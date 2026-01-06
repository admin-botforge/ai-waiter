from fastapi import APIRouter, HTTPException
from app.models.chat import ChatRequest, VoiceResponse
from app.services.user_service import UserService
from app.services.menu_service import MenuService
from app.services.agent import CafeAgent
from app.db.supabase import supabase
from datetime import datetime
import random

router = APIRouter()

@router.post("/chat", response_model=VoiceResponse)
async def handle_chat(request: ChatRequest):
    try:
        # 1. Identity Check: Get/Create User and get their active session
        # (Session must come before the AI call so we have history)
        user, is_new = UserService.get_or_create_user(request.phone_number, request.name)
        session = UserService.get_active_session(request.phone_number)

        # 2. Status Check: Does this user have a pending order?
        active_order_res = supabase.table("orders") \
            .select("*") \
            .eq("phone_number", request.phone_number) \
            .eq("status", "Pending") \
            .execute()
        
        active_order = active_order_res.data[0] if active_order_res.data else None

        # 3. Context Retrieval: Get menu items relevant to the input
        # We need an instance of MenuService to call its methods
        menu_res = supabase.table("menu").select("*").eq("is_available", True).execute()
        
        # Convert the list of items into a clean string for the AI's "brain"
        menu_context = "\n".join([
            f"- {item['name_en']} ({item['name_hi']}): Rs.{item['price']}" 
            for item in menu_res.data
        ])

        # 4. Agent Reasoning: Generate the response
        # Now we have all the variables defined and ready to pass
        ai_response = CafeAgent.get_voice_response(
            user_input=request.user_input,
            user_name=request.name,
            menu_context=menu_context,      # The dynamic menu string
            active_order=active_order,
            session_id=session['id'],
            history=session.get('history', []),
            current_cart=request.current_cart # <--- PASS THE CHECKBOX ITEMS HERE
        )
        # 5. Execute Order Placement if triggered
        if ai_response.get("action") == "ORDER_PLACED" and ai_response.get("items"):
            # Create a unique token (e.g., T-105)
            current_session_id = session.get('id')
            time_stamp = datetime.now().strftime('%M%S')
            rand_suffix = random.randint(10, 99)

            token = f"T-{request.phone_number[-3:]}{time_stamp}{rand_suffix}"
            items_list = ai_response["items"]
            total_price = sum(float(item.get('price', 0)) * int(item.get('quantity', 1)) for item in items_list)
            order_data = {
                "phone_number": request.phone_number,
                "table_id": request.table_id,
                "items": ai_response["items"], # Now Gemini will provide this
                "status": "Pending",
                "token_number": token,
                "name": request.name,
                "total_price": total_price
            }
            # INSERT INTO SUPABASE
            supabase.table("orders").insert(order_data).execute()

            # Clear the temporary cart from the session since order is now permanent
            if current_session_id:
                supabase.table("chat_sessions") \
                    .update({"cart_items": []}) \
                    .eq("id", current_session_id) \
                    .execute()
            
            # Update voice_text to include the token
            final_speech = (
                f"Thank you {request.name}. Your order is confirmed. "
                f"Your total bill is {total_price} rupees. "
                f"Please note your token number. {', '.join(token)}."
            )
            ai_response["voice_text"] = final_speech
            ai_response["display_text"] = f"Order Placed! Token: #{token}"
            ai_response["token_number"] = token
        # 6. Return structured response to Frontend
        return VoiceResponse(
            voice_text=ai_response.get("voice_text", ""),
            display_text=ai_response.get("display_text", ""),
            action=ai_response.get("action", "NONE"),
            items=ai_response.get("items"),
            table_id=request.table_id,
            token_number=ai_response.get("token_number")
        )

    except Exception as e:
        # Logging the error helps in debugging
        print(f"Error in chat_router: {e}")
        raise HTTPException(status_code=500, detail=str(e))
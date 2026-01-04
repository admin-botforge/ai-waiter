import google.generativeai as genai
import os
import json
import re 
from dotenv import load_dotenv
from app.db.supabase import supabase

load_dotenv()

genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))

class CafeAgent:
    # Using the stable 2.5 Flash model for best performance
    MODEL_NAME = "gemini-2.5-flash" 

    @classmethod
    def get_voice_response(cls, user_input, user_name, menu_context, active_order=None, session_id=None, history=[]):
        # 1. FETCH PERSISTENT CART FROM DATABASE
        session_query = supabase.table("chat_sessions").select("cart_items").eq("id", session_id).single().execute()
        db_cart = session_query.data.get("cart_items", []) if session_query.data else []
        if not isinstance(db_cart, list): db_cart = []
        
        # 2. Format current items for Gemini's instructions
        current_items_str = ", ".join([f"{i.get('name') or i.get('name_en')} (x{i.get('quantity', 1)})" for i in db_cart]) if db_cart else "Empty"

        # 3. INITIALIZE MODEL
        model = genai.GenerativeModel(
            model_name=cls.MODEL_NAME,
            system_instruction=(
                f"You are Alexa-Server, a professional Hinglish waiter at 'Veg Cafe'. "
                f"Customer: {user_name}. Current Cart: {current_items_str}. "
                f"If the input is 'GREET_USER_INITIAL', you must say: 'Namaste {user_name}! Welcome to Veg Cafe. Main aapki kya sewa kar sakta hoon?' "
                "STRICT RULES:\n"
                "1. ALWAYS return ONLY a JSON object.\n"
                "2. The 'items' list must ALWAYS contain the FULL cart (existing + new items).\n"
                "3. Use 'name' as the key for item names in the JSON items list.\n"
                "4. Only set action='ORDER_PLACED' if user confirms the final summary.\n"
                "5. If user asks a question, keep 'items' populated with current cart."
            )
        )

        chat = model.start_chat(history=history)
        
        prompt = f"""
        MENU DATA: {menu_context}
        CURRENT_DATABASE_CART: {json.dumps(db_cart)}
        USER_MESSAGE: "{user_input}"
        
        RESPONSE FORMAT:
        {{
          "voice_text": "natural Hinglish response",
          "display_text": "short summary",
          "action": "ORDER_PLACED" or "NONE",
          "items": [{{"name": "standard name", "price": 0, "quantity": 1}}]
        }}
        """

        response = chat.send_message(prompt)
        
        # 4. SAVE HISTORY
        updated_history = []
        for content in chat.history:
            updated_history.append({
                "role": content.role,
                "parts": [{"text": str(part.text)} for part in content.parts]
            })
        supabase.table("chat_sessions").update({"history": updated_history}).eq("id", session_id).execute()

        try:
            # 5. ROBUST JSON EXTRACTION
            raw_text = response.text
            match = re.search(r'\{.*\}', raw_text, re.DOTALL)
            if not match: raise ValueError("No JSON found")
            
            result = json.loads(match.group(0))

            # 6. SYNC DATABASE & STANDARDIZE NAMES
            new_items = result.get("items")
            if isinstance(new_items, list):
                # Ensure every item has a 'name' key for the frontend
                for item in new_items:
                    if 'name' not in item or not item['name']:
                        item['name'] = item.get('name_en') or item.get('name_hi') or "Unknown Item"
                
                # Save standardized list to Database
                supabase.table("chat_sessions").update({"cart_items": new_items}).eq("id", session_id).execute()
                result["items"] = new_items
            else:
                # Fallback to DB cart if Gemini failed to return the list
                result["items"] = db_cart

            return result

        except Exception as e:
            print(f"Agent Parsing Error: {e}")
            return {
                "voice_text": "Technical glitch, please repeat.",
                "display_text": "Sync Error",
                "action": "NONE",
                "items": db_cart
            }
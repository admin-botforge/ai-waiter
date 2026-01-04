import google.generativeai as genai
import os
import json
from dotenv import load_dotenv
from app.db.supabase import supabase

load_dotenv()

genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))

class CafeAgent:
    MODEL_NAME = "gemini-2.5-flash-lite"

    @classmethod
    def get_voice_response(cls, user_input, user_name, menu_context, active_order=None, session_id=None, history=[]):
        """
        Generates a personalized, context-aware response using Gemini Flash-Lite.
        """
        model = genai.GenerativeModel(
            model_name=cls.MODEL_NAME,
            system_instruction=(
                f"You are Alexa-Server, a friendly Hinglish waiter at 'Veg Cafe'. "
                f"User: {user_name}. Persona: Interactive, helpful, and concise. "
                "Instructions: Use short sentences for voice. If an order is confirmed, "
                "trigger [ACTION:ORDER_PLACED]. Always refer to the menu provided."
            )
        )

        # 1. Prepare Order & Session Context
        status_info = f"Current Order: {active_order['items']} (Status: {active_order['status']})" if active_order else "No active order."
        
        # 2. Format History for Gemini (Chat Interface)
        # Gemini expects a list of parts or a specific chat object
        chat = model.start_chat(history=history)

        # 3. Enhanced Prompt
        prompt = f"""
        MENU OPTIONS: {menu_context}
        ACCOUNT STATUS: {status_info}
        
        USER MESSAGE: "{user_input}"
        
        RESPONSE REQUIREMENTS:
        - Format: JSON only.
        - voice_text: Natural Hinglish for TTS.
        - display_text: Brief summary for UI.
        - action: 'ORDER_PLACED' (only if confirmed), 'SHOW_STATUS', or 'NONE'.
        - items: List of ordered items if action is 'ORDER_PLACED' like this:
          [{{"name": "Item Name", "price": 0.0, "quantity": 1}}]
        """

        response = chat.send_message(prompt)
        
        # 4. Save updated history back to Supabase
        # We extract the updated history from the chat object
        updated_history = []
        for content in chat.history:
            updated_history.append({
                "role": content.role,
                "parts": [part.text for part in content.parts]
            })
        
        supabase.table("chat_sessions").update({
            "history": updated_history,
            "last_interaction": "now()"
        }).eq("id", session_id).execute()

        try:
            # Parsing JSON from Gemini
            clean_res = response.text.replace("```json", "").replace("```", "").strip()
            return json.loads(clean_res)
        except:
            return {
                "voice_text": response.text,
                "display_text": response.text,
                "action": "NONE"
            }
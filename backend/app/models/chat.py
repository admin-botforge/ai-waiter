from pydantic import BaseModel
from typing import List, Optional

class ChatRequest(BaseModel):
    phone_number: str
    name: str
    table_id: str
    user_input: str
    table_id: str
    current_cart: list = []

class VoiceResponse(BaseModel):
    voice_text: str        # To be read by the browser/TTS engine
    display_text: str      # To be shown in the chat UI
    action: str = "NONE"   # Instructions like "ADD_TO_CART" or "CONFIRM_ORDER"
    items: Optional[List[dict]] = None # List of items found or ordered
    table_id: str
    token_number: Optional[str] = None
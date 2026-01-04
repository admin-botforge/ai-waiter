from app.db.supabase import supabase
from datetime import datetime

class UserService:
    @staticmethod
    def get_or_create_user(phone_number: str, name: str):
        """
        Retrieves a user by phone number or creates a new one if they don't exist.
        """
        # 1. Check for existing user
        response = supabase.table("users").select("*").eq("phone_number", phone_number).execute()
        
        if not response.data:
            # 2. Register new user
            new_user = {"phone_number": phone_number, "name": name}
            result = supabase.table("users").insert(new_user).execute()
            return result.data[0], True  # Returns user data and 'is_new' flag
            
        return response.data[0], False

    @staticmethod
    def get_active_session(phone_number: str):
        """
        Finds the current active chat session for a user. 
        If none exists, it creates a fresh one.
        """
        # Look for a session that hasn't been 'flushed' (is_active=True)
        session_query = supabase.table("chat_sessions") \
            .select("*") \
            .eq("phone_number", phone_number) \
            .eq("is_active", True) \
            .order("last_interaction", desc=True) \
            .limit(1) \
            .execute()

        if session_query.data:
            return session_query.data[0]
        
        # Create a new session if no active one is found
        new_session = {"phone_number": phone_number, "is_active": True}
        result = supabase.table("chat_sessions").insert(new_session).execute()
        return result.data[0]

    @staticmethod
    def flush_session(phone_number: str):
        """
        Marks the current session as inactive. 
        Used after an order is served to 'clear' the AI's memory.
        """
        supabase.table("chat_sessions") \
            .update({"is_active": False}) \
            .eq("phone_number", phone_number) \
            .eq("is_active", True) \
            .execute()
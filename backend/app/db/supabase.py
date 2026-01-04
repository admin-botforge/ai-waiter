import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load variables from the .env file in the backend root
load_dotenv()

# Retrieve credentials
url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

if not url or not key:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_KEY in .env file")

# Initialize the Supabase client
# Using the 'service_role' key here gives the backend full admin access 
# to bypass RLS for internal logic (like creating users and managing all tables).
supabase: Client = create_client(url, key)

def get_supabase() -> Client:
    """
    Returns the initialized Supabase client instance.
    """
    return supabase
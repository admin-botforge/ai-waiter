from app.db.supabase import supabase

try:
    # Try to fetch something (even if table is empty, it shouldn't error)
    res = supabase.table("orders").select("*").limit(1).execute()
    print("✅ Successfully connected to Supabase!")
except Exception as e:
    print(f"❌ Connection failed: {e}")
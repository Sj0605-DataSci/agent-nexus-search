# app/core/clients.py
import os
from supabase import create_async_client
from app.core.config import settings

async def get_supabase_client():
    """Create and return a Supabase client using environment settings"""
    # Get Supabase URL and key from environment variables
    supabase_url = os.environ.get("SUPABASE_URL", settings.SUPABASE_URL)
    supabase_key = os.environ.get("SUPABASE_ANON_KEY", settings.SUPABASE_ANON_KEY)
    
    # Create and return the Supabase client
    return await create_async_client(supabase_url, supabase_key)
# app/core/clients.py
import os
import asyncio
from supabase import create_async_client, create_client
from app.core.config import settings

# Global client that will be initialized once
_supabase_client = None

# Global async client that will be initialized once
_async_supabase_client = None

def init_supabase_client():
    """Initialize the Supabase client synchronously for global use"""
    global _supabase_client
    
    # Get Supabase URL and key from environment variables
    supabase_url = os.environ.get("SUPABASE_URL", settings.SUPABASE_URL)
    supabase_key = os.environ.get("SUPABASE_ANON_KEY", settings.SUPABASE_ANON_KEY)
    
    # Create a synchronous client
    _supabase_client = create_client(supabase_url, supabase_key)
    return _supabase_client

def get_supabase_client():
    """Get the global Supabase client, initializing if needed"""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = init_supabase_client()
    return _supabase_client

# Keep the async version for compatibility where needed
async def get_async_supabase_client():
    """Get the global async Supabase client, initializing if needed"""
    global _async_supabase_client
    if _async_supabase_client is None:
        # Get Supabase URL and key from environment variables
        supabase_url = os.environ.get("SUPABASE_URL", settings.SUPABASE_URL)
        supabase_key = os.environ.get("SUPABASE_ANON_KEY", settings.SUPABASE_ANON_KEY)
        
        # Create the Supabase client - await is needed here
        _async_supabase_client = await create_async_client(supabase_url, supabase_key)
    
    return _async_supabase_client

# supabase_async_client = get_async_supabase_client()

# async def get_data():
#     response = await supabase_async_client.table("agent_templates").select("*").execute()
#     return response.data

# response = get_data()

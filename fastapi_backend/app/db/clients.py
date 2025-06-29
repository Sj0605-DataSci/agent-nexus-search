# app/core/clients.py
import os
import asyncio
from supabase import create_async_client, create_client
from app.core.config import settings

# Global client that will be initialized once
_supabase_client = None

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
    """Create and return an async Supabase client"""
    # Get Supabase URL and key from environment variables
    supabase_url = os.environ.get("SUPABASE_URL", settings.SUPABASE_URL)
    supabase_key = os.environ.get("SUPABASE_ANON_KEY", settings.SUPABASE_ANON_KEY)
    
    # Create and return the Supabase client
    return await create_async_client(supabase_url, supabase_key)
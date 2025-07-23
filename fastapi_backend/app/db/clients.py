# app/core/clients.py
from supabase import create_async_client, create_client
from app.core.config import settings
import httpx

# Global client that will be initialized once
_supabase_client = None

# Global async client that will be initialized once
_async_supabase_client = None

# Keep track of which environment the client was initialized for
_client_environment = None

def init_supabase_client():
    """Initialize the Supabase client synchronously for global use"""
    global _supabase_client
    
    # Get Supabase URL and key from environment variables
    supabase_url = settings.SUPABASE_URL
    supabase_key = settings.SUPABASE_ANON_KEY
    
    # Log client creation
    print(f"Creating new sync Supabase client for environment: {settings.ENVIRONMENT}")
    print(f"Using Supabase URL: {supabase_url}")
    
    # Create a synchronous client
    _supabase_client = create_client(supabase_url, supabase_key)
    return _supabase_client

# Track which environment the sync client was initialized for
_sync_client_environment = None

def get_supabase_client():
    """Get the global Supabase client, initializing if needed or if environment changed"""
    global _supabase_client, _sync_client_environment
    current_env = settings.ENVIRONMENT
    
    # Create a new client if none exists or if environment has changed
    if _supabase_client is None or _sync_client_environment != current_env:
        _supabase_client = init_supabase_client()
        _sync_client_environment = current_env
    
    return _supabase_client

# Keep the async version for compatibility where needed
async def get_async_supabase_client():
    """Get the global async Supabase client, initializing if needed or if environment changed"""
    global _async_supabase_client, _client_environment
    current_env = settings.ENVIRONMENT
    
    # Create a new client if none exists or if environment has changed
    if _async_supabase_client is None or _client_environment != current_env:
        # Get Supabase URL and key from environment variables
        supabase_url = settings.SUPABASE_URL
        supabase_key = settings.SUPABASE_ANON_KEY
        
        # Log client creation
        print(f"Creating new Supabase client for environment: {current_env}")
        print(f"Using Supabase URL: {supabase_url}")
        
        # Create the Supabase client - await is needed here
        _async_supabase_client = await create_async_client(supabase_url, supabase_key)
        _client_environment = current_env
    
    return _async_supabase_client

# supabase_async_client = get_async_supabase_client()

# async def get_data():
#     response = await supabase_async_client.table("agent_templates").select("*").execute()
#     return response.data

# response = get_data()

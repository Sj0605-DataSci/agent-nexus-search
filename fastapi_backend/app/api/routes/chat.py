from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from app.models.chat import ChatRequest, ChatResponse
from app.core.services.chat_service import ChatService
from typing import Annotated, Optional
import json

# Create router
router = APIRouter(prefix="/chat", tags=["chat"])

# Create a supabase client function
async def get_supabase_client():
    """Create and return a Supabase client using environment settings"""
    import os
    from supabase import create_async_client
    from app.core.config import settings
    
    # Get Supabase URL and key from environment variables
    supabase_url = os.environ.get("SUPABASE_URL", settings.SUPABASE_URL)
    supabase_key = os.environ.get("SUPABASE_ANON_KEY", settings.SUPABASE_ANON_KEY)
    
    # Create and return the Supabase client
    return await create_async_client(supabase_url, supabase_key)

@router.post("/", response_model=ChatResponse)
async def process_chat(
    request: ChatRequest,
    supabase_client: Annotated[any, Depends(get_supabase_client)],
):
    """
    Process a chat request and return search results
    
    - **query**: The search query from the user
    - **user_id**: The ID of the current user
    - **agent_id**: The ID of the agent being used
    """
    try:
        # Initialize chat service
        chat_service = ChatService(supabase_client)
        
        # Process the chat request
        result = await chat_service.chat(request.user_id, request.agent_id, request.messages)
        
        # Convert the result to a ChatResponse
        
        # Convert LangChain message objects to dictionaries
        messages = []
        for msg in result.get("messages", []):
            if hasattr(msg, "content") and hasattr(msg, "type"):
                # It's a LangChain message object
                msg_dict = {
                    "content": msg.content,
                    "type": msg.type,
                }
                messages.append(msg_dict)
            else:
                # It's already a dictionary
                messages.append(msg)
        
        # Ensure sources have the required score field
        sources = []
        for source in result.get("sources_gathered", []):
            if isinstance(source, dict):
                if "score" not in source:
                    source["score"] = 1.0  # Default score
                sources.append(source)
        
        response = ChatResponse(
            messages=messages,
            sources_gathered=sources,
            search_query=[q["query"] if isinstance(q, dict) and "query" in q else q 
                         for q in result.get("search_query", []) if q],
            web_research_result=result.get("web_research_result", [])
        )
        
        return response
    except Exception as e:
        # Log the error (in a production environment)
        print(f"Error processing chat: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing chat request: {str(e)}"
        )

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from app.models.chat import ChatRequest, ChatResponse, StreamingChatRequest, StreamingChatUpdate
from app.core.services.chat_service import ChatService
from typing import Annotated, Optional, AsyncGenerator, Dict, Any
import json
import traceback
import logging
import asyncio
from app.db.clients import get_supabase_client
from app.models.schemas import StandardResponse, StandardJSONResponse

# Set up logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=StandardResponse[ChatResponse], response_class=StandardJSONResponse, status_code=status.HTTP_200_OK)
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
        
        # The result is already a ChatResponse object, so we can use it directly
        response = result
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Chat processed successfully",
            data=response
        ))
    except HTTPException as e:
        # Log the error
        logger.error(f"HTTP Exception in process_chat: {e.detail}")
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=e.status_code,
            message=str(e.detail),
            data=None
        ))
    except Exception as e:
        # Log the full stack trace for unexpected errors
        logger.error(f"Unexpected error in process_chat: {str(e)}")
        logger.error(traceback.format_exc())
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"Error processing chat request: {str(e)}",
            data=None
        ))


@router.post("/stream")
async def stream_chat(
    request: StreamingChatRequest,
    supabase_client: Annotated[any, Depends(get_supabase_client)],
) -> StreamingResponse:
    """
    Process a chat request and stream the results back to the client
    
    - **query**: The search query from the user
    - **user_id**: The ID of the current user
    - **agent_id**: The ID of the agent being used
    - **stream**: Whether to stream the response (default: True)
    """
    
    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            # Initialize chat service
            chat_service = ChatService(supabase_client)
            
            # Send initial thinking state
            thinking_update = StreamingChatUpdate(
                type="thinking",
                content={"message": "Thinking..."}
            )
            yield f"data: {thinking_update.model_dump_json()}\n\n"
            
            # Small delay to ensure frontend receives the thinking state
            await asyncio.sleep(0.1)
            
            # Process the chat request
            result = await chat_service.chat(request.user_id, request.agent_id, request.messages)
            
            # Stream search queries if available
            if result.search_query:
                for query in result.search_query:
                    query_update = StreamingChatUpdate(
                        type="search_query",
                        content={"query": query}
                    )
                    yield f"data: {query_update.model_dump_json()}\n\n"
                    await asyncio.sleep(0.1)
            
            # Stream sources if available
            if result.sources_gathered:
                for source in result.sources_gathered:
                    source_update = StreamingChatUpdate(
                        type="source",
                        content=source.model_dump()
                    )
                    yield f"data: {source_update.model_dump_json()}\n\n"
                    await asyncio.sleep(0.1)
            
            # Stream the final message
            if result.messages:
                message = result.messages[-1]  # Get the last message
                message_update = StreamingChatUpdate(
                    type="message",
                    content=message
                )
                yield f"data: {message_update.model_dump_json()}\n\n"
            
            # Send completion signal
            done_update = StreamingChatUpdate(
                type="done",
                content={"message": "Chat response complete"}
            )
            yield f"data: {done_update.model_dump_json()}\n\n"
            
        except Exception as e:
            # Log the error
            logger.error(f"Error in stream_chat: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Send error message
            error_update = StreamingChatUpdate(
                type="error",
                content={"message": f"Error: {str(e)}"}
            )
            yield f"data: {error_update.model_dump_json()}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )

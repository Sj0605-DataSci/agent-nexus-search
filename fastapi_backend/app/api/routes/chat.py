from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from app.models.chat import ChatRequest, ChatResponse, StreamingChatRequest, StreamingChatUpdate
from app.core.services.chat_service import ChatService
from typing import Annotated, AsyncGenerator
import traceback
import logging
from app.db.clients import get_async_supabase_client
from app.models.schemas import StandardResponse, StandardJSONResponse

# Set up logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=StandardResponse[ChatResponse], response_class=StandardJSONResponse, status_code=status.HTTP_200_OK)
async def process_chat(
    request: ChatRequest,
):
    """
    Process a chat request and return search results
    
    - **query**: The search query from the user
    - **user_id**: The ID of the current user
    - **agent_id**: The ID of the agent being used
    """
    try:
        # Initialize chat service
        chat_service = ChatService(client=await get_async_supabase_client())
        
        # Process the chat request
        result = await chat_service.chat(request.user_id, request.agent_id, request.messages, request.format, request.search_mode, request.world_connections)
        
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
) -> StreamingResponse:
    """
    Stream chat response as Server-Sent Events (SSE) using Redis-based background workers
    
    This endpoint queues the chat request to be processed by a background worker,
    then streams the response using Redis Pub/Sub as the worker processes it.
    This allows multiple users to get responses concurrently without blocking.
    """
    from app.core.worker import enqueue_chat_task
    from app.core.services.stream_service import stream_service
    
    try:
        # Queue the chat request to be processed by a background worker
        # This returns immediately without blocking
        request_id = await enqueue_chat_task(
            user_id=request.user_id,
            agent_id=request.agent_id,
            messages=request.messages,
            format=request.format,
            search_mode=request.search_mode,
            world_connections=request.world_connections
        )
        
        logger.info(f"Chat request queued with ID: {request_id}")
        
        # Return a streaming response that subscribes to the Redis Pub/Sub channel
        return StreamingResponse(
            stream_service.subscribe_to_chat_stream(request_id),
            media_type="text/event-stream"
        )
        
    except Exception as e:
        # Log the error
        logger.error(f"Error queueing chat request: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Return an error response
        async def error_generator():
            error_update = StreamingChatUpdate(
                type="error",
                content={"message": f"Error: {str(e)}"}
            )
            yield f"event: update\ndata: {error_update.model_dump_json()}\n\n"
            
        return StreamingResponse(
            error_generator(),
            media_type="text/event-stream"
        )

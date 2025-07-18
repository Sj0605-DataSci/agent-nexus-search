from fastapi import APIRouter, Depends, HTTPException, status, Path, Query, Body
from fastapi.responses import StreamingResponse
from app.models.chat import ChatRequest, ChatResponse, StreamingChatRequest, StreamingChatUpdate
from app.models.models import Profile
from app.core.services.chat_service import ChatService
from typing import Annotated, AsyncGenerator, List, Dict, Any, Optional
import traceback
import logging
from app.core.auth import get_current_user
from app.db.clients import get_async_supabase_client
from app.models.schemas import StandardResponse, StandardJSONResponse
from pydantic import BaseModel

# Define feedback model
class FeedbackData(BaseModel):
    is_positive: bool
    comment: Optional[str] = ""

# Set up structured logging
from app.core.structured_logger import get_structured_logger
logger = get_structured_logger(__name__)

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
        logger.error("HTTP exception in chat processing",
                    exception_type="HTTPException",
                    status_code=e.status_code,
                    detail=str(e.detail),
                    user_id=request.user_id,
                    agent_id=request.agent_id)
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=e.status_code,
            message=str(e.detail),
            data=None
        ))
    except Exception as e:
        # Log the full stack trace for unexpected errors
        logger.exception("Unexpected error in chat processing",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        user_id=request.user_id,
                        agent_id=request.agent_id)
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"Error processing chat request: {str(e)}",
            data=None
        ))


@router.post("/stream")
async def stream_chat(
    request: StreamingChatRequest,
    current_user: Profile = Depends(get_current_user)
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
            world_connections=request.world_connections,
            thread_id=request.thread_id
        )
        
        logger.log_chat_event("chat_request_queued",
                              user_id=request.user_id,
                              agent_id=request.agent_id,
                              chat_thread_id=request.thread_id,
                              request_id=request_id)
        
        # Return a streaming response that subscribes to the Redis Pub/Sub channel
        return StreamingResponse(
            stream_service.subscribe_to_chat_stream(request_id),
            media_type="text/event-stream"
        )
        
    except Exception as e:
        # Log the error
        logger.exception("Error queueing chat request",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        user_id=request.user_id,
                        agent_id=request.agent_id,
                        chat_thread_id=request.thread_id)
        
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


@router.get("/threads", response_model=StandardResponse[List[Dict[str, Any]]], response_class=StandardJSONResponse)
async def get_chat_threads(current_user: Profile = Depends(get_current_user)):
    """
    Get all chat threads for a specific user
    
    - **user_id**: The ID of the user
    
    Returns a list of chat thread objects with their IDs and metadata
    """
    try:
        # Initialize chat service
        chat_service = ChatService(client=await get_async_supabase_client())
        
        # Get chat threads for the user
        threads = await chat_service.get_chat_threads(current_user.id)
        
        logger.info("Chat threads retrieved successfully",
                   user_id=current_user.id,
                   thread_count=len(threads) if threads else 0)
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Chat threads retrieved successfully",
            data=threads
        ))
    except HTTPException as e:
        logger.error("HTTP exception in get_chat_threads",
                    exception_type="HTTPException",
                    status_code=e.status_code,
                    detail=str(e.detail),
                    user_id=current_user.id)
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=e.status_code,
            message=str(e.detail),
            data=None
        ))
    except Exception as e:
        logger.exception("Unexpected error in get_chat_threads",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        user_id=current_user.id)
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"Error retrieving chat threads: {str(e)}",
            data=None
        ))


@router.get("/messages/{chat_thread_id}", response_model=StandardResponse[List[Dict[str, Any]]], response_class=StandardJSONResponse)
async def get_messages_for_thread(
    chat_thread_id: str = Path(..., description="ID of the chat thread"),
    current_user: Profile = Depends(get_current_user)
):
    """
    Get all messages for a specific chat thread and user
    
    - **user_id**: The ID of the user
    - **chat_thread_id**: The ID of the chat thread
    
    Returns a list of message objects with their content and metadata
    """
    try:
        # Initialize chat service
        chat_service = ChatService(client=await get_async_supabase_client())
        
        # Get messages for the chat thread
        messages = await chat_service.get_messages_for_thread(current_user.id, chat_thread_id)
        
        logger.info("Chat messages retrieved successfully",
                   user_id=current_user.id,
                   chat_thread_id=chat_thread_id,
                   message_count=len(messages) if messages else 0)
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Chat messages retrieved successfully",
            data=messages
        ))
    except HTTPException as e:
        logger.error("HTTP exception in get_messages_for_thread",
                    exception_type="HTTPException",
                    status_code=e.status_code,
                    detail=str(e.detail),
                    user_id=current_user.id,
                    chat_thread_id=chat_thread_id)
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=e.status_code,
            message=str(e.detail),
            data=None
        ))
    except Exception as e:
        logger.exception("Unexpected error in get_messages_for_thread",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        user_id=current_user.id,
                        chat_thread_id=chat_thread_id)
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"Error retrieving chat messages: {str(e)}",
            data=None
        ))
        
@router.get("/feedback/{message_id}", response_model=StandardResponse[List[Dict[str, Any]]], response_class=StandardJSONResponse)
async def get_feedback_for_thread_message(message_id: str, current_user: Profile = Depends(get_current_user)):
    try:
        # Initialize chat service
        chat_service = ChatService(client=await get_async_supabase_client())
        
        # Get feedback for the chat thread
        feedback = await chat_service.get_feedback_for_thread_message(current_user.id, message_id)
        
        logger.info("Feedback retrieved successfully",
                   user_id=current_user.id,
                   message_id=message_id,
                   feedback_count=len(feedback) if feedback else 0)
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Feedback retrieved successfully",
            data=feedback
        ))
    except HTTPException as e:
        logger.error("HTTP exception in get_feedback_for_thread",
                    exception_type="HTTPException",
                    status_code=e.status_code,
                    detail=str(e.detail),
                    user_id=current_user.id,
                    message_id=message_id)
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=e.status_code,
            message=str(e.detail),
            data=None
        ))
    except Exception as e:
        logger.exception("Unexpected error in get_feedback_for_thread",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        user_id=current_user.id,
                        message_id=message_id)
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"Error retrieving feedback: {str(e)}",
            data=None
        ))

@router.post("/feedback/{message_id}", response_model=StandardResponse[Dict[str, Any]], response_class=StandardJSONResponse)
async def post_feedback_for_thread_message(
    message_id: str, 
    feedback_data: FeedbackData = Body(...),
    current_user: Profile = Depends(get_current_user)):
    try:
        # Initialize chat service
        chat_service = ChatService(client=await get_async_supabase_client())
        
        # Log the received feedback data
        logger.info("Received feedback data",
                   user_id=current_user.id,
                   message_id=message_id,
                   is_positive=feedback_data.is_positive,
                   has_comment=bool(feedback_data.comment))
        
        # Submit feedback to the chat service
        feedback = await chat_service.post_feedback_for_thread_message(
            current_user.id, 
            message_id, 
            feedback_data.is_positive,
            feedback_data.comment or "")
        
        logger.info("Feedback submitted successfully",
                   user_id=current_user.id,
                   message_id=message_id,
                   is_positive=feedback_data.is_positive)
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Feedback submitted successfully",
            data=None
        ))
    except HTTPException as e:
        logger.error("HTTP exception in post_feedback_for_thread_message",
                    exception_type="HTTPException",
                    status_code=e.status_code,
                    detail=str(e.detail),
                    user_id=current_user.id,
                    message_id=message_id)
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=e.status_code,
            message=str(e.detail),
            data=None
        ))
    except Exception as e:
        logger.exception("Unexpected error in post_feedback_for_thread_message",
                        exception_type=type(e).__name__,
                        error_message=str(e),
                        user_id=current_user.id,
                        message_id=message_id)
        return StandardJSONResponse(StandardResponse(
            success=False,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=f"Error submitting feedback: {str(e)}",
            data=None
        ))
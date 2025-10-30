from fastapi import APIRouter, Depends, HTTPException, status, Path, Query, Body, Header, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from app.models.chat import ChatRequest, ChatResponse, StreamingChatRequest, StreamingChatUpdate, StreamingPublicChatRequest
from app.models.models import Profile
from app.core.services.chat_service import ChatService
from typing import List, Dict, Any, Optional
from app.core.auth import get_current_user
from app.core.utils.cache import (
    get_cached_chat_messages, cache_chat_messages, invalidate_chat_messages_cache,
    get_cached_message_feedback, cache_message_feedback, invalidate_message_feedback_cache,
    get_cached_chat_threads, cache_chat_threads, invalidate_chat_threads_cache
)
from app.db.clients import get_async_supabase_client
from app.models.schemas import StandardResponse, StandardJSONResponse
from pydantic import BaseModel
from app.core.worker import enqueue_chat_task
from app.core.services.stream_service import stream_service
from app.db.redis_client import redis_client
from app.core.config import settings

CACHE_TTL_SECONDS = 2 * 24 * 60 * 60  # 2 days

# Define feedback model
class FeedbackData(BaseModel):
    is_positive: bool
    comment: Optional[str] = ""

# Set up structured logging
from app.core.structured_logger import get_structured_logger
from app.core.profiling import profile_async
logger = get_structured_logger(__name__)

# Create router
router = APIRouter(prefix="/chat", tags=["chat"])

# Create a dependency for the ChatService
async def get_chat_service():
    """
    Dependency to get a ChatService instance.
    This helps reduce the overhead of creating a new service for each request.
    """
    client = await get_async_supabase_client()
    return ChatService(client=client)

@router.post("", response_model=StandardResponse[ChatResponse], response_class=StandardJSONResponse, status_code=status.HTTP_200_OK)
async def process_chat(
    request: ChatRequest,
    current_user: Profile = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service)
):
    """
    Process a chat request and return search results
    
    - **query**: The search query from the user
    - **user_id**: The ID of the current user
    - **agent_id**: The ID of the agent being used
    """
    try:
        # Process the chat request
        result = await chat_service.chat(current_user.id, request.agent_id, request.messages, request.format, request.search_mode, request.world_connections)
        
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
                    user_id=current_user.id,
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
                        user_id=current_user.id,
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
    x_client_ip: str = Header(None, alias="X-Client-Ip"),
    x_device_id: str = Header(..., alias="X-Device-Id"),
    x_device_type: str = Header(..., alias="X-Device-Type"),
    endpoint:str="Private",
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
            user_id=current_user.id,
            agent_id=request.agent_id,
            messages=request.messages,
            format="table",
            search_mode="basic",
            world_connections="connections",
            thread_id=request.thread_id,
            device_id=x_device_id,
            device_type=x_device_type,
            client_ip=x_client_ip,
            endpoint=endpoint
        )
        
        logger.log_chat_event("chat_request_queued",
                              user_id=current_user.id,
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
                        user_id=current_user.id,
                        agent_id=request.agent_id,
                        chat_thread_id=request.thread_id)
        
        # Return an error response
        error_message = str(e)  # Capture the error message outside the generator
        
        async def error_generator():
            error_update = StreamingChatUpdate(
                type="error",
                content={"message": f"Error: {error_message}"}
            )
            yield f"event: update\ndata: {error_update.model_dump_json()}\n\n"
            
        return StreamingResponse(
            error_generator(),
            media_type="text/event-stream"
        )

@router.post("/public/stream")
async def public_stream_chat(
    request: StreamingPublicChatRequest,
    x_client_ip: str = Header(None, alias="X-Client-Ip"),
    x_device_id: str = Header(..., alias="X-Device-Id"),
    x_device_type: str = Header(..., alias="X-Device-Type"),
    endpoint:str="Public"
) -> StreamingResponse:
    
    cache_key = f"rate_limit:{x_device_id}:{x_client_ip}:{x_device_type}"

    cached_result = await redis_client.get(cache_key)
    search_count = int(cached_result) if cached_result is not None else 0

    if search_count >= 3:
        raise HTTPException(
            status_code=429,
            detail="You've reached the maximum number of free searches. Please try again later or sign up for more."
        )

    try:
        request_id = await enqueue_chat_task(
            user_id=settings.FOUNDERS_USERID,
            agent_id=settings.FOUNDERS_AGENTID,
            device_id=x_device_id,
            device_type=x_device_type,
            client_ip=x_client_ip,
            endpoint=endpoint,
            messages=request.messages,
            format="table",
            search_mode="basic",
            world_connections="connections",
            thread_id="new"
        )

        # Increment the count and set TTL (only on first time or reset TTL)
        await redis_client.set(cache_key, search_count + 1, expire=CACHE_TTL_SECONDS)
        
        return StreamingResponse(
            stream_service.subscribe_to_chat_stream(request_id),
            media_type="text/event-stream"
        )

    except Exception as e:
        logger.exception(
            "Error in public chat stream",
            exception_type=type(e).__name__,
            error_message=str(e),
            user_id=settings.FOUNDERS_USERID,
            agent_id=settings.FOUNDERS_AGENTID
        )
        raise HTTPException(
            status_code=500,
            detail="Error processing chat request"
        )   


@router.get("/threads", response_model=StandardResponse[Dict[str, Any]], response_class=StandardJSONResponse)
@profile_async("routes.chat.get_chat_threads")
async def get_chat_threads(
    page: int = Query(1, ge=1, description="Page number (starts from 1)"),
    page_size: int = Query(10, ge=1, le=100, description="Number of items per page"),
    current_user: Profile = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service)
):
    """
    Get chat threads for a specific user with pagination
    
    - **user_id**: The ID of the user (from authentication)
    - **page**: Page number, starting from 1 (default: 1)
    - **page_size**: Number of items per page (default: 10, max: 100)
    
    Returns paginated chat thread objects with their IDs and metadata, plus total count
    """
    try:
        # Create cache key including user_id and pagination info
        user_id_str = str(current_user.id)
        cache_key = f"threads:{user_id_str}:{page}:{page_size}"
        
        # Try to get from cache first
        cached_threads = get_cached_chat_threads(cache_key)
        if cached_threads is not None:
            logger.info("Chat threads retrieved from cache",
                       user_id=current_user.id,
                       page=page,
                       page_size=page_size,
                       thread_count=len(cached_threads.get("threads", [])))
            
            return StandardJSONResponse(StandardResponse(
                success=True,
                status_code=status.HTTP_200_OK,
                message="Chat threads retrieved from cache",
                data=cached_threads
            ))
        
        # If not in cache, get from database
        logger.info(f"Cache miss for threads {cache_key}, fetching from database")
        
        # Calculate offset from page and page_size
        offset = (page - 1) * page_size
        
        # Get chat threads for the user with pagination
        result = await chat_service.get_chat_threads(current_user.id, limit=page_size, offset=offset)
        
        # Calculate pagination metadata
        total_count = result.get("total", 0)
        total_pages = (total_count + page_size - 1) // page_size if total_count > 0 else 0
        
        # Add pagination metadata to the result
        pagination_data = {
            "threads": result.get("threads", []),
            "pagination": {
                "total": total_count,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_previous": page > 1
            }
        }
        
        # Cache the results
        cache_chat_threads(cache_key, pagination_data)
        logger.info("Chat threads cached", cache_key=cache_key)
        
        logger.info("Chat threads retrieved successfully",
                   user_id=current_user.id,
                   thread_count=len(result.get("threads", [])),
                   total_count=total_count,
                   page=page,
                   page_size=page_size,
                   total_pages=total_pages)
        
        return StandardJSONResponse(StandardResponse(
            success=True,
            status_code=status.HTTP_200_OK,
            message="Chat threads retrieved successfully",
            data=pagination_data
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
@profile_async("routes.chat.get_messages_for_thread")
async def get_messages_for_thread(
    chat_thread_id: str = Path(..., description="ID of the chat thread"),
    page: int = Query(1, ge=1, description="Page number (starts from 1)"),
    page_size: int = Query(10, ge=1, le=100, description="Number of items per page"),
    current_user: Profile = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service)
):
    """
    Get all messages for a specific chat thread and user
    
    - **user_id**: The ID of the user
    - **chat_thread_id**: The ID of the chat thread
    
    Returns a list of message objects with their content and metadata
    """
    try:
        # Create cache key including pagination info
        cache_key = f"messages:{chat_thread_id}:{page}:{page_size}"
        
        # Try to get from cache first
        cached_messages = get_cached_chat_messages(cache_key)
        if cached_messages is not None:
            logger.info("Chat messages retrieved from cache",
                       user_id=current_user.id,
                       chat_thread_id=chat_thread_id,
                       page=page,
                       page_size=page_size,
                       message_count=len(cached_messages))
            
            return StandardJSONResponse(StandardResponse(
                success=True,
                status_code=status.HTTP_200_OK,
                message="Chat messages retrieved from cache",
                data=cached_messages
            ))
        
        # If not in cache, get from database
        offset = (page - 1) * page_size
        messages = await chat_service.get_messages_for_thread(current_user.id, chat_thread_id, limit=page_size, offset=offset)
        
        # Cache the results
        if messages is not None:
            cache_chat_messages(cache_key, messages)
            logger.info("Chat messages cached", cache_key=cache_key)
        
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
@profile_async("routes.chat.get_feedback_for_thread_message")
async def get_feedback_for_thread_message(
    message_id: str, 
    current_user: Profile = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service)
):
    try:
        # Try to get from cache first
        cached_feedback = get_cached_message_feedback(message_id)
        if cached_feedback is not None:
            logger.info("Feedback retrieved from cache",
                       user_id=current_user.id,
                       message_id=message_id,
                       feedback_count=len(cached_feedback))
            
            return StandardJSONResponse(StandardResponse(
                success=True,
                status_code=status.HTTP_200_OK,
                message="Feedback retrieved from cache",
                data=cached_feedback
            ))
        
        # If not in cache, get from database
        feedback = await chat_service.get_feedback_for_thread_message(current_user.id, message_id)
        
        # Cache the results
        if feedback is not None:
            cache_message_feedback(message_id, feedback)
            logger.info("Feedback cached", message_id=message_id)
        
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

@router.patch("/feedback/{message_id}", response_model=StandardResponse[Dict[str, Any]], response_class=StandardJSONResponse)
@profile_async("routes.chat.patch_feedback_for_thread_message")
async def patch_feedback_for_thread_message(
    message_id: str, 
    feedback_data: FeedbackData = Body(...),
    current_user: Profile = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service)
):
    try:
        # Log the received feedback data
        logger.info("Received feedback data",
                   user_id=current_user.id,
                   message_id=message_id,
                   is_positive=feedback_data.is_positive,
                   has_comment=bool(feedback_data.comment))
        
        # Submit feedback to the chat service
        feedback = await chat_service.patch_feedback_for_thread_message(
            current_user.id, 
            message_id, 
            feedback_data.is_positive,
            feedback_data.comment or "")
        
        # Invalidate feedback cache for this message
        invalidate_message_feedback_cache(message_id)
        
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
        logger.error("HTTP exception in patch_feedback_for_thread_message",
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
        logger.exception("Unexpected error in patch_feedback_for_thread_message",
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


# ============================================================================
# TALLY PRODUCT QUERY ENDPOINT
# ============================================================================

class TallyQueryRequest(BaseModel):
    query: str

@router.post("/tally")
async def tally_product_chat(
    request: TallyQueryRequest,
    current_user: Profile = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service)
) -> StreamingResponse:
    """
    Chat endpoint for Tally product queries.
    Uses LangGraph with tool calling to search products and answer questions.
    """
    try:
        logger.info("tally_product_chat_request",
                   query=request.query)
        
        # Stream the response from the product query agent
        async def event_generator():
            try:
                async for event in chat_service.process_tally_query(request.query, current_user.id):
                    yield f"data: {event}\n\n"
            except Exception as e:
                logger.error("tally_product_chat_error",
                           exception_type=type(e).__name__,
                           error_message=str(e))
                error_event = {
                    "type": "error",
                    "content": {"message": f"Error processing query: {str(e)}"}
                }
                yield f"data: {error_event}\n\n"
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream"
        )
        
    except Exception as e:
        logger.error("tally_product_chat_error",
                   exception_type=type(e).__name__,
                   error_message=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing Tally query: {str(e)}"
        )


@router.websocket("/tally/ws/{user_id}")
async def tally_websocket(
    websocket: WebSocket,
    user_id: str,
    chat_service: ChatService = Depends(get_chat_service)
):
    """
    WebSocket endpoint for Tally chat with bidirectional communication.
    Allows backend to request XML execution on Electron's local Tally.
    """
    await websocket.accept()
    logger.info("tally_websocket_connected", user_id=user_id)
    
    try:
        while True:
            # Receive message from Electron
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            logger.info("tally_websocket_message_received",
                       user_id=user_id,
                       message_type=message_type)
            
            if message_type == "query":
                # User query received from Electron
                query = data.get("message", "")
                
                logger.info("tally_websocket_query",
                           user_id=user_id,
                           query=query)
                
                # Send thinking status
                await websocket.send_json({
                    "type": "thinking",
                    "content": "Processing your query..."
                })
                
                try:
                    # Process query with LangGraph agent
                    # This will stream events including XML requests
                    async for event in chat_service.process_tally_query_websocket(query, user_id, websocket):
                        # Events are sent directly through websocket in the service
                        pass
                        
                except Exception as e:
                    logger.error("tally_websocket_query_error",
                               user_id=user_id,
                               error=str(e))
                    await websocket.send_json({
                        "type": "error",
                        "content": f"Error processing query: {str(e)}"
                    })
            
            elif message_type == "tally_result":
                # Tally execution result received from Electron
                # This is handled within the process_tally_query_websocket flow
                logger.info("tally_websocket_result_received",
                           user_id=user_id,
                           success=data.get("success", False))
            
            elif message_type == "ping":
                # Ping/keepalive message from client
                logger.debug("tally_websocket_ping_received", user_id=user_id)
                # Send pong back
                await websocket.send_json({
                    "type": "pong",
                    "message": "Server ready"
                })
            
            else:
                logger.warning("tally_websocket_unknown_message_type",
                             user_id=user_id,
                             message_type=message_type)
    
    except WebSocketDisconnect:
        logger.info("tally_websocket_disconnected", user_id=user_id)
    except Exception as e:
        logger.error("tally_websocket_error",
                    user_id=user_id,
                    error=str(e))
        try:
            await websocket.close()
        except:
            pass
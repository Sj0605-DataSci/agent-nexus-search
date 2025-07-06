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
    Stream chat response as Server-Sent Events (SSE) using LangGraph's streaming capabilities
    """
    # Initialize chat service
    chat_service = ChatService(client=await get_async_supabase_client())
    
    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            # Send initial thinking state
            thinking_update = StreamingChatUpdate(
                type="thinking",
                content={"message": "Thinking..."}
            )
            yield f"event: update\ndata: {thinking_update.model_dump_json()}\n\n"
            
            # Use the new stream_chat method that leverages LangGraph streaming
            async for update in chat_service.stream_chat(
                request.user_id, 
                request.agent_id, 
                request.messages,
                request.format,
                request.search_mode,
                request.world_connections
            ):
                # Convert the update to a StreamingChatUpdate
                if update["type"] == "token":
                    # For token updates, we'll send them as "thinking" updates
                    # to show the LLM is generating text
                    token_update = StreamingChatUpdate(
                        type="token",
                        content={
                            "text": update["content"],
                            "node": update["node"]
                        }
                    )
                    yield f"event: update\ndata: {token_update.model_dump_json()}\n\n"
                    
                elif update["type"] == "search_query":
                    # For search query updates
                    query_update = StreamingChatUpdate(
                        type="search_query",
                        content=update["content"]
                    )
                    yield f"event: update\ndata: {query_update.model_dump_json()}\n\n"
                    
                elif update["type"] == "source":
                    # For source updates
                    source_update = StreamingChatUpdate(
                        type="source",
                        content=update["content"]
                    )
                    yield f"event: update\ndata: {source_update.model_dump_json()}\n\n"
                    
                elif update["type"] == "message":
                    # For final message updates
                    message_update = StreamingChatUpdate(
                        type="message",
                        content=update["content"]
                    )
                    yield f"event: update\ndata: {message_update.model_dump_json()}\n\n"
                    
                elif update["type"] == "done":
                    # For completion signal
                    done_update = StreamingChatUpdate(
                        type="done",
                        content=update["content"]
                    )
                    yield f"event: update\ndata: {done_update.model_dump_json()}\n\n"
                    
                elif update["type"] == "error":
                    # For error messages
                    error_update = StreamingChatUpdate(
                        type="error",
                        content=update["content"]
                    )
                    yield f"event: update\ndata: {error_update.model_dump_json()}\n\n"
                    
        except Exception as e:
            # Log the error
            logger.error(f"Error in stream_chat endpoint: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Send error message
            error_update = StreamingChatUpdate(
                type="error",
                content={"message": f"Error: {str(e)}"}
            )
            yield f"event: update\ndata: {error_update.model_dump_json()}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )

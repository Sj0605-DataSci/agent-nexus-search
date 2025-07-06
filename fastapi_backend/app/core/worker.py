"""
Worker module for handling background tasks using Redis queues
"""
import asyncio
import json
import logging
import uuid
import traceback
from typing import Dict, Any, List, Union, Optional
import redis.asyncio as redis

from app.db.redis_client import redis_client
from app.core.services.chat_service import ChatService
from app.db.clients import get_async_supabase_client
from app.models.chat import StreamingChatUpdate

# Configure logging
logger = logging.getLogger(__name__)

# Queue names
CHAT_QUEUE = "chat:queue"
CHAT_PROCESSING = "chat:processing"

# Pub/Sub channel prefix
CHAT_CHANNEL_PREFIX = "chat:stream:"

# TTL for stream channels (in seconds)
STREAM_CHANNEL_TTL = 3600  # 1 hour

class ChatWorker:
    """Worker for processing chat requests in the background"""
    
    def __init__(self):
        self.running = False
        self.worker_id = str(uuid.uuid4())
        self.current_task = None
    
    async def start(self):
        """Start the worker process"""
        self.running = True
        logger.info(f"Starting chat worker {self.worker_id}")
        
        try:
            while self.running:
                try:
                    # Try to get a task from the queue
                    task = await self._get_next_task()
                    
                    if task:
                        # Process the task
                        self.current_task = task
                        await self._process_chat_task(task)
                        self.current_task = None
                    else:
                        # No tasks, wait a bit
                        await asyncio.sleep(0.1)
                        
                except Exception as e:
                    logger.error(f"Error in worker loop: {str(e)}")
                    logger.error(traceback.format_exc())
                    await asyncio.sleep(1)  # Wait a bit before retrying
                    
        except asyncio.CancelledError:
            logger.info(f"Worker {self.worker_id} received cancellation signal")
            self.running = False
            
        logger.info(f"Worker {self.worker_id} stopped")
    
    async def stop(self):
        """Stop the worker process"""
        self.running = False
        logger.info(f"Stopping worker {self.worker_id}")
        
        # If we're processing a task, try to return it to the queue
        if self.current_task:
            try:
                client = await redis_client.get_client()
                # Move from processing back to queue
                await client.lrem(CHAT_PROCESSING, 0, json.dumps(self.current_task))
                await client.lpush(CHAT_QUEUE, json.dumps(self.current_task))
                logger.info(f"Returned task {self.current_task['request_id']} to queue")
            except Exception as e:
                logger.error(f"Error returning task to queue: {str(e)}")
    
    async def _get_next_task(self) -> Optional[Dict[str, Any]]:
        """Get the next task from the queue"""
        try:
            client = await redis_client.get_client()
            
            # Atomic operation: move item from queue to processing list
            raw_task = await client.rpoplpush(CHAT_QUEUE, CHAT_PROCESSING)
            
            if not raw_task:
                return None
                
            # Parse the task
            task = json.loads(raw_task)
            logger.info(f"Got task {task.get('request_id')} from queue")
            return task
            
        except Exception as e:
            logger.error(f"Error getting next task: {str(e)}")
            return None
    
    async def _process_chat_task(self, task: Dict[str, Any]):
        """Process a chat task"""
        request_id = task.get("request_id")
        channel = f"{CHAT_CHANNEL_PREFIX}{request_id}"
        
        try:
            # Initialize chat service
            chat_service = ChatService(client=await get_async_supabase_client())
            client = await redis_client.get_client()
            
            # Extract request parameters
            user_id = task.get("user_id")
            agent_id = task.get("agent_id")
            messages = task.get("messages")
            format = task.get("format", "table")
            search_mode = task.get("search_mode", "basic")
            world_connections = task.get("world_connections", "world")
            
            # Send initial thinking state
            thinking_update = StreamingChatUpdate(
                type="thinking",
                content={"message": "Thinking..."}
            )
            await client.publish(channel, thinking_update.model_dump_json())
            
            # Process the chat request and stream results
            async for update in chat_service.stream_chat(
                user_id, 
                agent_id, 
                messages,
                format,
                search_mode,
                world_connections
            ):
                # Convert the update to a StreamingChatUpdate
                if update["type"] == "token":
                    # For token updates
                    token_update = StreamingChatUpdate(
                        type="token",
                        content={
                            "text": update["content"],
                            "node": update["node"]
                        }
                    )
                    await client.publish(channel, token_update.model_dump_json())
                    
                elif update["type"] == "search_query":
                    # For search query updates
                    query_update = StreamingChatUpdate(
                        type="search_query",
                        content=update["content"]
                    )
                    await client.publish(channel, query_update.model_dump_json())
                    
                elif update["type"] == "source":
                    # For source updates
                    source_update = StreamingChatUpdate(
                        type="source",
                        content=update["content"]
                    )
                    await client.publish(channel, source_update.model_dump_json())
                    
                elif update["type"] == "message":
                    # For final message updates
                    message_update = StreamingChatUpdate(
                        type="message",
                        content=update["content"]
                    )
                    await client.publish(channel, message_update.model_dump_json())
                    
                elif update["type"] == "done":
                    # For completion signal
                    done_update = StreamingChatUpdate(
                        type="done",
                        content=update["content"]
                    )
                    await client.publish(channel, done_update.model_dump_json())
                    
                elif update["type"] == "error":
                    # For error messages
                    error_update = StreamingChatUpdate(
                        type="error",
                        content=update["content"]
                    )
                    await client.publish(channel, error_update.model_dump_json())
            
            # Task completed successfully
            logger.info(f"Task {request_id} completed successfully")
            
        except Exception as e:
            # Log the error
            logger.error(f"Error processing task {request_id}: {str(e)}")
            logger.error(traceback.format_exc())
            
            try:
                # Send error message to the channel
                client = await redis_client.get_client()
                error_update = StreamingChatUpdate(
                    type="error",
                    content={"message": f"Error: {str(e)}"}
                )
                await client.publish(channel, error_update.model_dump_json())
            except Exception as pub_error:
                logger.error(f"Error publishing error message: {str(pub_error)}")
        
        finally:
            # Remove the task from processing list
            try:
                client = await redis_client.get_client()
                await client.lrem(CHAT_PROCESSING, 0, json.dumps(task))
                logger.info(f"Removed task {request_id} from processing list")
            except Exception as e:
                logger.error(f"Error removing task from processing: {str(e)}")


# Helper functions for enqueueing tasks
async def enqueue_chat_task(
    user_id: str, 
    agent_id: str, 
    messages: Union[str, List[Dict[str, Any]]],
    format: str = "table",
    search_mode: str = "basic",
    world_connections: str = "world"
) -> str:
    """
    Add a chat task to the queue
    
    Returns:
        str: Request ID for tracking the task
    """
    try:
        # Generate a unique request ID
        request_id = str(uuid.uuid4())
        
        # Create the task
        task = {
            "request_id": request_id,
            "user_id": user_id,
            "agent_id": agent_id,
            "messages": messages,
            "format": format,
            "search_mode": search_mode,
            "world_connections": world_connections,
            "timestamp": str(asyncio.get_event_loop().time())
        }
        
        # Add to queue
        client = await redis_client.get_client()
        await client.lpush(CHAT_QUEUE, json.dumps(task))
        
        # Create a pub/sub channel for this request with TTL
        channel = f"{CHAT_CHANNEL_PREFIX}{request_id}"
        await client.set(f"channel:{channel}", "active", ex=STREAM_CHANNEL_TTL)
        
        logger.info(f"Enqueued chat task with request_id {request_id}")
        return request_id
        
    except Exception as e:
        logger.error(f"Error enqueueing chat task: {str(e)}")
        logger.error(traceback.format_exc())
        raise

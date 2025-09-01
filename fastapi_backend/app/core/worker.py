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

# Configure structured logging
from app.core.structured_logger import get_structured_logger
logger = get_structured_logger(__name__)

# Queue names
CHAT_QUEUE = "chat:queue"
CHAT_PROCESSING = "chat:processing"

# Pub/Sub channel prefix
CHAT_CHANNEL_PREFIX = "chat:stream:"

# TTL for stream channels (in seconds)
STREAM_CHANNEL_TTL = 3600  # 1 hour

class ChatWorker:
    """Worker for processing chat requests from Redis queue"""
    
    def __init__(self):
        """Initialize the worker"""
        self.worker_id = str(uuid.uuid4())
        self.running = False
        self.current_task = None
        self.request_restart = False  # Flag to request restart due to memory issues
    
    async def start(self):
        """Start the worker process"""
        self.running = True
        logger.log_worker_event(self.worker_id, "worker_started")
        
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
        from app.core.memory import get_memory_usage, force_garbage_collection, memory_intensive
        
        request_id = task.get("request_id")
        channel = f"{CHAT_CHANNEL_PREFIX}{request_id}"
        
        # Check memory before processing
        start_memory = get_memory_usage()
        logger.debug(f"Starting task {request_id} with memory: RSS={start_memory['rss']:.2f}MB")
        
        # Reset restart flag
        self.request_restart = False
        
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
            thread_id = task.get("thread_id", "")
            
            # Process the chat request and stream results
            async for update in chat_service.stream_chat(
                user_id, 
                agent_id, 
                messages,
                format,
                search_mode,
                world_connections,
                thread_id
            ):
                # Convert the update to a StreamingChatUpdate
                if update["type"] == "thinking":
                    # For thinking updates
                    thinking_update = StreamingChatUpdate(
                        type="thinking",
                        content=update["content"]
                    )
                    await client.publish(channel, thinking_update.model_dump_json())
                    
                elif update["type"] == "thread_id":
                    # For thread_id updates
                    thread_id_update = StreamingChatUpdate(
                        type="thread_id",
                        content=update["content"]
                    )
                    await client.publish(channel, thread_id_update.model_dump_json())
                    
                elif update["type"] == "token":
                    # For token updates
                    token_update = StreamingChatUpdate(
                        type="token",
                        content={
                            "text": update["content"],
                            "node": update["node"]
                        }
                    )
                    await client.publish(channel, token_update.model_dump_json())
                    
                elif update["type"] == "query_analysis":
                    # For query analysis updates from graph_2
                    analysis_update = StreamingChatUpdate(
                        type="query_analysis",
                        content=update["content"]
                    )
                    await client.publish(channel, analysis_update.model_dump_json())
                    
                elif update["type"] == "vector_search_results":
                    # For vector search results from graph_2
                    vector_update = StreamingChatUpdate(
                        type="vector_search_results",
                        content=update["content"]
                    )
                    await client.publish(channel, vector_update.model_dump_json())
                    
                elif update["type"] == "sql_query":
                    # For individual SQL query updates from graph_2
                    sql_query_update = StreamingChatUpdate(
                        type="sql_query",
                        content=update["content"]
                    )
                    await client.publish(channel, sql_query_update.model_dump_json())
                    
                elif update["type"] == "sql_search_results":
                    # For SQL search results from graph_2
                    sql_results_update = StreamingChatUpdate(
                        type="sql_search_results",
                        content=update["content"]
                    )
                    await client.publish(channel, sql_results_update.model_dump_json())
                    
                elif update["type"] == "fusion_ranking":
                    # For fusion ranking results from graph_2
                    fusion_update = StreamingChatUpdate(
                        type="fusion_ranking",
                        content=update["content"]
                    )
                    await client.publish(channel, fusion_update.model_dump_json())
                    
                elif update["type"] == "finalize_answer":
                    # For final answer from graph_2
                    finalize_update = StreamingChatUpdate(
                        type="finalize_answer",
                        content=update["content"]
                    )
                    await client.publish(channel, finalize_update.model_dump_json())
                
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
                    
                    # Generate and email PDF after streaming is complete
                    # Use the data from the 'done' message to avoid race conditions
                    try:
                        content = update.get("content", {})
                        if isinstance(content, dict) and "message_id" in content and "query" in content:
                            # Generate and email PDF in the background (don't await to avoid blocking)
                            asyncio.create_task(
                                chat_service.generate_and_email_pdf_results(
                                    user_id=content["user_id"],
                                    agent_id=content["agent_id"],
                                    chat_thread_id=content["chat_thread_id"],
                                    message_id=content["message_id"],
                                    query=content["query"]
                                )
                            )
                            
                            logger.info(f"PDF email task queued for thread {content['chat_thread_id']}")
                        else:
                            logger.warning("Done message missing required data for PDF email")
                            
                    except Exception as pdf_error:
                        logger.error(f"Error queuing PDF email task: {str(pdf_error)}")
                        # Don't fail the main task if PDF email fails
                    
                elif update["type"] == "credit_info":
                    # For credit information updates
                    credit_update = StreamingChatUpdate(
                        type="credit_info",
                        content=update["content"]
                    )
                    await client.publish(channel, credit_update.model_dump_json())
                    
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
                
            # Aggressive memory cleanup
            try:
                # Clear local variables that might hold large objects
                if 'chat_service' in locals():
                    del chat_service
                if 'client' in locals():
                    del client
                    
                # Force cache cleanup if memory usage is high
                current_memory = get_memory_usage()
                if current_memory['rss'] > 600:  # If over 600MB, clean caches
                    from app.core.utils.cache import clear_all_caches
                    cleared_count = clear_all_caches()
                    logger.info(f"Cleared {cleared_count} cache entries due to high memory usage")
                    
            except Exception as cleanup_error:
                logger.error(f"Error during memory cleanup: {str(cleanup_error)}")
                
            # Force garbage collection after task processing
            force_garbage_collection()
            
            # Check memory after processing
            end_memory = get_memory_usage()
            logger.debug(f"Finished task {request_id} with memory: RSS={end_memory['rss']:.2f}MB (change: {end_memory['rss'] - start_memory['rss']:.2f}MB)")
            
            # Request restart if memory usage is too high
            if end_memory['rss'] > 3*1024:  # 3GB threshold (for 8GB Railway instance)
                logger.warning(f"Worker memory usage too high: {end_memory['rss']:.2f}MB, requesting restart")
                self.request_restart = True


# Helper functions for enqueueing tasks
async def enqueue_chat_task(
    user_id: str, 
    agent_id: str, 
    messages: Union[str, List[Dict[str, Any]]],
    format: str = "table",
    search_mode: str = "basic",
    world_connections: str = "world",
    thread_id: str = ""
) -> Optional[str]:
    """
    Add a chat task to the queue
    
    Returns:
        str: Request ID for tracking the task, or None if queue is full
    """
    try:
        client = await redis_client.get_client()
        
        # Check queue size before adding
        queue_size = await client.llen(CHAT_QUEUE)
        processing_size = await client.llen(CHAT_PROCESSING)
        total_tasks = queue_size + processing_size
        
        # Set a reasonable limit for Railway free tier
        if total_tasks > 100:  # Limit total tasks in system
            logger.warning(f"Chat queue too large (queue: {queue_size}, processing: {processing_size}), rejecting request")
            return None
        
        # Generate a unique request ID
        request_id = str(uuid.uuid4())
        
        # Create the task with TTL
        import time
        current_time = time.time()
        
        task = {
            "request_id": request_id,
            "user_id": user_id,
            "agent_id": agent_id,
            "messages": messages,
            "format": format,
            "search_mode": search_mode,
            "world_connections": world_connections,
            "thread_id": thread_id,
            "created_at": current_time,
            "ttl": 600,  # 10 minute TTL
            "timestamp": str(asyncio.get_event_loop().time())
        }
        
        # Add to queue
        await client.lpush(CHAT_QUEUE, json.dumps(task))
        
        # Create a pub/sub channel for this request with TTL
        channel = f"{CHAT_CHANNEL_PREFIX}{request_id}"
        await client.set(f"channel:{channel}", "active", ex=STREAM_CHANNEL_TTL)
        
        logger.info(f"Enqueued chat task with request_id {request_id} (queue size: {queue_size+1})")
        return request_id
        
    except Exception as e:
        logger.error(f"Error enqueueing chat task: {str(e)}")
        logger.error(traceback.format_exc())
        raise

"""
Service for handling Redis-based streaming operations
"""
import asyncio
import json
import logging
import time
from typing import AsyncGenerator, Dict, Any
import redis.asyncio as redis

from app.db.redis_client import redis_client
from app.core.worker import CHAT_CHANNEL_PREFIX
from app.core.structured_logger import get_structured_logger

# Configure logging
logger = get_structured_logger(__name__)

class StreamService:
    """Service for handling streaming operations using Redis Pub/Sub"""
    
    @staticmethod
    async def subscribe_to_chat_stream(request_id: str) -> AsyncGenerator[str, None]:
        """
        Subscribe to a chat stream channel and yield messages as they arrive
        
        Args:
            request_id: The unique request ID for the chat stream
            
        Yields:
            str: SSE formatted messages from the stream
        """
        channel_name = f"{CHAT_CHANNEL_PREFIX}{request_id}"
        pubsub = None
        
        start_time = time.time()
        client = await redis_client.get_client()
        logger.debug("Redis client acquisition time", 
                    time_ms=round((time.time() - start_time) * 1000, 2),
                    request_id=request_id)
        
        try:
            # Check if channel exists with timeout handling
            try:
                exists = await asyncio.wait_for(client.exists(f"channel:{channel_name}"), timeout=2.0)
                if not exists:
                    logger.warning("Channel does not exist",
                                  channel_name=channel_name,
                                  request_id=request_id)
                    yield f"event: error\ndata: {json.dumps({'type': 'error', 'content': {'message': 'Stream not found or expired'}})}\n\n"
                    return
            except asyncio.TimeoutError:
                logger.error("Timeout checking if channel exists",
                           channel_name=channel_name,
                           request_id=request_id,
                           timeout_seconds=2.0)
                yield f"event: error\ndata: {json.dumps({'type': 'error', 'content': {'message': 'Redis connection timeout - please try again later'}})}\n\n"
                return
            except Exception as e:
                if "circuit breaker open" in str(e).lower():
                    logger.error("Redis circuit breaker open when checking channel",
                               channel_name=channel_name,
                               request_id=request_id,
                               error_message=str(e))
                    yield f"event: error\ndata: {json.dumps({'type': 'error', 'content': {'message': 'Redis service temporarily unavailable - please try again in 30 seconds'}})}\n\n"
                    return
                else:
                    logger.error("Error checking if channel exists",
                               channel_name=channel_name,
                               request_id=request_id,
                               error_message=str(e))
                    yield f"event: error\ndata: {json.dumps({'type': 'error', 'content': {'message': f'Error connecting to stream: {str(e)}'}})}\n\n"
                    return
                
            # Create a pubsub instance
            pubsub = client.pubsub()
            
            # Subscribe to the channel
            await pubsub.subscribe(channel_name)
            logger.info("Subscribed to channel",
                       channel_name=channel_name,
                       request_id=request_id)
            
            # Send initial connection message
            yield f"event: update\ndata: {json.dumps({'type': 'connected', 'content': {'message': 'Connected to stream'}})}\n\n"
            
            # Listen for messages
            message_count = 0
            async for message in pubsub.listen():
                if message["type"] == "message":
                    message_count += 1
                    message_start = time.time()
                    data = message["data"]
                    if isinstance(data, bytes):
                        data = data.decode("utf-8")
                        
                    # Format as SSE and yield
                    yield f"event: update\ndata: {data}\n\n"
                    
                    # Check if this is a done message
                    try:
                        parsed = json.loads(data)
                        if parsed.get("type") == "done" or parsed.get("type") == "error":
                            logger.debug("Message processing time", 
                                        time_ms=round((time.time() - message_start) * 1000, 2),
                                        message_type=parsed.get("type"),
                                        message_count=message_count,
                                        request_id=request_id)
                            logger.info("Stream completed",
                                       request_id=request_id,
                                       channel_name=channel_name,
                                       completion_type=parsed.get("type"))
                            break
                    except:
                        pass
                        
        except asyncio.CancelledError:
            logger.info("Stream subscription cancelled",
                       request_id=request_id,
                       channel_name=channel_name)
            raise
            
        except Exception as e:
            logger.exception("Error in stream subscription",
                           request_id=request_id,
                           channel_name=channel_name,
                           exception_type=type(e).__name__,
                           error_message=str(e))
            yield f"event: error\ndata: {json.dumps({'type': 'error', 'content': {'message': f'Stream error: {str(e)}'}})}\n\n"
            
        finally:
            # Unsubscribe and clean up
            try:
                if pubsub:
                    await pubsub.unsubscribe(channel_name)
                    logger.info("Unsubscribed from channel",
                               channel_name=channel_name,
                               request_id=request_id)
            except Exception as e:
                logger.exception("Error unsubscribing from channel",
                               channel_name=channel_name,
                               request_id=request_id,
                               exception_type=type(e).__name__,
                               error_message=str(e))
                
            # Clean up channel metadata with TTL
            try:
                # Set a shorter TTL for completed channels
                await client.expire(f"channel:{channel_name}", 300)  # 5 minute TTL after completion
                logger.debug("Set cleanup TTL for channel",
                           channel_name=channel_name,
                           request_id=request_id,
                           ttl_seconds=300)
            except Exception as e:
                logger.exception("Error setting cleanup TTL for channel",
                               channel_name=channel_name,
                               request_id=request_id,
                               exception_type=type(e).__name__,
                               error_message=str(e))

# Create singleton instance
stream_service = StreamService()

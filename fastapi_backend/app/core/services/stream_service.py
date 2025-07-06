"""
Service for handling Redis-based streaming operations
"""
import asyncio
import json
import logging
from typing import AsyncGenerator, Dict, Any
import redis.asyncio as redis

from app.db.redis_client import redis_client
from app.core.worker import CHAT_CHANNEL_PREFIX

# Configure logging
logger = logging.getLogger(__name__)

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
        client = await redis_client.get_client()
        
        try:
            # Check if channel exists
            exists = await client.exists(f"channel:{channel_name}")
            if not exists:
                logger.warning(f"Channel {channel_name} does not exist")
                yield f"event: error\ndata: {json.dumps({'type': 'error', 'content': {'message': 'Stream not found or expired'}})}\n\n"
                return
                
            # Create a pubsub instance
            pubsub = client.pubsub()
            
            # Subscribe to the channel
            await pubsub.subscribe(channel_name)
            logger.info(f"Subscribed to channel {channel_name}")
            
            # Send initial connection message
            yield f"event: update\ndata: {json.dumps({'type': 'connected', 'content': {'message': 'Connected to stream'}})}\n\n"
            
            # Listen for messages
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = message["data"]
                    if isinstance(data, bytes):
                        data = data.decode("utf-8")
                        
                    # Format as SSE and yield
                    yield f"event: update\ndata: {data}\n\n"
                    
                    # Check if this is a done message
                    try:
                        parsed = json.loads(data)
                        if parsed.get("type") == "done" or parsed.get("type") == "error":
                            logger.info(f"Stream {request_id} completed")
                            break
                    except:
                        pass
                        
        except asyncio.CancelledError:
            logger.info(f"Stream {request_id} subscription cancelled")
            raise
            
        except Exception as e:
            logger.error(f"Error in stream subscription {request_id}: {str(e)}")
            yield f"event: error\ndata: {json.dumps({'type': 'error', 'content': {'message': f'Stream error: {str(e)}'}})}\n\n"
            
        finally:
            # Unsubscribe and clean up
            try:
                await pubsub.unsubscribe(channel_name)
                logger.info(f"Unsubscribed from channel {channel_name}")
            except Exception as e:
                logger.error(f"Error unsubscribing from channel {channel_name}: {str(e)}")

# Create singleton instance
stream_service = StreamService()

"""
WebSocket endpoint for real-time enrichment status updates
"""
import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
from app.db.redis_client import redis_client
from app.core.structured_logger import get_structured_logger

router = APIRouter()
logger = get_structured_logger(__name__)

# Store active WebSocket connections
active_connections: Dict[str, Set[WebSocket]] = {}

@router.websocket("/enrichment-status/{task_id}")
async def enrichment_status_websocket(websocket: WebSocket, task_id: str):
    """WebSocket endpoint for real-time enrichment status updates"""
    await websocket.accept()
    
    # Add connection to active connections
    if task_id not in active_connections:
        active_connections[task_id] = set()
    active_connections[task_id].add(websocket)
    
    try:
        # Subscribe to Redis channel for this task
        client = await redis_client.get_client()
        pubsub = client.pubsub()
        channel = f"enrichment_status:{task_id}"
        await pubsub.subscribe(channel)
        
        logger.info(f"WebSocket connected for enrichment task {task_id}")
        
        # Listen for messages
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    # Forward Redis message to WebSocket
                    await websocket.send_text(message["data"].decode())
                except Exception as e:
                    logger.error(f"Error sending WebSocket message: {str(e)}")
                    break
                    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for enrichment task {task_id}")
    except Exception as e:
        logger.error(f"WebSocket error for task {task_id}: {str(e)}")
    finally:
        # Clean up connection
        if task_id in active_connections:
            active_connections[task_id].discard(websocket)
            if not active_connections[task_id]:
                del active_connections[task_id]
        
        try:
            await pubsub.unsubscribe(channel)
            await pubsub.close()
        except Exception as e:
            logger.error(f"Error cleaning up Redis subscription: {str(e)}")

@router.websocket("/user-updates/{user_id}")
async def user_updates_websocket(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for all user-related status updates"""
    await websocket.accept()
    
    try:
        # Subscribe to Redis channel for this user
        client = await redis_client.get_client()
        pubsub = client.pubsub()
        channel = f"user_updates:{user_id}"
        await pubsub.subscribe(channel)
        
        logger.info(f"WebSocket connected for user updates {user_id}")
        
        # Listen for messages
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    # Forward Redis message to WebSocket
                    await websocket.send_text(message["data"].decode())
                except Exception as e:
                    logger.error(f"Error sending WebSocket message: {str(e)}")
                    break
                    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user updates {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {str(e)}")
    finally:
        try:
            await pubsub.unsubscribe(channel)
            await pubsub.close()
        except Exception as e:
            logger.error(f"Error cleaning up Redis subscription: {str(e)}")

async def broadcast_to_task_connections(task_id: str, message: dict):
    """Broadcast message to all WebSocket connections for a specific task"""
    if task_id not in active_connections:
        return
    
    message_text = json.dumps(message)
    disconnected = set()
    
    for websocket in active_connections[task_id]:
        try:
            await websocket.send_text(message_text)
        except Exception:
            disconnected.add(websocket)
    
    # Remove disconnected connections
    for websocket in disconnected:
        active_connections[task_id].discard(websocket)

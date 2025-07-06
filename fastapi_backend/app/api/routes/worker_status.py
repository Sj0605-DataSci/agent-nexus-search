"""
Worker status monitoring endpoints
"""
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
import logging
from app.core.worker_manager import worker_manager
from app.db.redis_client import redis_client
from app.core.worker import CHAT_QUEUE, CHAT_PROCESSING

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/worker", tags=["worker"])

@router.get("/status")
async def get_worker_status():
    """
    Get status information about the worker system
    """
    try:
        # Get worker manager status
        worker_status = worker_manager.get_status()
        
        # Get Redis queue information
        client = await redis_client.get_client()
        queue_length = await client.llen(CHAT_QUEUE)
        processing_length = await client.llen(CHAT_PROCESSING)
        
        # Check Redis health
        redis_health = await redis_client.health_check()
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "healthy" if redis_health and worker_status["initialized"] else "unhealthy",
                "workers": {
                    "count": worker_status["worker_count"],
                    "initialized": worker_status["initialized"],
                    "details": worker_status["workers"]
                },
                "queue": {
                    "pending": queue_length,
                    "processing": processing_length
                },
                "redis": {
                    "connected": redis_health
                }
            }
        )
    except Exception as e:
        logger.error(f"Error getting worker status: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "error",
                "message": f"Error getting worker status: {str(e)}"
            }
        )

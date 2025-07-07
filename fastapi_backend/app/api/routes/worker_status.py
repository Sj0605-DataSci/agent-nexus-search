"""
Worker status monitoring endpoints
"""
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
import logging
import psutil
import os
import time
import asyncio
from app.core.worker_manager import worker_manager
from app.db.redis_client import redis_client
from app.core.worker import CHAT_QUEUE, CHAT_PROCESSING
from app.core.memory import get_memory_usage

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/worker", tags=["worker"])

@router.get("/redis/health")
async def check_redis_health():
    """
    Check Redis connection health
    """
    try:
        client = await redis_client.get_client()
        # Try a simple ping with timeout
        ping_success = False
        ping_latency = 0
        error_message = None
        
        try:
            import time
            start_time = time.time()
            await asyncio.wait_for(client.ping(), timeout=2.0)
            ping_latency = round((time.time() - start_time) * 1000, 2)  # ms
            ping_success = True
        except asyncio.TimeoutError:
            error_message = "Redis ping timeout"
        except Exception as e:
            error_message = str(e)
        
        # Get some basic Redis info if ping succeeded
        info = None
        if ping_success:
            try:
                info = await asyncio.wait_for(client.info(), timeout=2.0)
            except:
                pass
        
        return JSONResponse(
            status_code=status.HTTP_200_OK if ping_success else status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "connected" if ping_success else "disconnected",
                "ping_success": ping_success,
                "ping_latency_ms": ping_latency if ping_success else None,
                "error": error_message,
                "info": {
                    "used_memory": info.get("used_memory_human") if info else None,
                    "clients_connected": info.get("connected_clients") if info else None,
                    "uptime": info.get("uptime_in_seconds") if info else None
                } if info else None
            }
        )
    except Exception as e:
        logger.error(f"Redis health check failed: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "status": "error",
                "message": f"Redis health check error: {str(e)}"
            }
        )

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
        
        # Get system resource information
        memory = get_memory_usage()
        cpu_count = os.cpu_count() or 1
        cpu_percent = psutil.cpu_percent(interval=0.1)
        
        # Get queue details if available
        queue_details = []
        if queue_length > 0:
            # Get the first 5 items in the queue for inspection
            queue_items = await client.lrange(CHAT_QUEUE, 0, 4)
            for item in queue_items:
                try:
                    task = client.json().loads(item)
                    queue_details.append({
                        "request_id": task.get("request_id"),
                        "created_at": task.get("created_at"),
                        "wait_time": time.time() - task.get("created_at", time.time()) if task.get("created_at") else 0
                    })
                except:
                    queue_details.append({"raw": str(item)[:50] + "..." if len(str(item)) > 50 else str(item)})
        
        # Get worker manager monitoring status
        manager_monitoring = hasattr(worker_manager, '_monitor_task') and worker_manager._monitor_task is not None
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "healthy" if redis_health and worker_status["initialized"] else "unhealthy",
                "manager": {
                    "initialized": worker_status["initialized"],
                    "monitoring_active": manager_monitoring,
                    "target_worker_count": getattr(worker_manager, 'num_workers', 1),
                    "uptime": time.time() - getattr(worker_manager, 'start_time', time.time()) if hasattr(worker_manager, 'start_time') else 0
                },
                "workers": {
                    "count": worker_status["worker_count"],
                    "details": worker_status["workers"]
                },
                "queue": {
                    "pending": queue_length,
                    "processing": processing_length,
                    "sample": queue_details if queue_details else None
                },
                "redis": {
                    "connected": redis_health,
                    "client_info": await client.info() if redis_health else None
                },
                "system": {
                    "memory_mb": {
                        "rss": round(memory["rss"], 2),
                        "vms": round(memory["vms"], 2)
                    },
                    "cpu": {
                        "count": cpu_count,
                        "percent": cpu_percent
                    }
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

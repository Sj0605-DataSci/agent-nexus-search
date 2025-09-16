"""
API endpoints for automatic LinkedIn profile enrichment after connection import
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
import logging
import uuid
from datetime import datetime
import json
import traceback

from app.core.auth import get_current_user
from app.core.structured_logger import get_structured_logger
from app.core.profiling import profile_async
from app.db.clients import get_async_supabase_client
from app.db.redis_client import redis_client
from app.core.services.simplified_enrichment_service import SimplifiedEnrichmentService

# Queue names for auto enrichment
AUTO_ENRICHMENT_QUEUE = "auto_enrichment:queue"
AUTO_ENRICHMENT_PROCESSING = "auto_enrichment:processing"

router = APIRouter(prefix="/auto-enrichment", tags=["auto-enrichment"])
logger = get_structured_logger(__name__)

class AutoEnrichmentRequest(BaseModel):
    user_id: str
    connection_ids: Optional[List[str]] = None  # If None, will enrich all connections without enrichment
    force_refresh: bool = False  # If True, will re-enrich already enriched profiles

class SimpleEnrichmentRequest(BaseModel):
    force_refresh: bool = False  # If True, will re-enrich already enriched profiles
    direct: bool = False  # If True, will use direct enrichment instead of queueing

class AutoEnrichmentResponse(BaseModel):
    status: str
    message: str
    task_id: str
    profiles_count: int
    estimated_time_minutes: int

@router.post("/trigger", response_model=AutoEnrichmentResponse)
@profile_async("routes.auto_enrichment.trigger_auto_enrichment")
async def trigger_auto_enrichment(
    request: AutoEnrichmentRequest,
    current_user = Depends(get_current_user)
):
    """
    Trigger automatic LinkedIn profile enrichment for user connections
    
    This endpoint can be called manually or automatically after connection import
    """
    try:
        # Verify user access
        current_user_id = current_user.id if hasattr(current_user, 'id') else current_user.get('id')
        if current_user_id != request.user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get Supabase client
        supabase = await get_async_supabase_client()
        
        # Determine which connections to enrich
        if request.connection_ids:
            # Specific connections requested
            query = supabase.table("connections").select("id, linkedin_url").eq("user_id", request.user_id).in_("id", request.connection_ids)
        else:
            # All unenriched connections
            query = supabase.table("connections").select("id, linkedin_url").eq("user_id", request.user_id)
            if not request.force_refresh:
                query = query.is_("enriched_at", None)
        
        # Execute query
        response = await query.execute()
        
        if not response.data:
            return AutoEnrichmentResponse(
                status="success",
                message="No profiles to enrich",
                task_id="",
                profiles_count=0,
                estimated_time_minutes=0
            )
        
        # Filter connections with LinkedIn URLs
        connections_to_enrich = []
        for conn in response.data:
            linkedin_url = conn.get("linkedin_url", "")
            if linkedin_url and "linkedin.com/in/" in linkedin_url:
                connections_to_enrich.append({
                    "id": conn["id"],
                    "linkedin_url": linkedin_url
                })
        
        if not connections_to_enrich:
            return AutoEnrichmentResponse(
                status="success",
                message="No valid LinkedIn URLs found in connections",
                task_id="",
                profiles_count=0,
                estimated_time_minutes=0
            )
        
        # Enqueue auto enrichment task
        task_id = await enqueue_auto_enrichment_task(request.user_id, connections_to_enrich)
        
        if not task_id:
            raise HTTPException(
                status_code=503, 
                detail="Enrichment queue is full. Please try again later."
            )
        
        logger.info(f"Enqueued auto enrichment task {task_id} for user {request.user_id} with {len(connections_to_enrich)} connections")
        
        # Estimate processing time (1-2 minutes per profile)
        estimated_time = len(connections_to_enrich) * 1.5
        
        return AutoEnrichmentResponse(
            status="success",
            message="Auto enrichment started",
            task_id=task_id,
            profiles_count=len(connections_to_enrich),
            estimated_time_minutes=int(estimated_time)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting auto enrichment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error starting auto enrichment: {str(e)}")

@router.post("/enrich-user/{user_id}")
@profile_async("routes.auto_enrichment.enrich_user_connections")
async def enrich_user_connections(
    user_id: str,
    request: SimpleEnrichmentRequest = None,
    current_user = Depends(get_current_user),
    background_tasks: BackgroundTasks = None
):
    """
    Enrich all LinkedIn connections for a user with just the user ID
    
    This is a simplified endpoint that only requires the user_id
    """
    try:
        # Default request if none provided
        if request is None:
            request = SimpleEnrichmentRequest()
            
        # Verify user access
        current_user_id = current_user.id if hasattr(current_user, 'id') else current_user.get('id')
        if current_user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # If direct enrichment is requested, use the simplified enrichment service directly
        if request.direct:
            return await direct_enrich_user_connections(user_id, request.force_refresh, background_tasks)
        
        # Otherwise, create a full request object for the queue
        full_request = AutoEnrichmentRequest(
            user_id=user_id,
            connection_ids=None,  # Enrich all connections
            force_refresh=request.force_refresh
        )
        
        # Use the existing endpoint logic
        return await trigger_auto_enrichment(full_request, current_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting user enrichment: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error starting user enrichment: {str(e)}")

@router.get("/status/{task_id}")
@profile_async("routes.auto_enrichment.get_auto_enrichment_status")
async def get_auto_enrichment_status(
    task_id: str,
    current_user = Depends(get_current_user)
):
    """Get status of an auto enrichment task"""
    try:
        # Get Redis client
        client = await redis_client.get_client()
        
        # Check if task exists in processing queue
        processing_items = await client.lrange(AUTO_ENRICHMENT_PROCESSING, 0, -1)
        for item in processing_items:
            import json
            task = json.loads(item)
            if task.get("task_id") == task_id:
                # Verify user access
                if task.get("user_id") != current_user.id:
                    raise HTTPException(status_code=403, detail="Access denied")
                
                return {
                    "status": "processing",
                    "task_id": task_id,
                    "profiles_count": len(task.get("connections", [])),
                    "created_at": task.get("created_at"),
                    "user_id": task.get("user_id")
                }
        
        # Check if task exists in queue
        queue_items = await client.lrange(AUTO_ENRICHMENT_QUEUE, 0, -1)
        queue_position = 0
        for item in queue_items:
            import json
            task = json.loads(item)
            if task.get("task_id") == task_id:
                # Verify user access
                if task.get("user_id") != current_user.id:
                    raise HTTPException(status_code=403, detail="Access denied")
                
                return {
                    "status": "queued",
                    "task_id": task_id,
                    "profiles_count": len(task.get("connections", [])),
                    "created_at": task.get("created_at"),
                    "queue_position": queue_position,
                    "estimated_wait_minutes": queue_position * 2  # Rough estimate
                }
            queue_position += 1
        
        # Task not found
        return {
            "status": "not_found",
            "task_id": task_id,
            "message": "Task not found or completed"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting auto enrichment status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting status: {str(e)}")

async def direct_enrich_user_connections(
    user_id: str,
    force_refresh: bool = False,
    background_tasks: BackgroundTasks = None
):
    """
    Directly enrich all LinkedIn connections for a user using the simplified enrichment service
    
    This bypasses the Redis queue and processes the enrichment immediately
    """
    try:
        # Get Supabase client
        supabase = await get_async_supabase_client()
        
        # Query for connections with LinkedIn URLs
        query = supabase.table("connections").select("id, linkedin_url").eq("user_id", user_id)
        if not force_refresh:
            query = query.is_("enriched_at", None)
        
        # Execute query
        response = await query.execute()
        
        if not response.data:
            return {
                "status": "success",
                "message": "No profiles to enrich",
                "profiles_count": 0
            }
        
        # Filter connections with LinkedIn URLs
        connections_to_enrich = []
        for conn in response.data:
            linkedin_url = conn.get("linkedin_url", "")
            if linkedin_url and "linkedin.com/in/" in linkedin_url:
                connections_to_enrich.append({
                    "id": conn["id"],
                    "linkedin_url": linkedin_url
                })
        
        if not connections_to_enrich:
            return {
                "status": "success",
                "message": "No valid LinkedIn URLs found in connections",
                "profiles_count": 0
            }
        
        # Get Redis client
        redis_client_instance = await redis_client.get_client()
        
        # Create a task ID
        task_id = str(uuid.uuid4())
        
        # Create task data
        task_data = {
            "user_id": user_id,
            "connections": connections_to_enrich,
            "task_id": task_id
        }
        
        # Queue the task for auto enrichment worker
        await redis_client_instance.lpush(AUTO_ENRICHMENT_QUEUE, json.dumps(task_data))
        
        logger.info(f"Queued auto enrichment task {task_id} for user {user_id} with {len(connections_to_enrich)} connections")
        
        return {
            "status": "success",
            "message": f"Queued enrichment for {len(connections_to_enrich)} connections",
            "profiles_count": len(connections_to_enrich),
            "task_id": task_id
        }
            
    except Exception as e:
        logger.error(f"Error in direct enrichment: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error in direct enrichment: {str(e)}")

async def enqueue_auto_enrichment_task(
    user_id: str,
    connections: List[Dict[str, Any]]
) -> Optional[str]:
    """
    Add an auto enrichment task to the queue
    
    Args:
        user_id: User ID
        connections: List of connections with id and linkedin_url
        
    Returns:
        str: Task ID for tracking the task, or None if queue is full
    """
    try:
        client = await redis_client.get_client()
        
        # Check queue size before adding
        queue_size = await client.llen(AUTO_ENRICHMENT_QUEUE)
        processing_size = await client.llen(AUTO_ENRICHMENT_PROCESSING)
        total_tasks = queue_size + processing_size
        
        # Set a reasonable limit
        if total_tasks > 50:  # Limit total enrichment tasks
            logger.warning(f"Auto enrichment queue too large (queue: {queue_size}, processing: {processing_size}), rejecting request")
            return None
        
        # Generate a unique task ID
        task_id = str(uuid.uuid4())
        
        # Create the task
        task = {
            "task_id": task_id,
            "user_id": user_id,
            "connections": connections,
            "created_at": datetime.now().isoformat(),
            "ttl": 3600,  # 1 hour TTL
        }
        
        # Add to queue
        await client.lpush(AUTO_ENRICHMENT_QUEUE, json.dumps(task))
        
        logger.info(f"Enqueued auto enrichment task with task_id {task_id} for {len(connections)} connections (queue size: {queue_size+1})")
        return task_id
        
    except Exception as e:
        logger.error(f"Error enqueueing auto enrichment task: {str(e)}")
        return None

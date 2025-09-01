"""
API endpoints for LinkedIn profile enrichment
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Dict, Any, List
from pydantic import BaseModel, Field
import logging

from app.core.auth import get_current_user
from app.core.structured_logger import get_structured_logger
from app.core.profiling import profile_async
from app.core.enrichment_worker import enqueue_enrichment_task
from app.db.clients import get_async_supabase_client
from app.core.services.linkedin_enrichment_service import LinkedInEnrichmentService

router = APIRouter(prefix="/linkedin-enrichment", tags=["linkedin-enrichment"])
logger = get_structured_logger(__name__)

class ProfileData(BaseModel):
    firstName: str
    lastName: str
    headline: str
    profileUrl: str
    profileImg: str = ""

class EnrichmentRequest(BaseModel):
    profiles: List[ProfileData] = Field(..., min_items=1, max_items=40, description="List of LinkedIn profiles to enrich (max 40)")

class EnrichmentResponse(BaseModel):
    status: str
    message: str
    task_id: str
    profiles_count: int
    estimated_time_minutes: int


async def get_linkedin_enrichment_service():
    """
    Dependency to get a LinkedInEnrichmentService instance.
    This helps reduce the overhead of creating a new service for each request.
    """
    client = await get_async_supabase_client()
    return LinkedInEnrichmentService(client=client)

@router.post("/enrich-profiles", response_model=EnrichmentResponse)
@profile_async("routes.linkedin_enrichment.enrich_profiles")
async def enrich_profiles(
    request: EnrichmentRequest,
    current_user = Depends(get_current_user)
):
    """
    Trigger LinkedIn profile enrichment for batch of profiles
    
    Process:
    1. Store initial profile data in connections table
    2. Queue profiles for Tavily enrichment
    3. Check for existing LinkedIn URLs and copy data if available
    4. Extract new profile data using improved_profile_extractor
    5. Generate embeddings using Gemini model
    """
    try:
        user_id = current_user.id if hasattr(current_user, 'id') else current_user.get('id')
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found")
        
        profiles_data = [profile.dict() for profile in request.profiles]
        
        # Validate LinkedIn URLs
        invalid_urls = []
        for profile in profiles_data:
            profile_url = profile.get('profileUrl', '')
            if not profile_url or 'linkedin.com/in/' not in profile_url:
                invalid_urls.append(profile_url)
        
        if invalid_urls:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid LinkedIn URLs found: {invalid_urls}"
            )
        
        # Enqueue enrichment task
        task_id = await enqueue_enrichment_task(user_id, profiles_data)
        
        if not task_id:
            raise HTTPException(
                status_code=503, 
                detail="Enrichment queue is full. Please try again later."
            )
        
        logger.info(f"Enqueued enrichment task {task_id} for user {user_id} with {len(profiles_data)} profiles")
        
        # Estimate processing time (1-2 minutes per profile)
        estimated_time = len(profiles_data) * 1.5
        
        return EnrichmentResponse(
            status="success",
            message="Profile enrichment started",
            task_id=task_id,
            profiles_count=len(profiles_data),
            estimated_time_minutes=int(estimated_time)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting profile enrichment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error starting enrichment: {str(e)}")

@router.get("/enrichment-stats/{user_id}")
@profile_async("routes.linkedin_enrichment.get_enrichment_stats")
async def get_enrichment_stats(
    user_id: str,
    current_user = Depends(get_current_user)
):
    """Get enrichment statistics for a user"""
    try:
        # Verify user access
        current_user_id = current_user.id if hasattr(current_user, 'id') else current_user.get('id')
        if current_user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        supabase = await get_async_supabase_client()
        
        # Get enrichment statistics
        response = await supabase.table("connections").select(
            "source, enriched_at, created_at, linkedin_url"
        ).eq("user_id", user_id).execute()
        
        if not response.data:
            return {
                "total_profiles": 0,
                "enriched_profiles": 0,
                "pending_enrichment": 0,
                "recent_updates": 0,
                "last_enrichment": None
            }
        
        total_profiles = len(response.data)
        enriched_profiles = len([p for p in response.data if p.get('enriched_at')])
        pending_enrichment = total_profiles - enriched_profiles
        
        # Count recent updates (last 24 hours)
        from datetime import datetime, timedelta
        day_ago = datetime.now() - timedelta(days=1)
        recent_updates = len([
            p for p in response.data 
            if p.get('enriched_at') and 
            datetime.fromisoformat(p['enriched_at'].replace('Z', '+00:00')) > day_ago
        ])
        
        # Get last enrichment time
        enriched_profiles_with_time = [
            p for p in response.data 
            if p.get('enriched_at')
        ]
        
        last_enrichment = None
        if enriched_profiles_with_time:
            last_enrichment = max([
                p.get('enriched_at', '') 
                for p in enriched_profiles_with_time
            ])
        
        return {
            "total_profiles": total_profiles,
            "enriched_profiles": enriched_profiles,
            "pending_enrichment": pending_enrichment,
            "recent_updates": recent_updates,
            "last_enrichment": last_enrichment
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting enrichment stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting stats: {str(e)}")

@router.get("/queue-status")
@profile_async("routes.linkedin_enrichment.get_queue_status")
async def get_queue_status():
    """Get current enrichment queue status"""
    try:
        from app.db.redis_client import redis_client
        from app.core.enrichment_worker import ENRICHMENT_QUEUE, ENRICHMENT_PROCESSING
        
        client = await redis_client.get_client()
        
        queue_length = await client.llen(ENRICHMENT_QUEUE)
        processing_length = await client.llen(ENRICHMENT_PROCESSING)
        
        # Get sample tasks from queue
        sample_tasks = []
        if queue_length > 0:
            queue_items = await client.lrange(ENRICHMENT_QUEUE, 0, 2)  # Get first 3 items
            for item in queue_items:
                try:
                    import json
                    task = json.loads(item)
                    sample_tasks.append({
                        "task_id": task.get("task_id"),
                        "profiles_count": len(task.get("profiles_data", [])),
                        "created_at": task.get("created_at")
                    })
                except:
                    continue
        
        return {
            "queue_length": queue_length,
            "processing_length": processing_length,
            "total_tasks": queue_length + processing_length,
            "sample_tasks": sample_tasks,
            "estimated_wait_time_minutes": queue_length * 2  # Rough estimate
        }
        
    except Exception as e:
        logger.error(f"Error getting queue status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting queue status: {str(e)}")

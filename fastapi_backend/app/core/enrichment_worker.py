"""
LinkedIn Enrichment Worker for processing Tavily search and profile extraction
"""
import asyncio
import json
import logging
import traceback
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import redis.asyncio as redis

# LinkedIn enrichment will be handled by background service
from app.db.redis_client import redis_client
from app.db.clients import get_async_supabase_client
from app.core.structured_logger import get_structured_logger

logger = get_structured_logger(__name__)

# Queue names
ENRICHMENT_QUEUE = "enrichment:queue"
ENRICHMENT_PROCESSING = "enrichment:processing"

class EnrichmentWorker:
    """Worker to handle LinkedIn profile enrichment tasks separately from connection processing"""
    
    def __init__(self):
        self.worker_id = str(uuid.uuid4())
        self.running = False
        self.current_task = None
    
    async def start(self):
        """Start the enrichment worker"""
        if self.running:
            logger.warning("Enrichment worker is already running")
            return
        
        self.running = True
        logger.info("Starting LinkedIn enrichment worker")
        
        # Start processing loop
        await self._process_loop()
        
        logger.info(f"Enrichment worker {self.worker_id} stopped")
    
    async def stop(self):
        """Stop the enrichment worker"""
        self.running = False
        logger.info(f"Stopping enrichment worker {self.worker_id}")
        
        # If we're processing a task, try to return it to the queue
        if self.current_task:
            try:
                client = await redis_client.get_client()
                # Move from processing back to queue
                await client.lrem(ENRICHMENT_PROCESSING, 0, json.dumps(self.current_task))
                await client.lpush(ENRICHMENT_QUEUE, json.dumps(self.current_task))
                logger.info(f"Returned enrichment task to queue")
            except Exception as e:
                logger.error(f"Error returning enrichment task to queue: {str(e)}")
    
    async def _process_loop(self):
        """Main processing loop for enrichment tasks"""
        while self.running:
            try:
                client = await redis_client.get_client()
                
                # Get task from queue (blocking with timeout)
                task_data = await client.brpop(ENRICHMENT_QUEUE, timeout=5)
                
                if task_data:
                    _, task_json = task_data
                    task = json.loads(task_json)
                    self.current_task = task
                    
                    # Add to processing list
                    await client.lpush(ENRICHMENT_PROCESSING, task_json)
                    
                    # Process the enrichment task
                    await self._process_enrichment_task(task)
                    
                    # Remove from processing list
                    await client.lrem(ENRICHMENT_PROCESSING, 0, task_json)
                    self.current_task = None
                
            except Exception as e:
                logger.error(f"Error in enrichment worker loop: {str(e)}")
                await asyncio.sleep(1)  # Brief pause before retrying
    
    async def _get_next_task(self) -> Optional[Dict[str, Any]]:
        """Get the next task from the queue"""
        try:
            client = await redis_client.get_client()
            
            # Atomic operation: move item from queue to processing list
            raw_task = await client.rpoplpush(ENRICHMENT_QUEUE, ENRICHMENT_PROCESSING)
            
            if not raw_task:
                return None
                
            # Parse the task
            task = json.loads(raw_task)
            logger.info(f"Got enrichment task {task.get('task_id')} from queue")
            return task
            
        except Exception as e:
            logger.error(f"Error getting next enrichment task: {str(e)}")
            return None
    
    async def _process_enrichment_task(self, task: Dict[str, Any]):
        """
        Process LinkedIn enrichment task using existing LinkedIn enrichment service
        
        Args:
            task: Task data containing user_id and linkedin_urls
        """
        try:
            user_id = task.get("user_id")
            linkedin_urls = task.get("linkedin_urls", [])
            task_id = task.get("task_id", "unknown")
            
            if not user_id or not linkedin_urls:
                logger.warning(f"Invalid enrichment task: missing user_id or linkedin_urls")
                return
            
            # Limit to first 50 URLs for testing
            if len(linkedin_urls) > 50:
                linkedin_urls = linkedin_urls[:50]
                logger.info(f"Limited enrichment to first 50 URLs for testing (original: {len(task.get('linkedin_urls', []))})")
            
            logger.info(f"Processing enrichment task for user {user_id} with {len(linkedin_urls)} URLs")
            
            # Update status: Starting enrichment
            await self._update_task_status(task_id, "starting", f"Starting enrichment for {len(linkedin_urls)} profiles")
            
            # Get Supabase client
            supabase = await get_async_supabase_client()
            
            # Initialize LinkedIn enrichment service
            from app.core.services.linkedin_enrichment_service import LinkedInEnrichmentService
            enrichment_service = LinkedInEnrichmentService(client=supabase)
            
            # Update status: Getting information
            await self._update_task_status(task_id, "processing", "🔍 Getting information and indexing profiles...")
            
            # Enrich profiles using Apify (primary method)
            enrichment_results = await enrichment_service.enrich_batch_profiles(
                linkedin_urls, 
                preferred_method="apify"
            )
            
            logger.info(f"Enrichment completed: {enrichment_results['success_count']} successful, {enrichment_results['failure_count']} failed")
            
            # Update connections table with enriched data
            await self._update_connections_with_enriched_data(user_id, enrichment_results['successful'])
            
            # Generate vector embeddings for the user's profiles
            await enrichment_service.generate_embeddings_for_user(user_id)
            
            logger.info(f"LinkedIn enrichment task completed for user {user_id}")
            
            # Update status: Enrichment completed
            await self._update_task_status(task_id, "completed", f"Enrichment completed for {len(linkedin_urls)} profiles")
            
        except Exception as e:
            logger.error(f"Error processing enrichment task: {str(e)}")
            logger.error(traceback.format_exc())
        
        finally:
            # Remove the task from processing list
            try:
                client = await redis_client.get_client()
                await client.lrem(ENRICHMENT_PROCESSING, 0, json.dumps(task))
                logger.info(f"Removed enrichment task from processing list")
            except Exception as e:
                logger.error(f"Error removing enrichment task from processing: {str(e)}")
    
    async def _update_task_status(self, task_id: str, status: str, message: str):
        """Stream task status updates via Redis pub/sub for real-time frontend updates"""
        try:
            client = await redis_client.get_client()
            
            # Create status update payload
            status_update = {
                "task_id": task_id,
                "status": status,
                "message": message,
                "timestamp": datetime.now().isoformat(),
                "type": "enrichment_status"
            }
            
            # Publish to Redis channel for real-time streaming
            channel = f"enrichment_status:{task_id}"
            await client.publish(channel, json.dumps(status_update))
            
            # Also publish to general user channel
            user_id = task_id.split("_")[0] if "_" in task_id else "unknown"
            user_channel = f"user_updates:{user_id}"
            await client.publish(user_channel, json.dumps(status_update))
            
            logger.info(f"Streamed enrichment status {task_id}: {status} - {message}")
            
        except Exception as e:
            logger.error(f"Error streaming enrichment task status: {str(e)}")
            # Fallback to database update if Redis fails
            try:
                supabase = await get_async_supabase_client()
                await supabase.table("enrichment_tasks").update({
                    "status": status,
                    "status_message": message
                }).eq("task_id", task_id).execute()
            except Exception as db_error:
                logger.error(f"Database fallback also failed: {str(db_error)}")
    
    async def _update_connections_with_enriched_data(self, user_id: str, successful_results: List[Dict]):
        """Update connections table with enriched profile data"""
        try:
            supabase = await get_async_supabase_client()
            
            for result in successful_results:
                url = result['url']
                data = result['data']
                
                # Prepare update data
                update_data = {
                    'enriched_at': datetime.now().isoformat(),
                    'enrichment_source': result.get('method', 'apify')
                }
                
                # Add enriched fields if available
                if data.get('headline'):
                    update_data['headline'] = data['headline']
                if data.get('about_section'):
                    update_data['about_section'] = data['about_section']
                if data.get('experience_json'):
                    update_data['experience_json'] = data['experience_json']
                if data.get('education_json'):
                    update_data['education_json'] = data['education_json']
                if data.get('skills'):
                    update_data['skills'] = data['skills']
                if data.get('location'):
                    update_data['location'] = data['location']
                if data.get('company'):
                    update_data['company'] = data['company']
                if data.get('position'):
                    update_data['position'] = data['position']
                if data.get('profile_photo_url'):
                    update_data['profile_photo_url'] = data['profile_photo_url']    
                
                # Update the connection record
                await supabase.table("connections").update(update_data).eq(
                    "user_id", user_id
                ).eq("linkedin_url", url).execute()
                
                logger.info(f"Updated connection record for {url}")
            
        except Exception as e:
            logger.error(f"Error updating connections with enriched data: {str(e)}")
    
    async def _store_initial_profiles(self, profiles_data: List[Dict], user_id: str):
        """Store initial profile data in connections table"""
        try:
            supabase = await get_async_supabase_client()
            
            connections_data = []
            for profile in profiles_data:
                connection = {
                    'user_id': user_id,
                    'first_name': profile.get('firstName', ''),
                    'last_name': profile.get('lastName', ''),
                    'headline': profile.get('headline', ''),
                    'linkedin_url': profile.get('profileUrl', ''),
                    'profile_img': profile.get('profileImg', ''),
                    'source': 'LinkedIn Profile Enrichment',
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat()
                }
                connections_data.append(connection)
            
            # Batch insert
            if connections_data:
                response = await supabase.table("connections").insert(connections_data).execute()
                logger.info(f"Stored {len(connections_data)} initial profiles for user {user_id}")
                
        except Exception as e:
            logger.error(f"Error storing initial profiles: {str(e)}")
            raise
    
    async def _check_existing_linkedin_url(self, linkedin_url: str) -> Optional[Dict]:
        """Check if LinkedIn URL already exists in database"""
        try:
            supabase = await get_async_supabase_client()
            
            response = await supabase.table("connections").select("*").eq(
                "linkedin_url", linkedin_url
            ).limit(1).execute()
            
            if response.data:
                return response.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Error checking existing LinkedIn URL: {str(e)}")
            return None
    
    async def _copy_existing_profile_data(self, existing_profile: Dict, new_profile: Dict, user_id: str):
        """Copy enriched data from existing profile to new user_id"""
        try:
            supabase = await get_async_supabase_client()
            
            # Update the new profile with enriched data from existing profile
            update_data = {
                'company': existing_profile.get('company', ''),
                'position': existing_profile.get('position', ''),
                'location': existing_profile.get('location', ''),
                'email_address': existing_profile.get('email_address', ''),
                'about_section': existing_profile.get('about_section', ''),
                'experience_json': existing_profile.get('experience_json', {}),
                'education_json': existing_profile.get('education_json', {}),
                'skills': existing_profile.get('skills', []),
                'enriched_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            await supabase.table("connections").update(update_data).eq(
                "user_id", user_id
            ).eq("linkedin_url", new_profile.get('profileUrl')).execute()
            
        except Exception as e:
            logger.error(f"Error copying existing profile data: {str(e)}")
            raise
    
    async def _update_enriched_profiles_batch(self, user_id: str, results):
        """Update database with enriched profile data from batch results"""
        try:
            supabase = await get_async_supabase_client()
            
            for result in results.results:
                if not result.success or not result.profile_data:
                    continue
                
                profile = result.profile_data
                
                # Prepare update data
                update_data = {
                    'company': profile.current_company,
                    'position': profile.current_position,
                    'location': profile.location,
                    'email_address': profile.email,
                    'about_section': profile.about_section,
                    'experience_json': profile.experience,
                    'education_json': profile.education,
                    'skills': profile.skills,
                    'connections_count': profile.connections_count,
                    'followers_count': profile.followers_count,
                    'enriched_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat()
                }
                
                # Update the connection record
                await supabase.table("connections").update(update_data).eq(
                    "user_id", user_id
                ).eq("linkedin_url", profile.linkedin_url).execute()
                
                logger.info(f"Updated enriched profile {profile.linkedin_url} via {result.method_used}")
                
        except Exception as e:
            logger.error(f"Error updating enriched profiles batch: {str(e)}")
            # Don't raise - this is optional
    
    async def _generate_profile_embeddings(self, user_id: str, profiles_data: List[Dict]):
        """Generate embeddings for all profiles (optional feature)"""
        try:
            # This is optional - could integrate with vector database later
            logger.info(f"Skipping embeddings generation for user {user_id} profiles (not implemented)")
            
        except Exception as e:
            logger.error(f"Error generating profile embeddings: {str(e)}")
            # Don't raise - embeddings are optional


# Helper function for enqueueing enrichment tasks
async def enqueue_enrichment_task(
    user_id: str,
    profiles_data: List[Dict[str, Any]]
) -> Optional[str]:
    """
    Add an enrichment task to the queue
    
    Returns:
        str: Task ID for tracking the task, or None if queue is full
    """
    try:
        client = await redis_client.get_client()
        
        # Check queue size before adding
        queue_size = await client.llen(ENRICHMENT_QUEUE)
        processing_size = await client.llen(ENRICHMENT_PROCESSING)
        total_tasks = queue_size + processing_size
        
        # Set a reasonable limit
        if total_tasks > 50:  # Limit total enrichment tasks
            logger.warning(f"Enrichment queue too large (queue: {queue_size}, processing: {processing_size}), rejecting request")
            return None
        
        # Generate a unique task ID
        task_id = str(uuid.uuid4())
        
        # Create the task
        task = {
            "task_id": task_id,
            "user_id": user_id,
            "profiles_data": profiles_data,
            "created_at": datetime.now().isoformat(),
            "ttl": 3600,  # 1 hour TTL
        }
        
        # Add to queue
        await client.lpush(ENRICHMENT_QUEUE, json.dumps(task))
        
        logger.info(f"Enqueued enrichment task with task_id {task_id} for {len(profiles_data)} profiles (queue size: {queue_size+1})")
        return task_id
        
    except Exception as e:
        logger.error(f"Error enqueueing enrichment task: {str(e)}")
        logger.error(traceback.format_exc())
        raise

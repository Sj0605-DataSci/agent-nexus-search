"""
Auto Enrichment Worker for processing LinkedIn connections using Apify
"""
import asyncio
import json
import traceback
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import redis.asyncio as redis

from app.db.redis_client import redis_client
from app.db.clients import get_async_supabase_client
from app.core.structured_logger import get_structured_logger
from app.core.services.simplified_enrichment_service import SimplifiedEnrichmentService
from app.core.services.apify_extractor import extract_apify_profile_data
from app.api.routes.auto_enrichment import AUTO_ENRICHMENT_QUEUE, AUTO_ENRICHMENT_PROCESSING
from app.core.embedding_worker import EMBEDDING_QUEUE

logger = get_structured_logger(__name__)

class AutoEnrichmentWorker:
    """Worker to handle automatic LinkedIn profile enrichment for connections"""
    
    def __init__(self):
        self.worker_id = str(uuid.uuid4())
        self.running = False
        self.current_task = None
    
    async def start(self):
        """Start the auto enrichment worker"""
            logger.warning("Auto enrichment worker is already running")
            return
        
        self.running = True
        logger.info(f"Starting auto enrichment worker {self.worker_id}")
        
        # Start processing loop
        await self._process_loop()
        
        logger.info(f"Auto enrichment worker {self.worker_id} stopped")
    
    async def stop(self):
        """Stop the auto enrichment worker"""
        self.running = False
        logger.info(f"Stopping auto enrichment worker {self.worker_id}")
        
        # If we're processing a task, try to return it to the queue
        if self.current_task:
            try:
                client = await redis_client.get_client()
                # Move from processing back to queue
                await client.lrem(AUTO_ENRICHMENT_PROCESSING, 0, json.dumps(self.current_task))
                await client.lpush(AUTO_ENRICHMENT_QUEUE, json.dumps(self.current_task))
                logger.info(f"Returned auto enrichment task to queue")
            except Exception as e:
                logger.error(f"Error returning auto enrichment task to queue: {str(e)}")
    
    async def _process_loop(self):
        """Main processing loop for auto enrichment tasks"""
        while self.running:
            try:
                client = await redis_client.get_client()
                
                # Get task from queue (blocking with timeout)
                task_data = await client.brpop(AUTO_ENRICHMENT_QUEUE, timeout=5)
                
                if task_data:
                    _, task_json = task_data
                    task = json.loads(task_json)
                    self.current_task = task
                    
                    # Add to processing list
                    await client.lpush(AUTO_ENRICHMENT_PROCESSING, task_json)
                    
                    # Process the auto enrichment task
                    await self._process_auto_enrichment_task(task)
                    
                    # Remove from processing list
                    await client.lrem(AUTO_ENRICHMENT_PROCESSING, 0, task_json)
                    self.current_task = None
                
            except Exception as e:
                logger.error(f"Error in auto enrichment worker loop: {str(e)}")
                logger.error(traceback.format_exc())
                await asyncio.sleep(1)  # Brief pause before retrying
    
    async def _process_auto_enrichment_task(self, task: Dict[str, Any]):
        """
        Process auto enrichment task using Apify - only handles profile data extraction
        and sends tasks to the embedding worker for embedding generation
        
        Args:
            task: Task data containing user_id and connections
        """
        try:
            user_id = task.get("user_id")
            connections = task.get("connections", [])
            task_id = task.get("task_id", "unknown")
            
            if not user_id or not connections:
                logger.warning(f"Invalid auto enrichment task: missing user_id or connections")
                return
            
            logger.info(f"Processing auto enrichment task {task_id} for user {user_id} with {len(connections)} connections")
            
            # Update status: Starting enrichment
            await self._update_task_status(task_id, "starting", f"Starting enrichment for {len(connections)} connections")
            
            # Get Supabase client
            supabase = await get_async_supabase_client()
            
            # Initialize simplified enrichment service
            enrichment_service = SimplifiedEnrichmentService(supabase_client=supabase)
            
            # Get Redis client for embedding queue
            redis_client_instance = await redis_client.get_client()
            
            # Process connections in batches for scraping (Apify limit)
            urls_to_process = [conn["linkedin_url"] for conn in connections if conn.get("linkedin_url")]
            url_to_id = {conn["linkedin_url"]: conn["id"] for conn in connections if conn.get("linkedin_url") and conn.get("id")}
            
            # Check which connections already have enrichment data
            connections_to_process = []
            skipped_count = 0
            reused_count = 0
            
            for url, connection_id in url_to_id.items():
                # Check if this connection already has enrichment data
                existing_data, exists_for_this_user, exists_for_other_user = await enrichment_service.check_existing_embeddings(connection_id, url)
                
                if exists_for_this_user:
                    # Skip this connection as it already has enrichment data
                    logger.info(f"Skipping connection {connection_id} as it already has enrichment data")
                    skipped_count += 1
                elif exists_for_other_user:
                    # Reuse data from another user's connection
                    logger.info(f"Reusing data for connection {connection_id} from another user with same LinkedIn URL {url}")
                    # Copy the enrichment data to this connection
                    await enrichment_service._copy_enrichment_data(existing_data, connection_id)
                    reused_count += 1
                else:
                    # Connection is missing data - process it
                    connections_to_process.append({"linkedin_url": url, "id": connection_id})
            
            if not connections_to_process:
                logger.info("All connections already have enrichment data")
                await self._update_task_status(
                    task_id, 
                    "completed", 
                    f"✅ All connections already have enrichment data: {skipped_count} skipped, {reused_count} reused"
                )
                return
            
            # Get URLs for connections that need processing
            urls_to_process = [conn["linkedin_url"] for conn in connections_to_process]
            
            # Initialize counters
            successful_count = 0
            failed_count = 0
            
            # Process connections in batches for scraping (Apify limit)
            batches = [urls_to_process[i:i + 50] for i in range(0, len(urls_to_process), 50)]
            
            logger.info(f"Processing {len(urls_to_process)} connections in {len(batches)} batches")
            
            # Process each batch of URLs
            for batch_idx, batch_urls in enumerate(batches):
                # Update status: Processing batch
                await self._update_task_status(
                    task_id, 
                    "processing", 
                    f"🔍 Processing batch {batch_idx + 1}/{len(batches)} with {len(batch_urls)} URLs"
                )
                
                # Fetch profiles from Apify
                enriched_profiles = await enrichment_service.fetch_profiles_from_apify(batch_urls)
                
                if not enriched_profiles:
                    logger.warning(f"No profiles enriched from Apify in batch {batch_idx + 1}")
                    failed_count += len(batch_urls)
                    continue
                
                # Process each profile and save to database
                for url, profile_data in enriched_profiles.items():
                    if not profile_data:
                        logger.warning(f"No data for {url}")
                        failed_count += 1
                        continue
                    
                    connection_id = url_to_id.get(url)
                    if not connection_id:
                        logger.warning(f"No connection ID for {url}")
                        failed_count += 1
                        continue
                    
                    # Extract profile data
                    extracted_data = extract_apify_profile_data(profile_data)
                    
                    # Save the extracted data to Supabase
                    update_data = {
                        'enriched_at': datetime.now(timezone.utc).isoformat(),
                        'enrichment_source': 'apify'
                    }
                    
                    # Add extracted fields
                    for field in ['headline', 'about_section', 'experience_json', 'education_json', 'skills',
                                 'location', 'company', 'position', 'profile_photo_url']:
                        if field in extracted_data and extracted_data[field]:
                            update_data[field] = extracted_data[field]
                    
                    # Update connection with enrichment data
                    try:
                        response = await supabase.table("connections").update(update_data).eq(
                            "id", connection_id
                        ).execute()
                        
                        if response.data:
                            logger.info(f"Successfully saved profile data for connection {connection_id}")
                            successful_count += 1
                            
                            # Create embedding task
                            embedding_task = {
                                "user_id": user_id,
                                "connection_id": connection_id,
                                "profile_data": extracted_data,
                                "task_id": task_id
                            }
                            
                            # Send to embedding queue
                            await redis_client_instance.lpush(EMBEDDING_QUEUE, json.dumps(embedding_task))
                            logger.info(f"Sent embedding task for connection {connection_id} to embedding queue")
                        else:
                            logger.warning(f"Failed to save profile data for connection {connection_id}")
                            failed_count += 1
                    except Exception as e:
                        logger.error(f"Error saving profile data for connection {connection_id}: {str(e)}")
                        failed_count += 1
                
                # Update status: Batch completed
                await self._update_task_status(
                    task_id, 
                    "processing", 
                    f"✅ Batch {batch_idx + 1}/{len(batches)} completed: {successful_count} profiles enriched"
                )
            
            # Update status: Enrichment completed
            await self._update_task_status(
                task_id, 
                "completed", 
                f"✅ Enrichment completed: {successful_count}/{len(urls_to_process)} profiles enriched, {failed_count} failed, {skipped_count} skipped, {reused_count} reused"
            )
            
        except Exception as e:
            logger.error(f"Error processing auto enrichment task: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Update status: Error
            await self._update_task_status(
                task_id, 
                "error", 
                f"❌ Error during enrichment: {str(e)}"
            )
    
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
                "type": "auto_enrichment_status"
            }
            
            # Publish to Redis channel for real-time streaming
            channel = f"auto_enrichment_status:{task_id}"
            await client.publish(channel, json.dumps(status_update))
            
            # Also publish to general user channel
            user_id = task_id.split("_")[0] if "_" in task_id else "unknown"
            user_channel = f"user_updates:{user_id}"
            await client.publish(user_channel, json.dumps(status_update))
            
            logger.info(f"Streamed auto enrichment status {task_id}: {status} - {message}")
            
        except Exception as e:
            logger.error(f"Error streaming auto enrichment task status: {str(e)}")
            # Fallback to database update if Redis fails
            try:
                supabase = await get_async_supabase_client()
                await supabase.table("auto_enrichment_tasks").update({
                    "status": status,
                    "status_message": message
                }).eq("task_id", task_id).execute()
            except Exception as db_error:
                logger.error(f"Database fallback also failed: {str(db_error)}")
    
    # The _update_connections_with_enriched_data method is no longer needed as the simplified service handles this

# Helper function for manual testing
async def run_auto_enrichment_worker():
    """Run the auto enrichment worker"""
    worker = AutoEnrichmentWorker()
    await worker.start()

if __name__ == "__main__":
    asyncio.run(run_auto_enrichment_worker())

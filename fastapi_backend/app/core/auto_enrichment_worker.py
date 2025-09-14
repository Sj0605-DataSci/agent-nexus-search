"""
Auto Enrichment Worker for processing LinkedIn connections using Apify
"""
import asyncio
import json
import traceback
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
import redis.asyncio as redis

from app.db.redis_client import redis_client
from app.db.clients import get_async_supabase_client
from app.core.structured_logger import get_structured_logger
from app.core.services.simplified_enrichment_service import SimplifiedEnrichmentService
from app.core.services.apify_extractor import extract_apify_profile_data
from app.api.routes.auto_enrichment import AUTO_ENRICHMENT_QUEUE, AUTO_ENRICHMENT_PROCESSING

logger = get_structured_logger(__name__)

class AutoEnrichmentWorker:
    """Worker to handle automatic LinkedIn profile enrichment for connections"""
    
    def __init__(self):
        self.worker_id = str(uuid.uuid4())
        self.running = False
        self.current_task = None
        self.batch_size = 50  # Process 50 connections at a time (Apify limit)
    
    async def start(self):
        """Start the auto enrichment worker"""
        if self.running:
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
        Process auto enrichment task using Apify
        
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
            
            # Process connections in batches (Apify has a limit of ~10 URLs per request)
            total_processed = 0
            total_successful = 0
            
            # Group connections into batches
            batches = [connections[i:i + self.batch_size] for i in range(0, len(connections), self.batch_size)]
            
            for batch_index, batch in enumerate(batches):
                # Extract LinkedIn URLs from batch
                linkedin_urls = [conn["linkedin_url"] for conn in batch]
                connection_ids = [conn["id"] for conn in batch]
                
                # Update status: Processing batch
                await self._update_task_status(
                    task_id, 
                    "processing", 
                    f"🔍 Processing batch {batch_index + 1}/{len(batches)} ({len(batch)} connections)"
                )
                
                # Prepare connections data for enrichment
                connections_data = []
                for i, url in enumerate(linkedin_urls):
                    connections_data.append({
                        "id": connection_ids[i],
                        "linkedin_url": url
                    })
                
                # Enrich and embed connections using simplified service
                enrichment_results = await enrichment_service.enrich_and_embed_connections(
                    user_id,
                    connections_data
                )
                
                # Get successful updates count
                successful_updates = enrichment_results.get("successful", 0)
                
                total_processed += len(batch)
                total_successful += successful_updates
                
                # Update status: Batch completed
                await self._update_task_status(
                    task_id, 
                    "processing", 
                    f"✅ Batch {batch_index + 1}/{len(batches)} completed: {successful_updates}/{len(batch)} successful"
                )
                
                # Embeddings are already generated in the enrich_and_embed_connections method
                await self._update_task_status(
                    task_id, 
                    "processing", 
                    f"✅ Embeddings generated for batch {batch_index + 1}/{len(batches)}"
                )
                
                # Add delay between batches to avoid rate limiting
                if batch_index < len(batches) - 1:
                    await asyncio.sleep(2)
            
            logger.info(f"Auto enrichment task completed for user {user_id}: {total_successful}/{total_processed} successful")
            
            # Update status: Enrichment completed
            await self._update_task_status(
                task_id, 
                "completed", 
                f"✅ Enrichment completed: {total_successful}/{total_processed} profiles enriched successfully"
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

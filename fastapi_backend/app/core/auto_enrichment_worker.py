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
            
            # Use the optimized bulk processing in SimplifiedEnrichmentService with batch yielding
            # This will allow us to process embedding tasks as soon as each batch is enriched
            total_successful = 0
            total_failed = 0
            total_skipped = 0
            total_reused = 0
            
            # Process enrichment in batches and immediately queue embedding tasks
            async for batch_result in enrichment_service.enrich_connections(user_id, connections, yield_batches=True):
                # Extract batch results
                batch_idx = batch_result.get("batch_idx", 0)
                total_batches = batch_result.get("total_batches", 0)
                batch_successful = batch_result.get("successful", 0)
                batch_failed = batch_result.get("failed", 0)
                batch_skipped = batch_result.get("skipped", 0)
                batch_reused = batch_result.get("reused", 0)
                batch_enriched_connections = batch_result.get("enriched_connections", [])
                
                # Update counters
                total_successful += batch_successful
                total_failed += batch_failed
                total_skipped += batch_skipped
                total_reused += batch_reused
                
                # Update status for this batch
                status_message = f"✅ Batch {batch_idx}/{total_batches} completed: {batch_successful} profiles enriched, {batch_failed} failed"
                
                # Include skipped/reused counts in the first batch message
                if batch_idx == 1 and (batch_skipped > 0 or batch_reused > 0):
                    status_message += f", {batch_skipped} skipped, {batch_reused} reused"
                    
                await self._update_task_status(
                    task_id, 
                    "processing", 
                    status_message
                )
                
                # If we have enriched connections in this batch, queue them for embedding immediately
                if batch_enriched_connections:
                    # Create batch embedding task
                    batch_task = {
                        "user_id": user_id,
                        "task_id": task_id,
                        "connections": [{
                            "id": conn["id"],
                            "profile_data": conn["profile_data"]
                        } for conn in batch_enriched_connections]
                    }
                    
                    # Send batch to embedding queue
                    await redis_client_instance.lpush(EMBEDDING_QUEUE, json.dumps(batch_task))
                    logger.info(f"Sent batch of {len(batch_enriched_connections)} connections to embedding queue (batch {batch_idx}/{total_batches})")
                    
                    # Update status for embedding queue
                    await self._update_task_status(
                        task_id, 
                        "processing", 
                        f"🔍 Queued {len(batch_enriched_connections)} connections for embedding (batch {batch_idx}/{total_batches})"
                    )
                    
                    # Add a small delay to avoid overwhelming Redis
                    await asyncio.sleep(0.1)
            
            # Update status: Enrichment completed
            await self._update_task_status(
                task_id, 
                "completed", 
                f"✅ Enrichment completed: {total_successful} profiles enriched, {total_failed} failed, {total_skipped} skipped, {total_reused} reused"
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

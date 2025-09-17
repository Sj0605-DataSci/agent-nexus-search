"""
Embedding Worker for generating embeddings for LinkedIn profiles
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

logger = get_structured_logger(__name__)

# Queue names for embedding tasks
EMBEDDING_QUEUE = "embedding:queue"
EMBEDDING_PROCESSING = "embedding:processing"

class EmbeddingWorker:
    """Worker to handle embedding generation for LinkedIn profiles"""
    
    def __init__(self):
        self.worker_id = str(uuid.uuid4())
        self.running = False
        self.current_task = None
        self.embedding_semaphore = asyncio.Semaphore(5)  # Limit concurrent embedding API calls
    
    async def start(self):
        """Start the embedding worker"""
        if self.running:
            logger.warning("Embedding worker is already running")
            return
        
        self.running = True
        logger.info(f"Starting embedding worker {self.worker_id}")
        
        # Start processing loop
        await self._process_loop()
        
        logger.info(f"Embedding worker {self.worker_id} stopped")
    
    async def stop(self):
        """Stop the embedding worker"""
        self.running = False
        logger.info(f"Stopping embedding worker {self.worker_id}")
        
        # If we're processing a task, try to return it to the queue
        if self.current_task:
            try:
                client = await redis_client.get_client()
                # Move from processing back to queue
                await client.lrem(EMBEDDING_PROCESSING, 0, json.dumps(self.current_task))
                await client.lpush(EMBEDDING_QUEUE, json.dumps(self.current_task))
                logger.info(f"Returned embedding task to queue")
            except Exception as e:
                logger.error(f"Error returning embedding task to queue: {str(e)}")
    
    async def _process_loop(self):
        """Main processing loop for embedding tasks"""
        while self.running:
            try:
                client = await redis_client.get_client()
                
                # Get task from queue (blocking with timeout)
                task_data = await client.brpop(EMBEDDING_QUEUE, timeout=5)
                
                if task_data:
                    _, task_json = task_data
                    task = json.loads(task_json)
                    self.current_task = task
                    
                    # Add to processing list
                    await client.lpush(EMBEDDING_PROCESSING, task_json)
                    
                    # Process the embedding task
                    await self._process_embedding_task(task)
                    
                    # Remove from processing list
                    await client.lrem(EMBEDDING_PROCESSING, 0, task_json)
                    self.current_task = None
                
            except Exception as e:
                logger.error(f"Error in embedding worker loop: {str(e)}")
                logger.error(traceback.format_exc())
                await asyncio.sleep(1)  # Brief pause before retrying
    
    async def _process_embedding_task(self, task: Dict[str, Any]):
        """
        Process embedding task - handles both individual and batch tasks
        
        Args:
            task: Task data containing user_id and either connection_id + profile_data (individual)
                 or connections list (batch)
        """
        try:
            user_id = task.get("user_id")
            task_id = task.get("task_id", "unknown")
            connections = task.get("connections")
            
            # Get Supabase client
            supabase = await get_async_supabase_client()
            
            # Initialize simplified enrichment service
            enrichment_service = SimplifiedEnrichmentService(supabase_client=supabase)
            
            # Check if this is a batch task or individual task
            if connections:
                # Batch task
                logger.info(f"Processing batch embedding task with {len(connections)} connections")
                
                # Stream status update
                await self._update_task_status(
                    task_id,
                    user_id,
                    "processing",
                    f"🔍 Processing embeddings for {len(connections)} connections"
                )
                
                # Process each connection in the batch
                successful = 0
                failed = 0
                
                for conn in connections:
                    connection_id = conn.get("id")
                    profile_data = conn.get("profile_data")
                    
                    if not connection_id or not profile_data:
                        logger.warning(f"Invalid connection in batch: missing id or profile_data")
                        failed += 1
                        continue
                    
                    # Generate and save embeddings
                    success = await enrichment_service.generate_and_save_embeddings(
                        connection_id=connection_id,
                        profile_data=profile_data
                    )
                    
                    if success:
                        successful += 1
                    else:
                        failed += 1
                
                # Stream final status update
                await self._update_task_status(
                    task_id,
                    user_id,
                    "completed",
                    f"✅ Completed embeddings: {successful} successful, {failed} failed"
                )
                
            else:
                # Individual task (legacy format)
                connection_id = task.get("connection_id")
                profile_data = task.get("profile_data")
                
                if not user_id or not connection_id or not profile_data:
                    logger.warning(f"Invalid embedding task: missing required fields")
                    return
                
                logger.info(f"Processing embedding task for connection {connection_id}")
                
                # Generate and save embeddings using the utility method
                success = await enrichment_service.generate_and_save_embeddings(
                    connection_id=connection_id,
                    profile_data=profile_data
                )
                
                if not success:
                    logger.warning(f"Failed to generate embeddings for connection {connection_id}")
                    
                    # Stream status update
                    await self._update_task_status(
                        task_id,
                        user_id,
                        "error",
                        f"❌ Failed to generate embeddings for connection {connection_id}"
                    )
                    return
                
                logger.info(f"Successfully updated embeddings for connection {connection_id}")
                
                # Stream status update
                await self._update_task_status(
                    task_id,
                    user_id,
                    "completed",
                    f"✅ Successfully generated embeddings for connection {connection_id}"
                )
                
        except Exception as e:
            logger.error(f"Error processing embedding task: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Stream status update
            await self._update_task_status(
                task_id,
                user_id,
                "error",
                f"❌ Error during embedding generation: {str(e)}"
            )
    
    async def _update_task_status(self, task_id: str, user_id: str, status: str, message: str):
        """Stream task status updates via Redis pub/sub for real-time frontend updates"""
        try:
            client = await redis_client.get_client()
            
            # Create status update payload
            status_update = {
                "task_id": task_id,
                "status": status,
                "message": message,
                "timestamp": datetime.now().isoformat(),
                "type": "embedding_status"
            }
            
            # Publish to Redis channel for real-time streaming
            channel = f"embedding_status:{task_id}"
            await client.publish(channel, json.dumps(status_update))
            
            # Also publish to general user channel
            user_channel = f"user_updates:{user_id}"
            await client.publish(user_channel, json.dumps(status_update))
            
            logger.info(f"Streamed embedding status {task_id}: {status} - {message}")
            
        except Exception as e:
            logger.error(f"Error streaming embedding task status: {str(e)}")
            # Fallback to database update if Redis fails
            try:
                supabase = await get_async_supabase_client()
                await supabase.table("embedding_tasks").update({
                    "status": status,
                    "status_message": message
                }).eq("task_id", task_id).execute()
            except Exception as db_error:
                logger.error(f"Database fallback also failed: {str(db_error)}")

# Helper function for manual testing
async def run_embedding_worker():
    """Run the embedding worker"""
    worker = EmbeddingWorker()
    await worker.start()

if __name__ == "__main__":
    asyncio.run(run_embedding_worker())

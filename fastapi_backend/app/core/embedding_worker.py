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
from app.core.services.email_service import email_service

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
        self.embedding_semaphore = asyncio.Semaphore(8)  # Limit concurrent embedding API calls - increased for parallel processing
    
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
                
                # Maximum number of connections to process at once to avoid rate limits
                max_connections = 50
                connection_chunks = [connections[i:i + max_connections] for i in range(0, len(connections), max_connections)]
                total_chunks = len(connection_chunks)
                
                total_successful = 0
                total_failed = 0

                for i, connection_chunk in enumerate(connection_chunks):
                    chunk_num = i + 1
                    logger.info(f"Processing chunk {chunk_num}/{total_chunks} with {len(connection_chunk)} connections")

                    # Stream status update
                    await self._update_task_status(
                        task_id,
                        user_id,
                        "processing",
                        f"🔍 Processing batch {chunk_num}/{total_chunks} ({len(connection_chunk)} connections)"
                    )

                    # Prepare data for this chunk
                    valid_connections = []
                    basic_info_texts = []
                    experience_texts = []

                    # Collect all texts that need embeddings for this chunk
                    for conn in connection_chunk:
                        connection_id = conn.get("id")
                        
                        # Check if profile_data is nested or at top level
                        profile_data = conn.get("profile_data")
                        
                        # If profile_data is missing, check if fields are at the top level
                        if not profile_data:
                            has_basic_fields = any([
                                conn.get("first_name") and conn.get("last_name"),
                                conn.get("headline"),
                                conn.get("about_section"),
                                conn.get("company") and conn.get("position")
                            ])
                            has_experience = conn.get("experience_json") and len(conn.get("experience_json", [])) > 0
                            
                            # Only proceed if we have data for BOTH basic fields and experience
                            if has_basic_fields and has_experience:
                                logger.info(f"Creating profile_data from top-level fields for connection {connection_id}")
                                profile_data = {
                                    "first_name": conn.get("first_name", ""),
                                    "last_name": conn.get("last_name", ""),
                                    "headline": conn.get("headline", ""),
                                    "about_section": conn.get("about_section", ""),
                                    "company": conn.get("company", ""),
                                    "position": conn.get("position", ""),
                                    "location": conn.get("location", ""),
                                    "experience_json": conn.get("experience_json", []),
                                    "education_json": conn.get("education_json", []),
                                    "skills": conn.get("skills", []),
                                    "profile_photo_url": conn.get("profile_photo_url", "")
                                }
                        
                        if not connection_id or not profile_data:
                            logger.warning(f"Invalid connection in batch (missing id or profile_data): {connection_id}")
                            total_failed += 1
                            continue
                        
                        # Generate text for each section
                        basic_info_text = enrichment_service.create_basic_info_text(profile_data)
                        experience_text = enrichment_service.create_experience_text(profile_data.get("experience_json", []))
                        
                        # Final check: only proceed if both texts are non-empty
                        if not basic_info_text or not experience_text:
                            logger.warning(f"Skipping connection {connection_id} due to missing basic or experience text.")
                            total_failed += 1
                            continue

                        # Add to batch lists
                        valid_connections.append({"id": connection_id, "profile_data": profile_data})
                        basic_info_texts.append(basic_info_text)
                        experience_texts.append(experience_text)

                    if not valid_connections:
                        logger.warning(f"No valid connections found in chunk {chunk_num}")
                        continue

                    # Generate embeddings in parallel batches
                    logger.info(f"Generating embeddings for {len(valid_connections)} connections in chunk {chunk_num}")
                    
                    from app.core.utils.rate_limiter import jina_rate_limiter
                    basic_info_tokens = jina_rate_limiter.count_tokens(basic_info_texts)
                    experience_tokens = jina_rate_limiter.count_tokens(experience_texts)
                    total_tokens = basic_info_tokens + experience_tokens
                    logger.info(f"Chunk {chunk_num} Estimated token usage - Basic: {basic_info_tokens}, Exp: {experience_tokens}, Total: {total_tokens}")
                    
                    batch_size = 10
                    process_sequentially = total_tokens > 500000

                    try:
                        if process_sequentially:
                            logger.info(f"Processing chunk {chunk_num} sequentially due to high token count ({total_tokens})")
                            basic_info_embeddings = await enrichment_service.generate_batch_embeddings(basic_info_texts, batch_size=batch_size)
                            experience_embeddings = await enrichment_service.generate_batch_embeddings(experience_texts, batch_size=batch_size)
                        else:
                            logger.info(f"Processing chunk {chunk_num} in parallel with batch size {batch_size}")
                            basic_info_task = enrichment_service.generate_batch_embeddings(basic_info_texts, batch_size=batch_size)
                            experience_task = enrichment_service.generate_batch_embeddings(experience_texts, batch_size=batch_size)
                            basic_info_embeddings, experience_embeddings = await asyncio.gather(basic_info_task, experience_task)
                        logger.info(f"Successfully generated embeddings for chunk {chunk_num}")
                    except Exception as e:
                        logger.error(f"Error during embedding generation for chunk {chunk_num}: {str(e)}")
                        error_str = str(e).lower()
                        if "token rate limit exceeded" in error_str or "rate limit" in error_str:
                            message = f"⚠️ API rate limit exceeded. Please try again in 5-10 minutes."
                        else:
                            message = f"❌ Error generating embeddings for batch {chunk_num}"
                        await self._update_task_status(task_id, user_id, "error", message)
                        total_failed += len(valid_connections)
                        continue # Move to the next chunk

                    # Initialize counters for this chunk
                    successful_in_chunk = 0
                    failed_in_chunk = 0
                    
                    for idx, connection in enumerate(valid_connections):
                        connection_id = connection["id"]
                        basic_info_embedding = basic_info_embeddings[idx] if idx < len(basic_info_embeddings) else None
                        experience_embedding = experience_embeddings[idx] if idx < len(experience_embeddings) else None

                        # Check if we have any embeddings to update
                        has_embedding = False
                        update_data = {}
                        
                        if basic_info_embedding:
                            update_data["basic_info_embedding"] = basic_info_embedding
                            has_embedding = True
                        if experience_embedding:
                            update_data["experience_embedding"] = experience_embedding
                            has_embedding = True

                        if not has_embedding:
                            logger.warning(f"Failed to generate any embeddings for connection {connection_id} in chunk {chunk_num}")
                            failed_in_chunk += 1
                            continue

                        # Add timestamp for when embedding was generated
                        update_data["embedding_generated_at"] = datetime.now(timezone.utc).isoformat()
                        
                        # Update this connection record immediately
                        try:
                            logger.info(f"Updating connection {idx+1}/{len(valid_connections)} with ID {connection_id} in chunk {chunk_num}")
                            
                            # Use update with eq filter for a single record
                            response = await supabase.table("connections") \
                                .update(update_data) \
                                .eq("id", connection_id) \
                                .execute()
                            
                            if response.data:
                                successful_in_chunk += 1
                                logger.info(f"Successfully updated embedding for connection {connection_id} in chunk {chunk_num}")
                            else:
                                # PostgREST can return 0 data on success, so we check error
                                if response.error:
                                    logger.error(f"Error updating embedding for connection {connection_id} in chunk {chunk_num}: {response.error}")
                                    failed_in_chunk += 1
                                else:
                                    successful_in_chunk += 1
                                    logger.info(f"Update for connection {connection_id} in chunk {chunk_num} completed with no data returned, assuming success.")
                            
                            # Add a small delay between updates to reduce database load
                            await asyncio.sleep(0.1)
                            
                        except Exception as e:
                            logger.error(f"Exception during update for connection {connection_id} in chunk {chunk_num}: {str(e)}")
                            failed_in_chunk += 1
                            # Continue with the next connection even if this one failed

                    logger.info(f"Completed all connections for chunk {chunk_num}: {successful_in_chunk} successful, {failed_in_chunk} failed")
                    total_successful += successful_in_chunk
                    total_failed += failed_in_chunk

                # Stream final status update
                await self._update_task_status(
                    task_id,
                    user_id,
                    "completed",
                    f"✅ Completed all batches: {total_successful} successful, {total_failed} failed"
                )
                
                # Send completion email
                try:
                    # Fetch user email and full name from profiles table
                    user_profile_response = await supabase.table("profiles").select("email,full_name").eq("id", user_id).single().execute()
                    if user_profile_response.data and user_profile_response.data.get("email"):
                        user_email = user_profile_response.data["email"]
                        # Get user name if available
                        user_name = user_profile_response.data.get("full_name", "").split(" ")[0] if user_profile_response.data.get("full_name") else ""
                        
                        # Create subject line with user name if available
                        subject = f"{user_name + ', your' if user_name else 'Your'} Connections Are Ready!"
                        
                        # Get frontend URL from config based on environment
                        from app.core.config import settings
                        import urllib.parse
                        
                        # URL encode the username for tracking
                        encoded_name = urllib.parse.quote(user_name) if user_name else "user"
                        
                        # Create tracking URL with UTM parameters
                        base_url = settings.FRONTEND_URL or "https://www.discoverminds.ai"
                        tracking_url = f"{base_url}/?utm_source=email&utm_medium=notification&utm_campaign=connections_ready&utm_content=embedding_complete&username={encoded_name}"
                        
                        body = f"""
                        <html>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
                                    Connections Processing Complete
                                </h2>
                                
                                <p>Hi {user_name or 'there'},</p>
                                
                                <p>Great news! We've finished processing your connections. All profiles have been successfully enriched and are now available for you to search.</p>
                                
                                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                    <p>You can start searching your connections right away by clicking the button below:</p>
                                    
                                    <div style="text-align: center; margin: 20px 0;">
                                        <a href="{tracking_url}" style="background-color: #3498db; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Search My Connections</a>
                                    </div>
                                </div>
                                
                                <p style="margin-top: 30px;">
                                    Best regards,<br>
                                    <strong>Sanyam Ashish</strong><br>
                                    Team DiscoverMinds
                                </p>
                                
                                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                                <p style="font-size: 12px; color: #666; text-align: center;">
                                    This email was automatically sent by DiscoverMinds.
                                    If you have any questions, please contact our support team.
                                </p>
                            </div>
                        </body>
                        </html>
                        """
                        await email_service.send_email(to_email=user_email, subject=subject, body=body)
                        logger.info(f"Sent completion email to {user_email} for task {task_id}")
                    else:
                        logger.warning(f"Could not find email for user {user_id} to send completion notification.")
                except Exception as e:
                    logger.error(f"Failed to send completion email for task {task_id}: {str(e)}")

            else:
                # Individual task (legacy format)
                connection_id = task.get("connection_id")
                profile_data = task.get("profile_data")
                
                if not user_id or not connection_id or not profile_data:
                    logger.warning(f"Invalid embedding task: missing required fields")
                    return
                
                logger.info(f"Processing embedding task for connection {connection_id}")
                
                # Use the same batch approach for individual tasks for code consistency
                # Generate text for each section
                basic_info_text = enrichment_service.create_basic_info_text(profile_data)
                experience_text = enrichment_service.create_experience_text(profile_data.get("experience_json", []))
                
                # Calculate approximate token count for logging
                from app.core.utils.rate_limiter import jina_rate_limiter
                basic_info_tokens = jina_rate_limiter.count_tokens([basic_info_text])
                experience_tokens = jina_rate_limiter.count_tokens([experience_text])
                total_tokens = basic_info_tokens + experience_tokens
                logger.info(f"Estimated token usage - Basic info: {basic_info_tokens}, Experience: {experience_tokens}, Total: {total_tokens}")
                
                # Add delay between individual tasks to avoid rate limits
                await asyncio.sleep(1)  # 1 second delay between individual tasks
                
                try:
                    # Process sequentially for individual tasks
                    logger.info(f"Processing basic info embedding for connection {connection_id}")
                    basic_info_embeddings = await enrichment_service.generate_batch_embeddings([basic_info_text], batch_size=1)
                    
                    # Add small delay between API calls
                    await asyncio.sleep(0.5)
                    
                    logger.info(f"Processing experience embedding for connection {connection_id}")
                    experience_embeddings = await enrichment_service.generate_batch_embeddings([experience_text], batch_size=1)
                    
                    basic_info_embedding = basic_info_embeddings[0] if basic_info_embeddings else None
                    experience_embedding = experience_embeddings[0] if experience_embeddings else None
                    
                    if not basic_info_embedding and not experience_embedding:
                        logger.warning(f"Failed to generate embeddings for connection {connection_id}")
                        
                        # Stream status update
                        await self._update_task_status(
                            task_id,
                            user_id,
                            "error",
                            f"❌ Failed to generate embeddings for connection {connection_id}"
                        )
                        return
                    
                    embeddings_to_update = {}
                    if basic_info_embedding:
                        embeddings_to_update["basic_info_embedding"] = basic_info_embedding
                    if experience_embedding:
                        embeddings_to_update["experience_embedding"] = experience_embedding

                    # Add timestamp if we are updating at least one embedding
                    embeddings_to_update["embedding_generated_at"] = datetime.now(timezone.utc).isoformat()

                    # Update connection with available embeddings
                    try:
                        response = await supabase.table("connections").update(embeddings_to_update).eq(
                            "id", connection_id
                        ).execute()
                        
                        if not response.data:
                            logger.warning(f"Failed to update embeddings for connection {connection_id}")
                            
                            # Stream status update
                            await self._update_task_status(
                                task_id,
                                user_id,
                                "error",
                                f"❌ Failed to save embeddings for connection {connection_id}"
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
                        logger.error(f"Error updating embeddings for connection {connection_id}: {str(e)}")
                        
                        # Stream status update
                        await self._update_task_status(
                            task_id,
                            user_id,
                            "error",
                            f"❌ Error saving embeddings for connection {connection_id}: {str(e)}"
                        )
                
                except Exception as e:
                    error_str = str(e).lower()
                    if "token rate limit exceeded" in error_str or "rate limit" in error_str:
                        logger.error(f"Rate limit exceeded during embedding generation: {str(e)}")
                        # Stream status update
                        await self._update_task_status(
                            task_id,
                            user_id,
                            "error",
                            f"⚠️ API rate limit exceeded. Please try again in 5-10 minutes."
                        )
                        return
                    else:
                        logger.error(f"Error during embedding generation: {str(e)}")
                        # Stream status update
                        await self._update_task_status(
                            task_id,
                            user_id,
                            "error",
                            f"❌ Error generating embeddings: {str(e)}"
                        )
                        return
                
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

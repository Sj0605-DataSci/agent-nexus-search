"""
Connection worker module for processing LinkedIn connection CSV files
"""
import asyncio
import json
import logging
import uuid
import traceback
import csv
import requests
import os
import sys
from datetime import datetime
from typing import Dict, Any, List, Union, Optional

# LinkedIn enrichment will be handled by background service
from app.db.redis_client import redis_client
from app.db.clients import get_async_supabase_client
from app.api.routes.auto_enrichment import enqueue_auto_enrichment_task

# Configure logging
logger = logging.getLogger(__name__)

# Queue names
CONNECTION_QUEUE = "connection:queue"
CONNECTION_PROCESSING = "connection:processing"

class ConnectionWorker:
    """Worker for processing LinkedIn connection CSV files"""
    
    def __init__(self):
        """Initialize the worker"""
        self.worker_id = str(uuid.uuid4())
        self.running = False
        self.current_task = None
        
        # No longer need enrichment package - using separate enrichment worker
    
    async def start(self):
        """Start the worker process"""
        self.running = True
        logger.info(f"Starting connection worker {self.worker_id}")
        
        try:
            while self.running:
                try:
                    # Try to get a task from the queue
                    task = await self._get_next_task()
                    
                    if task:
                        # Process the task
                        self.current_task = task
                        await self._process_connection_task(task)
                        self.current_task = None
                    else:
                        # No tasks, wait a bit
                        await asyncio.sleep(1)
                        
                except Exception as e:
                    logger.error(f"Error in connection worker loop: {str(e)}")
                    logger.error(traceback.format_exc())
                    await asyncio.sleep(1)  # Wait a bit before retrying
                    
        except asyncio.CancelledError:
            logger.info(f"Connection worker {self.worker_id} received cancellation signal")
            self.running = False
            
        logger.info(f"Connection worker {self.worker_id} stopped")
    
    async def stop(self):
        """Stop the worker process"""
        self.running = False
        logger.info(f"Stopping connection worker {self.worker_id}")
        
        # If we're processing a task, try to return it to the queue
        if self.current_task:
            try:
                client = await redis_client.get_client()
                # Move from processing back to queue
                await client.lrem(CONNECTION_PROCESSING, 0, json.dumps(self.current_task))
                await client.lpush(CONNECTION_QUEUE, json.dumps(self.current_task))
                logger.info(f"Returned connection task {self.current_task['file_id']} to queue")
            except Exception as e:
                logger.error(f"Error returning connection task to queue: {str(e)}")
    
    async def _get_next_task(self) -> Optional[Dict[str, Any]]:
        """Get the next task from the queue"""
        try:
            client = await redis_client.get_client()
            
            # Atomic operation: move item from queue to processing list
            raw_task = await client.rpoplpush(CONNECTION_QUEUE, CONNECTION_PROCESSING)
            
            if not raw_task:
                return None
                
            # Parse the task
            task = json.loads(raw_task)
            logger.info(f"Got connection task {task.get('file_id')} from queue")
            return task
            
        except Exception as e:
            logger.error(f"Error getting next connection task: {str(e)}")
            return None
    
    async def _process_connection_task(self, task: Dict[str, Any]):
        """Process a connection file task"""
        file_id = task.get("file_id")
        
        try:
            logger.info(f"Processing connection file: {file_id}")
            
            # Get Supabase client
            supabase = await get_async_supabase_client()
            
            # Update status to processing
            await self._update_file_status(supabase, file_id, "processing")
            
            # Get file data
            response = await supabase.table("connection_files").select("*").eq("id", file_id).execute()
            
            if not response.data:
                logger.error(f"No file found with ID: {file_id}")
                return
                
            file_data = response.data[0]
            file_url = file_data["file_url"]
            user_id = file_data["user_id"]
            
            # Download file
            csv_content = await self._download_file(file_url)
            if not csv_content:
                await self._update_file_status(supabase, file_id, "failed", "Failed to download file")
                return
            
            # Parse connections
            connections = await self._parse_linkedin_csv(csv_content)
            if not connections:
                await self._update_file_status(supabase, file_id, "failed", "No connections found in file")
                return
            
            logger.info(f"Found {len(connections)} connections in file {file_id}")
            
            # Insert connections
            success = await self._insert_connections(supabase, user_id, connections)
            if not success:
                await self._update_file_status(supabase, file_id, "failed", "Failed to insert connections")
                return
            
            # Update status to completed
            await self._update_file_status(supabase, file_id, "completed")
            logger.info(f"Successfully processed connection file {file_id}")
            
            # Trigger auto enrichment for connections with LinkedIn URLs
            await self._trigger_auto_enrichment(user_id, connections)
            
        except Exception as e:
            logger.error(f"Error processing connection file {file_id}: {e}")
            logger.error(traceback.format_exc())
            
            # Try to update status to failed
            try:
                supabase = await get_async_supabase_client()
                await self._update_file_status(supabase, file_id, "failed", str(e))
            except Exception as update_error:
                logger.error(f"Error updating file status: {update_error}")
        
        finally:
            # Remove the task from processing list
            try:
                client = await redis_client.get_client()
                await client.lrem(CONNECTION_PROCESSING, 0, json.dumps(task))
                logger.info(f"Removed connection task {file_id} from processing list")
            except Exception as e:
                logger.error(f"Error removing connection task from processing: {str(e)}")
    
    async def _trigger_auto_enrichment(self, user_id: str, connections: List[Dict[str, Any]]):
        """Trigger automatic LinkedIn profile enrichment for imported connections"""
        try:
            # Extract connections with LinkedIn URLs
            connections_to_enrich = []
            for conn in connections:
                url = conn.get('url', '').strip()
                if url and 'linkedin.com/in/' in url:
                    connections_to_enrich.append({
                        "id": conn.get('id'),  # This will be None for new connections
                        "linkedin_url": url
                    })
            
            if not connections_to_enrich:
                logger.info("No LinkedIn URLs found in connections")
                return
            
            # Get connection IDs from database for the newly imported connections
            supabase = await get_async_supabase_client()
            for i, conn in enumerate(connections_to_enrich):
                if not conn.get('id'):
                    # Look up the connection ID by LinkedIn URL
                    response = await supabase.table("connections").select("id").eq(
                        "user_id", user_id
                    ).eq("linkedin_url", conn["linkedin_url"]).limit(1).execute()
                    
                    if response.data:
                        connections_to_enrich[i]["id"] = response.data[0]["id"]
            
            # Filter out connections without IDs
            connections_to_enrich = [conn for conn in connections_to_enrich if conn.get('id')]
            
            if not connections_to_enrich:
                logger.info("No connection IDs found for LinkedIn URLs")
                return
            
            logger.info(f"Enqueueing auto enrichment task for {len(connections_to_enrich)} connections")
            
            # Enqueue auto enrichment task
            task_id = await enqueue_auto_enrichment_task(user_id, connections_to_enrich)
            
            if task_id:
                logger.info(f"Enqueued auto enrichment task {task_id} for user {user_id} with {len(connections_to_enrich)} connections")
            else:
                logger.warning(f"Failed to enqueue auto enrichment task for user {user_id}")
            
        except Exception as e:
            logger.error(f"Error triggering auto enrichment: {str(e)}")
            logger.error(traceback.format_exc())
            # Don't raise - enrichment is optional
    
    async def _update_enriched_profiles(self, user_id: str, results):
        """Update database with enriched profile data"""
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
                    'enriched_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat()
                }
                
                # Update the connection record
                await supabase.table("connections").update(update_data).eq(
                    "user_id", user_id
                ).eq("linkedin_url", profile.linkedin_url).execute()
                
        except Exception as e:
            logger.error(f"Error updating enriched profiles: {str(e)}")
            # Don't raise - this is optional
    
    async def _download_file(self, file_url: str) -> Optional[str]:
        """Download file from URL and return its content"""
        try:
            response = requests.get(file_url, timeout=10)
            response.raise_for_status()
            return response.text
        except requests.RequestException as e:
            logger.error(f"Error downloading file: {e}")
            return None
    
    async def _parse_linkedin_csv(self, csv_content: str) -> List[Dict[str, Any]]:
        """Parse LinkedIn connections CSV file"""
        connections = []
        
        try:
            # Split by lines and find the actual CSV content (LinkedIn CSVs often have headers)
            lines = csv_content.splitlines()
            
            # Skip the Notes section at the beginning
            start_idx = 0
            for i, line in enumerate(lines):
                # Skip the Notes section
                if line.startswith('Notes:'):
                    # Skip until we find an empty line or the header line
                    while i < len(lines) and not (lines[i].startswith('First Name') or lines[i].strip() == ''):
                        i += 1
                    
                # Find the actual header line
                if "First Name,Last Name,URL,Email Address" in line:
                    start_idx = i
                    break
            
            # If we didn't find the exact header, look for a line with 'First Name' and 'Last Name'
            if start_idx == 0:
                for i, line in enumerate(lines):
                    if "First Name" in line and "Last Name" in line:
                        start_idx = i
                        break
            
            logger.info(f"Found CSV header at line {start_idx}: {lines[start_idx] if start_idx < len(lines) else 'Not found'}")
            
            # Parse CSV content
            reader = csv.DictReader(lines[start_idx:])
            
            for row in reader:
                # Skip empty rows
                if not row.get('First Name') and not row.get('Last Name'):
                    continue
                    
                # Create connection object
                connection = {
                    'first_name': row.get('First Name', ''),
                    'last_name': row.get('Last Name', ''),
                    'email_address': row.get('Email Address', ''),
                    'url': row.get('URL', ''),
                    'company': row.get('Company', ''),
                    'position': row.get('Position', ''),
                    'connected_on': row.get('Connected On', '')
                }
                
                connections.append(connection)
                
        except Exception as e:
            logger.error(f"Error parsing CSV: {e}")
        
        return connections
    
    async def _insert_connections(self, supabase, user_id: str, connections: List[Dict[str, Any]]) -> bool:
        """Insert connections into the connections table"""
        try:
            # Prepare data for batch insert
            data_to_insert = []
            for conn in connections:
                data_to_insert.append({
                    'user_id': user_id,
                    'email_address': conn.get('email_address', ''),
                    'first_name': conn.get('first_name', ''),
                    'last_name': conn.get('last_name', ''),
                    'company': conn.get('company', ''),
                    'position': conn.get('position', ''),
                    'source': 'Linkedin CSV File',
                    'linkedin_url': conn.get('url', ''),
                    'connected_on': conn.get('connected_on', ''),
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat()
                })
            
            if not data_to_insert:
                logger.warning("No valid connections to insert")
                return False
                
            # Insert connections in batches to avoid hitting limits
            batch_size = 100
            for i in range(0, len(data_to_insert), batch_size):
                batch = data_to_insert[i:i+batch_size]
                response = await supabase.table("connections").insert(batch).execute()
                
                if hasattr(response, 'error') and response.error:
                    logger.error(f"Error inserting connections batch: {response.error}")
                    return False
                    
            return True
            
        except Exception as e:
            logger.error(f"Error inserting connections: {e}")
            return False
    
    async def _update_file_status(self, supabase, file_id: str, status: str, message: str = None):
        """Stream file processing status via Redis pub/sub and update database"""
        try:
            # Create status update payload
            status_update = {
                "file_id": file_id,
                "status": status,
                "message": message or f"Status: {status}",
                "timestamp": datetime.now().isoformat(),
                "type": "connection_file_status"
            }
            
            # Stream to Redis for real-time updates
            client = await redis_client.get_client()
            
            # Publish to file-specific channel
            file_channel = f"connection_file_status:{file_id}"
            await client.publish(file_channel, json.dumps(status_update))
            
            # Get user_id from file record and publish to user channel
            try:
                file_response = await supabase.table("connection_files").select("user_id").eq("id", file_id).execute()
                if file_response.data:
                    user_id = file_response.data[0]["user_id"]
                    user_channel = f"user_updates:{user_id}"
                    await client.publish(user_channel, json.dumps(status_update))
            except Exception as e:
                logger.warning(f"Could not publish to user channel: {str(e)}")
            
            # Also update database as backup
            update_data = {"status": status}
            if message:
                update_data["status_message"] = message
                
            await supabase.table("connection_files").update(update_data).eq("id", file_id).execute()
            
            logger.info(f"Streamed connection file status {file_id}: {status} - {message}")
            
        except Exception as e:
            logger.error(f"Error streaming connection file status: {str(e)}")
            # Fallback to database-only update
            try:
                update_data = {"status": status}
                if message:
                    update_data["status_message"] = message
                await supabase.table("connection_files").update(update_data).eq("id", file_id).execute()
            except Exception as db_error:
                logger.error(f"Database fallback also failed: {str(db_error)}")


# Helper function for enqueueing tasks
async def enqueue_connection_task(file_id: str) -> bool:
    """
    Add a connection file processing task to the queue
    
    Args:
        file_id: ID of the connection file to process
        
    Returns:
        bool: True if task was enqueued, False otherwise
    """
    try:
        client = await redis_client.get_client()
        
        # Create the task
        task = {
            "file_id": file_id,
            "created_at": datetime.now().isoformat(),
        }
        
        # Add to queue
        await client.lpush(CONNECTION_QUEUE, json.dumps(task))
        
        logger.info(f"Enqueued connection task for file {file_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error enqueueing connection task: {str(e)}")
        return False

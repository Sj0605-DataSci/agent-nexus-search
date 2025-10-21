"""
Stock items worker module for processing stock items CSV files
"""
import asyncio
import json
import logging
import uuid
import traceback
import csv
import aiohttp
from datetime import datetime
from typing import Dict, Any, List, Union, Optional
from decimal import Decimal

from app.db.redis_client import redis_client
from app.db.clients import get_async_supabase_client

# Configure logging
logger = logging.getLogger(__name__)

# Queue names
STOCK_ITEMS_QUEUE = "stock_items:queue"
STOCK_ITEMS_PROCESSING = "stock_items:processing"

class StockItemsWorker:
    """Worker for processing stock items CSV files"""
    
    def __init__(self):
        """Initialize the worker"""
        self.worker_id = str(uuid.uuid4())
        self.running = False
        self.current_task = None
    
    async def start(self):
        """Start the worker process"""
        self.running = True
        logger.info(f"Starting stock items worker {self.worker_id}")
        
        try:
            while self.running:
                try:
                    # Try to get a task from the queue
                    task = await self._get_next_task()
                    
                    if task:
                        # Process the task
                        self.current_task = task
                        await self._process_stock_items_task(task)
                        self.current_task = None
                    else:
                        # No tasks, wait a bit
                        await asyncio.sleep(1)
                        
                except Exception as e:
                    logger.error(f"Error in stock items worker loop: {str(e)}")
                    logger.error(traceback.format_exc())
                    await asyncio.sleep(1)  # Wait a bit before retrying
                    
        except asyncio.CancelledError:
            logger.info(f"Stock items worker {self.worker_id} received cancellation signal")
            self.running = False
            
        logger.info(f"Stock items worker {self.worker_id} stopped")
    
    async def stop(self):
        """Stop the worker process"""
        self.running = False
        logger.info(f"Stopping stock items worker {self.worker_id}")
        
        # If we're processing a task, try to return it to the queue
        if self.current_task:
            try:
                client = await redis_client.get_client()
                # Move from processing back to queue
                await client.lrem(STOCK_ITEMS_PROCESSING, 0, json.dumps(self.current_task))
                await client.lpush(STOCK_ITEMS_QUEUE, json.dumps(self.current_task))
                logger.info(f"Returned stock items task {self.current_task['file_id']} to queue")
            except Exception as e:
                logger.error(f"Error returning stock items task to queue: {str(e)}")
    
    async def _get_next_task(self) -> Optional[Dict[str, Any]]:
        """Get the next task from the queue"""
        try:
            client = await redis_client.get_client()
            
            # Atomic operation: move item from queue to processing list
            raw_task = await client.rpoplpush(STOCK_ITEMS_QUEUE, STOCK_ITEMS_PROCESSING)
            
            if not raw_task:
                return None
                
            # Parse the task
            task = json.loads(raw_task)
            logger.info(f"Got stock items task {task.get('file_id')} from queue")
            return task
            
        except Exception as e:
            logger.error(f"Error getting next stock items task: {str(e)}")
            return None
    
    async def _process_stock_items_task(self, task: Dict[str, Any]):
        """Process a stock items file task"""
        file_id = task.get("file_id")
        
        try:
            logger.info(f"Processing stock items file: {file_id}")
            
            # Get Supabase client
            supabase = await get_async_supabase_client()
            
            # Update status to processing
            await self._update_file_status(supabase, file_id, "processing")
            
            # Get file data
            response = await supabase.table("stock_items_files").select("*").eq("id", file_id).execute()
            
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
            
            # Parse stock items
            stock_items = await self._parse_stock_items_csv(csv_content)
            if not stock_items:
                await self._update_file_status(supabase, file_id, "failed", "No stock items found in file")
                return
            
            logger.info(f"Found {len(stock_items)} stock items in file {file_id}")
            
            # Insert or update stock items with user_id
            success = await self._upsert_stock_items(supabase, stock_items, user_id)
            if not success:
                await self._update_file_status(supabase, file_id, "failed", "Failed to insert stock items")
                return
            
            # Update status to completed
            await self._update_file_status(supabase, file_id, "completed", f"Successfully processed {len(stock_items)} items")
            logger.info(f"Successfully processed stock items file {file_id}")
            
        except Exception as e:
            logger.error(f"Error processing stock items file {file_id}: {e}")
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
                await client.lrem(STOCK_ITEMS_PROCESSING, 0, json.dumps(task))
                logger.info(f"Removed stock items task {file_id} from processing list")
            except Exception as e:
                logger.error(f"Error removing stock items task from processing: {str(e)}")
    
    async def _download_file(self, file_url: str) -> Optional[str]:
        """Download file from URL and return its content (async)"""
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                timeout = aiohttp.ClientTimeout(total=30)
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    async with session.get(file_url) as response:
                        response.raise_for_status()
                        # Check file size (max 50MB)
                        content_length = response.headers.get('Content-Length')
                        if content_length and int(content_length) > 50 * 1024 * 1024:
                            logger.error(f"File too large: {content_length} bytes (max 50MB)")
                            return None
                        
                        content = await response.text()
                        logger.info(f"Downloaded file: {len(content)} bytes")
                        return content
                        
            except aiohttp.ClientError as e:
                logger.warning(f"Download attempt {attempt + 1}/{max_retries} failed: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay)
                else:
                    logger.error(f"Error downloading file after {max_retries} attempts: {e}")
                    return None
            except Exception as e:
                logger.error(f"Unexpected error downloading file: {e}")
                return None
    
    async def _parse_stock_items_csv(self, csv_content: str) -> List[Dict[str, Any]]:
        """Parse stock items CSV file with validation"""
        stock_items = []
        skipped_rows = 0
        max_rows = 50000  # Limit to prevent memory issues
        
        try:
            # Split by lines
            lines = csv_content.splitlines()
            
            if not lines:
                logger.error("CSV file is empty")
                return []
            
            # Check row limit
            if len(lines) > max_rows + 1:  # +1 for header
                logger.error(f"CSV has too many rows: {len(lines)-1} (max {max_rows})")
                return []
            
            # Parse CSV content
            reader = csv.DictReader(lines)
            
            # Validate headers
            required_headers = {'item_name', 'quantity', 'rate'}
            if reader.fieldnames:
                headers = set(reader.fieldnames)
                missing_headers = required_headers - headers
                if missing_headers:
                    logger.error(f"CSV missing required headers: {missing_headers}")
                    return []
            
            row_number = 1  # Start from 1 (header is 0)
            for row in reader:
                row_number += 1
                
                # Skip empty rows
                if not row.get('item_name'):
                    skipped_rows += 1
                    continue
                
                # Extract and validate data
                item_name = row.get('item_name', '').strip()
                if not item_name:
                    logger.warning(f"Row {row_number}: Empty item_name, skipping")
                    skipped_rows += 1
                    continue
                
                # Validate item name length
                if len(item_name) > 500:
                    logger.warning(f"Row {row_number}: item_name too long ({len(item_name)} chars), truncating")
                    item_name = item_name[:500]
                
                try:
                    quantity = int(row.get('quantity', 0))
                    if quantity < 0:
                        logger.warning(f"Row {row_number}: Negative quantity ({quantity}), setting to 0")
                        quantity = 0
                except (ValueError, TypeError) as e:
                    logger.warning(f"Row {row_number}: Invalid quantity '{row.get('quantity')}', setting to 0")
                    quantity = 0
                
                try:
                    rate = float(row.get('rate', 0.0))
                    if rate < 0:
                        logger.warning(f"Row {row_number}: Negative rate ({rate}), setting to 0")
                        rate = 0.0
                except (ValueError, TypeError) as e:
                    logger.warning(f"Row {row_number}: Invalid rate '{row.get('rate')}', setting to 0")
                    rate = 0.0
                
                # Create stock item object
                stock_item = {
                    'item_name': item_name,
                    'item_name_lower': item_name.lower(),
                    'quantity': quantity,
                    'rate': rate
                }
                
                stock_items.append(stock_item)
            
            if skipped_rows > 0:
                logger.info(f"Skipped {skipped_rows} invalid rows during CSV parsing")
                
        except Exception as e:
            logger.error(f"Error parsing CSV: {e}")
            logger.error(traceback.format_exc())
        
        return stock_items
    
    async def _upsert_stock_items(self, supabase, stock_items: List[Dict[str, Any]], user_id: str) -> bool:
        """Insert or update stock items in the stock_items table"""
        try:
            # Remove duplicates within the CSV itself (keep last occurrence)
            seen = {}
            for item in stock_items:
                seen[item['item_name_lower']] = item
            
            unique_items = list(seen.values())
            duplicates_removed = len(stock_items) - len(unique_items)
            if duplicates_removed > 0:
                logger.info(f"Removed {duplicates_removed} duplicate items from CSV")
            
            # Prepare data for batch upsert
            data_to_upsert = []
            for item in unique_items:
                data_to_upsert.append({
                    'item_name': item['item_name'],
                    'item_name_lower': item['item_name_lower'],
                    'quantity': item['quantity'],
                    'rate': item['rate'],
                    'user_id': user_id,
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat()
                })
            
            if not data_to_upsert:
                logger.warning("No valid stock items to insert")
                return False
            
            # PERFORMANCE FIX: Only fetch items that match our CSV (not entire table)
            item_names_lower = [item['item_name_lower'] for item in data_to_upsert]
            
            # Query in batches to avoid URL length limits
            # Filter by user_id to only check items belonging to this user
            existing_items_map = {}
            batch_size = 100
            for i in range(0, len(item_names_lower), batch_size):
                batch_names = item_names_lower[i:i+batch_size]
                existing_items_response = await supabase.table("stock_items").select(
                    "id, item_name_lower"
                ).in_("item_name_lower", batch_names).eq("user_id", user_id).execute()
                
                if existing_items_response.data:
                    for item in existing_items_response.data:
                        existing_items_map[item['item_name_lower']] = item['id']
            
            logger.info(f"Found {len(existing_items_map)} existing items out of {len(data_to_upsert)} in CSV")
            
            items_to_insert = []
            items_to_update = []
            
            for item in data_to_upsert:
                if item['item_name_lower'] in existing_items_map:
                    # Update existing item
                    items_to_update.append({
                        'id': existing_items_map[item['item_name_lower']],
                        'item_name': item['item_name'],  # Update name too in case of case changes
                        'quantity': item['quantity'],
                        'rate': item['rate'],
                        'user_id': user_id,
                        'updated_at': item['updated_at']
                    })
                else:
                    # Insert new item
                    items_to_insert.append(item)
            
            # Insert new items in batches
            insert_errors = 0
            if items_to_insert:
                batch_size = 100
                for i in range(0, len(items_to_insert), batch_size):
                    batch = items_to_insert[i:i+batch_size]
                    try:
                        response = await supabase.table("stock_items").insert(batch).execute()
                        
                        if hasattr(response, 'error') and response.error:
                            logger.error(f"Error inserting stock items batch {i//batch_size + 1}: {response.error}")
                            insert_errors += len(batch)
                    except Exception as e:
                        logger.error(f"Exception inserting batch {i//batch_size + 1}: {str(e)}")
                        insert_errors += len(batch)
                
                logger.info(f"Inserted {len(items_to_insert) - insert_errors}/{len(items_to_insert)} new stock items")
            
            # PERFORMANCE FIX: Batch update using upsert instead of individual updates
            update_errors = 0
            if items_to_update:
                # Use Supabase upsert with on_conflict for batch updates
                batch_size = 100
                for i in range(0, len(items_to_update), batch_size):
                    batch = items_to_update[i:i+batch_size]
                    try:
                        # Prepare batch for upsert
                        upsert_batch = []
                        for item in batch:
                            upsert_batch.append({
                                'id': item['id'],
                                'item_name': item['item_name'],
                                'item_name_lower': item['item_name'].lower(),
                                'quantity': item['quantity'],
                                'rate': item['rate'],
                                'user_id': user_id,
                                'updated_at': item['updated_at']
                            })
                        
                        # Use upsert for batch update
                        response = await supabase.table("stock_items").upsert(
                            upsert_batch,
                            on_conflict='id'
                        ).execute()
                        
                        if hasattr(response, 'error') and response.error:
                            logger.error(f"Error updating stock items batch {i//batch_size + 1}: {response.error}")
                            update_errors += len(batch)
                    except Exception as e:
                        logger.error(f"Exception updating batch {i//batch_size + 1}: {str(e)}")
                        update_errors += len(batch)
                
                logger.info(f"Updated {len(items_to_update) - update_errors}/{len(items_to_update)} existing stock items")
            
            # Return success if at least some items were processed
            total_processed = (len(items_to_insert) - insert_errors) + (len(items_to_update) - update_errors)
            if total_processed == 0:
                logger.error("Failed to process any stock items")
                return False
            
            logger.info(f"Successfully processed {total_processed}/{len(data_to_upsert)} stock items")
            return True
            
        except Exception as e:
            logger.error(f"Error upserting stock items: {e}")
            logger.error(traceback.format_exc())
            return False
    
    async def _update_file_status(self, supabase, file_id: str, status: str, message: str = None):
        """Update file processing status in database and stream via Redis"""
        try:
            # Create status update payload
            status_update = {
                "file_id": file_id,
                "status": status,
                "message": message or f"Status: {status}",
                "timestamp": datetime.now().isoformat(),
                "type": "stock_items_file_status"
            }
            
            # Stream to Redis for real-time updates
            try:
                client = await redis_client.get_client()
                
                # Publish to file-specific channel
                file_channel = f"stock_items_file_status:{file_id}"
                await client.publish(file_channel, json.dumps(status_update))
                
                # Get user_id from file record and publish to user channel
                file_response = await supabase.table("stock_items_files").select("user_id").eq("id", file_id).execute()
                if file_response.data:
                    user_id = file_response.data[0]["user_id"]
                    user_channel = f"user_updates:{user_id}"
                    await client.publish(user_channel, json.dumps(status_update))
            except Exception as e:
                logger.warning(f"Could not publish to Redis channel: {str(e)}")
            
            # Update database
            update_data = {"status": status, "updated_at": datetime.now().isoformat()}
            if message:
                update_data["error_message"] = message if status == "failed" else None
                
            await supabase.table("stock_items_files").update(update_data).eq("id", file_id).execute()
            
            logger.info(f"Updated stock items file status {file_id}: {status} - {message}")
            
        except Exception as e:
            logger.error(f"Error updating stock items file status: {str(e)}")
            logger.error(traceback.format_exc())


# Helper function for enqueueing tasks
async def enqueue_stock_items_task(file_id: str) -> bool:
    """
    Add a stock items file processing task to the queue
    
    Args:
        file_id: ID of the stock items file to process
        
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
        await client.lpush(STOCK_ITEMS_QUEUE, json.dumps(task))
        
        logger.info(f"Enqueued stock items task for file {file_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error enqueueing stock items task: {str(e)}")
        return False

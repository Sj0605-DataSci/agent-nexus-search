"""
Simplified LinkedIn Profile Enrichment Service
Uses Apify for profile data extraction and Jina for embedding generation
"""
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any, Callable, Tuple
import json
import requests
import time
from functools import wraps
from collections import deque

from apify_client import ApifyClient
from apify_client.errors import ApifyApiError

from app.core.config import settings
from app.core.structured_logger import get_structured_logger
from app.core.services.apify_extractor import extract_apify_profile_data, extract_batch_apify_profiles

logger = get_structured_logger(__name__)

class SimplifiedEnrichmentService:
    """
    Simplified LinkedIn Profile Enrichment Service
    Handles Apify data extraction and embedding generation
    """
    
    def __init__(self, supabase_client=None):
        """Initialize the service with a Supabase client"""
        self.supabase_client = supabase_client
        self.jina_api_key = settings.JINA_API_KEY
        self.apify_api_key = settings.APIFY_API_KEY
        
        # Retry configuration
        self.max_retries = 3
        self.retry_delay = 2  # seconds
        self.backoff_factor = 2  # exponential backoff
        
        # Freshness configuration
        self.freshness_days = 30  # Consider data fresh if enriched within this many days
        
        # Parallel processing configuration
        self.scraping_batch_size = 50  # Process 50 URLs at a time for scraping
        self.embedding_batch_size = 10  # Process 10 profiles at a time for embedding generation
        self.embedding_queue = asyncio.Queue()  # Queue for profiles ready for embedding
        self.embedding_results = {}  # Store embedding results
        self.embedding_semaphore = asyncio.Semaphore(5)  # Limit concurrent embedding API calls
        
    # Removed initialize_vecs method as we're not using vecs anymore
    
    async def retry_async(self, func: Callable, *args, **kwargs) -> Any:
        """
        Retry an async function with exponential backoff
        
        Args:
            func: Async function to retry
            *args: Arguments to pass to the function
            **kwargs: Keyword arguments to pass to the function
            
        Returns:
            Result of the function call or None if all retries fail
        """
        retries = 0
        last_exception = None
        
        while retries < self.max_retries:
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                retries += 1
                
                if retries >= self.max_retries:
                    logger.error(f"Max retries ({self.max_retries}) reached for {func.__name__}: {str(e)}")
                    break
                    
                # Calculate backoff delay
                delay = self.retry_delay * (self.backoff_factor ** (retries - 1))
                logger.warning(f"Retry {retries}/{self.max_retries} for {func.__name__} after {delay}s delay. Error: {str(e)}")
                
                # Wait before retrying
                await asyncio.sleep(delay)
        
        # All retries failed
        if last_exception:
            logger.error(f"All retries failed for {func.__name__}: {str(last_exception)}")
        return None
    
    async def _fetch_profiles_from_apify_impl(self, linkedin_urls: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Implementation of fetching LinkedIn profile data from Apify (for retry wrapper)
        """
        logger.info(f"Fetching {len(linkedin_urls)} profiles from Apify")
        
        # Validate API key
        if not self.apify_api_key:
            logger.error("APIFY_API_KEY not configured")
            return {}
        
        # Initialize Apify client
        apify_client = ApifyClient(self.apify_api_key)
        
        # Prepare Apify actor input
        run_input = {
            "profileScraperMode": "Profile details no email ($4 per 1k)",
            "queries": linkedin_urls,
        }
        
        # Run the Apify actor and wait for completion
        logger.info(f"Calling Apify actor with {len(linkedin_urls)} URLs")
        run = apify_client.actor("LpVuK3Zozwuipa5bp").call(run_input=run_input)
        
        if not run or "defaultDatasetId" not in run:
            logger.error("Invalid response from Apify actor")
            return {}
        
        # Fetch results from the dataset
        apify_results = []
        for item in apify_client.dataset(run["defaultDatasetId"]).iterate_items():
            apify_results.append(item)
        
        logger.info(f"Apify returned {len(apify_results)} results")
        
        # Extract structured data using our Apify extractor
        extracted_data = extract_batch_apify_profiles(apify_results)
        
        return extracted_data
    
    async def fetch_profiles_from_apify(self, linkedin_urls: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Fetch LinkedIn profile data from Apify with retry mechanism
        
        Args:
            linkedin_urls: List of LinkedIn profile URLs
            
        Returns:
            Dictionary mapping LinkedIn URLs to their extracted profile data
        """
        try:
            # Use retry mechanism
            result = await self.retry_async(self._fetch_profiles_from_apify_impl, linkedin_urls)
            return result if result else {}
                
        except Exception as e:
            logger.error(f"Error fetching profiles from Apify: {str(e)}")
            return {}
    
    async def _generate_embedding_impl(self, text: str) -> Optional[List[float]]:
        """
        Implementation of embedding generation using Jina API (for retry wrapper)
        """
        if not text or not text.strip():
            return None
            
        url = "https://api.jina.ai/v1/embeddings"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.jina_api_key}",
        }
        data = {
            "model": "jina-embeddings-v3",
            "task": "text-matching",
            "input": text,
        }
        
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        
        result = response.json()
        embedding = result["data"][0]["embedding"]
        
        return embedding
    
    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        """
        Generate embedding using Jina API with retry mechanism
        
        Args:
            text: Text to generate embedding for
            
        Returns:
            Embedding vector or None if failed
        """
        if not text or not text.strip():
            return None
            
        try:
            # Use retry mechanism
            result = await self.retry_async(self._generate_embedding_impl, text)
            return result
        except Exception as e:
            logger.error(f"Error generating embedding after all retries: {e}")
            return None
    
    def create_basic_info_text(self, profile: Dict) -> str:
        """Create text for basic profile information"""
        parts = []
        
        # Basic info
        name = f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip()
        if name:
            parts.append(f"Name: {name}")
        
        # Use URL if available and name is missing
        if not name and profile.get('linkedin_url'):
            parts.append(f"LinkedIn URL: {profile.get('linkedin_url')}")
            
        if profile.get('headline'):
            parts.append(f"Headline: {profile['headline']}")
            
        # About section
        if profile.get('about_section'):
            parts.append(f"About: {profile['about_section']}")
        
        # Add company and position if available
        if profile.get('company'):
            parts.append(f"Company: {profile['company']}")
            
        if profile.get('position'):
            parts.append(f"Position: {profile['position']}")
            
        if profile.get('location'):
            parts.append(f"Location: {profile['location']}")
        
        # Return joined text or empty string if no parts
        return "\n".join(parts)
    
    def create_experience_text(self, experience_json: List[Dict]) -> str:
        """Create consolidated text for all experience entries"""
        if not experience_json:
            return ""
            
        parts = ["Experience:"]
        
        # Sort experiences by recency (current jobs first)
        sorted_exp = sorted(experience_json, key=lambda x: x.get("is_current", False), reverse=True)
        
        for exp in sorted_exp:
            exp_parts = []
            
            # Focus on position and company
            if exp.get("position"):
                exp_parts.append(f"Position: {exp['position']}")
            if exp.get("company"):
                exp_parts.append(f"Company: {exp['company']}")
                
            # Add description (important for semantic search)
            if exp.get("description"):
                exp_parts.append(f"Description: {exp['description']}")
                
            parts.append(" | ".join(exp_parts))
        
        return "\n".join(parts)
    
    async def generate_embeddings(self, extracted_data: Dict[str, Any]) -> Dict[str, List[float]]:
        """
        Generate embeddings for extracted profile data
        
        Args:
            extracted_data: Dictionary with extracted profile data
            
        Returns:
            Dictionary with generated embeddings
        """
        # Check if we have enough data to generate meaningful embeddings
        has_name = extracted_data.get('first_name') or extracted_data.get('last_name')
        has_headline = bool(extracted_data.get('headline'))
        has_about = bool(extracted_data.get('about_section'))
        has_experience = bool(extracted_data.get('experience_json'))
        
        if not (has_name or has_headline or has_about or has_experience):
            logger.warning(f"Insufficient data to generate embeddings for LinkedIn URL: {extracted_data.get('linkedin_url', 'unknown')}")
            return None
        
        logger.info(f"Generating embeddings for profile: {extracted_data.get('first_name', '')} {extracted_data.get('last_name', '')}")
        
        # Generate text for each section
        basic_info_text = self.create_basic_info_text(extracted_data)
        experience_text = self.create_experience_text(extracted_data.get("experience_json", []))
        
        # If we don't have enough text, use the LinkedIn URL as a fallback
        if not basic_info_text and not experience_text:
            if extracted_data.get('linkedin_url'):
                basic_info_text = f"LinkedIn Profile: {extracted_data.get('linkedin_url')}"
            else:
                return None
        
        # Generate embeddings for each section
        basic_info_embedding = await self.generate_embedding(basic_info_text)
        experience_embedding = await self.generate_embedding(experience_text)
        
        return {
            "basic_info_embedding": basic_info_embedding,
            "experience_embedding": experience_embedding
        }
    
    async def process_connection(self, connection: Dict) -> Dict[str, List[float]]:
        """
        Process a single connection and generate embeddings for basic info and experience
        
        Args:
            connection: Connection data dictionary
            
        Returns:
            Dictionary with generated embeddings
        """
        logger.info(f"Processing connection: {connection.get('first_name')} {connection.get('last_name')}")
        
        # Generate text for each section
        basic_info_text = self.create_basic_info_text(connection)
        experience_text = self.create_experience_text(connection.get("experience_json", []))
        
        # Generate embeddings for each section
        basic_info_embedding = await self.generate_embedding(basic_info_text)
        experience_embedding = await self.generate_embedding(experience_text)
        
        return {
            "basic_info_embedding": basic_info_embedding,
            "experience_embedding": experience_embedding
        }
    
    async def update_connection_embeddings(self, connection_id: str, embeddings: Dict[str, List[float]]) -> bool:
        """
        Update connection record with embeddings
        
        Args:
            connection_id: Connection ID
            embeddings: Dictionary with embeddings
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Add timestamp for when embeddings were generated
            update_data = {
                "embedding_generated_at": datetime.now(timezone.utc).isoformat(),
                **{k: v for k, v in embeddings.items() if v is not None}
            }
            
            response = await self.supabase_client.table("connections").update(
                update_data
            ).eq("id", connection_id).execute()
            
            if response.data and len(response.data) > 0:
                logger.info(f"Updated embeddings for connection {connection_id}")
                return True
            else:
                logger.warning(f"Failed to update embeddings for connection {connection_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error updating connection embeddings: {str(e)}")
            return False
    
    # Removed store_vector_embedding method as we're not using vecs anymore
    
    async def _copy_enrichment_data(self, source_connection: Dict[str, Any], target_connection_id: str) -> bool:
        """
        Copy enrichment data from one connection to another
        
        Args:
            source_connection: Source connection data
            target_connection_id: Target connection ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Extract fields to copy
            update_data = {
                'enriched_at': datetime.now(timezone.utc).isoformat(),  # Use current time as enrichment date with timezone
                'enrichment_source': 'reused',  # Mark as reused data
            }
            
            # Copy enrichment fields if available
            for field in [
                'headline', 'about_section', 'experience_json', 'education_json', 'skills',
                'location', 'company', 'position', 'profile_photo_url',
                'basic_info_embedding', 'experience_embedding'
            ]:
                if source_connection.get(field) is not None:
                    update_data[field] = source_connection[field]
            
            # If embeddings are copied, update the embedding_generated_at timestamp
            if 'basic_info_embedding' in update_data or 'experience_embedding' in update_data:
                update_data['embedding_generated_at'] = datetime.now(timezone.utc).isoformat()
            
            # Update the target connection
            response = await self.supabase_client.table("connections").update(update_data).eq(
                "id", target_connection_id
            ).execute()
            
            if response.data:
                logger.info(f"Successfully copied enrichment data to connection {target_connection_id}")
                return True
            else:
                logger.warning(f"Failed to copy enrichment data to connection {target_connection_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error copying enrichment data: {str(e)}")
            return False
    
    async def check_existing_embeddings_by_url(self, linkedin_url: str) -> Tuple[Dict[str, Any], bool]:
        """
        Check if embeddings already exist for a LinkedIn URL across all users
        
        Args:
            linkedin_url: LinkedIn URL to check
            
        Returns:
            Tuple of (connection_data, exists)
            - connection_data: Dictionary with existing data or None if not found
            - exists: True if connection with this URL exists with enrichment data
        """
        try:
            # Query for any connection with this LinkedIn URL that has enrichment data
            response = await self.supabase_client.table("connections").select(
                "id, linkedin_url, embedding_generated_at, basic_info_embedding, experience_embedding, enriched_at, "
                "experience_json, education_json, skills, headline, about_section, location, company, position, profile_photo_url"
            ).eq("linkedin_url", linkedin_url).not_.is_("enriched_at", None).order("enriched_at", desc=True).limit(1).execute()
            
            if not response.data or len(response.data) == 0:
                return None, False
                
            connection = response.data[0]
            
            # Check if embeddings exist
            has_embeddings = (
                connection.get("basic_info_embedding") is not None and 
                connection.get("experience_embedding") is not None and
                connection.get("embedding_generated_at") is not None
            )
            
            # Profile is enriched (we filtered for this in the query)
            is_enriched = True
            
            # Check if data is complete (has both embeddings and enrichment)
            exists = has_embeddings and is_enriched
            
            if exists:
                logger.info(f"LinkedIn URL {linkedin_url} has existing data from another user")
            
            return connection, exists
            
        except Exception as e:
            logger.error(f"Error checking existing embeddings by URL: {str(e)}")
            return None, False

    async def check_existing_embeddings(self, connection_id: str, linkedin_url: str = None) -> Tuple[Dict[str, Any], bool, bool]:
        """
        Check if embeddings already exist for a connection (by ID or URL)
        
        Args:
            connection_id: Connection ID to check
            linkedin_url: LinkedIn URL to check (optional)
            
        Returns:
            Tuple of (connection_data, exists_for_this_user, exists_for_other_user)
            - connection_data: Dictionary with existing data or None if not found
            - exists_for_this_user: True if connection has embeddings and enrichment data
            - exists_for_other_user: True if data was found from another user's connection
        """
        try:
            # First check by ID (this user's own connection)
            response = await self.supabase_client.table("connections").select(
                "id, linkedin_url, embedding_generated_at, basic_info_embedding, experience_embedding, enriched_at, "
                "experience_json, education_json, skills, headline, about_section, location, company, position, profile_photo_url"
            ).eq("id", connection_id).execute()
            
            exists_for_this_user = False
            if response.data and len(response.data) > 0:
                connection = response.data[0]
                
                # Check if embeddings exist
                has_embeddings = (
                    connection.get("basic_info_embedding") is not None and 
                    connection.get("experience_embedding") is not None and
                    connection.get("embedding_generated_at") is not None
                )
                
                # Check if profile is enriched
                is_enriched = connection.get("enriched_at") is not None
                
                # Check if data is complete (has both embeddings and enrichment)
                exists_for_this_user = has_embeddings and is_enriched
                
                if exists_for_this_user:
                    logger.info(f"Connection {connection_id} already has enrichment data")
                    return connection, True, False
            
            # If LinkedIn URL provided, check if any other user has this connection
            if linkedin_url:
                other_connection, exists_for_other = await self.check_existing_embeddings_by_url(linkedin_url)
                
                # If another user has data for this LinkedIn URL, use it
                if other_connection and exists_for_other:
                    logger.info(f"Found existing data for LinkedIn URL {linkedin_url} from another user")
                    return other_connection, False, True
            
            # Return original connection data (might be None if not found)
            return connection if 'connection' in locals() else None, exists_for_this_user, False
            
        except Exception as e:
            logger.error(f"Error checking existing embeddings: {str(e)}")
            return None, False, False
    
    async def enrich_and_embed_connections(self, user_id: str, connections: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Enrich connections with Apify data and generate embeddings in parallel
        
        Args:
            user_id: User ID
            connections: List of connections with linkedin_url and id
            
        Returns:
            Dictionary with results
        """
        try:
            # Extract LinkedIn URLs
            linkedin_urls = [conn["linkedin_url"] for conn in connections if conn.get("linkedin_url")]
            
            if not linkedin_urls:
                logger.warning("No LinkedIn URLs provided")
                return {
                    "success": False,
                    "message": "No LinkedIn URLs provided",
                    "total": 0,
                    "successful": 0,
                    "failed": 0,
                    "skipped": 0,
                    "stale": 0,
                    "reused": 0
                }
            
            # Create mapping from LinkedIn URL to connection ID
            url_to_id = {conn["linkedin_url"]: conn["id"] for conn in connections if conn.get("linkedin_url") and conn.get("id")}
            
            # Check which connections already have embeddings and enrichment data
            connections_to_process = []
            skipped_count = 0
            reused_count = 0
            
            for url, connection_id in url_to_id.items():
                # Check if this connection already has embeddings or if data exists for this LinkedIn URL from other users
                existing_data, exists_for_this_user, exists_for_other_user = await self.check_existing_embeddings(connection_id, url)
                
                if exists_for_this_user:
                    # Skip this connection as it already has embeddings and enrichment data
                    logger.info(f"Skipping connection {connection_id} as it already has enrichment data")
                    skipped_count += 1
                elif exists_for_other_user:
                    # Reuse data from another user's connection
                    logger.info(f"Reusing data for connection {connection_id} from another user with same LinkedIn URL {url}")
                    # Copy the enrichment data to this connection
                    await self._copy_enrichment_data(existing_data, connection_id)
                    reused_count += 1
                else:
                    # Connection is missing data - process it
                    connections_to_process.append({"linkedin_url": url, "id": connection_id})
            
            if not connections_to_process:
                logger.info("All connections already have enrichment data")
                return {
                    "success": True,
                    "message": "All connections already have enrichment data",
                    "total": len(linkedin_urls),
                    "successful": 0,
                    "failed": 0,
                    "skipped": skipped_count,
                    "stale": 0,
                    "reused": reused_count
                }
            
            # Get URLs for connections that need processing
            urls_to_process = [conn["linkedin_url"] for conn in connections_to_process]
            
            # Initialize counters and tracking
            successful_count = 0
            failed_count = 0
            self.embedding_results = {}
            
            # Initialize embedding queue
            self.embedding_queue = asyncio.Queue()
            
            # Start embedding worker tasks
            embedding_workers = [
                asyncio.create_task(self._embedding_worker(user_id))
                for _ in range(3)  # Create 3 embedding worker tasks
            ]
            
            # Process connections in batches for scraping
            batches = [urls_to_process[i:i + self.scraping_batch_size] 
                      for i in range(0, len(urls_to_process), self.scraping_batch_size)]
            
            logger.info(f"Processing {len(urls_to_process)} connections in {len(batches)} batches")
            
            # Process each batch of URLs
            for batch_idx, batch_urls in enumerate(batches):
                logger.info(f"Processing batch {batch_idx + 1}/{len(batches)} with {len(batch_urls)} URLs")
                
                # Fetch profiles from Apify
                enriched_profiles = await self.fetch_profiles_from_apify(batch_urls)
                
                if not enriched_profiles:
                    logger.warning(f"No profiles enriched from Apify in batch {batch_idx + 1}")
                    failed_count += len(batch_urls)
                    continue
                
                # Queue profiles for embedding generation
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
                    
                    # Queue for embedding generation
                    await self.embedding_queue.put({
                        "connection_id": connection_id,
                        "url": url,
                        "data": extracted_data
                    })
            
            # Signal embedding workers that no more data is coming
            for _ in range(len(embedding_workers)):
                await self.embedding_queue.put(None)
            
            # Wait for all embedding workers to complete
            await asyncio.gather(*embedding_workers)
            
            # Count successful and failed connections
            for connection_id, result in self.embedding_results.items():
                if result.get("success"):
                    successful_count += 1
                else:
                    failed_count += 1
            
            return {
                "success": successful_count > 0 or skipped_count > 0 or reused_count > 0,
                "message": f"Processed {successful_count} profiles successfully, {failed_count} failed, {skipped_count} skipped (existing data), {reused_count} reused from other users",
                "total": len(linkedin_urls),
                "successful": successful_count,
                "failed": failed_count,
                "skipped": skipped_count,
                "stale": 0,
                "reused": reused_count
            }
            
        except Exception as e:
            logger.error(f"Error enriching and embedding connections: {str(e)}")
            return {
                "success": False,
                "message": f"Error: {str(e)}",
                "total": len(connections),
                "successful": 0,
                "failed": len(connections),
                "skipped": 0,
                "stale": 0,
                "reused": 0
            }
    
    async def _embedding_worker(self, user_id: str):
        """
        Worker to process profiles from the queue and generate embeddings
        
        Args:
            user_id: User ID for the connections
        """
        while True:
            # Get a batch of profiles to process
            batch = []
            item = await self.embedding_queue.get()
            
            # None signals end of queue
            if item is None:
                self.embedding_queue.task_done()
                break
            
            # Add first item to batch
            batch.append(item)
            
            # Try to get more items up to batch size
            try:
                for _ in range(self.embedding_batch_size - 1):
                    # Non-blocking get with timeout
                    item = await asyncio.wait_for(self.embedding_queue.get(), 0.1)
                    if item is None:
                        self.embedding_queue.task_done()
                        break
                    batch.append(item)
            except asyncio.TimeoutError:
                # No more items available right now, continue with what we have
                pass
            
            # Process the batch
            await self._process_embedding_batch(batch, user_id)
            
            # Mark tasks as done
            for _ in range(len(batch)):
                self.embedding_queue.task_done()
    
    async def _process_embedding_batch(self, batch: List[Dict], user_id: str):
        """
        Process a batch of profiles for embedding generation
        
        Args:
            batch: List of profiles to process
            user_id: User ID for the connections
        """
        # Process each profile in the batch
        embedding_tasks = []
        for item in batch:
            task = asyncio.create_task(self._process_single_embedding(item, user_id))
            embedding_tasks.append(task)
            
        # Wait for all embedding tasks to complete
        await asyncio.gather(*embedding_tasks)
    
    async def _process_single_embedding(self, item: Dict, user_id: str):
        """
        Process a single profile for embedding generation
        
        Args:
            item: Profile data dictionary
            user_id: User ID for the connection
        """
        connection_id = item["connection_id"]
        url = item["url"]
        extracted_data = item["data"]
        
        try:
            # Generate embeddings
            async with self.embedding_semaphore:
                embeddings = await self.generate_embeddings(extracted_data)
            
            if not embeddings or not embeddings.get("basic_info_embedding") or not embeddings.get("experience_embedding"):
                logger.warning(f"Failed to generate embeddings for {url}")
                self.embedding_results[connection_id] = {"success": False}
                return
            
            # Update connection with enrichment data and embeddings
            update_data = {
                'enriched_at': datetime.now(timezone.utc).isoformat(),
                'enrichment_source': 'apify'
            }
            
            # Add extracted fields
            for field in ['headline', 'about_section', 'experience_json', 'education_json', 'skills',
                         'location', 'company', 'position', 'profile_photo_url']:
                if field in extracted_data and extracted_data[field]:
                    update_data[field] = extracted_data[field]
            
            # Update connection with embeddings
            success = await self.update_connection_embeddings(connection_id, embeddings)
            
            if success:
                # Update connection with enrichment data
                response = await self.supabase_client.table("connections").update(update_data).eq(
                    "id", connection_id
                ).execute()
                
                if response.data:
                    logger.info(f"Successfully updated connection {connection_id}")
                    self.embedding_results[connection_id] = {"success": True}
                else:
                    logger.warning(f"Failed to update connection {connection_id}")
                    self.embedding_results[connection_id] = {"success": False}
            else:
                logger.warning(f"Failed to update embeddings for connection {connection_id}")
                self.embedding_results[connection_id] = {"success": False}
                
        except Exception as e:
            logger.error(f"Error updating connection {connection_id}: {str(e)}")
            self.embedding_results[connection_id] = {"success": False}

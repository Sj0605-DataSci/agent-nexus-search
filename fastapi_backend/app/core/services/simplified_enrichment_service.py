"""
Simplified LinkedIn Profile Enrichment Service
Uses Apify for profile data extraction and Jina for embedding generation
"""
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any, Callable, Tuple, AsyncGenerator
import json
import logging
import os
import re
import traceback
import requests
import aiohttp
import time
from functools import wraps
from collections import deque
from typing import AsyncGenerator, Union

from apify_client import ApifyClient, ApifyClientAsync
from apify_client.errors import ApifyApiError

from app.core.config import settings
from app.core.structured_logger import get_structured_logger
from app.core.services.apify_extractor import extract_apify_profile_data, extract_batch_apify_profiles
from app.core.utils.rate_limiter import jina_rate_limiter

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
        
        # Batch size for Apify API calls
        self.scraping_batch_size = 50  # Process 50 URLs at a time for scraping
        
        # Parallel processing configuration
        self.max_parallel_apify_calls = 32  # Maximum number of parallel Apify API calls (Apify's limit)
        self.max_parallel_embedding_calls = 3  # Maximum number of parallel embedding API calls (reduced to avoid rate limits)
        
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
        Uses async Apify client for true parallelism
        """
        logger.info(f"Fetching {len(linkedin_urls)} profiles from Apify")
        
        # Validate API key
        if not self.apify_api_key:
            logger.error("APIFY_API_KEY not configured")
            return {}
        
        # Initialize Apify async client
        apify_client = ApifyClientAsync(self.apify_api_key)
        
        # Prepare Apify actor input
        run_input = {
            "profileScraperMode": "Profile details no email ($4 per 1k)",
            "queries": linkedin_urls,
        }
        
        # Run the Apify actor and wait for completion
        logger.info(f"Calling Apify actor with {len(linkedin_urls)} URLs")
        run = await apify_client.actor("LpVuK3Zozwuipa5bp").call(run_input=run_input)
        
        if not run or "defaultDatasetId" not in run:
            logger.error("Invalid response from Apify actor")
            return {}
        
        # Fetch results from the dataset
        apify_results = []
        dataset_client = apify_client.dataset(run["defaultDatasetId"])
        async for item in dataset_client.iterate_items():
            apify_results.append(item)
        
        logger.info(f"Apify returned {len(apify_results)} results")
        
        # Extract structured data using our Apify extractor
        extracted_data = extract_batch_apify_profiles(apify_results)
        
        return extracted_data
    
    async def _fetch_profiles_from_apify_parallel(self, linkedin_urls: List[str], max_parallel_calls: int = 32) -> Dict[str, Dict[str, Any]]:
        """
        Implementation of fetching LinkedIn profile data from Apify in parallel batches using direct concurrency
        
        Args:
            linkedin_urls: List of LinkedIn profile URLs
            max_parallel_calls: Maximum number of parallel Apify API calls (default: 32, Apify's limit)
            
        Returns:
            Dictionary mapping LinkedIn URLs to their extracted profile data
        """
        logger.info(f"Fetching {len(linkedin_urls)} profiles from Apify using direct concurrency")
        
        # Validate API key
        if not self.apify_api_key:
            logger.error("APIFY_API_KEY not configured")
            return {}
        
        # Use fixed optimal batch size for Apify (50 URLs per call is optimal based on benchmarks)
        total_urls = len(linkedin_urls)
        optimal_batch_size = self.scraping_batch_size  # 50 URLs per batch
        
        # Split URLs into batches of 50 URLs each
        url_batches = [linkedin_urls[i:i+optimal_batch_size] for i in range(0, total_urls, optimal_batch_size)]
        logger.info(f"Split {total_urls} URLs into {len(url_batches)} batches of {optimal_batch_size} URLs each")
        
        # Define a function to process a batch of URLs
        async def process_batch(batch_urls):
            """Process a single batch of URLs"""
            logger.info(f"Processing batch with {len(batch_urls)} URLs")
            return await self.retry_async(self._fetch_profiles_from_apify_impl, batch_urls)
        
        # Process batches in chunks of max_parallel_calls to avoid overwhelming Apify
        combined_results = {}
        for i in range(0, len(url_batches), max_parallel_calls):
            # Get the next chunk of batches (up to max_parallel_calls)
            current_batches = url_batches[i:i+max_parallel_calls]
            logger.info(f"Processing chunk {i//max_parallel_calls + 1} with {len(current_batches)} batches (each batch has {optimal_batch_size} URLs)")
            
            # Create tasks for the current chunk of batches
            tasks = [process_batch(batch) for batch in current_batches]
            
            # Execute all tasks in this chunk concurrently
            chunk_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results from this chunk
            for result in chunk_results:
                if isinstance(result, Exception):
                    logger.error(f"Error in batch processing: {str(result)}")
                    continue
                    
                if result:
                    combined_results.update(result)
            
            logger.info(f"Completed chunk {i//max_parallel_calls + 1}, got {len(combined_results)} profiles so far")
        
        logger.info(f"Direct concurrent processing complete. Got data for {len(combined_results)} URLs")
        return combined_results
    
    async def fetch_profiles_from_apify(self, linkedin_urls: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Fetch LinkedIn profile data from Apify with retry mechanism and parallel processing
        
        Args:
            linkedin_urls: List of LinkedIn profile URLs
            
        Returns:
            Dictionary mapping LinkedIn URLs to their extracted profile data
        """
        try:
            return await self._fetch_profiles_from_apify_parallel(linkedin_urls, max_parallel_calls=self.max_parallel_apify_calls)
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
            logger.error(f"Error generating embedding: {str(e)}")
            return None
    
    async def generate_batch_embeddings(self, texts: List[str], batch_size: int = 50) -> List[Optional[List[float]]]:
        """
        Generate embeddings for a batch of texts using a single, rate-limited API call.
        
        Args:
            texts: List of texts to generate embeddings for.
            batch_size: (No longer used, kept for compatibility) Size of each batch for API calls.
            
        Returns:
            List of embeddings, one for each text.
        """
        if not texts:
            return []

        # Create a mapping to handle empty/None texts, preserving original list order
        valid_texts = []
        original_indices = []
        for i, text in enumerate(texts):
            if text and text.strip():
                valid_texts.append(text)
                original_indices.append(i)

        if not valid_texts:
            return [None] * len(texts)

        # This function will be called by the rate limiter
        async def api_call(texts_to_embed: List[str]):
            url = "https://api.jina.ai/v1/embeddings"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.jina_api_key}",
            }
            data = {
                "model": "jina-embeddings-v3",
                "task": "text-matching",
                "input": texts_to_embed,
            }

            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(url, headers=headers, json=data) as response:
                        response_text = await response.text()
                        if response.status != 200:
                            if "token rate limit exceeded" in response_text.lower():
                                raise Exception(f"Token rate limit exceeded: {response_text}")
                            else:
                                logger.error(f"Error generating embeddings: {response_text}")
                                return None
                        
                        result = json.loads(response_text)
                        if "data" not in result:
                            logger.error(f"Invalid response from Jina API: {result}")
                            return None
                        return [item["embedding"] for item in result["data"]]
            except aiohttp.ClientError as e:
                logger.error(f"Network error calling Jina API: {str(e)}")
                raise Exception(f"Network error: {str(e)}")
            except Exception as e:
                logger.error(f"An unexpected error occurred during API call: {str(e)}")
                raise

        # Execute the single API call for all valid texts via the rate limiter
        try:
            logger.info(f"Sending {len(valid_texts)} texts to Jina API in a single batch.")
            embeddings = await jina_rate_limiter.execute_with_rate_limit(api_call, valid_texts)
        except Exception as e:
            logger.error(f"Failed to generate embeddings after rate limiting: {str(e)}")
            embeddings = None

        # Map the results back to the original list structure
        final_embeddings = [None] * len(texts)
        if embeddings and len(embeddings) == len(original_indices):
            for i, embedding in enumerate(embeddings):
                original_idx = original_indices[i]
                final_embeddings[original_idx] = embedding
        else:
            logger.warning("Mismatch in returned embeddings count or API call failed.")

        return final_embeddings
    
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
    
    async def enrich_connections(self, user_id: str, connections: List[Dict[str, Any]], yield_batches: bool = False) -> Union[Dict[str, Any], AsyncGenerator[Dict[str, Any], None]]:
        """
        Enrich connections with Apify data only (no embedding generation)
        
        Args:
            user_id: User ID
            connections: List of connections with linkedin_url and id
            yield_batches: If True, yield results after each batch for parallel processing
            
        Returns:
            If yield_batches is False: Dictionary with results
            If yield_batches is True: AsyncGenerator yielding batch results
        """
        try:
            # Extract LinkedIn URLs
            linkedin_urls = [conn["linkedin_url"] for conn in connections if conn.get("linkedin_url")]
            connection_ids = [conn["id"] for conn in connections if conn.get("id")]
            
            if not linkedin_urls:
                logger.warning("No LinkedIn URLs provided")
                if yield_batches:
                    # For async generator, we need to yield instead of return
                    yield {
                        "success": False,
                        "message": "No LinkedIn URLs provided",
                        "total": 0,
                        "successful": 0,
                        "failed": 0,
                        "skipped": 0,
                        "reused": 0,
                        "batch_idx": 0,
                        "total_batches": 0,
                        "enriched_connections": []
                    }
                else:
                    yield {
                        "success": False,
                        "message": "No LinkedIn URLs provided",
                        "total": 0,
                        "successful": 0,
                        "failed": 0,
                        "skipped": 0,
                        "reused": 0
                    }
            
            # Create mapping from LinkedIn URL to connection ID
            url_to_id = {conn["linkedin_url"]: conn["id"] for conn in connections if conn.get("linkedin_url") and conn.get("id")}
            id_to_url = {conn["id"]: conn["linkedin_url"] for conn in connections if conn.get("linkedin_url") and conn.get("id")}
            
            # Use the connections data directly from the input parameter
            logger.info(f"Processing {len(connections)} connections")
            
            # Create mapping for quick lookups - we only need to check if enriched_at and embedding_generated_at exist
            # We'll use the data that's already in the connections parameter
            connection_data_by_id = {}
            for conn in connections:
                if conn.get("id"):
                    # Get enrichment status from the connection if available
                    has_enrichment = conn.get("enriched_at") is not None
                    has_embeddings = conn.get("embedding_generated_at") is not None
                    
                    # Store this information for quick lookup
                    connection_data_by_id[conn["id"]] = {
                        "id": conn["id"],
                        "linkedin_url": conn.get("linkedin_url"),
                        "enriched_at": conn.get("enriched_at"),
                        "embedding_generated_at": conn.get("embedding_generated_at"),
                        "has_enrichment": has_enrichment,
                        "has_embeddings": has_embeddings
                    }
            
            # BULK FETCH 2: Find existing data from other users by LinkedIn URL
            all_linkedin_urls = list(url_to_id.keys())
            other_users_data = []
            page_size = 100  # Define page_size for batch processing
            
            for i in range(0, len(all_linkedin_urls), page_size):
                batch_urls = all_linkedin_urls[i:i+page_size]
                response = await self.supabase_client.table("connections").select(
                    "id, linkedin_url, embedding_generated_at, basic_info_embedding, experience_embedding, enriched_at, "
                    "experience_json, education_json, skills, headline, about_section, location, company, position, profile_photo_url"
                ).in_("linkedin_url", batch_urls).neq("user_id", user_id).not_.is_("enriched_at", None).not_.is_("embedding_generated_at", None).execute()
                
                if response.data:
                    other_users_data.extend(response.data)
            
            # Create mapping of LinkedIn URL to other users' connection data
            url_to_other_data = {}
            for conn in other_users_data:
                if conn.get("linkedin_url") and self._is_enriched_and_embedded(conn):
                    url_to_other_data[conn["linkedin_url"]] = conn
            
            # Process connections based on the bulk data
            connections_to_process = []
            connections_for_embedding_only = []
            skipped_count = 0
            reused_count = 0
            embedding_only_count = 0
            
            for url, connection_id in url_to_id.items():
                # Check if this user's connection already has data
                conn_data = connection_data_by_id.get(connection_id)
                has_enrichment = conn_data and conn_data.get("has_enrichment")
                has_embeddings = conn_data and conn_data.get("has_embeddings")
                
                if has_enrichment and has_embeddings:
                    # Skip this connection as it already has both enrichment data and embeddings
                    logger.info(f"Skipping connection {connection_id} as it already has enrichment data and embeddings")
                    skipped_count += 1
                elif has_enrichment and not has_embeddings:
                    # Connection has enrichment data but no embeddings
                    logger.info(f"Connection {connection_id} has enrichment data but no embeddings - adding to embedding-only list")
                    
                    # Check if we already have the profile data in the connection object
                    conn_obj = next((c for c in connections if c.get("id") == connection_id), None)
                    
                    # Check if we have enough data to generate meaningful embeddings
                    # We need at least some basic profile info or experience data
                    has_basic_info = conn_obj and any([
                        conn_obj.get("first_name") and conn_obj.get("last_name"),
                        conn_obj.get("headline"),
                        conn_obj.get("about_section"),
                        conn_obj.get("company") and conn_obj.get("position")
                    ])
                    
                    has_experience = conn_obj and conn_obj.get("experience_json") and len(conn_obj.get("experience_json", [])) > 0
                    
                    if conn_obj and (has_basic_info or has_experience):
                        # Use the pre-fetched profile data
                        logger.info(f"Using pre-fetched profile data for connection {connection_id}")
                        connections_for_embedding_only.append(conn_obj)
                        embedding_only_count += 1
                    else:
                        # Fallback: Get the full profile data for embedding generation
                        logger.info(f"Fetching profile data for connection {connection_id}")
                        profile_response = await self.supabase_client.table("connections").select(
                            "id, linkedin_url, headline, about_section, company, position, location, first_name, last_name, experience_json, education_json, skills, profile_photo_url"
                        ).eq("id", connection_id).execute()
                        
                        if profile_response.data:
                            connections_for_embedding_only.append(profile_response.data[0])
                            embedding_only_count += 1
                        else:
                            logger.warning(f"Could not fetch profile data for connection {connection_id}")
                            connections_to_process.append({"linkedin_url": url, "id": connection_id})
                elif url in url_to_other_data:
                    # Reuse data from another user's connection
                    logger.info(f"Reusing data for connection {connection_id} from another user with same LinkedIn URL {url}")
                    # Copy the enrichment data to this connection
                    await self._copy_enrichment_data(url_to_other_data[url], connection_id)
                    reused_count += 1
                else:
                    # Connection is missing data - process it
                    connections_to_process.append({"linkedin_url": url, "id": connection_id})
            
            # Check if we have connections that only need embedding (already enriched)
            if connections_for_embedding_only:
                logger.info(f"Found {len(connections_for_embedding_only)} connections that only need embedding generation")
                # Yield these connections directly for embedding worker to process
                yield {
                    "success": True,
                    "message": "Connections ready for embedding generation",
                    "total": len(connections_for_embedding_only),
                    "connections": connections_for_embedding_only,
                    "embedding_only": True,
                    "task_type": "embedding"
                }
            
            # If there are no connections that need full enrichment, we're done
            if not connections_to_process:
                logger.info("No connections need full enrichment processing")
                yield {
                    "success": True,
                    "message": "No connections need full enrichment processing",
                    "total": len(linkedin_urls),
                    "successful": 0,
                    "failed": 0,
                    "skipped": skipped_count,
                    "reused": reused_count,
                    "enriched_connections": []
                }
                # Return early to avoid unnecessary processing
                return
            
            # Get URLs for connections that need processing
            urls_to_process = [conn["linkedin_url"] for conn in connections_to_process]
            
            # Initialize counters
            successful_count = 0
            failed_count = 0
            
            # Process connections in batches for scraping
            # Process URLs in chunks of 32 parallel calls with 50 URLs each (1600 URLs per chunk)
            logger.info(f"Processing {len(urls_to_process)} connections with direct concurrent Apify calls")
            
            # For tracking overall results if not yielding batches
            all_enriched_connections = []
            
            # Calculate optimal chunk size for maximum parallelism
            # Each chunk will have max_parallel_apify_calls (32) batches of scraping_batch_size (50) URLs
            # This gives us chunks of 1600 URLs that will be processed in parallel
            chunk_size = self.scraping_batch_size * self.max_parallel_apify_calls  # 50 URLs × 32 parallel calls = 1600 URLs
            
            # Split URLs into chunks for processing
            url_chunks = [urls_to_process[i:i + chunk_size] 
                         for i in range(0, len(urls_to_process), chunk_size)]
            
            # Calculate and log expected time savings
            num_batches = len(urls_to_process) / self.scraping_batch_size
            sequential_time = (num_batches * 25) / 60  # 25 seconds per batch of 50 URLs
            parallel_time = (num_batches / self.max_parallel_apify_calls * 25) / 60  # Time with parallelism
            time_saved = sequential_time - parallel_time
            
            logger.info(f"Split {len(urls_to_process)} connections into {len(url_chunks)} chunks of ~{chunk_size} URLs each")
            logger.info(f"Each chunk will use {self.max_parallel_apify_calls} parallel Apify calls with {self.scraping_batch_size} URLs per call")
            logger.info(f"Using maximum parallelism: Processing would take ~{sequential_time:.1f} minutes sequentially vs ~{parallel_time:.1f} minutes with parallelism (saving ~{time_saved:.1f} minutes)")
            
            # Process each chunk
            for chunk_idx, chunk_urls in enumerate(url_chunks):
                logger.info(f"Processing chunk {chunk_idx + 1}/{len(url_chunks)} with {len(chunk_urls)} URLs")
                
                # Fetch profiles from Apify using direct concurrency
                enriched_profiles = await self.fetch_profiles_from_apify(chunk_urls)
                
                # Process the enriched profiles from this chunk
                if not enriched_profiles:
                    logger.warning(f"No profiles enriched from Apify in chunk {chunk_idx + 1}")
                    failed_count += len(chunk_urls)
                    continue
                
                # Process the entire chunk at once for yielding results if needed
                if yield_batches:
                    # We're processing the entire chunk (1600 URLs) as a single batch for embedding
                    logger.info(f"Processing chunk {chunk_idx + 1}/{len(url_chunks)} with {len(chunk_urls)} URLs as a single batch for embedding")
                    
                    # Filter enriched profiles for this chunk
                    chunk_enriched_profiles = {url: enriched_profiles.get(url) for url in chunk_urls if url in enriched_profiles}
                    
                    # Track chunk results
                    chunk_successful = 0
                    chunk_failed = 0
                    chunk_enriched_connections = []
                    
                    # Process each profile in this chunk
                    for url in chunk_urls:
                        profile_data = chunk_enriched_profiles.get(url)
                        connection_id = url_to_id.get(url)
                        
                        if not profile_data:
                            logger.warning(f"No data for {url}")
                            failed_count += 1
                            chunk_failed += 1
                            continue
                            
                        if not connection_id:
                            logger.warning(f"No connection ID for {url}")
                            failed_count += 1
                            chunk_failed += 1
                            continue
                            
                        # Save the extracted data to Supabase
                        update_data = {
                            'enriched_at': datetime.now(timezone.utc).isoformat(),
                            'enrichment_source': 'apify'
                        }
                        
                        # Add extracted fields
                        for field in ['headline', 'about_section', 'experience_json', 'education_json', 'skills',
                                    'location', 'company', 'position', 'profile_photo_url']:
                            if field in profile_data and profile_data[field]:
                                update_data[field] = profile_data[field]
                            
                        # Update connection with enrichment data
                        try:
                            response = await self.supabase_client.table("connections").update(update_data).eq(
                                "id", connection_id
                            ).execute()
                            
                            if response.data:
                                logger.info(f"Successfully saved profile data for connection {connection_id}")
                                successful_count += 1
                                chunk_successful += 1
                                
                                # Add to chunk results with profile data for embedding
                                enriched_connection = {
                                    "id": connection_id,
                                    "linkedin_url": url,
                                    "profile_data": update_data
                                }
                                chunk_enriched_connections.append(enriched_connection)
                                all_enriched_connections.append(enriched_connection)
                            else:
                                logger.warning(f"Failed to save profile data for connection {connection_id}")
                                failed_count += 1
                                chunk_failed += 1
                        except Exception as e:
                            logger.error(f"Error saving profile data for connection {connection_id}: {str(e)}")
                            failed_count += 1
                            chunk_failed += 1
                        
                    # After processing all profiles in the chunk, yield the chunk result
                    if chunk_idx == 0:
                        # For the first chunk, include skipped/reused counts
                        chunk_result = {
                            "success": chunk_successful > 0 or skipped_count > 0 or reused_count > 0,
                            "message": f"Chunk {chunk_idx + 1}/{len(url_chunks)}: {chunk_successful} profiles enriched, {chunk_failed} failed, {skipped_count} skipped, {reused_count} reused",
                            "batch_idx": chunk_idx + 1,  # Keep batch_idx for backward compatibility
                            "total_batches": len(url_chunks),
                            "successful": chunk_successful,
                            "failed": chunk_failed,
                            "skipped": skipped_count,
                            "reused": reused_count,
                            "enriched_connections": chunk_enriched_connections
                        }
                    else:
                        chunk_result = {
                            "success": chunk_successful > 0,
                            "message": f"Chunk {chunk_idx + 1}/{len(url_chunks)}: {chunk_successful} profiles enriched, {chunk_failed} failed",
                            "batch_idx": chunk_idx + 1,
                            "total_batches": len(url_chunks),
                            "successful": chunk_successful,
                            "failed": chunk_failed,
                            "skipped": 0,  # Only count skipped in first chunk
                            "reused": 0,    # Only count reused in first chunk
                            "enriched_connections": chunk_enriched_connections
                        }
                    
                    logger.info(f"Yielding chunk {chunk_idx + 1}/{len(url_chunks)} with {len(chunk_enriched_connections)} enriched connections for embedding")
                    yield chunk_result
                else:
                    # If not yielding chunks, process all profiles in this chunk
                    chunk_successful = 0
                    chunk_failed = 0
                    chunk_enriched_connections = []
                    
                    # Process each profile and save to database
                    for url, profile_data in enriched_profiles.items():
                        if not profile_data:
                            logger.warning(f"No data for {url}")
                            failed_count += 1
                            chunk_failed += 1
                            continue
                        
                        connection_id = url_to_id.get(url)
                        if not connection_id:
                            logger.warning(f"No connection ID for {url}")
                            failed_count += 1
                            chunk_failed += 1
                            continue
                    
                        # Save the extracted data to Supabase
                        update_data = {
                            'enriched_at': datetime.now(timezone.utc).isoformat(),
                            'enrichment_source': 'apify'
                        }
                    
                        # Add extracted fields
                        for field in ['headline', 'about_section', 'experience_json', 'education_json', 'skills',
                                    'location', 'company', 'position', 'profile_photo_url']:
                            if field in profile_data and profile_data[field]:
                                update_data[field] = profile_data[field]
                        
                        # Update connection with enrichment data
                        try:
                            response = await self.supabase_client.table("connections").update(update_data).eq(
                                "id", connection_id
                            ).execute()
                            
                            if response.data:
                                logger.info(f"Successfully saved profile data for connection {connection_id}")
                                successful_count += 1
                                chunk_successful += 1
                                
                                # Add to chunk results with profile data for embedding
                                enriched_connection = {
                                    "id": connection_id,
                                    "linkedin_url": url,
                                    "profile_data": update_data
                                }
                                chunk_enriched_connections.append(enriched_connection)
                                all_enriched_connections.append(enriched_connection)
                            else:
                                logger.warning(f"Failed to save profile data for connection {connection_id}")
                                failed_count += 1
                                chunk_failed += 1
                        except Exception as e:
                            logger.error(f"Error saving profile data for connection {connection_id}: {str(e)}")
                            failed_count += 1
                            chunk_failed += 1
                
            # If we're yielding batches, we've already yielded all results
            # If not yielding batches, yield final summary
            if not yield_batches:
                yield {
                    "success": successful_count > 0 or skipped_count > 0 or reused_count > 0,
                    "message": f"Processed {successful_count} profiles successfully, {failed_count} failed, {skipped_count} skipped (existing data), {reused_count} reused from other users",
                    "total": len(linkedin_urls),
                    "successful": successful_count,
                    "failed": failed_count,
                    "skipped": skipped_count,
                    "reused": reused_count,
                    "enriched_connections": all_enriched_connections
                }
            # For async generator, we need to end without a return value
            
        except Exception as e:
            logger.error(f"Error enriching connections: {str(e)}")
            if yield_batches:
                # For async generator, yield error result
                yield {
                    "success": False,
                    "message": f"Error: {str(e)}",
                    "total": len(connections),
                    "successful": 0,
                    "failed": len(connections),
                    "skipped": 0,
                    "reused": 0,
                    "batch_idx": 0,
                    "total_batches": 0,
                    "enriched_connections": []
                }
            else:
                yield {
                    "success": False,
                    "message": f"Error: {str(e)}",
                    "total": len(connections),
                    "successful": 0,
                    "failed": len(connections),
                    "skipped": 0,
                    "reused": 0
                }
    
    async def generate_and_save_embeddings(self, connection_id: str, profile_data: Dict[str, Any], url: str = None) -> bool:
        """
        Generate embeddings for a profile and save them to the database
        
        Args:
            connection_id: Connection ID to update
            profile_data: Profile data to generate embeddings for
            url: LinkedIn URL (for logging purposes)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Generate text for each section
            basic_info_text = self.create_basic_info_text(profile_data)
            experience_text = self.create_experience_text(profile_data.get("experience_json", []))
            
            # Generate embeddings for each section
            basic_info_embedding = await self.generate_embedding(basic_info_text)
            experience_embedding = await self.generate_embedding(experience_text)
            
            if not basic_info_embedding or not experience_embedding:
                logger.warning(f"Failed to generate embeddings for connection {connection_id}")
                return False
            
            # Update connection with embeddings
            embeddings = {
                "basic_info_embedding": basic_info_embedding,
                "experience_embedding": experience_embedding,
                "embedding_generated_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Update connection with embeddings
            response = await self.supabase_client.table("connections").update(embeddings).eq(
                "id", connection_id
            ).execute()
            
            if response.data:
                logger.info(f"Successfully updated embeddings for connection {connection_id}")
                return True
            else:
                logger.warning(f"Failed to update embeddings for connection {connection_id}")
                return False
                
        except Exception as e:
            logger.error(f"Error generating embeddings for connection {connection_id}: {str(e)}")
            return False
    
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

    def _is_enriched_and_embedded(self, connection: Dict[str, Any]) -> bool:
        """
        Check if a connection has both enrichment data and embeddings
        
        Args:
            connection: Connection data dictionary
            
        Returns:
            True if connection has both enrichment data and embeddings
        """
        # Check if embeddings exist
        has_embeddings = (
            connection.get("embedding_generated_at") is not None
        )
        
        # Check if profile is enriched
        is_enriched = connection.get("enriched_at") is not None
        
        # Check if data is complete (has both embeddings and enrichment)
        return has_embeddings and is_enriched
    
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
                exists_for_this_user = self._is_enriched_and_embedded(connection)
                
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
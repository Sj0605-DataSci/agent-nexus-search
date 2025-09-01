"""LinkedIn Profile Enrichment Service
Unified service supporting both Apify and Tavily with automatic fallback routing
Integrates: Apify -> Tavily (fallback) -> Profile extraction -> Database storage
"""
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from tavily import TavilyClient
from apify_client import ApifyClient
import vecs
from urllib.parse import quote_plus
from app.core.structured_logger import get_structured_logger
from app.core.config import settings
from improved_profile_extractor import extract_batch_linkedin_profile_data
from app.core.services.apify_extractor import extract_batch_apify_profiles, extract_apify_profile_data
# Use Gemini embedding model with correct API
from google import genai
client = genai.Client(api_key=settings.GOOGLE_API_KEY)
tavily_client = TavilyClient(api_key=settings.TAVILY_API_KEY)
# Don't initialize apify_client at module level - causes Gunicorn issues
# apify_client = ApifyClient(settings.APIFY_API_KEY)

logger = get_structured_logger(__name__)

class LinkedInEnrichmentService:
    """Unified LinkedIn Profile Enrichment Service with Apify and Tavily support"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls, client=None):
        """Singleton pattern implementation"""
        if cls._instance is None:
            cls._instance = super(LinkedInEnrichmentService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self, client=None):
        """Initialize the service with a Supabase client if provided"""
        # Only initialize once
        if not self._initialized and client is not None:
            self.client = client
            self._vecs_client = None
            self._linkedin_profiles_collection = None
            self._apify_enabled = hasattr(settings, 'APIFY_API_KEY') and settings.APIFY_API_KEY
            self._tavily_enabled = hasattr(settings, 'TAVILY_API_KEY') and settings.TAVILY_API_KEY
            
            # Concurrency control for parallel batch processing
            self._max_concurrent_apify_batches = 3  # Process max 3 batches simultaneously
            self._semaphore_apify = asyncio.Semaphore(self._max_concurrent_apify_batches)
            
            self._initialized = True
        # If client is provided and we're already initialized, update the client
        elif client is not None:
            self.client = client
    
    async def _get_vecs_collection(self):
        """Initialize and get vecs collection for LinkedIn profiles"""
        if self._vecs_client is None:
            # Use the same URL construction pattern as the main database connection
            if settings.SUPABASE_USER and settings.SUPABASE_PASSWORD and settings.SUPABASE_HOST and settings.SUPABASE_PORT and settings.SUPABASE_DBNAME:
                # Construct URL with proper encoding (same as database.py)
                db_url = f"postgresql://{settings.SUPABASE_USER}:{quote_plus(settings.SUPABASE_PASSWORD)}@{settings.SUPABASE_HOST}:{settings.SUPABASE_PORT}/{settings.SUPABASE_DBNAME}?sslmode=require"
                logger.info(f"Using constructed database URL for vector DB")
            else:
                # Fallback to DATABASE_URL
                db_url = settings.DATABASE_URL
                if not db_url:
                    logger.error("DATABASE_URL not configured for vector database")
                    return None
                
            self._vecs_client = vecs.create_client(db_url)
        
        if self._linkedin_profiles_collection is None:
            # Create or get collection with HNSW index
            self._linkedin_profiles_collection = self._vecs_client.get_or_create_collection(
                name="linkedin_profiles",
                dimension=768,  # Gemini embedding dimension
                index_method="hnsw",
                index_options={
                    "m": 16,
                    "ef_construction": 64
                }
            )
        
        return self._linkedin_profiles_collection
            
    async def enrich_batch_profiles(self, linkedin_urls: List[str], max_retries: int = 2, preferred_method: str = "apify") -> Dict[str, Any]:
        """
        Enrich multiple LinkedIn profiles using Apify (primary) with Tavily fallback
        
        Args:
            linkedin_urls: List of LinkedIn profile URLs (max 1000 for Apify, 10 for Tavily)
            max_retries: Maximum retry attempts for failed URLs
            preferred_method: "apify", "tavily", or "auto" (tries Apify first, then Tavily)
            
        Returns:
            Dict with successful and failed results
        """
        # Limit to first 50 URLs for testing
        original_count = len(linkedin_urls)
        if len(linkedin_urls) > 50:
            linkedin_urls = linkedin_urls[:50]
            logger.info(f"Limited enrichment to first 50 URLs for testing (original: {original_count})")
        
        successful_results = []
        failed_urls = []
        
        # Try Apify first if enabled and preferred
        if preferred_method in ["apify", "auto"] and self._apify_enabled:
            logger.info(f"Attempting Apify enrichment for {len(linkedin_urls)} URLs")
            
            # Split URLs into batches of 50 for parallel processing
            batches = [linkedin_urls[i:i + 50] for i in range(0, len(linkedin_urls), 50)]
            logger.info(f"Created {len(batches)} batches of ~50 URLs each for parallel processing")
            
            # Process batches in parallel with concurrency control
            batch_tasks = [self._enrich_batch_via_apify_with_semaphore(batch, i+1) for i, batch in enumerate(batches)]
            batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
            
            # Collect results from all batches
            processed_urls = set()
            for i, batch_result in enumerate(batch_results):
                if isinstance(batch_result, Exception):
                    logger.error(f"Error in Apify batch {i+1}: {str(batch_result)}")
                    # Add all URLs from failed batch to failed_urls
                    failed_urls.extend(batches[i])
                    continue
                
                # Process successful results
                for url in batch_result["successful_urls"]:
                    if url not in processed_urls:
                        successful_results.append({
                            "url": url,
                            "data": batch_result["data"][url],
                            "method": "apify",
                            "batch": i+1
                        })
                        processed_urls.add(url)
                
                # Add URLs that weren't successfully processed to failed_urls
                for url in batches[i]:
                    if url not in processed_urls:
                        failed_urls.append(url)
            
            logger.info(f"Apify parallel processing: {len(successful_results)} successful, {len(failed_urls)} failed from {len(batches)} batches")
        else:
            failed_urls = linkedin_urls.copy()
        
        # Fallback to Tavily for failed URLs if enabled
        if failed_urls and self._tavily_enabled and preferred_method in ["tavily", "auto"]:
            logger.info(f"Falling back to Tavily for {len(failed_urls)} failed URLs")
            
            # Limit Tavily batch to 10 URLs
            tavily_urls = failed_urls[:10]
            remaining_failed = failed_urls[10:] if len(failed_urls) > 10 else []
            
            tavily_results = await self._enrich_batch_via_tavily(tavily_urls, max_retries)
            
            # Add Tavily successes
            for result in tavily_results["successful"]:
                result["method"] = "tavily"
                successful_results.append(result)
            
            # Update failed URLs
            failed_urls = tavily_results["failed"] + remaining_failed
            
            logger.info(f"Tavily fallback: {len(tavily_results['successful'])} additional successful")
        
        return {
            "successful": successful_results,
            "failed": failed_urls,
            "total_processed": len(linkedin_urls),
            "success_count": len(successful_results),
            "failure_count": len(failed_urls),
            "methods_used": list(set([r["method"] for r in successful_results]))
        }

    async def enrich_single_profile(self, linkedin_url: str, preferred_method: str = "auto") -> Optional[Dict[str, Any]]:
        """
        Enrich a single LinkedIn profile using Apify (primary) with Tavily fallback
        
        Args:
            linkedin_url: LinkedIn profile URL
            preferred_method: "apify", "tavily", or "auto" (tries Apify first, then Tavily)
            
        Returns:
            Dict with extracted profile data or None if failed
        """
        try:
            # Use batch processing for single URL
            batch_result = await self.enrich_batch_profiles([linkedin_url], preferred_method=preferred_method)
            
            if batch_result["success_count"] > 0:
                return batch_result["successful"][0]["data"]
            else:
                return None
            
        except Exception as e:
            logger.error(f"Error enriching single profile {linkedin_url}: {str(e)}")
            return None

    async def _enrich_batch_via_apify_with_semaphore(self, linkedin_urls: List[str], batch_number: int) -> Dict[str, Any]:
        async with self._semaphore_apify:
            return await self._enrich_batch_via_apify(linkedin_urls)

    async def _enrich_batch_via_apify(self, linkedin_urls: List[str]) -> Dict[str, Any]:
        """
        Enrich profiles using Apify LinkedIn scraper
        
        Args:
            linkedin_urls: List of LinkedIn profile URLs (max 1000)
            
        Returns:
            Dict with successful URLs and extracted data
        """
        try:
            logger.info(f"Starting Apify enrichment for {len(linkedin_urls)} URLs")
            
            # Validate API key before making request
            if not settings.APIFY_API_KEY:
                raise ValueError("APIFY_API_KEY not configured")
            
            # Initialize Apify client inside the worker process
            apify_client = ApifyClient(settings.APIFY_API_KEY)
            
            # Prepare Apify actor input
            run_input = {
                "profileScraperMode": "Profile details no email ($4 per 1k)",
                "queries": linkedin_urls,
            }
            
            # Run the Apify actor and wait for completion
            logger.info(f"Calling Apify actor with {len(linkedin_urls)} URLs")
            run = apify_client.actor("LpVuK3Zozwuipa5bp").call(run_input=run_input)
            
            if not run or "defaultDatasetId" not in run:
                raise ValueError("Invalid response from Apify actor")
            
            # Fetch results from the dataset
            apify_results = []
            for item in apify_client.dataset(run["defaultDatasetId"]).iterate_items():
                apify_results.append(item)
            
            logger.info(f"Apify returned {len(apify_results)} results")
            
            # Extract structured data using our Apify extractor
            extracted_data = extract_batch_apify_profiles(apify_results)
            
            successful_urls = [url for url, data in extracted_data.items() if data is not None]
            
            return {
                "successful_urls": successful_urls,
                "data": extracted_data,
                "total_results": len(apify_results)
            }
            
        except Exception as e:
            error_msg = f"Error in Apify enrichment: {str(e)}"
            logger.error(error_msg)
            logger.error(f"Apify API Key configured: {bool(settings.APIFY_API_KEY)}")
            logger.error(f"Error type: {type(e).__name__}")
            return {
                "successful_urls": [],
                "data": {},
                "total_results": 0
            }

    async def _enrich_batch_via_tavily(self, linkedin_urls: List[str], max_retries: int = 2) -> Dict[str, Any]:
        """
        Enrich profiles using Tavily search (fallback method)
        
        Args:
            linkedin_urls: List of LinkedIn profile URLs (max 10)
            max_retries: Maximum retry attempts for failed URLs
            
        Returns:
            Dict with successful and failed results
        """
        successful_results = []
        failed_urls = []
        retry_urls = linkedin_urls.copy()
        
        for attempt in range(max_retries + 1):
            if not retry_urls:
                break
                
            logger.info(f"Tavily batch processing attempt {attempt + 1}, URLs: {len(retry_urls)}")
            
            # Get profile contents via Tavily batch extract
            batch_contents = await self._get_batch_profile_contents_via_tavily(retry_urls)
            
            # Extract structured data from all profiles in batch
            batch_extracted_data = extract_batch_linkedin_profile_data(batch_contents)
            
            current_retry_urls = []
            
            for url in retry_urls:
                extracted_data = batch_extracted_data.get(url)
                
                if extracted_data:
                    successful_results.append({
                        "url": url,
                        "data": extracted_data,
                        "attempt": attempt + 1
                    })
                    logger.info(f"Successfully enriched profile {url} on attempt {attempt + 1}")
                else:
                    logger.warning(f"Failed to extract data from {url}")
                    if attempt < max_retries:
                        current_retry_urls.append(url)
                    else:
                        failed_urls.append(url)
            
            retry_urls = current_retry_urls
            
            # Add delay between retry attempts
            if retry_urls and attempt < max_retries:
                await asyncio.sleep(2)
        
        return {
            "successful": successful_results,
            "failed": failed_urls
        }
    
    async def _get_batch_profile_contents_via_tavily(self, linkedin_urls: List[str]) -> Dict[str, str]:
        """
        Get LinkedIn profile contents in batch using Tavily Python client
        
        Args:
            linkedin_urls: List of LinkedIn profile URLs (max 10)
            
        Returns:
            Dict mapping URL to raw content for successful extractions
        """
        try:
            # Use Tavily extract method for batch URLs
            response = tavily_client.extract(
                urls=linkedin_urls,
                extract_depth="advanced"
            )
            
            url_to_content = {}
            
            if response and "results" in response:
                results = response["results"]
                for result in results:
                    url = result.get("url", "")
                    raw_content = result.get("raw_content", "")
                    
                    if url and raw_content:
                        url_to_content[url] = raw_content
                    elif url:
                        logger.warning(f"No raw content found for {url}")
                
                # Check for failed results
                failed_results = response.get("failed_results", [])
                if failed_results:
                    logger.warning(f"Failed to extract {len(failed_results)} URLs: {failed_results}")
                
                logger.info(f"Successfully extracted {len(url_to_content)} out of {len(linkedin_urls)} profiles")
                return url_to_content
            else:
                logger.error(f"Invalid response from Tavily batch extract")
                return {}
                
        except Exception as e:
            logger.error(f"Error fetching batch profile contents via Tavily: {str(e)}")
            return {}

    async def _get_profile_content_via_tavily(self, linkedin_url: str) -> Optional[str]:
        """
        Get LinkedIn profile content using Tavily Python client (single URL)
        
        Args:
            linkedin_url: LinkedIn profile URL
            
        Returns:
            Raw profile content or None if failed
        """
        batch_result = await self._get_batch_profile_contents_via_tavily([linkedin_url])
        return batch_result.get(linkedin_url)
    
    async def generate_embeddings_for_user(self, user_id: str):
        """
        Generate embeddings for all profiles of a user using Gemini and store in vecs
        
        Args:
            user_id: User ID to generate embeddings for
        """
        try:
            # Get vecs collection
            collection = await self._get_vecs_collection()
            
            # Get all profiles for user
            response = await self.client.table("connections").select(
                "id, first_name, last_name, headline, about_section, experience_json, education_json, skills, linkedin_url"
            ).eq("user_id", user_id).execute()
            
            if not response.data:
                logger.info(f"No profiles found for user {user_id}")
            
            for profile in response.data:
                try:
                    # Create comprehensive profile text
                    profile_text = self._create_profile_text(profile)
                    
                    # Generate embedding using Gemini
                    embedding = await self._generate_gemini_embedding(profile_text)
                    
                    if embedding:
                        # Store embedding in vecs with metadata
                        collection.upsert([
                            (
                                str(profile["id"]),  # Use connection ID as key
                                embedding,
                                {
                                    "user_id": user_id,
                                }
                            )
                        ])
                        
                        # Update connections table to mark embedding as generated
                        await self.client.table("connections").update({
                            "embedding_generated_at": datetime.now().isoformat()
                        }).eq("id", profile["id"]).execute()
                        
                        logger.info(f"Generated and stored embedding for profile {profile['id']} in vecs")
                    
                    # Rate limiting
                    await asyncio.sleep(0.5)
                    
                except Exception as e:
                    logger.error(f"Error processing profile {profile.get('id')}: {str(e)}")
                    continue
                    
        except Exception as e:
            logger.error(f"Error generating embeddings for user {user_id}: {str(e)}")
    
    def _create_profile_text(self, profile: Dict) -> str:
        """
        Create comprehensive profile text for embedding generation
        
        Args:
            profile: Profile data dictionary
            
        Returns:
            Formatted profile text
        """
        parts = []
        
        # Basic info
        name = f"{profile.get('first_name', '')} {profile.get('last_name', '')}".strip()
        if name:
            parts.append(f"Name: {name}")
            
        if profile.get('headline'):
            parts.append(f"Headline: {profile['headline']}")
            
        # About section
        if profile.get('about_section'):
            parts.append(f"About: {profile['about_section']}")
            
        # Experience
        experience_json = profile.get('experience_json', [])
        if experience_json and isinstance(experience_json, list):
            exp_texts = []
            for exp in experience_json[:5]:  # Limit to top 5 experiences
                if isinstance(exp, dict):
                    exp_text = f"{exp.get('position', '')} at {exp.get('company', '')}"
                    if exp.get('description'):
                        exp_text += f": {exp['description']}"
                    exp_texts.append(exp_text)
            
            if exp_texts:
                parts.append(f"Experience: {'; '.join(exp_texts)}")
        
        # Education
        education_json = profile.get('education_json', [])
        if education_json and isinstance(education_json, list):
            edu_texts = []
            for edu in education_json[:3]:  # Limit to top 3 education entries
                if isinstance(edu, dict):
                    edu_text = f"{edu.get('degree', '')} from {edu.get('institution', '')}"
                    edu_texts.append(edu_text)
            
            if edu_texts:
                parts.append(f"Education: {'; '.join(edu_texts)}")
        
        # Skills
        skills = profile.get('skills', [])
        if skills and isinstance(skills, list):
            skills_text = ', '.join(skills[:10])  # Limit to top 10 skills
            parts.append(f"Skills: {skills_text}")
        
        return '\n'.join(parts)
    
    async def _generate_gemini_embedding(self, text: str) -> Optional[List[float]]:
        """
        Generate embedding using Gemini API
        
        Args:
            text: Text to generate embedding for
            
        Returns:
            Embedding vector or None if failed
        """
        try:
            result = client.models.embed_content(
                model="gemini-embedding-001",
                contents=text
            )
            
            # Return the first embedding from the result
            if result.embeddings and len(result.embeddings) > 0:
                return result.embeddings[0].values
            else:
                return None
            
        except Exception as e:
            logger.error(f"Error generating Gemini embedding: {str(e)}")
            return None

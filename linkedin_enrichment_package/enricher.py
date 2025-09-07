"""
Main LinkedIn Profile Enricher class
Provides a clean API interface for enriching LinkedIn profiles
"""
import asyncio
import time
from typing import List, Dict, Any, Optional
from apify_client import ApifyClient
from tavily import TavilyClient
import httpx

from .models import EnrichmentConfig, ProfileData, EnrichmentResult, BatchEnrichmentResult
from .extractors import ApifyExtractor, TavilyExtractor
from .exceptions import EnrichmentError, APIKeyError, RateLimitError, NetworkError

class LinkedInProfileEnricher:
    """
    Main enricher class that provides a clean API for LinkedIn profile enrichment
    """
    
    def __init__(self, config: Optional[EnrichmentConfig] = None):
        """
        Initialize the enricher
        
        Args:
            config: EnrichmentConfig object with API keys and settings
        """
        self.config = config or EnrichmentConfig()
        self._apify_client = None
        self._tavily_client = None
        self._http_client = None
        
        # Initialize clients if API keys are available
        self._initialize_clients()
    
    def _initialize_clients(self):
        """Initialize API clients based on available keys"""
        if self.config.apify_api_key:
            try:
                self._apify_client = ApifyClient(self.config.apify_api_key)
            except Exception as e:
                print(f"Warning: Failed to initialize Apify client: {e}")
        
        if self.config.tavily_api_key:
            try:
                self._tavily_client = TavilyClient(api_key=self.config.tavily_api_key)
            except Exception as e:
                print(f"Warning: Failed to initialize Tavily client: {e}")
        
        # Initialize HTTP client for general requests
        self._http_client = httpx.AsyncClient(
            timeout=self.config.timeout_seconds,
            follow_redirects=True
        )
    
    async def enrich_profile(self, linkedin_url: str) -> EnrichmentResult:
        """
        Enrich a single LinkedIn profile
        
        Args:
            linkedin_url: LinkedIn profile URL
            
        Returns:
            EnrichmentResult: Result of enrichment operation
        """
        start_time = time.time()
        
        try:
            # Validate URL
            if not self._is_valid_linkedin_url(linkedin_url):
                return EnrichmentResult(
                    success=False,
                    error_message="Invalid LinkedIn URL",
                    processing_time_seconds=time.time() - start_time
                )
            
            # Determine which method to use
            method = self._determine_enrichment_method()
            
            if not method:
                return EnrichmentResult(
                    success=False,
                    error_message="No API keys configured. Please set APIFY_API_KEY or TAVILY_API_KEY",
                    processing_time_seconds=time.time() - start_time
                )
            
            # Try enrichment with retries
            for attempt in range(self.config.max_retries):
                try:
                    if method == "apify":
                        profile_data = await self._enrich_with_apify(linkedin_url)
                    else:  # tavily
                        profile_data = await self._enrich_with_tavily(linkedin_url)
                    
                    return EnrichmentResult(
                        success=True,
                        profile_data=profile_data,
                        method_used=method,
                        processing_time_seconds=time.time() - start_time
                    )
                
                except RateLimitError:
                    if attempt < self.config.max_retries - 1:
                        await asyncio.sleep(self.config.rate_limit_delay * (attempt + 1))
                        continue
                    raise
                
                except Exception as e:
                    if attempt < self.config.max_retries - 1:
                        await asyncio.sleep(1)
                        continue
                    raise
            
            return EnrichmentResult(
                success=False,
                error_message="Max retries exceeded",
                processing_time_seconds=time.time() - start_time
            )
            
        except Exception as e:
            return EnrichmentResult(
                success=False,
                error_message=str(e),
                processing_time_seconds=time.time() - start_time
            )
    
    async def enrich_profiles(self, linkedin_urls: List[str]) -> BatchEnrichmentResult:
        """
        Enrich multiple LinkedIn profiles
        
        Args:
            linkedin_urls: List of LinkedIn profile URLs
            
        Returns:
            BatchEnrichmentResult: Results of batch enrichment operation
        """
        start_time = time.time()
        results = []
        methods_used = []
        
        # Process profiles with rate limiting
        for i, url in enumerate(linkedin_urls):
            result = await self.enrich_profile(url)
            results.append(result)
            
            if result.success and result.method_used:
                methods_used.append(result.method_used)
            
            # Rate limiting between requests
            if i < len(linkedin_urls) - 1:
                await asyncio.sleep(self.config.rate_limit_delay)
        
        # Calculate statistics
        successful_count = sum(1 for r in results if r.success)
        failed_count = len(results) - successful_count
        
        return BatchEnrichmentResult(
            total_processed=len(linkedin_urls),
            successful_count=successful_count,
            failed_count=failed_count,
            results=results,
            methods_used=methods_used,
            total_processing_time_seconds=time.time() - start_time
        )
    
    async def _enrich_with_apify(self, linkedin_url: str) -> ProfileData:
        """Enrich profile using Apify"""
        if not self._apify_client:
            raise APIKeyError("Apify client not initialized")
        
        try:
            # Run the LinkedIn profile scraper
            run_input = {"profiles": [{"url": linkedin_url}]}
            
            run = self._apify_client.actor("apify/linkedin-profile-scraper").call(
                run_input=run_input
            )
            
            # Get results
            items = list(self._apify_client.dataset(run["defaultDatasetId"]).iterate_items())
            
            if not items:
                raise EnrichmentError("No data returned from Apify")
            
            # Extract profile data
            profile_data = ApifyExtractor.extract_profile_data(items[0])
            return profile_data
            
        except Exception as e:
            raise EnrichmentError(f"Apify enrichment failed: {str(e)}")
    
    async def _enrich_with_tavily(self, linkedin_url: str) -> ProfileData:
        """Enrich profile using Tavily"""
        if not self._tavily_client:
            raise APIKeyError("Tavily client not initialized")
        
        try:
            # Use Tavily extract method for direct URL content extraction
            response = self._tavily_client.extract(url=linkedin_url)
            
            # Check if we got content directly
            if response.get("content"):
                combined_content = response["content"]
            else:
                # Fallback to search method if extract doesn't work
                search_response = self._tavily_client.search(
                    query=f"LinkedIn profile {linkedin_url} professional background experience education",
                    search_depth="advanced",
                    max_results=5,
                    include_domains=["linkedin.com"]
                )
                
                if not search_response.get("results"):
                    raise EnrichmentError("No results returned from Tavily")
                
                # Combine content from all results
                combined_content = ""
                for result in search_response["results"]:
                    if result.get("content"):
                        combined_content += result["content"] + "\n\n"
            
            if not combined_content.strip():
                raise EnrichmentError("No content found in Tavily results")
            
            # Extract profile data using the improved extractor
            profile_data = TavilyExtractor.extract_profile_data(combined_content, linkedin_url)
            return profile_data
            
        except Exception as e:
            raise EnrichmentError(f"Tavily enrichment failed: {str(e)}")
    
    def _determine_enrichment_method(self) -> Optional[str]:
        """Determine which enrichment method to use"""
        if self.config.preferred_method == "apify" and self._apify_client:
            return "apify"
        elif self.config.preferred_method == "tavily" and self._tavily_client:
            return "tavily"
        elif self.config.preferred_method == "auto":
            # Auto mode: prefer Apify, fallback to Tavily
            if self._apify_client:
                return "apify"
            elif self._tavily_client:
                return "tavily"
        
        return None
    
    def _is_valid_linkedin_url(self, url: str) -> bool:
        """Validate LinkedIn URL format"""
        if not url:
            return False
        
        # Basic LinkedIn URL validation
        linkedin_patterns = [
            r'https?://(?:www\.)?linkedin\.com/in/[\w-]+/?',
            r'https?://(?:www\.)?linkedin\.com/pub/[\w-]+/[\w-]+/[\w-]+/?'
        ]
        
        import re
        for pattern in linkedin_patterns:
            if re.match(pattern, url):
                return True
        
        return False
    
    def get_available_methods(self) -> List[str]:
        """Get list of available enrichment methods"""
        methods = []
        if self._apify_client:
            methods.append("apify")
        if self._tavily_client:
            methods.append("tavily")
        return methods
    
    def get_config_info(self) -> Dict[str, Any]:
        """Get configuration information"""
        return {
            "apify_enabled": self._apify_client is not None,
            "tavily_enabled": self._tavily_client is not None,
            "preferred_method": self.config.preferred_method,
            "max_retries": self.config.max_retries,
            "timeout_seconds": self.config.timeout_seconds,
            "rate_limit_delay": self.config.rate_limit_delay
        }
    
    async def close(self):
        """Clean up resources"""
        if self._http_client:
            await self._http_client.aclose()


# Convenience functions for easy usage
async def enrich_single_profile(
    linkedin_url: str,
    apify_api_key: Optional[str] = None,
    tavily_api_key: Optional[str] = None,
    preferred_method: str = "auto"
) -> Optional[Dict[str, Any]]:
    """
    Convenience function to enrich a single profile
    
    Returns:
        Dict containing profile data or None if failed
    """
    config = EnrichmentConfig(
        apify_api_key=apify_api_key,
        tavily_api_key=tavily_api_key,
        preferred_method=preferred_method
    )
    
    enricher = LinkedInProfileEnricher(config)
    
    try:
        result = await enricher.enrich_profile(linkedin_url)
        if result.success and result.profile_data:
            return result.to_dict()
        return None
    finally:
        await enricher.close()


async def enrich_multiple_profiles(
    linkedin_urls: List[str],
    apify_api_key: Optional[str] = None,
    tavily_api_key: Optional[str] = None,
    preferred_method: str = "auto"
) -> Dict[str, Any]:
    """
    Convenience function to enrich multiple profiles
    
    Returns:
        Dict containing batch results
    """
    config = EnrichmentConfig(
        apify_api_key=apify_api_key,
        tavily_api_key=tavily_api_key,
        preferred_method=preferred_method
    )
    
    enricher = LinkedInProfileEnricher(config)
    
    try:
        result = await enricher.enrich_profiles(linkedin_urls)
        return result.to_dict()
    finally:
        await enricher.close()

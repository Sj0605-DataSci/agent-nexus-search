# LinkedIn Enrichment Package

A robust, standalone Python package for enriching LinkedIn profiles using multiple data sources including Apify and Tavily with intelligent fallback mechanisms.

## Features

- **Multi-source enrichment**: Supports both Apify and Tavily APIs
- **Intelligent routing**: Auto-fallback from Apify to Tavily
- **Robust extraction**: Handles both JSON (Apify) and Markdown (Tavily) formats
- **Rate limiting**: Built-in rate limiting and retry mechanisms
- **Clean API**: Simple interface for single and batch profile enrichment
- **Error handling**: Comprehensive error handling with detailed messages
- **Async support**: Full async/await support for high performance

## Installation

```bash
pip install -r requirements.txt
```

## Quick Start

```python
import asyncio
from linkedin_enrichment_package import LinkedInProfileEnricher, EnrichmentConfig

# Configure with your API keys
config = EnrichmentConfig(
    apify_api_key="your_apify_key",
    tavily_api_key="your_tavily_key",
    preferred_method="auto"  # or "apify" or "tavily"
)

# Initialize enricher
enricher = LinkedInProfileEnricher(config)

# Enrich a single profile
async def enrich_profile():
    result = await enricher.enrich_profile("https://www.linkedin.com/in/williamhgates")
    
    if result.success:
        profile = result.profile_data
        print(f"Name: {profile.full_name}")
        print(f"Company: {profile.current_company}")
        print(f"Position: {profile.current_position}")
    else:
        print(f"Error: {result.error_message}")

# Run the enrichment
asyncio.run(enrich_profile())
```

## Batch Processing

```python
# Enrich multiple profiles
urls = [
    "https://www.linkedin.com/in/williamhgates",
    "https://www.linkedin.com/in/towhid-rahman"
]

async def batch_enrich():
    results = await enricher.enrich_profiles(urls)
    
    print(f"Processed: {results.total_processed}")
    print(f"Successful: {results.successful_count}")
    print(f"Failed: {results.failed_count}")
    
    for result in results.results:
        if result.success:
            profile = result.profile_data
            print(f"✅ {profile.full_name} - {profile.current_company}")
        else:
            print(f"❌ Error: {result.error_message}")

asyncio.run(batch_enrich())
```

## API Reference

### LinkedInProfileEnricher

Main class for LinkedIn profile enrichment.

#### Methods

- `enrich_profile(linkedin_url: str) -> EnrichmentResult`
- `enrich_profiles(linkedin_urls: List[str]) -> BatchEnrichmentResult`
- `get_available_methods() -> List[str]`
- `get_config_info() -> Dict[str, Any]`

### Data Models

#### ProfileData
Contains structured LinkedIn profile information:
- `first_name`, `last_name`, `full_name`
- `headline`, `linkedin_url`, `location`
- `current_company`, `current_position`
- `about_section`, `connections_count`, `followers_count`
- `experience`, `education`, `skills`

#### EnrichmentResult
Result of single profile enrichment:
- `success: bool`
- `profile_data: ProfileData`
- `error_message: str`
- `method_used: str`
- `processing_time_seconds: float`

#### BatchEnrichmentResult
Result of batch profile enrichment:
- `total_processed: int`
- `successful_count: int`
- `failed_count: int`
- `results: List[EnrichmentResult]`

## Configuration

### EnrichmentConfig

```python
config = EnrichmentConfig(
    apify_api_key="your_key",           # Apify API key
    tavily_api_key="your_key",          # Tavily API key
    preferred_method="auto",            # "apify", "tavily", or "auto"
    max_retries=3,                      # Max retry attempts
    timeout_seconds=30,                 # Request timeout
    rate_limit_delay=1.0,               # Delay between requests
    enable_caching=True,                # Enable response caching
    cache_ttl_hours=24                  # Cache TTL in hours
)
```

## Environment Variables

You can also set API keys via environment variables:

```bash
export APIFY_API_KEY="your_apify_key"
export TAVILY_API_KEY="your_tavily_key"
export GOOGLE_API_KEY="your_google_key"  # Optional
```

## Error Handling

The package includes comprehensive error handling:

```python
from linkedin_enrichment_package.exceptions import (
    EnrichmentError,
    APIKeyError,
    RateLimitError,
    NetworkError
)

try:
    result = await enricher.enrich_profile(url)
except APIKeyError:
    print("API key is missing or invalid")
except RateLimitError:
    print("Rate limit exceeded, please wait")
except NetworkError:
    print("Network connection failed")
except EnrichmentError as e:
    print(f"Enrichment failed: {e}")
```

## Integration with Workers

This package is designed to integrate seamlessly with worker systems:

```python
# In your worker
from linkedin_enrichment_package import LinkedInProfileEnricher, EnrichmentConfig

class ProfileEnrichmentWorker:
    def __init__(self):
        config = EnrichmentConfig(
            apify_api_key=os.getenv("APIFY_API_KEY"),
            tavily_api_key=os.getenv("TAVILY_API_KEY"),
            preferred_method="auto"
        )
        self.enricher = LinkedInProfileEnricher(config)
    
    async def process_profiles(self, linkedin_urls: List[str]):
        results = await self.enricher.enrich_profiles(linkedin_urls)
        
        # Process results and store in database
        for result in results.results:
            if result.success:
                await self.store_profile_data(result.profile_data)
            else:
                await self.log_error(result.error_message)
```

## License

MIT License

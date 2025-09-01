"""
LinkedIn Profile Enrichment Package

A standalone package for enriching LinkedIn profiles using multiple data sources
including Apify and Tavily with robust extraction and fallback mechanisms.
"""

from .enricher import LinkedInProfileEnricher
from .models import EnrichmentResult, ProfileData, EnrichmentConfig
from .exceptions import EnrichmentError, APIKeyError, RateLimitError

__version__ = "1.0.0"
__all__ = [
    "LinkedInProfileEnricher",
    "EnrichmentResult", 
    "ProfileData",
    "EnrichmentConfig",
    "EnrichmentError",
    "APIKeyError", 
    "RateLimitError"
]

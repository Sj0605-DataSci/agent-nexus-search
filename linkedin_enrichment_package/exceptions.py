"""
Custom exceptions for LinkedIn enrichment package
"""

class EnrichmentError(Exception):
    """Base exception for enrichment errors"""
    pass

class APIKeyError(EnrichmentError):
    """Raised when API keys are missing or invalid"""
    pass

class RateLimitError(EnrichmentError):
    """Raised when API rate limits are exceeded"""
    pass

class ExtractionError(EnrichmentError):
    """Raised when data extraction fails"""
    pass

class NetworkError(EnrichmentError):
    """Raised when network requests fail"""
    pass

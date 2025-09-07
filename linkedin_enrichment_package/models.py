"""
Data models for LinkedIn enrichment package
"""
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime

@dataclass
class EnrichmentConfig:
    """Configuration for LinkedIn enrichment"""
    apify_api_key: Optional[str] = None
    tavily_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    preferred_method: str = "auto"  # "apify", "tavily", "auto"
    max_retries: int = 3
    timeout_seconds: int = 30
    rate_limit_delay: float = 1.0
    enable_caching: bool = True
    cache_ttl_hours: int = 24

@dataclass
class ProfileData:
    """Structured LinkedIn profile data"""
    # Basic Info
    first_name: str = ""
    last_name: str = ""
    full_name: str = ""
    headline: str = ""
    linkedin_url: str = ""
    profile_image_url: str = ""
    
    # Contact & Location
    email: str = ""
    location: str = ""
    
    # Current Position
    current_company: str = ""
    current_position: str = ""
    
    # Profile Details
    about_section: str = ""
    connections_count: int = 0
    followers_count: int = 0
    
    # Experience & Education
    experience: List[Dict[str, Any]] = field(default_factory=list)
    education: List[Dict[str, Any]] = field(default_factory=list)
    skills: List[str] = field(default_factory=list)
    
    # Metadata
    source: str = ""  # "apify", "tavily"
    extraction_date: str = ""
    raw_data: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        """Set extraction date if not provided"""
        if not self.extraction_date:
            self.extraction_date = datetime.now().isoformat()
        
        # Generate full name if not provided
        if not self.full_name and (self.first_name or self.last_name):
            self.full_name = f"{self.first_name} {self.last_name}".strip()

@dataclass
class EnrichmentResult:
    """Result of enrichment operation"""
    success: bool
    profile_data: Optional[ProfileData] = None
    error_message: str = ""
    method_used: str = ""
    processing_time_seconds: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = {
            "success": self.success,
            "error_message": self.error_message,
            "method_used": self.method_used,
            "processing_time_seconds": self.processing_time_seconds
        }
        
        if self.profile_data:
            result["profile_data"] = {
                "first_name": self.profile_data.first_name,
                "last_name": self.profile_data.last_name,
                "full_name": self.profile_data.full_name,
                "headline": self.profile_data.headline,
                "linkedin_url": self.profile_data.linkedin_url,
                "profile_image_url": self.profile_data.profile_image_url,
                "email": self.profile_data.email,
                "location": self.profile_data.location,
                "current_company": self.profile_data.current_company,
                "current_position": self.profile_data.current_position,
                "about_section": self.profile_data.about_section,
                "connections_count": self.profile_data.connections_count,
                "followers_count": self.profile_data.followers_count,
                "experience": self.profile_data.experience,
                "education": self.profile_data.education,
                "skills": self.profile_data.skills,
                "source": self.profile_data.source,
                "extraction_date": self.profile_data.extraction_date
            }
        
        return result

@dataclass
class BatchEnrichmentResult:
    """Result of batch enrichment operation"""
    total_processed: int = 0
    successful_count: int = 0
    failed_count: int = 0
    results: List[EnrichmentResult] = field(default_factory=list)
    methods_used: List[str] = field(default_factory=list)
    total_processing_time_seconds: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "total_processed": self.total_processed,
            "successful_count": self.successful_count,
            "failed_count": self.failed_count,
            "methods_used": list(set(self.methods_used)),
            "total_processing_time_seconds": self.total_processing_time_seconds,
            "results": [result.to_dict() for result in self.results]
        }

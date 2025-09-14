#!/usr/bin/env python3
"""
Test script for simplified LinkedIn profile enrichment with retry mechanisms
"""
import asyncio
import os
import sys
from typing import List, Dict, Any
import json
import requests
from unittest.mock import patch, MagicMock

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '.'))

from app.core.services.simplified_enrichment_service import SimplifiedEnrichmentService
from app.db.clients import get_async_supabase_client
from app.core.config import settings

# Sample LinkedIn URLs for testing
TEST_URLS = [
    "https://www.linkedin.com/in/williamhgates",
    "https://www.linkedin.com/in/satyanadella"
]

class MockResponse:
    """Mock HTTP response for testing retry mechanisms"""
    def __init__(self, status_code, json_data=None, raise_error=False):
        self.status_code = status_code
        self.json_data = json_data or {}
        self.raise_error = raise_error
        
    def json(self):
        return self.json_data
        
    def raise_for_status(self):
        if self.raise_error or self.status_code >= 400:
            raise requests.exceptions.HTTPError(f"HTTP Error: {self.status_code}")

async def test_normal_enrichment():
    """Test the normal operation of simplified enrichment service"""
    print("Starting normal enrichment test...")
    
    # Get Supabase client
    supabase = await get_async_supabase_client()
    
    # Initialize simplified enrichment service
    service = SimplifiedEnrichmentService(supabase_client=supabase)
    # Use shorter freshness period for testing
    service.freshness_days = 30
    
    # Test fetching profiles from Apify
    print(f"\n1. Testing Apify profile fetching for {len(TEST_URLS)} URLs...")
    profiles = await service.fetch_profiles_from_apify(TEST_URLS)
    
    if not profiles:
        print("❌ Failed to fetch profiles from Apify")
        return
    
    print(f"✅ Successfully fetched {len(profiles)} profiles from Apify")
    
    # Print sample profile data
    for url, profile in profiles.items():
        if profile:
            print(f"\nProfile for {url}:")
            print(f"  Name: {profile.get('first_name', '')} {profile.get('last_name', '')}")
            print(f"  Headline: {profile.get('headline', '')}")
            print(f"  Location: {profile.get('location', '')}")
            print(f"  Current position: {profile.get('position', '')}")
            print(f"  Current company: {profile.get('company', '')}")
            print(f"  Skills count: {len(profile.get('skills', []))}")
            print(f"  Experience count: {len(profile.get('experience_json', []))}")
    
    # Test embedding generation
    print("\n2. Testing embedding generation...")
    
    # Use the first profile for testing
    test_profile = next((p for p in profiles.values() if p), None)
    if not test_profile:
        print("❌ No valid profile found for embedding test")
        return
    
    # Generate embeddings
    embeddings = await service.process_connection(test_profile)
    
    if not embeddings:
        print("❌ Failed to generate embeddings")
        return
    
    # Check if embeddings were generated
    if embeddings.get("basic_info_embedding"):
        print(f"✅ Successfully generated basic info embedding (length: {len(embeddings['basic_info_embedding'])})")
    else:
        print("❌ Failed to generate basic info embedding")
    
    if embeddings.get("experience_embedding"):
        print(f"✅ Successfully generated experience embedding (length: {len(embeddings['experience_embedding'])})")
    else:
        print("❌ Failed to generate experience embedding")

async def test_freshness_check():
    """Test the freshness check functionality"""
    print("\n=== Testing Freshness Check Mechanism ===")
    
    # Initialize service with mock Supabase client
    service = SimplifiedEnrichmentService()
    
    # Mock the check_existing_embeddings method to test different scenarios
    original_check_method = service.check_existing_embeddings
    
    # Test case 1: Fresh data
    print("\nTest Case 1: Connection with fresh data")
    
    # Create a mock connection with fresh data
    fresh_connection = {
        "id": "fresh-connection-id",
        "basic_info_embedding": [0.1, 0.2, 0.3],
        "experience_embedding": [0.4, 0.5, 0.6],
        "enriched_at": datetime.now().isoformat(),
        "embedding_generated_at": datetime.now().isoformat()
    }
    
    # Override the check method to return our mock data
    async def mock_check_fresh(*args, **kwargs):
        return fresh_connection, True, True
    
    service.check_existing_embeddings = mock_check_fresh
    
    # Test with a connection that should be skipped
    test_connections = [{
        "id": "fresh-connection-id",
        "linkedin_url": "https://www.linkedin.com/in/fresh-profile"
    }]
    
    result = await service.enrich_and_embed_connections("test-user", test_connections)
    print(f"Result with fresh data: {result}")
    assert result["skipped"] == 1, "Should have skipped the fresh connection"
    assert result["stale"] == 0, "Should not have any stale connections"
    print("✅ Correctly skipped connection with fresh data")
    
    # Test case 2: Stale data
    print("\nTest Case 2: Connection with stale data")
    
    # Create a mock connection with stale data (older than freshness threshold)
    stale_date = (datetime.now() - timedelta(days=service.freshness_days + 5)).isoformat()
    stale_connection = {
        "id": "stale-connection-id",
        "basic_info_embedding": [0.1, 0.2, 0.3],
        "experience_embedding": [0.4, 0.5, 0.6],
        "enriched_at": stale_date,
        "embedding_generated_at": stale_date
    }
    
    # Override the check method to return stale data
    async def mock_check_stale(*args, **kwargs):
        return stale_connection, True, False
    
    service.check_existing_embeddings = mock_check_stale
    
    # Mock the fetch_profiles_from_apify method to avoid actual API calls
    async def mock_fetch_profiles(*args, **kwargs):
        return {"https://www.linkedin.com/in/stale-profile": {"first_name": "Stale", "last_name": "Profile"}}
    
    service.fetch_profiles_from_apify = mock_fetch_profiles
    
    # Mock the process_connection method
    async def mock_process_connection(*args, **kwargs):
        return {"basic_info_embedding": [0.1, 0.2, 0.3], "experience_embedding": [0.4, 0.5, 0.6]}
    
    service.process_connection = mock_process_connection
    
    # Mock the update_connection_embeddings method
    async def mock_update_embeddings(*args, **kwargs):
        return True
    
    service.update_connection_embeddings = mock_update_embeddings
    
    # Test with a connection that should be refreshed
    test_connections = [{
        "id": "stale-connection-id",
        "linkedin_url": "https://www.linkedin.com/in/stale-profile"
    }]
    
    result = await service.enrich_and_embed_connections("test-user", test_connections)
    print(f"Result with stale data: {result}")
    assert result["stale"] == 1, "Should have marked the connection as stale"
    assert result["successful"] == 1, "Should have successfully refreshed the stale connection"
    print("✅ Correctly refreshed connection with stale data")
    
    # Restore original method
    service.check_existing_embeddings = original_check_method
    
    print("\n✅ Freshness check tests completed successfully")

async def test_jina_retry_mechanism():
    """Test the retry mechanism for Jina embedding generation"""
    print("\n=== Testing Jina Embedding Retry Mechanism ===")
    
    # Initialize service
    service = SimplifiedEnrichmentService()
    
    # Configure for faster testing
    service.retry_delay = 0.1  # Short delay for testing
    service.max_retries = 3
    
    # Mock data
    test_text = "This is a test text for embedding generation"
    mock_embedding = [0.1, 0.2, 0.3] * 100  # 300-dim vector
    
    # Create success response for the final call
    success_response = MockResponse(200, {"data": [{"embedding": mock_embedding}]})
    
    # Create error responses for the first two calls
    error_response = MockResponse(429, {"error": "Rate limit exceeded"}, raise_error=True)
    
    # Mock the requests.post function to fail twice then succeed
    with patch('requests.post') as mock_post:
        # First two calls fail, third succeeds
        mock_post.side_effect = [
            error_response,  # First call - fails
            error_response,  # Second call - fails
            success_response  # Third call - succeeds
        ]
        
        # Call the embedding function
        print("Calling generate_embedding with mocked failures...")
        embedding = await service.generate_embedding(test_text)
        
        # Verify retry behavior
        assert mock_post.call_count == 3, f"Expected 3 calls, got {mock_post.call_count}"
        print(f"✅ Jina API called {mock_post.call_count} times (with 2 failures and 1 success)")
        
        # Verify we got a valid embedding
        assert embedding is not None, "Expected valid embedding but got None"
        assert len(embedding) == 300, f"Expected 300-dim vector, got {len(embedding)}"
        print(f"✅ Successfully generated embedding after retries (length: {len(embedding)})")

async def test_enrichment():
    """Run all tests"""
    try:
        # Test normal operation
        await test_normal_enrichment()
        
        # Test freshness check
        await test_freshness_check()
        
        # Test retry mechanisms
        await test_jina_retry_mechanism()
        
        print("\nAll tests completed successfully!")
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        import traceback
        print(traceback.format_exc())

if __name__ == "__main__":
    # Run the tests
    asyncio.run(test_enrichment())

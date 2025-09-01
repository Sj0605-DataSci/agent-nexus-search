"""
Test script for LinkedIn Enrichment Package
"""
import asyncio
import os
from linkedin_enrichment_package import LinkedInProfileEnricher, EnrichmentConfig

async def test_package():
    """Test the LinkedIn enrichment package"""
    print("🧪 TESTING LINKEDIN ENRICHMENT PACKAGE")
    print("=" * 60)
    
    # Test URLs
    test_urls = [
        "https://www.linkedin.com/in/williamhgates",
        "https://www.linkedin.com/in/towhid-rahman"
    ]
    
    # Configure with environment variables
    config = EnrichmentConfig(
        apify_api_key=os.getenv("APIFY_API_KEY"),
        tavily_api_key=os.getenv("TAVILY_API_KEY"),
        preferred_method="auto",
        max_retries=2
    )
    
    # Initialize enricher
    enricher = LinkedInProfileEnricher(config)
    
    try:
        # Test 1: Check available methods
        print("\n1. Available Methods:")
        methods = enricher.get_available_methods()
        config_info = enricher.get_config_info()
        print(f"   Methods: {methods}")
        print(f"   Config: {config_info}")
        
        if not methods:
            print("❌ No API keys configured!")
            return
        
        # Test 2: Single profile enrichment
        print(f"\n2. Single Profile Test:")
        result = await enricher.enrich_profile(test_urls[0])
        
        if result.success:
            profile = result.profile_data
            print(f"✅ Success via {result.method_used}")
            print(f"   Name: {profile.full_name}")
            print(f"   Company: {profile.current_company}")
            print(f"   Position: {profile.current_position}")
            print(f"   Location: {profile.location}")
            print(f"   Skills: {', '.join(profile.skills[:3])}...")
            print(f"   Processing time: {result.processing_time_seconds:.2f}s")
        else:
            print(f"❌ Failed: {result.error_message}")
        
        # Test 3: Batch processing
        print(f"\n3. Batch Processing Test:")
        batch_results = await enricher.enrich_profiles(test_urls)
        
        print(f"   Total processed: {batch_results.total_processed}")
        print(f"   Successful: {batch_results.successful_count}")
        print(f"   Failed: {batch_results.failed_count}")
        print(f"   Methods used: {batch_results.methods_used}")
        print(f"   Total time: {batch_results.total_processing_time_seconds:.2f}s")
        
        # Show individual results
        for i, result in enumerate(batch_results.results):
            if result.success:
                profile = result.profile_data
                print(f"   ✅ {profile.full_name} via {result.method_used}")
            else:
                print(f"   ❌ URL {i+1}: {result.error_message}")
        
        # Test 4: JSON output
        print(f"\n4. JSON Output Test:")
        if batch_results.successful_count > 0:
            json_output = batch_results.to_dict()
            print(f"   JSON keys: {list(json_output.keys())}")
            if json_output['results']:
                first_result = json_output['results'][0]
                if first_result['success']:
                    profile_keys = list(first_result['profile_data'].keys())
                    print(f"   Profile data keys: {profile_keys}")
        
        print(f"\n🎉 Package test completed successfully!")
        
    except Exception as e:
        print(f"❌ Package test failed: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        await enricher.close()

if __name__ == "__main__":
    asyncio.run(test_package())

"""
Test script to demonstrate parallel Apify actor calls
This will make 32 parallel calls to Apify with fake LinkedIn links
"""
import asyncio
import os
import time
from typing import Dict, List, Any
from apify_client import ApifyClientAsync
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import settings to get the actual Apify API key
import sys
sys.path.append('/Users/sanyamjain/Desktop/Projects/agent-nexus-search/fastapi_backend')
from app.core.config import settings

# Use the actual Apify API key from settings
APIFY_API_KEY = settings.APIFY_API_KEY

async def fetch_profile_from_apify(batch_id: int, linkedin_urls: List[str]) -> Dict[str, Any]:
    """
    Fetch LinkedIn profile data from Apify using async client
    """
    logger.info(f"Batch {batch_id}: Starting Apify call with {len(linkedin_urls)} URLs")
    
    # Initialize Apify async client
    apify_client = ApifyClientAsync(APIFY_API_KEY)
    
    # Prepare Apify actor input
    run_input = {
        "profileScraperMode": "Profile details no email ($4 per 1k)",
        "queries": linkedin_urls,
    }
    
    start_time = time.time()
    
    # Run the Apify actor and wait for completion
    try:
        run = await apify_client.actor("LpVuK3Zozwuipa5bp").call(run_input=run_input)
        
        if not run or "defaultDatasetId" not in run:
            logger.error(f"Batch {batch_id}: Invalid response from Apify actor")
            return {"batch_id": batch_id, "success": False, "error": "Invalid response"}
        
        # Fetch results from the dataset
        apify_results = []
        dataset_client = apify_client.dataset(run["defaultDatasetId"])
        async for item in dataset_client.iterate_items():
            apify_results.append(item)
        
        elapsed_time = time.time() - start_time
        logger.info(f"Batch {batch_id}: Completed in {elapsed_time:.2f} seconds, got {len(apify_results)} results")
        
        return {
            "batch_id": batch_id,
            "success": True,
            "results_count": len(apify_results),
            "elapsed_time": elapsed_time
        }
    
    except Exception as e:
        elapsed_time = time.time() - start_time
        logger.error(f"Batch {batch_id}: Error after {elapsed_time:.2f} seconds: {str(e)}")
        return {"batch_id": batch_id, "success": False, "error": str(e), "elapsed_time": elapsed_time}

async def main():
    """
    Main function to run 32 parallel Apify calls
    """
    # Number of parallel calls to make
    num_parallel_calls = 32
    
    # Number of fake LinkedIn URLs per batch
    urls_per_batch = 5
    
    # Generate fake LinkedIn URLs
    all_batches = []
    for i in range(num_parallel_calls):
        batch = [f"https://www.linkedin.com/in/fake-profile-{i}-{j}" for j in range(urls_per_batch)]
        all_batches.append(batch)
    
    logger.info(f"Starting {num_parallel_calls} parallel Apify calls with {urls_per_batch} URLs each")
    
    # Create tasks for all batches
    tasks = []
    for i, batch in enumerate(all_batches):
        task = fetch_profile_from_apify(i + 1, batch)
        tasks.append(task)
    
    # Execute all tasks concurrently
    start_time = time.time()
    results = await asyncio.gather(*tasks, return_exceptions=True)
    total_time = time.time() - start_time
    
    # Process results
    successful_batches = 0
    failed_batches = 0
    
    for result in results:
        if isinstance(result, Exception):
            logger.error(f"Task failed with exception: {str(result)}")
            failed_batches += 1
        elif result.get("success", False):
            successful_batches += 1
        else:
            failed_batches += 1
    
    logger.info(f"Completed {num_parallel_calls} Apify calls in {total_time:.2f} seconds")
    logger.info(f"Successful batches: {successful_batches}, Failed batches: {failed_batches}")
    
    # Calculate average time per batch
    valid_times = [r.get("elapsed_time", 0) for r in results if isinstance(r, dict) and "elapsed_time" in r]
    if valid_times:
        avg_time = sum(valid_times) / len(valid_times)
        logger.info(f"Average time per batch: {avg_time:.2f} seconds")
        logger.info(f"Estimated sequential time: {sum(valid_times):.2f} seconds")
        logger.info(f"Parallel speedup: {sum(valid_times) / total_time:.2f}x")

if __name__ == "__main__":
    asyncio.run(main())

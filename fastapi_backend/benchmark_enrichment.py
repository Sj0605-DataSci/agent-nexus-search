"""
Benchmark script for LinkedIn profile enrichment
Simulates API calls with fake data and measures performance
"""
import asyncio
import json
import time
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Union, AsyncGenerator
import random

# Create fake embeddings of the right dimension
def generate_fake_embedding(dimension=384):
    """Generate a fake embedding vector of the specified dimension"""
    return [random.uniform(-1, 1) for _ in range(dimension)]

class BenchmarkSupabase:
    """Mock Supabase client for benchmarking"""
    
    def __init__(self):
        self.tables = {
            "connections": BenchmarkTable("connections")
        }
        self.storage = {}
        self.query_time = 0.05  # 50ms per query
        self.insert_time = 0.1  # 100ms per insert
        self.update_time = 0.1  # 100ms per update
    
    def table(self, name):
        return self.tables.get(name, BenchmarkTable(name))
    
    def from_(self, name):
        return self.tables.get(name, BenchmarkTable(name))

class BenchmarkTable:
    """Mock Supabase table for benchmarking"""
    
    def __init__(self, name):
        self.name = name
        self.filters = []
        self.selected = "*"
        self._limit = None
        self._range = None
    
    def select(self, columns):
        self.selected = columns
        return self
    
    def eq(self, column, value):
        self.filters.append(("eq", column, value))
        return self
    
    def in_(self, column, values):
        self.filters.append(("in", column, values))
        return self
    
    def not_(self, column, op, value):
        self.filters.append(("not", column, op, value))
        return self
    
    def neq(self, column, value):
        self.filters.append(("neq", column, value))
        return self
    
    def limit(self, limit):
        self._limit = limit
        return self
    
    def range(self, start, end):
        self._range = (start, end)
        return self
    
    def upsert(self, data):
        return BenchmarkExecutor(self, "upsert", data)
    
    def insert(self, data):
        return BenchmarkExecutor(self, "insert", data)
    
    def update(self, data):
        return BenchmarkExecutor(self, "update", data)
    
    async def execute(self):
        """Simulate query execution with delay"""
        # Simulate query time with realistic timing
        # Base time + additional time based on complexity
        base_time = 0.02  # 20ms base time
        
        # Add time based on filters and complexity
        filter_time = 0.01 * len(self.filters)  # 10ms per filter
        range_time = 0.02 if self._range else 0  # 20ms for range queries
        
        # Calculate total query time
        query_time = base_time + filter_time + range_time
        
        # For large range queries, add more time
        if self._range and self._range[1] - self._range[0] > 1000:
            query_time += 0.05  # Add 50ms for large ranges
            
        await asyncio.sleep(query_time)
        
        # For select operations, return fake data
        if self.selected != "*":
            # Generate fake data based on filters
            if any(f[0] == "eq" and f[1] == "user_id" for f in self.filters):
                # Simulate connections for a user
                count = random.randint(50, 200)
                data = [self._generate_fake_connection() for _ in range(count)]
                return BenchmarkResponse(data)
        
        # Default empty response
        return BenchmarkResponse([])
    
    def _generate_fake_connection(self):
        """Generate a fake connection record"""
        return {
            "id": str(uuid.uuid4()),
            "user_id": str(uuid.uuid4()),
            "linkedin_url": f"https://www.linkedin.com/in/fake-user-{random.randint(1000, 9999)}",
            "first_name": f"First{random.randint(1, 100)}",
            "last_name": f"Last{random.randint(1, 100)}",
            "enriched_at": None,
            "embedding_generated_at": None
        }

class BenchmarkExecutor:
    """Mock Supabase executor for benchmarking"""
    
    def __init__(self, table, operation, data):
        self.table = table
        self.operation = operation
        self.data = data
        self.filters = []
    
    def eq(self, column, value):
        self.filters.append(("eq", column, value))
        return self
    
    async def execute(self):
        """Simulate execution with delay based on real-world performance"""
        # Calculate base time based on operation type
        if self.operation == "insert":
            # Base time for inserts
            base_time = 0.05  # 50ms base time
            per_record_time = 0.005  # 5ms per record
            max_time = 2.0  # Cap at 2 seconds for very large batches
            
            # Calculate count and total time
            count = len(self.data) if isinstance(self.data, list) else 1
            total_time = min(base_time + (per_record_time * count), max_time)
            
            print(f"[BENCHMARK] Database insert of {count} records, time: {total_time:.2f}s")
            await asyncio.sleep(total_time)
            
        elif self.operation == "update":
            # Faster for single updates, slower for filtered updates
            filter_count = len(self.filters)
            filter_time = 0.01 * filter_count  # 10ms per filter
            base_time = 0.03  # 30ms base time
            
            total_time = base_time + filter_time
            print(f"[BENCHMARK] Database update with {filter_count} filters, time: {total_time:.2f}s")
            await asyncio.sleep(total_time)
            
        elif self.operation == "upsert":
            # Upserts are more expensive than inserts
            base_time = 0.08  # 80ms base time
            per_record_time = 0.008  # 8ms per record
            max_time = 3.0  # Cap at 3 seconds for very large batches
            
            # Calculate count and total time
            count = len(self.data) if isinstance(self.data, list) else 1
            total_time = min(base_time + (per_record_time * count), max_time)
            
            print(f"[BENCHMARK] Database upsert of {count} records, time: {total_time:.2f}s")
            await asyncio.sleep(total_time)
        
        # Return fake response
        return BenchmarkResponse(self.data)

class BenchmarkResponse:
    """Mock Supabase response for benchmarking"""
    
    def __init__(self, data):
        self.data = data

class BenchmarkEnrichmentService:
    """Benchmark version of SimplifiedEnrichmentService"""
    
    def __init__(self, supabase_client=None):
        self.supabase_client = supabase_client or BenchmarkSupabase()
        self.scraping_batch_size = 50
        self.freshness_days = 30
    
    async def _fetch_profiles_from_apify_impl(self, linkedin_urls: List[str]) -> Dict[str, Dict[str, Any]]:
        """Simulate Apify API call with delay based on real-world performance"""
        print(f"[BENCHMARK] Fetching {len(linkedin_urls)} profiles from Apify")
        
        # Simulate Apify API call time - 25 seconds per batch of 50 (based on real logs)
        # Apify processes profiles in parallel, so total time is much less than individual times
        batch_time = 25.0
        
        # Adjust time based on batch size (proportional)
        adjusted_time = batch_time * (len(linkedin_urls) / 50)
        await asyncio.sleep(adjusted_time)
        
        # Generate fake profile data
        results = {}
        
        # Simulate ~5% failure rate as seen in real logs
        for url in linkedin_urls:
            if random.random() < 0.05:  # 5% chance of failure
                continue  # Skip this URL to simulate failure
            results[url] = self._generate_fake_profile_data(url)
        
        return results
    
    def _generate_fake_profile_data(self, url):
        """Generate fake profile data"""
        username = url.split("/")[-1]
        return {
            "element": {
                "firstName": f"First{random.randint(1, 100)}",
                "lastName": f"Last{random.randint(1, 100)}",
                "linkedinUrl": url,
                "headline": f"Fake headline for {username}",
                "about": f"This is a fake about section for {username}",
                "location": f"City{random.randint(1, 50)}, Country{random.randint(1, 10)}",
                "photo": f"https://fake-photos.com/{username}.jpg",
                "connectionsCount": random.randint(100, 5000),
                "followerCount": random.randint(100, 10000),
                "premium": random.choice([True, False]),
                "influencer": random.choice([True, False]),
                "verified": random.choice([True, False]),
                "openToWork": random.choice([True, False]),
                "hiring": random.choice([True, False]),
                "publicIdentifier": username,
                "id": f"fake-id-{random.randint(10000, 99999)}"
            }
        }
    
    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        """Simulate Jina API call with delay"""
        # Simulate Jina API call time - 1 second per embedding
        await asyncio.sleep(1.0)
        
        # Generate fake embedding
        return generate_fake_embedding()
    
    async def generate_embeddings_batch(self, texts: List[str]) -> List[Optional[List[float]]]:
        """Simulate batch Jina API call with delay - optimized for parallel processing"""
        if not texts:
            return []
            
        # Real-world batch processing is more efficient
        # Base time + incremental time per text (with diminishing returns)
        base_time = 1.0  # Base time for API call
        per_text_time = 0.1  # Incremental time per text
        max_time = 10.0  # Cap the maximum time
        
        # Calculate total time with diminishing returns for larger batches
        total_time = min(base_time + (per_text_time * len(texts)), max_time)
        
        print(f"[BENCHMARK] Generating embeddings for {len(texts)} texts, estimated time: {total_time:.2f}s")
        await asyncio.sleep(total_time)
        
        # Generate fake embeddings
        return [generate_fake_embedding() for _ in texts]
    
    def _create_basic_info_text(self, profile_data: Dict[str, Any]) -> str:
        """Create text representation of basic profile info"""
        return f"Fake basic info text for {profile_data.get('element', {}).get('publicIdentifier', 'unknown')}"
    
    def _create_experience_text(self, profile_data: Dict[str, Any]) -> str:
        """Create text representation of experience"""
        return f"Fake experience text for {profile_data.get('element', {}).get('publicIdentifier', 'unknown')}"
    
    async def enrich_connections(self, user_id: str, connections: List[Dict[str, Any]], yield_batches: bool = False) -> Union[Dict[str, Any], AsyncGenerator[Dict[str, Any], None]]:
        """
        Benchmark version of enrich_connections
        Simulates the enrichment process with timing measurements
        """
        try:
            start_time = time.time()
            print(f"[BENCHMARK] Starting enrichment for {len(connections)} connections")
            
            # Extract LinkedIn URLs
            linkedin_urls = [conn["linkedin_url"] for conn in connections if conn.get("linkedin_url")]
            connection_ids = [conn["id"] for conn in connections if conn.get("id")]
            
            if not linkedin_urls:
                print("[BENCHMARK] No LinkedIn URLs provided")
                if yield_batches:
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
                    return
                else:
                    # For non-generator mode, we need to yield the result instead of return
                    # since this is an async generator function
                    yield {
                        "success": False,
                        "message": "No LinkedIn URLs provided",
                        "total": 0,
                        "successful": 0,
                        "failed": 0,
                        "skipped": 0,
                        "reused": 0
                    }
                    return
            
            # Create mapping from LinkedIn URL to connection ID
            url_to_id = {conn["linkedin_url"]: conn["id"] for conn in connections if conn.get("linkedin_url") and conn.get("id")}
            
            # Initialize counters
            successful_count = 0
            failed_count = 0
            skipped_count = 0
            reused_count = 0
            all_enriched_connections = []
            
            # Calculate number of batches
            total_batches = (len(linkedin_urls) + self.scraping_batch_size - 1) // self.scraping_batch_size
            print(f"[BENCHMARK] Processing {len(linkedin_urls)} URLs in {total_batches} batches")
            
            # Process in batches
            for batch_idx in range(total_batches):
                batch_start_time = time.time()
                start_idx = batch_idx * self.scraping_batch_size
                end_idx = min(start_idx + self.scraping_batch_size, len(linkedin_urls))
                batch_urls = linkedin_urls[start_idx:end_idx]
                
                print(f"[BENCHMARK] Processing batch {batch_idx + 1}/{total_batches} with {len(batch_urls)} URLs")
                
                # Simulate Apify API call
                apify_start_time = time.time()
                enriched_profiles = await self._fetch_profiles_from_apify_impl(batch_urls)
                apify_time = time.time() - apify_start_time
                print(f"[BENCHMARK] Apify API call took {apify_time:.2f} seconds")
                
                # Process profiles
                db_start_time = time.time()
                batch_successful = 0
                batch_failed = 0
                batch_enriched_connections = []
                
                for url, profile_data in enriched_profiles.items():
                    if not profile_data:
                        failed_count += 1
                        batch_failed += 1
                        continue
                    
                    connection_id = url_to_id.get(url)
                    if not connection_id:
                        failed_count += 1
                        batch_failed += 1
                        continue
                    
                    # Save the extracted data to Supabase
                    update_data = {
                        'enriched_at': datetime.now(timezone.utc).isoformat(),
                        'enrichment_source': 'apify'
                    }
                    
                    # Add extracted fields
                    for field in ['headline', 'about_section', 'experience_json', 'education_json', 'skills',
                                 'location', 'company', 'position', 'profile_photo_url']:
                        if field in profile_data.get('element', {}) and profile_data['element'][field]:
                            update_data[field] = profile_data['element'][field]
                    
                    # Update connection with enrichment data
                    try:
                        # Simulate database update
                        await self.supabase_client.table("connections").update(update_data).eq("id", connection_id).execute()
                        
                        # Add to successful connections
                        batch_successful += 1
                        successful_count += 1
                        
                        # Add to enriched connections list
                        enriched_connection = {
                            "id": connection_id,
                            "linkedin_url": url,
                            "profile_data": profile_data
                        }
                        batch_enriched_connections.append(enriched_connection)
                        all_enriched_connections.append(enriched_connection)
                        
                    except Exception as e:
                        print(f"[BENCHMARK] Error updating connection {connection_id}: {str(e)}")
                        failed_count += 1
                        batch_failed += 1
                
                db_time = time.time() - db_start_time
                print(f"[BENCHMARK] Database updates took {db_time:.2f} seconds")
                
                # Queue embedding tasks
                embedding_start_time = time.time()
                
                # Simulate embedding task creation
                await asyncio.sleep(0.1)  # 100ms to queue the task
                
                embedding_time = time.time() - embedding_start_time
                print(f"[BENCHMARK] Queueing embedding tasks took {embedding_time:.2f} seconds")
                
                batch_time = time.time() - batch_start_time
                print(f"[BENCHMARK] Batch {batch_idx + 1} completed in {batch_time:.2f} seconds: {batch_successful} successful, {batch_failed} failed")
                
                # Yield batch results if requested
                if yield_batches:
                    yield {
                        "success": batch_successful > 0,
                        "message": f"Processed batch {batch_idx + 1}/{total_batches}: {batch_successful} successful, {batch_failed} failed",
                        "total": len(batch_urls),
                        "successful": batch_successful,
                        "failed": batch_failed,
                        "skipped": 0,
                        "reused": 0,
                        "batch_idx": batch_idx + 1,
                        "total_batches": total_batches,
                        "enriched_connections": batch_enriched_connections
                    }
            
            total_time = time.time() - start_time
            print(f"[BENCHMARK] Total enrichment completed in {total_time:.2f} seconds: {successful_count} successful, {failed_count} failed")
            
            # Return final results if not yielding batches
            if not yield_batches:
                # Use yield instead of return in async generator
                yield {
                    "success": successful_count > 0,
                    "message": f"Processed {successful_count} profiles successfully, {failed_count} failed",
                    "total": len(linkedin_urls),
                    "successful": successful_count,
                    "failed": failed_count,
                    "skipped": skipped_count,
                    "reused": reused_count,
                    "enriched_connections": all_enriched_connections
                }
                return  # Empty return to end generator
            
        except Exception as e:
            print(f"[BENCHMARK] Error enriching connections: {str(e)}")
            if yield_batches:
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
                return  # Empty return to end generator

class BenchmarkEmbeddingWorker:
    """Benchmark version of EmbeddingWorker"""
    
    def __init__(self):
        self.worker_id = str(uuid.uuid4())
        self.batch_size = 50
    
    async def process_batch(self, connections, user_id="test_user", task_id="test_task"):
        """Process a batch of connections for embedding"""
        start_time = time.time()
        print(f"[BENCHMARK] Processing batch of {len(connections)} connections for embedding")
        
        # Create enrichment service
        enrichment_service = BenchmarkEnrichmentService()
        
        # Extract texts for batch embedding generation
        extract_start_time = time.time()
        basic_info_texts = []
        experience_texts = []
        connection_ids = []
        
        for connection in connections:
            connection_id = connection.get("id")
            profile_data = connection.get("profile_data")
            
            if not connection_id or not profile_data:
                continue
            
            # Create text representations
            basic_info = enrichment_service._create_basic_info_text(profile_data)
            experience = enrichment_service._create_experience_text(profile_data)
            
            basic_info_texts.append(basic_info)
            experience_texts.append(experience)
            connection_ids.append(connection_id)
        
        extract_time = time.time() - extract_start_time
        print(f"[BENCHMARK] Extracting texts took {extract_time:.2f} seconds")
        
        # Generate embeddings in batches
        embedding_start_time = time.time()
        basic_info_embeddings = await enrichment_service.generate_embeddings_batch(basic_info_texts)
        experience_embeddings = await enrichment_service.generate_embeddings_batch(experience_texts)
        embedding_time = time.time() - embedding_start_time
        print(f"[BENCHMARK] Generating embeddings took {embedding_time:.2f} seconds")
        
        # Save embeddings in bulk
        db_start_time = time.time()
        
        # Simulate database updates
        timestamp = datetime.now(timezone.utc).isoformat()
        updates = []
        
        for i, connection_id in enumerate(connection_ids):
            updates.append({
                "id": connection_id,
                "basic_info_embedding": basic_info_embeddings[i],
                "experience_embedding": experience_embeddings[i],
                "embedding_generated_at": timestamp
            })
        
        # Simulate bulk update
        await enrichment_service.supabase_client.table("connections").upsert(updates).execute()
        
        db_time = time.time() - db_start_time
        print(f"[BENCHMARK] Saving embeddings to database took {db_time:.2f} seconds")
        
        total_time = time.time() - start_time
        print(f"[BENCHMARK] Total embedding processing took {total_time:.2f} seconds")
        
        return len(connection_ids), 0  # successful, failed

async def run_benchmark(connection_count=18000):
    """Run the benchmark with the specified number of connections"""
    print(f"[BENCHMARK] Starting benchmark with {connection_count} connections")
    start_time = time.time()
    
    # Generate fake connections
    connections = []
    for i in range(connection_count):
        connections.append({
            "id": str(uuid.uuid4()),
            "linkedin_url": f"https://www.linkedin.com/in/fake-user-{i}",
            "first_name": f"First{i}",
            "last_name": f"Last{i}"
        })
    
    # Create enrichment service
    enrichment_service = BenchmarkEnrichmentService()
    
    # Process enrichment and embedding in parallel with separate workers
    print("[BENCHMARK] Starting enrichment and embedding processes")
    enrichment_start_time = time.time()
    embedding_start_time = time.time()
    
    enriched_connections = []
    embedded_connections = []
    embedding_worker = BenchmarkEmbeddingWorker()
    total_enriched = 0
    total_embedded = 0
    
    # Queue to simulate Redis queue for embedding tasks
    embedding_queue = asyncio.Queue()
    
    # Create a task to process the embedding queue in parallel
    async def embedding_processor():
        nonlocal total_embedded
        while True:
            try:
                # Get batch from queue with timeout
                try:
                    batch = await asyncio.wait_for(embedding_queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    # Check if enrichment is done and queue is empty
                    if enrichment_done.is_set() and embedding_queue.empty():
                        break
                    continue
                    
                # Process the batch
                batch_idx = batch.get("batch_idx", 0)
                batch_connections = batch.get("connections", [])
                print(f"[BENCHMARK] Embedding worker: Processing batch {batch_idx} with {len(batch_connections)} connections")
                
                # Simulate processing time
                successful, failed = await embedding_worker.process_batch(batch_connections)
                total_embedded += successful
                embedded_connections.extend(batch_connections)
                
                print(f"[BENCHMARK] Embedding progress: {total_embedded}/{total_enriched} (Batch {batch_idx})")
                embedding_queue.task_done()
            except Exception as e:
                print(f"[BENCHMARK] Error in embedding processor: {str(e)}")
    
    # Flag to signal when enrichment is done
    enrichment_done = asyncio.Event()
    
    # Start the embedding processor task
    embedding_task = asyncio.create_task(embedding_processor())
    
    # Process the async generator for enrichment
    async for batch_result in enrichment_service.enrich_connections("test_user", connections, yield_batches=True):
        batch_enriched_connections = batch_result.get("enriched_connections", [])
        if batch_enriched_connections:
            # Track enrichment progress
            batch_idx = batch_result.get("batch_idx", 0)
            total_batches = batch_result.get("total_batches", 0)
            enriched_connections.extend(batch_enriched_connections)
            total_enriched = len(enriched_connections)
            print(f"[BENCHMARK] Enrichment progress: {total_enriched}/{connection_count} (Batch {batch_idx}/{total_batches})")
            
            # Queue the batch for embedding (will be processed in parallel)
            await embedding_queue.put({
                "batch_idx": batch_idx,
                "connections": batch_enriched_connections
            })
            print(f"[BENCHMARK] Queued batch {batch_idx} for embedding with {len(batch_enriched_connections)} connections")
        else:
            print(f"[BENCHMARK] Batch processed with status: {batch_result.get('message')}")
    
    # Signal that enrichment is done
    enrichment_done.set()
    
    # Wait for embedding queue to be fully processed
    await embedding_queue.join()
    await embedding_task
    
    # If no enriched connections were found, we might need to try without yield_batches
    if not enriched_connections:
        print("[BENCHMARK] No enriched connections found with batch mode, trying single result mode")
        
        # Reset for single result mode
        enrichment_done = asyncio.Event()
        embedding_queue = asyncio.Queue()
        embedding_task = asyncio.create_task(embedding_processor())
        
        result_gen = enrichment_service.enrich_connections("test_user", connections, yield_batches=False)
        # Get the single result from the generator
        result = await anext(result_gen)
        if result.get("enriched_connections"):
            batch_enriched_connections = result.get("enriched_connections", [])
            enriched_connections = batch_enriched_connections
            total_enriched = len(enriched_connections)
            print(f"[BENCHMARK] Got {total_enriched} connections in single result mode")
            
            # Process in parallel using the same queue mechanism
            # Split into smaller batches for better parallelism
            batch_size = 50
            for i in range(0, len(batch_enriched_connections), batch_size):
                sub_batch = batch_enriched_connections[i:i+batch_size]
                sub_batch_idx = i // batch_size + 1
                await embedding_queue.put({
                    "batch_idx": sub_batch_idx,
                    "connections": sub_batch
                })
                print(f"[BENCHMARK] Queued sub-batch {sub_batch_idx} for embedding with {len(sub_batch)} connections")
            
            # Signal that enrichment is done and wait for embedding to complete
            enrichment_done.set()
            await embedding_queue.join()
            await embedding_task
    
    enrichment_time = time.time() - enrichment_start_time
    embedding_time = time.time() - embedding_start_time  # Total time including both processes
    
    print(f"[BENCHMARK] Enrichment completed in {enrichment_time:.2f} seconds")
    print(f"[BENCHMARK] Embedding completed in {embedding_time:.2f} seconds")
    
    # Calculate total time
    total_time = time.time() - start_time
    print(f"[BENCHMARK] Total process completed in {total_time:.2f} seconds")
    
    # Calculate throughput
    enrichment_throughput = connection_count / enrichment_time if enrichment_time > 0 else 0
    embedding_throughput = len(enriched_connections) / embedding_time if embedding_time > 0 else 0
    total_throughput = connection_count / total_time if total_time > 0 else 0
    
    # Calculate estimated times for 18,000 connections
    estimated_enrichment_time = (18000 / enrichment_throughput) / 60 if enrichment_throughput > 0 else 0
    estimated_embedding_time = (18000 / embedding_throughput) / 60 if embedding_throughput > 0 else 0
    estimated_total_time = (18000 / total_throughput) / 60 if total_throughput > 0 else 0
    
    print("\n" + "="*80)
    print("[BENCHMARK] DETAILED PERFORMANCE SUMMARY")
    print("="*80)
    print(f"Total connections processed: {connection_count}")
    print(f"Total enriched: {total_enriched}")
    print(f"Total embedded: {total_embedded}")
    
    print(f"\nPARALLEL PROCESSING METRICS:")
    print(f"  - Enrichment and embedding run in parallel with separate workers")
    print(f"  - Enrichment starts first, embedding processes batches as they arrive")
    print(f"  - Overlap time: {min(enrichment_time, embedding_time):.2f} seconds")
    print(f"  - Parallel efficiency: {min(enrichment_time, embedding_time)/max(enrichment_time, embedding_time)*100:.1f}%")
    
    print(f"\nENRICHMENT PHASE:")
    print(f"  - Time: {enrichment_time:.2f} seconds")
    print(f"  - Throughput: {enrichment_throughput:.2f} connections/second")
    print(f"  - Batch size: {50} connections per batch")
    print(f"  - Apify API time per batch: ~25 seconds")
    
    print(f"\nEMBEDDING PHASE:")
    print(f"  - Time: {embedding_time:.2f} seconds")
    print(f"  - Throughput: {embedding_throughput:.2f} connections/second")
    print(f"  - Batch size: {50} connections per batch")
    print(f"  - Embedding generation: ~{1.0 + 0.1*50:.1f} seconds per batch of 50")
    
    print(f"\nDATABASE OPERATIONS:")
    print(f"  - Batch upsert time: ~{0.08 + 0.008*50:.2f} seconds per batch of 50")
    print(f"  - Query time: ~{0.02 + 0.01*3:.2f} seconds per query with 3 filters")
    
    print(f"\nTOTAL PERFORMANCE:")
    print(f"  - Total processing time: {total_time:.2f} seconds")
    print(f"  - Overall throughput: {total_throughput:.2f} connections/second")
    
    print(f"\nESTIMATED TIME FOR 18,000 CONNECTIONS:")
    print(f"  - Enrichment phase: {estimated_enrichment_time:.2f} minutes")
    print(f"  - Embedding phase: {estimated_embedding_time:.2f} minutes")
    print(f"  - Parallel processing: ~{max(estimated_enrichment_time, estimated_embedding_time):.2f} minutes")
    print(f"  - Total time with parallelism: ~{max(estimated_enrichment_time, estimated_embedding_time):.2f} minutes ({max(estimated_enrichment_time, estimated_embedding_time)/60:.2f} hours)")
    
    print(f"\nOPTIMIZATION IMPACT:")
    print(f"  - Without batch embedding: ~{(18000 * 2) / 60:.2f} minutes for embedding phase")
    print(f"  - With batch embedding: ~{estimated_embedding_time:.2f} minutes for embedding phase")
    print(f"  - With parallel processing: ~{max(estimated_enrichment_time, estimated_embedding_time):.2f} minutes total")
    print(f"  - Speedup factor: ~{(estimated_enrichment_time + (18000 * 2) / 60) / max(estimated_enrichment_time, estimated_embedding_time):.1f}x faster")
    print("="*80)

if __name__ == "__main__":
    # Run the benchmark with 500 connections by default for faster testing
    # Use command line argument to test with larger numbers
    connection_count = 18000  # Reduced from 18000 for faster testing
    
    # Parse command line arguments
    import sys
    if len(sys.argv) > 1:
        try:
            connection_count = int(sys.argv[1])
        except ValueError:
            print(f"Invalid connection count: {sys.argv[1]}, using default of 1000")
    
    asyncio.run(run_benchmark(connection_count))

# LinkedIn Profile Enrichment Service - PRD

## 📋 Product Requirements Document

### 🎯 Objective
Build an automated LinkedIn profile enrichment service that discovers, extracts, and stores professional profiles with semantic search capabilities using Tavily search integration.

### 🏗️ System Context
- **Infrastructure**: 4 Gunicorn workers × 2 instances = 8 total workers
- **Database**: PostgreSQL with pgvector extension
- **Current Schema**: `connections` table for user profiles
- **Framework**: FastAPI with async background processing
- **Profile Extractor**: Existing `improved_profile_extractor.py`

### 🔄 Core Pipeline Flow
```
Tavily Search → URL Deduplication → Profile Extraction → Vector Embedding → Database Storage
```

## 🛠️ Technical Architecture

### Vector Database Strategy
- **Library**: `vecs` with automatic embedding adapters
- **Model**: `all-MiniLM-L6-v2` (384 dimensions) or `gte-small`
- **Indexing**: HNSW with `m=16, ef_construction=64`
- **Auto-embedding**: vecs handles text-to-vector conversion automatically

### Database Integration
- **Primary Storage**: Existing `connections` table
- **Vector Collection**: `linkedin_profiles` via vecs
- **Linking**: LinkedIn URL as primary key between systems
- **Metadata**: Store user_id, company, position for SQL filtering

### Deduplication Logic
- Check existing LinkedIn URLs in database
- Skip profiles updated within 30 days (`cache_duration_days = 30`)
- Update stale profiles (>30 days old)
- Validate LinkedIn URL format before processing

### Rate Limiting & Performance
- **Profile Processing**: 0.5s delay between profiles
- **Tavily API**: 1s delay between search calls
- **Background Processing**: FastAPI BackgroundTasks
- **Concurrent Handling**: Leverage 8 workers for parallel processing

## 📡 API Endpoints

### POST /enrich-profiles
**Purpose**: Trigger LinkedIn profile enrichment using Tavily search

**Request Body**:
```json
{
  "search_queries": ["machine learning engineer", "python developer"],
  "max_profiles_per_query": 10
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Profile enrichment started",
  "search_queries": ["machine learning engineer", "python developer"],
  "estimated_time": "60 seconds"
}
```

### GET /enrichment-stats/{user_id}
**Purpose**: View enrichment metrics and statistics

**Response**:
```json
{
  "total_profiles": 150,
  "enriched_profiles": 45,
  "recent_updates": 12,
  "avg_completeness": 0.85,
  "last_enrichment": "2024-08-26T18:30:00Z"
}
```

## 🔍 Hybrid Search Implementation

### Vector Search with Auto-Embedding
```python
# Automatic embedding conversion - no manual sentence-transformers needed
results = docs.query(
    data="machine learning engineer python",  # Auto-converted to embedding
    limit=20,
    filters={'user_id': {'$eq': user_id}}
)
```

### SQL + Vector Hybrid Queries
```python
# Combine SQL filtering with vector similarity
results = await hybrid_search_connections(
    user_query="senior python developer with ML experience",
    user_id="user-123",
    filters={'company': 'startup', 'min_connections': 500}
)
```

## 🏗️ Service Components

### LinkedInEnrichmentService
- **Main orchestrator** for the enrichment pipeline
- **Tavily integration** for LinkedIn profile discovery
- **Profile extraction** using existing `improved_profile_extractor.py`
- **Vector embedding** via vecs adapters
- **Database operations** for storage and updates

### Key Methods
- `enrich_profiles_batch()`: Main enrichment pipeline
- `_get_linkedin_urls_from_tavily()`: Search and discover profiles
- `_filter_urls_for_processing()`: Deduplication logic
- `_process_single_profile()`: Extract and store individual profiles
- `_generate_profile_embeddings()`: Vector generation (via vecs)

## 📊 Data Flow

### Input Processing
1. **Search Queries**: User provides search terms
2. **Tavily Search**: Find LinkedIn profile URLs
3. **URL Validation**: Check LinkedIn URL format
4. **Deduplication**: Skip recent profiles (<30 days)

### Profile Extraction
1. **Content Fetching**: Get LinkedIn profile content
2. **Data Extraction**: Use `improved_profile_extractor.py`
3. **Embedding Generation**: Auto-convert text to vectors via vecs
4. **Database Storage**: Store in connections table + vector collection

### Search & Retrieval
1. **Query Input**: User search text
2. **Auto-Embedding**: vecs converts query to vector
3. **Hybrid Search**: Combine vector similarity + SQL filters
4. **Ranked Results**: Return semantically relevant profiles

## ⚡ Key Benefits

- **Zero Manual Embedding**: vecs adapter handles text-to-vector automatically
- **Smart Deduplication**: Avoids redundant Tavily API calls
- **Hybrid Search**: SQL filtering + semantic similarity
- **Scalable Performance**: HNSW indexing for fast queries
- **Non-blocking**: Background processing with error handling
- **Cost Efficient**: 30-day cache prevents unnecessary API usage

## 🔧 Configuration Parameters

### Rate Limiting
- `profile_delay`: 0.5 seconds between profile processing
- `tavily_delay`: 1.0 seconds between API calls
- `batch_size`: 10 profiles per batch

### Cache Settings
- `cache_duration_days`: 30 days for profile freshness
- `max_profiles_per_query`: 10 profiles per search query
- `max_search_queries`: 5 queries per request

### Vector Database
- `embedding_model`: 'all-MiniLM-L6-v2' (384 dimensions)
- `hnsw_m`: 16 (HNSW parameter)
- `hnsw_ef_construction`: 64 (HNSW parameter)

## 🚨 Error Handling

### Graceful Failures
- **Tavily API errors**: Log and continue with remaining queries
- **Profile extraction errors**: Skip profile and continue batch
- **Database errors**: Retry with exponential backoff
- **Embedding errors**: Fall back to text-only storage

### Logging & Monitoring
- **Structured logging** for all operations
- **Error tracking** with context and stack traces
- **Performance metrics** for API response times
- **Success/failure rates** for enrichment operations

## 📈 Success Metrics

### Performance KPIs
- **Enrichment Speed**: Profiles processed per minute
- **API Efficiency**: Tavily calls vs profiles discovered
- **Search Accuracy**: Semantic search relevance scores
- **System Reliability**: Error rates and uptime

### Business KPIs
- **Profile Coverage**: Percentage of user connections enriched
- **Data Quality**: Average profile completeness scores
- **User Engagement**: Search query frequency and satisfaction
- **Cost Efficiency**: API usage vs value generated

---

**PRD Status**: ✅ Complete - Ready for implementation
**Last Updated**: 2024-08-26
**Version**: 1.0

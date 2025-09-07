# Scalable Search Engine Architecture

## Phase 1: Enhanced PostgreSQL with Vector Search

### Database Schema Evolution
```sql
-- Enhanced connections table
ALTER TABLE connections ADD COLUMN 
    embedding vector(1536),  -- OpenAI embeddings
    enriched_data JSONB,     -- Tavily scraped data
    search_vector tsvector,  -- Full-text search
    relevance_score FLOAT DEFAULT 0;

-- Indexes for performance
CREATE INDEX idx_connections_embedding ON connections USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_connections_search ON connections USING gin(search_vector);
CREATE INDEX idx_connections_enriched ON connections USING gin(enriched_data);
```

### Search Pipeline Architecture
```
User Query
    ↓
┌─────────────────────────────────────────────────────────┐
│                Query Processing                          │
│  • Intent classification                                │
│  • Entity extraction (names, companies, skills)        │
│  • Query embedding generation                           │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────┬─────────────────┬─────────────────────┐
│   SQL Search    │  Vector Search  │   Graph Search      │
│                 │                 │   (Optional)        │
│ • Exact matches │ • Semantic      │ • Network analysis  │
│ • Filters       │   similarity    │ • Mutual connections│
│ • Structured    │ • Fuzzy matches │ • Influence paths   │
│   queries       │ • Context aware │                     │
└─────────────────┴─────────────────┴─────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│                Result Fusion & Ranking                  │
│  • Weighted scoring algorithm                           │
│  • Deduplication                                        │
│  • Relevance ranking                                    │
│  • Personalization                                      │
└─────────────────────────────────────────────────────────┘
    ↓
Frontend Results
```

## Phase 2: Data Enrichment Pipeline

### Tavily Integration Architecture
```
Connection Data Input (CSV/Extension)
    ↓
┌─────────────────────────────────────────────────────────┐
│              Social Graph Optimization                  │
│  • Deduplicate by LinkedIn URL                         │
│  • Check existing enriched data                        │
│  • Queue only new/stale profiles for enrichment        │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│                Enrichment Queue                         │
│  • Redis queue for Tavily scraping                     │
│  • Rate limiting (API quotas)                          │
│  • Priority scoring (VIP users, recent activity)       │
│  • Retry logic with exponential backoff                │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│              Tavily Scraping Worker                     │
│  • Parallel workers (respect rate limits)              │
│  • Profile data extraction                             │
│  • Company information                                  │
│  • Recent activity/posts                               │
│  • Skills and endorsements                             │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│              Data Processing Pipeline                   │
│  • Clean and normalize data                            │
│  • Generate embeddings (OpenAI/local model)           │
│  • Extract searchable text                             │
│  • Calculate relevance scores                          │
└─────────────────────────────────────────────────────────┘
    ↓
Database Storage (enriched_data, embedding, search_vector)
```

## Phase 3: Advanced Search Features

### Multi-Modal Search Capabilities
1. **Structured Search**: SQL queries for exact matches
2. **Semantic Search**: Vector similarity for context
3. **Full-Text Search**: PostgreSQL tsvector for text matching
4. **Graph Search**: Network relationships (if using Neo4j)

### Ranking Algorithm Components
```python
def calculate_relevance_score(query, connection, user_context):
    score = 0
    
    # Exact match bonus (40% weight)
    score += exact_match_score(query, connection) * 0.4
    
    # Semantic similarity (30% weight)  
    score += vector_similarity(query_embedding, connection.embedding) * 0.3
    
    # Network proximity (20% weight)
    score += network_distance_score(user_context.user_id, connection) * 0.2
    
    # Recency and activity (10% weight)
    score += activity_recency_score(connection) * 0.1
    
    return score
```

## Technology Stack Recommendations

### Database Layer
- **Primary**: PostgreSQL (Supabase) with pgvector extension
- **Caching**: Redis for search results and session data
- **Optional**: Neo4j for complex graph queries (Phase 3)

### Search Infrastructure
- **Vector Store**: pgvector (integrated) or Pinecone (managed)
- **Embeddings**: OpenAI text-embedding-3-small (cost-effective)
- **Full-Text**: PostgreSQL built-in tsvector

### Processing Pipeline
- **Queue**: Redis with Bull/BullMQ for job processing
- **Workers**: FastAPI background tasks or Celery
- **Rate Limiting**: Redis-based sliding window

### Monitoring & Analytics
- **Search Analytics**: Track query patterns, result clicks
- **Performance**: Query latency, cache hit rates
- **Business**: User engagement, search success rates
```

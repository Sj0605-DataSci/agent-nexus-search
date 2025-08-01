# Agent Nexus Search - Pricing & Credits System Implementation Plan

## Current Architecture Analysis

### Key Files Analyzed:
1. **`app/api/routes/profiles.py`** - User profile management endpoints
2. **`app/core/services/chat_service.py`** - Main search/chat streaming logic
3. **`app/core/services/agent/graph.py`** - LangGraph execution and search processing

### Current Flow:
1. User sends message via chat endpoint
2. `chat_service.stream_chat()` handles the request
3. Intent classification determines if it's a search or direct answer
4. For searches, LangGraph (`graph.py`) executes the search workflow
5. Results are streamed back to the user

## Pricing Model Design

### Tier Structure
```
FREE TIER:
- 5 basic searches/day
- 1 deep search/day  
- 10 starting credits
- No email reports
- No API access

PRO TIER ($29.99/month):
- 50 basic searches/day
- 10 deep searches/day
- 100 credits/month included
- Email reports enabled
- API access
- Priority support

ENTERPRISE TIER ($99.99/month):
- 500 basic searches/day
- 100 deep searches/day
- 500 credits/month included
- All Pro features
- Custom integrations
- Dedicated support
```

### Credit System
```
CREDIT COSTS:
- Basic Search: 1 credit
- Deep Search: 3 credits

CREDIT PACKAGES:
- 50 credits: $9.99
- 100 credits: $19.99
- 250 credits: $39.99
- 500 credits: $69.99
```

## Database Schema Changes

#### Create separate `user_subscriptions` table:
```sql
CREATE TABLE public.user_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  
  -- Tier and Credit System
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  credits integer NOT NULL DEFAULT 10,
  total_credits_purchased integer NOT NULL DEFAULT 0,
  
  -- Daily Search Limits and Tracking
  daily_searches_allowed integer NOT NULL DEFAULT 5,
  daily_searches_used integer NOT NULL DEFAULT 0,
  last_search_date date NULL DEFAULT CURRENT_DATE,
  
  -- Search Type Limits (for different tiers)
  deep_searches_allowed integer NOT NULL DEFAULT 1,
  deep_searches_used integer NOT NULL DEFAULT 0,
  basic_searches_allowed integer NOT NULL DEFAULT 5,
  basic_searches_used integer NOT NULL DEFAULT 0,
  
  -- Subscription Management
  subscription_start_date timestamp with time zone NULL,
  subscription_end_date timestamp with time zone NULL,
  auto_renew boolean NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT user_subscriptions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles (id) ON DELETE CASCADE,
  CONSTRAINT user_subscriptions_profile_id_unique UNIQUE (profile_id)
);
```

**Benefits of separate table approach:**
- Better normalization and data organization
- Keeps profiles table clean and focused
- Easier to extend subscription features
- Better performance for subscription-specific queries
- Maintains referential integrity with CASCADE delete

### New Tables
1. **`search_usage`** - Track individual search usage
2. **`credit_transactions`** - Track credit purchases/usage
3. **`tier_configs`** - Configurable tier settings

## Implementation Strategy

### ✅ Phase 1: Database & Models (COMPLETED)
- ✅ Created separate `user_subscriptions` table
- ✅ Updated SQLAlchemy models with `UserSubscription` model
- ✅ Updated Pydantic schemas for subscription management
- ✅ Created `CreditService` for all credit operations
- ✅ Database functions for atomic credit checking/consumption

### Phase 2: Integration (IN PROGRESS)
- [ ] Create database migration scripts
- [ ] Update SQLAlchemy models (`app/models/models.py`)
- [ ] Update Pydantic schemas (`app/models/schemas.py`)
- [ ] Create database functions for credit checking/consumption

### Phase 2: Credit Service (Priority 1)
- [ ] Create `app/core/services/credit_service.py`
- [ ] Implement credit checking logic
- [ ] Implement credit consumption logic
- [ ] Implement tier management
- [ ] Add daily limit reset functionality

### Phase 3: Integration Points (Priority 1)
- [ ] **Chat Service Integration**: Modify `stream_chat()` to check/consume credits
- [ ] **Profile Routes**: Add credit/tier endpoints to `profiles.py`
- [ ] **Graph Integration**: Add credit consumption tracking in search nodes

### Phase 4: API Endpoints (Priority 2)
- [ ] Credit purchase endpoints
- [ ] Tier upgrade endpoints  
- [ ] Usage statistics endpoints
- [ ] Admin tier management endpoints

### Phase 5: Frontend Integration (Priority 3)
- [ ] Credit display in UI
- [ ] Tier upgrade flows
- [ ] Usage dashboards
- [ ] Payment integration

## Key Integration Points

### 1. Chat Service Modifications (`chat_service.py`)

**Before Search Execution (Line ~490):**
```python
# Check if user can perform search
credit_service = CreditService(supabase_client)
search_check = await credit_service.check_search_limit(user_id, search_mode)

if not search_check.can_search:
    yield {
        "type": "error", 
        "content": search_check.error,
        "credits_needed": search_check.credits_needed
    }
    return

# Consume credits before starting search
await credit_service.consume_search_credits(
    user_id=user_id,
    search_type=search_mode, 
    thread_id=thread_id,
    message_id=message_id,
    query=latest_message
)
```

### 2. Profile Routes Enhancement (`profiles.py`)

**New Endpoints:**
- `GET /profiles/usage` - Get usage statistics
- `GET /profiles/tier-configs` - Get available tiers
- `POST /profiles/purchase-credits` - Purchase credits
- `POST /profiles/upgrade-tier` - Upgrade tier
- `GET /profiles/credit-history` - Get credit transaction history

### 3. Graph Integration (`graph.py`)

**Search Node Modifications:**
- Add credit consumption tracking in major search nodes
- Track search success/failure for billing accuracy
- Add search type detection (basic vs deep based on complexity)

## Technical Implementation Details

### Credit Checking Flow
```python
async def check_and_consume_credits(user_id: str, search_type: str) -> bool:
    # 1. Check daily limits
    # 2. Check credit balance  
    # 3. Consume credits if allowed
    # 4. Update daily counters
    # 5. Log transaction
```

### Daily Reset Mechanism
- Cron job to reset daily counters at midnight
- Database function: `reset_daily_searches()`
- Automatic tier limit application

### Search Type Detection
```python
def determine_search_type(search_mode: str, world_connections: str) -> str:
    """
    Basic: Simple queries, connections search
    Deep: Complex research, world search with multiple iterations
    """
    if search_mode == "basic" or world_connections == "connections":
        return "basic"
    return "deep"
```

## Error Handling & User Experience

### Credit Exhaustion Scenarios
1. **Daily Limit Reached**: Show upgrade prompt
2. **Credits Exhausted**: Show top-up options
3. **Tier Downgrade**: Graceful limit enforcement

### Streaming Error Messages
```python
yield {
    "type": "limit_reached",
    "message": "Daily search limit reached",
    "current_tier": "free", 
    "upgrade_options": [...],
    "credits_needed": 3
}
```

## Security Considerations

### Credit Fraud Prevention
- Server-side validation only
- Atomic credit transactions
- Audit logging for all credit operations
- Rate limiting on credit-sensitive endpoints

### Tier Enforcement
- Database-level constraints
- Multiple validation layers
- Graceful degradation for expired subscriptions

## Testing Strategy

### Unit Tests
- Credit service functions
- Tier validation logic
- Daily reset functionality

### Integration Tests  
- End-to-end search with credit consumption
- Tier upgrade flows
- Payment processing

### Load Testing
- Credit checking performance
- Concurrent search handling
- Database transaction integrity

## Monitoring & Analytics

### Key Metrics
- Credit consumption rates by tier
- Search success/failure rates
- Tier conversion rates
- Daily active users by tier

### Alerting
- Low credit balance warnings
- Failed payment notifications
- Unusual usage patterns

## Migration Strategy

### Existing Users
- Grant 10 free credits to existing users
- Set appropriate tier based on usage history
- Grandfather existing unlimited users temporarily

### Rollout Plan
1. **Week 1**: Database migration + backend implementation
2. **Week 2**: API endpoint testing + integration
3. **Week 3**: Frontend integration + user testing
4. **Week 4**: Production rollout with monitoring

## Success Criteria

### Technical
- [ ] 99.9% credit transaction accuracy
- [ ] <100ms credit checking latency
- [ ] Zero credit fraud incidents

### Business
- [ ] 15% free-to-paid conversion rate
- [ ] 90% user satisfaction with pricing
- [ ] 25% increase in daily active users

## Risk Mitigation

### Technical Risks
- **Database performance**: Implement proper indexing and caching
- **Race conditions**: Use database-level atomic operations
- **Service downtime**: Implement circuit breakers and fallbacks

### Business Risks
- **User churn**: Generous free tier and clear value proposition
- **Pricing sensitivity**: A/B testing for optimal pricing
- **Feature complexity**: Phased rollout with user feedback

## Next Steps

1. **Immediate**: Review and approve this plan
2. **Week 1**: Begin database schema implementation
3. **Week 2**: Implement credit service and core logic
4. **Week 3**: Integrate with existing chat/search flow
5. **Week 4**: Add API endpoints and testing

---

**Total Estimated Development Time**: 3-4 weeks
**Team Required**: 2-3 developers + 1 QA + 1 DevOps
**Priority Level**: High (Revenue Generation)

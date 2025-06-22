# Discover new Minds - Backend PRD

## Overview

This document outlines the Product Requirements for the Discover new Minds backend functionality. The backend will handle user search queries, process them through a multi-stage pipeline using LangGraph, and return relevant search results with reasoning.

## User Flow

1. User enters a search query in the frontend's chatbox/textbox
2. User clicks the "Search" button
3. Frontend sends the query to the backend API
4. Backend processes the query through multiple stages
5. Backend returns structured results to the frontend
6. Frontend renders the results to the user

## API Endpoint

### Chat Endpoint

- **Route**: `/chat`
- **Method**: POST
- **Parameters**:

  - `query` (string): The search query from the user's textbox
  - `user_id` (string): The ID of the current user
  - `agent_id` (string): The ID of the agent being used for the search

- **Response**:
  ```json
  {
    "results": [
      {
        "content": "Result content",
        "source": "Source URL",
        "score": 0.95,
        "reasoning": "Why this result is relevant"
      }
    ]
  }
  ```

## Backend Architecture

### Route Layer

- Implement a new route in `app/api/routes/chat.py`
- The route will accept POST requests with the required parameters
- The route will validate the input and pass it to the service layer

### Service Layer

- Create a new service in `app/core/services/chat_service.py`
- The service will:
  1. Fetch agent configuration from Supabase based on `user_id` and `agent_id`
  2. Initialize the LangGraph workflow
  3. Process the query through the workflow
  4. Return the results

### LangGraph Implementation

The LangGraph workflow will consist of the following nodes:

#### 1. Start Node

- Input: User query, user_id, agent_id
- Function: Initialize the workflow state
- Output: Prepared state for subquery generation

#### 2. Subquery Generation Node

- Input: User query
- Function: Make parallel LLM calls to extract entities (companies, professions, etc.)
- Output: List of subqueries for search

#### 3. Search Node

- Input: Original query and generated subqueries
- Function: Make parallel API calls to search services:
  - Exa API
  - Firecrawl
  - Tavily
- Output: Combined search results from all services

#### 4. Answer Node

- Input: Search results, agent configuration
- Function: Score and rank results, generate reasoning for top results
- Output: Scored list of results with reasoning

#### 5. End Node

- Input: Processed results
- Function: Format final output for frontend
- Output: Structured response ready for frontend rendering

## Data Models

### State Model (Pydantic)

```python
class SearchState(BaseModel):
    query: str
    user_id: str
    agent_id: str
    agent_config: Optional[dict] = None
    subqueries: List[str] = []
    search_results: List[Dict] = []
    scored_results: List[Dict] = []
```

### Request Model

```python
class ChatRequest(BaseModel):
    query: str
    user_id: str
    agent_id: str
```

### Response Model

```python
class SearchResult(BaseModel):
    content: str
    source: str
    score: float
    reasoning: str

class ChatResponse(BaseModel):
    results: List[SearchResult]
```

## Implementation Steps

1. Create the necessary Pydantic models
2. Implement the chat route
3. Create the chat service
4. Implement the LangGraph workflow:
   - Define the state model
   - Implement each node function
   - Connect the nodes in the workflow
5. Integrate with external search APIs
6. Add error handling and logging
7. Test the complete flow

## Dependencies

- LangGraph
- Pydantic
- FastAPI
- Supabase client
- API clients for Exa, Firecrawl, and Tavily

## Future Enhancements

- Caching of search results
- User feedback mechanism
- Analytics on search performance
- Adaptive agent configuration based on search patterns

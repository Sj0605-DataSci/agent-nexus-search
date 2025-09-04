from typing import List, Union, Optional
from langchain_core.messages import AIMessage, HumanMessage, BaseMessage
from langgraph.graph import StateGraph, START, END
from langchain_core.runnables import RunnableConfig
from app.models.chat import OverallState
from app.core.utils.llm_utils import GeminiChatModel, GroqChatModel
from app.db.clients import get_async_supabase_client
from app.core.config import settings
from app.models.schemas import QueryAnalysis, ScoredProfilesResponse
from langsmith import traceable
from app.core.utils.cache import invalidate_chat_messages_cache
import vecs
import json
import asyncio
from urllib.parse import quote_plus
from langsmith import traceable
# Add imports for LangGraph caching
from app.db.redis_client import redis_client

if settings.GOOGLE_API_KEY is None:
    raise ValueError("GOOGLE_API_KEY is not set")

CACHE_TTL = 604800


def get_vecs_client():
    """Get vecs client without caching to reduce memory pressure."""
    try:
        # Initialize vector client
        if settings.SUPABASE_USER and settings.SUPABASE_PASSWORD and settings.SUPABASE_HOST and settings.SUPABASE_PORT and settings.SUPABASE_DBNAME:
            db_url = f"postgresql://{settings.SUPABASE_USER}:{quote_plus(settings.SUPABASE_PASSWORD)}@{settings.SUPABASE_HOST}:{settings.SUPABASE_PORT}/{settings.SUPABASE_DBNAME}?sslmode=require"
        else:
            db_url = settings.DATABASE_URL
    except Exception as e:
        raise e
    client = vecs.create_client(db_url)
    return client


@traceable(project_name="Discoverminds",name="get_research_topic")
def get_research_topic(messages: List[Union[BaseMessage, dict]]) -> str:
    """Get the research topic from the messages."""
    if not messages or len(messages) == 0:
        return ""
        
    if len(messages) == 1:
        message = messages[-1]
        if isinstance(message, dict):
            research_topic = message.get("content", "")
        else:
            research_topic = message.content
    else:
        research_topic = ""
        for message in messages:
            if isinstance(message, dict):
                role = message.get("type", "")
                content = message.get("content", "")
                if role == "human":
                    research_topic += f"User: {content}\n"
                elif role == "ai":
                    research_topic += f"Assistant: {content}\n"
            elif isinstance(message, HumanMessage):
                research_topic += f"User: {message.content}\n"
            elif isinstance(message, AIMessage):
                research_topic += f"Assistant: {message.content}\n"
    return research_topic


# ===== NODE 1: Query Analysis =====
@traceable(project_name="Discoverminds",name="query_analysis")
async def query_analysis(state: OverallState, config: RunnableConfig) -> OverallState:
    """Analyze user query and extract filters, traits, and keyphrases.
    
    Args:
        state: The current state containing messages and other context
        config: Configuration for the runnable
        
    Returns:
        Updated state with query analysis results
    """
    try:
        if hasattr(state, "model_dump"):
            state = state.model_dump()

        supabase_client = await get_async_supabase_client()
        print("Node 1: Query Analysis (Cache Miss - Computing)")
        
        model = "gemini-2.5-flash-lite"
        agent_config = state["agent_config"]
        agent_id = agent_config["id"]
        user_id = agent_config["user_id"]
        chat_thread_id = state["chat_thread_id"]
        current_message_id = state.get("current_message_id", "")
        
        user_query = get_research_topic(state["messages"]) 

        cache_key = f"graph2:query_analysis:{user_id}:{user_query}"
        
        # Try to get from cache
        cached_result = await redis_client.get(cache_key)
        if cached_result is not None:
            return cached_result
      
        system_instruction = """You are an expert at analyzing search queries for professional networking and people search. 

Extract exactly 9 keyphrases maximum for semantic search. Focus on the most important professional attributes and qualifications.

Given a user's search query, you need to:
1. Paraphrase the query in a clear, professional manner
2. Extract relevant filters (location, work experience, company, position, skills)
3. Identify key traits the user is looking for in people
4. Extract exactly 9 important keyphrases for semantic search (or fewer if query is simple)

Lets say i searched : Tech founders in NYC who raised a pre-seed round

filters : [Location, Work Work Including prior work experience]
traits : [Is a tech founder,Is based in NYC, Has closed a pre-seed funding round of less than or approximately $3M]
keyphrases : [Startup founder in technology,Entrepreneur in the tech sector,Built a tech company from the ground up,Lives in New York City,NYC-based professional,Operating out of the greater New York area,Raised pre-seed capital,Secured early-stage funding under $3 million,Closed a seed round of approximately $2.5M]

Be thorough but precise. Focus on professional attributes and qualifications."""

        user_prompt = f"""Analyze this search query and extract structured information:

Query: "{user_query}"

Please provide:
1. A paraphrased version of the query
2. Filters for location, work experience, company, position, skills
3. Key traits the user is looking for (e.g., "tech founder", "startup experience", "AI expertise")
4. Exactly 9 important keyphrases for semantic matching (or fewer if query is simple)
"""

        # llm = GeminiChatModel(model=model, temperature=0, system_instruction=system_instruction)
        llm = GroqChatModel(model="meta-llama/llama-4-maverick-17b-128e-instruct", temperature=0, system_instruction=system_instruction)

        
        # Generate query analysis
        response, usage_metadata = await llm.with_structured_output(
            schema_type=QueryAnalysis, 
            prompt=user_prompt
        )        
        # Store query analysis in state for other nodes
        state["query_analysis"] = response.model_dump()
        state["user_query"] = user_query
        
        # Log query analysis
        try:
            await supabase_client.table("chat_messages").update({
                "sub_queries": response.keyphrases.keyphrases,
                "weave_url": state["weave_url"],
            }).eq("id", current_message_id).execute()
            
            invalidate_chat_messages_cache(chat_thread_id)
            
            # Log costs
            input_tokens = usage_metadata.get("input_tokens", 0)
            output_tokens = usage_metadata.get("output_tokens", 0)
            cost_dollar = (input_tokens/1000000) * 0.15 + (output_tokens/1000000) * 0.60
            cost_rupees = cost_dollar * 85.86
            
            await supabase_client.table("chat_costs").insert({
                "user_id": user_id, 
                "agent_id": agent_id, 
                "chat_thread_id": chat_thread_id,
                "message_id": current_message_id,
                "model": model,
                "node": "query_analysis",
                "model_input_tokens": float(input_tokens), 
                "model_output_tokens": float(output_tokens), 
                "model_cost_dollar": float(cost_dollar),
                "model_cost_rupees": float(cost_rupees),
                "weave_url": state["weave_url"]
            }).execute()
        except Exception as e:
            pass
        
        print("Node 1: Query Analysis Completed")
        result = {
            "messages": state["messages"],
            "intent": state["intent"],
            "format": state["format"],
            "search_query": [],
            "sql_queries": [],
            "web_research_result": [],
            "sources_gathered": [],
            "current_message_id": current_message_id,
            "agent_config": agent_config,
            "chat_thread_id": chat_thread_id,
            "user_id": user_id,
            "agent_id": agent_id,
            "weave_url": state["weave_url"],
            "max_research_loops": state["max_research_loops"],
            "initial_search_query_count": state["initial_search_query_count"],
            "number_of_results_returned": state["number_of_results_returned"],
            "world_connections": state["world_connections"],
            "query_analysis": response.model_dump() if hasattr(response, 'model_dump') else response,
            "user_query": user_query
        }
        
        await redis_client.set(cache_key, result, expire=3600)
        return OverallState(**result)
        
    except Exception as e:
        raise
        
# ===== NODE 2: Vector Search (Parallel) =====
@traceable(project_name="Discoverminds",name="vector_search")
async def vector_search(state: OverallState, config: RunnableConfig) -> OverallState:
    """Generate embeddings and perform vector search only."""
    try:
        print("Node 2: Vector Search")
        if hasattr(state, "model_dump"):
            state = state.model_dump()

        query_analysis = state.get("query_analysis", {})
        keyphrases = query_analysis.get("keyphrases", {}).get("keyphrases", [])
        agent_config = state["agent_config"]
        user_id = agent_config["user_id"]
        user_query = state["user_query"]
        cache_key = f"graph2:vector_search:{user_id}:{user_query}"
        
        # Try to get from cache
        cached_result = await redis_client.get(cache_key)
        if cached_result is not None:
            return OverallState(**cached_result)
        
        # Skip vector search in PRODUCTION environment
        if settings.ENVIRONMENT == "PRODUCTION":
            print("Node 2: Vector Search skipped in PRODUCTION environment")
            result = {
                "messages": state["messages"],
                "intent": state["intent"],
                "format": state["format"],
                "search_query": state.get("search_query", []),
                "sql_queries": state.get("sql_queries", []),
                "web_research_result": state.get("web_research_result", []),
                "sources_gathered": state.get("sources_gathered", []),
                "current_message_id": state["current_message_id"],
                "agent_config": state["agent_config"],
                "chat_thread_id": state["chat_thread_id"],
                "user_id": state["user_id"],
                "agent_id": state["agent_id"],
                "weave_url": state["weave_url"],
                "max_research_loops": state["max_research_loops"],
                "initial_search_query_count": state["initial_search_query_count"],
                "number_of_results_returned": state["number_of_results_returned"],
                "world_connections": state["world_connections"],
                "query_analysis": state["query_analysis"],
                "user_query": state["user_query"],
                "vector_results": [],
                "vector_similarity_data": {}
            }
            await redis_client.set(cache_key, result, expire=3600)
            return OverallState(**result)
        
        print("Node 2: Vector Search Client")
        vecs_client = get_vecs_client()
        linkedin_profiles_collection = vecs_client.get_collection("linkedin_profiless")
        
        all_vector_results = []
        
        # Streaming approach: generate embedding -> search -> delete -> repeat
        print("Node 2: Vector Search generating embeddings")
        for i, keyphrase in enumerate(keyphrases):  # Reduced from 9 to 5 for memory efficiency
            try:
                # Generate single embedding using Jina
                embedding = await generate_jina_embedding(keyphrase)
                
                if embedding:
                    # Immediately search with this embedding
                    print("Node 2: Vector Search searching")
                    vector_results = linkedin_profiles_collection.query(
                        data=embedding,
                        limit=3,  # Reduced limit per keyphrase to balance total results
                        filters={"user_id": {"$eq": user_id}},
                        include_value=True  # Include similarity scores
                    )
                    
                    # Process results immediately
                    for vec_result in vector_results:
                        if (isinstance(vec_result, tuple) or hasattr(vec_result, '__getitem__')) and len(vec_result) >= 2:
                            profile_id, similarity_score = vec_result[0], vec_result[1]
                            try:
                                all_vector_results.append({
                                    "profile_id": profile_id,
                                    "similarity_score": float(similarity_score),
                                    "keyphrase": keyphrase
                                })
                            except Exception as append_e:
                                raise append_e
                        elif isinstance(vec_result, str):
                            all_vector_results.append({
                                "profile_id": vec_result,
                                "similarity_score": 1.0,
                                "keyphrase": keyphrase
                            })
                        else:
                            raise Exception(f"Unexpected result format: {result} (type: {type(result)})")
                    
                    # Explicitly delete embedding from memory
                    del embedding
                    del vector_results
                
                await asyncio.sleep(0.2)
                
            except Exception as e:
                raise e
        
        # ===== STEP 4: Remove duplicates from vector results =====
        
        unique_vector_profiles = {}
        for vec_result in all_vector_results:
            profile_id = vec_result["profile_id"]
            if profile_id not in unique_vector_profiles:
                unique_vector_profiles[profile_id] = {
                    "profile_id": profile_id,
                    "max_similarity": vec_result["similarity_score"],
                    "matching_keyphrases": [vec_result["keyphrase"]]
                }
            else:
                # Update with higher similarity score and add keyphrase
                if vec_result["similarity_score"] > unique_vector_profiles[profile_id]["max_similarity"]:
                    unique_vector_profiles[profile_id]["max_similarity"] = vec_result["similarity_score"]
                unique_vector_profiles[profile_id]["matching_keyphrases"].append(vec_result["keyphrase"])
        
        vector_profile_ids = list(unique_vector_profiles.keys())
        print("Node 2: Vector Search Completed")
        
        result={
            "messages": state["messages"],
            "intent": state["intent"],
            "format": state["format"],
            "search_query": state.get("search_query", []),
            "sql_queries": state.get("sql_queries", []),
            "web_research_result": state.get("web_research_result", []),
            "sources_gathered": state.get("sources_gathered", []),
            "current_message_id": state["current_message_id"],
            "agent_config": state["agent_config"],
            "chat_thread_id": state["chat_thread_id"],
            "user_id": state["user_id"],
            "agent_id": state["agent_id"],
            "weave_url": state["weave_url"],
            "max_research_loops": state["max_research_loops"],
            "initial_search_query_count": state["initial_search_query_count"],
            "number_of_results_returned": state["number_of_results_returned"],
            "world_connections": state["world_connections"],
            "query_analysis": state["query_analysis"],
            "user_query": state["user_query"],
            "vector_results": vector_profile_ids,
            "vector_similarity_data": unique_vector_profiles
        }


        await redis_client.set(cache_key, result, expire=3600)
        return OverallState(**result)
        
    except Exception as e:
        raise

@traceable(project_name="Discoverminds",name="embedding gen")
async def generate_jina_embedding(text: str) -> Optional[List[float]]:
    """Generate embedding using Jina API"""
    try:
        import requests
        from app.core.config import settings
        
        url = "https://api.jina.ai/v1/embeddings"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.JINA_API_KEY}",
        }
        data = {
            "model": "jina-embeddings-v3",
            "task": "text-matching",
            "input": text,
        }
        response = requests.post(url, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        result = response.json()
        
        if "data" in result and len(result["data"]) > 0:
            return result["data"][0]["embedding"]
        return None
    except Exception as e:
        print(f"Error generating Jina embedding: {e}")
        return None


async def generate_jina_embedding(text: str) -> Optional[List[float]]:
    """Generate embedding using Jina API"""
    try:
        import requests
        from app.core.config import settings
        
        url = "https://api.jina.ai/v1/embeddings"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.JINA_API_KEY}",
        }
        data = {
            "model": "jina-embeddings-v3",
            "task": "text-matching",
            "input": text,
        }
        response = requests.post(url, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        result = response.json()
        
        if "data" in result and len(result["data"]) > 0:
            return result["data"][0]["embedding"]
        return None
    except Exception as e:
        print(f"Error generating Jina embedding: {e}")
        return None


# ===== NODE 3: SQL Search (Parallel) =====
@traceable(project_name="Discoverminds",name="sql_search")
async def sql_search(state: OverallState, config: RunnableConfig) -> OverallState:
    """Generate SQL queries and execute keyword search."""
    try:
        if hasattr(state, "model_dump"):
            state = state.model_dump()
        
        print("Node 3: SQL Search")
        
        query_analysis = state.get("query_analysis", {})
        agent_config = state["agent_config"]
        user_id = agent_config["user_id"]
        user_query = state.get("user_query", "")

        cache_key = f"graph2:sql_search:{user_id}:{user_query}"
        
        if cached_result is not None:
            return OverallState(**cached_result)
        
        supabase_client = await get_async_supabase_client()
        
        # Extract traits and filters for keyword generation
        
        # Prepare search context for LLM
        search_context = {
            "filters": filters,
            "traits": traits
        }
        
        sql_system_instruction = """You are an expert SQL query generator for a connections database.

IMPORTANT: Use ONLY these exact column names from the connections table:
- first_name (text)
- last_name (text) 
- linkedin_url (text)
- email_address (text)
- company (text)
- position (text)
- connected_on (date)
- headline (text)
- about_section (text)
- experience_json (jsonb)
- education_json (jsonb)
- skills (text[])
- location (text)
- profile_photo_url (text)
- user_id (uuid)
- created_at (timestamp)
- embedding_generated_at (timestamp)

Generate PostgreSQL-compatible queries that search across relevant fields for the given criteria."""

        sql_user_prompt = f"""Generate a SQL query to find connections matching these criteria:

User ID: {user_id}
Search Context: {json.dumps(search_context, indent=2)}

Requirements:
- Always filter by user_id = '{user_id}'
- Search across headline, about_section, experience_json, company, position, location
- Use ILIKE for case-insensitive text matching
- Use OR logic for broader matching (avoid overly restrictive AND conditions)
- Order by relevance (embedding_generated_at DESC, created_at DESC)
- Limit to 20 results
- DO NOT use row_to_json() wrapper - return direct SELECT results

Example format:
SELECT id, first_name, last_name, headline, about_section, 
       experience_json, education_json, skills, linkedin_url, 
       company, position, location, profile_photo_url, embedding_generated_at
FROM connections 
WHERE user_id = '{user_id}' AND [your conditions]
ORDER BY embedding_generated_at DESC, created_at DESC
LIMIT 20;

Return only the SQL query, no explanation."""

        keyword_results = []
        generated_sql = ""
        try:            
            # sql_llm = GeminiChatModel(model="gemini-2.5-flash-lite", temperature=0, system_instruction=sql_system_instruction)
            llm = GroqChatModel(model="meta-llama/llama-4-maverick-17b-128e-instruct", temperature=0, system_instruction=sql_system_instruction)
            sql_response = await llm.ainvoke(sql_user_prompt)
            
            generated_sql = sql_response.content.strip()
            # Clean up the SQL (remove markdown formatting if present)
            if "```sql" in generated_sql:
                generated_sql = generated_sql.split("```sql")[1].split("```")[0].strip()
            elif "```" in generated_sql:
                generated_sql = generated_sql.split("```")[1].strip()
            
            # Clean the SQL query by removing trailing semicolon
            clean_query = generated_sql.strip().rstrip(';')
            
            # Execute the SQL query using JSON wrapper to avoid type mismatch
            json_query = f"SELECT to_jsonb(t) FROM ({clean_query}) t"
            
            keyword_result = await supabase_client.rpc('execute_dynamic_sql', {'query_text': json_query}).execute()
            
            # Parse JSONB results
            keyword_results = []
            if keyword_result.data:
                for row in keyword_result.data:
                    if isinstance(row, dict) and 'to_jsonb' in row:
                        keyword_results.append(row['to_jsonb'])
                    else:
                        keyword_results.append(row)
                        
        except Exception as e:
            # Fallback: get basic results without complex filtering
            try:
                result = await supabase_client.table("connections").select(
                    "id, first_name, last_name, headline, about_section, "
                    "experience_json, education_json, skills, linkedin_url, "
                    "company, position, location, profile_photo_url, embedding_generated_at"
                ).eq("user_id", user_id).order("embedding_generated_at", desc=True).limit(20).execute()
            except Exception as fallback_e:
                raise fallback_e
        
        print("Node 3: SQL Search Completed")

        result = {
            "messages":state["messages"],
            "intent":state["intent"],
            "format":state["format"],
            "search_query":state.get("search_query", []),
            "sql_queries":[generated_sql],
            "web_research_result":keyword_results,
            "sources_gathered":state.get("sources_gathered", []),
            "current_message_id":state.get("current_message_id", ""),
            "agent_config":state["agent_config"],
            "chat_thread_id":state["chat_thread_id"],
            "user_id":state["user_id"],
            "agent_id":state["agent_id"],
            "weave_url":state["weave_url"],
            "max_research_loops":state["max_research_loops"],
            "initial_search_query_count":state["initial_search_query_count"],
            "number_of_results_returned":state["number_of_results_returned"],
            "world_connections":state["world_connections"],
            "query_analysis":state.get("query_analysis", {}),
            "user_query":state.get("user_query", ""),
            "sql_results":keyword_results
        }

        await redis_client.set(cache_key, result, expire=3600)
        return OverallState(**result)
        
    except Exception as e:
        raise

# ===== NODE 4: Fusion Ranking (Combines Vector + SQL Results) =====
@traceable(project_name="Discoverminds",name="fusion_ranking")
async def fusion_ranking(state: OverallState, config: RunnableConfig) -> OverallState:
    """Combine vector and SQL results, perform fusion ranking and LLM scoring."""
    try:
        if hasattr(state, "model_dump"):
            state = state.model_dump()
        
        print("Node 4: Fusion Ranking")
        agent_config = state["agent_config"]
        user_id = agent_config["user_id"]
        user_query = state.get("user_query", "")
        
        cache_key = f"graph2:fusion_ranking:{user_id}:{user_query}"
        
        cached_result = await redis_client.get(cache_key)
        if cached_result is not None:
            return OverallState(**cached_result)
        
        
        keyword_results = state.get("sql_results", [])
        
        # Get vector search profiles from database
        vector_results = []
        if vector_profile_ids:
            try:
                import uuid
                valid_profile_ids = []
                for profile_id in vector_profile_ids:
                    try:
                        uuid.UUID(str(profile_id))
                        valid_profile_ids.append(profile_id)
                    except (ValueError, TypeError):
                        raise Exception(f"Invalid UUID: {profile_id}")
                
                if valid_profile_ids:
                    result = await supabase_client.table("connections").select(
                        "experience_json, education_json, skills, linkedin_url, "
                    ).order("created_at", desc=True).execute()
                    
                    vector_results = result.data if result.data else []
            except Exception as e:
                raise e
        
        fusion_profiles = {}
        for i, profile in enumerate(vector_results):
            profile_id = profile.get("id", "")
            linkedin_url = profile.get("linkedin_url", "")
            
            # Use profile_id or linkedin_url as the key
            match_key = profile_id if profile_id else linkedin_url
            
            if match_key:
                vector_rank_score = 100 - (i * 5)
                similarity_data = vector_similarity_data.get(profile_id, {})
                
                fusion_profiles[match_key] = {
                    "profile": profile,
                    "vector_score": vector_rank_score,
                    "keyword_score": 0,
                    "fusion_score": vector_rank_score * 0.6,
                    "similarity_score": similarity_data.get("max_similarity", 0),
                    "matching_keyphrases": similarity_data.get("matching_keyphrases", []),
                    "source": "vector"
                }
        
        # Add keyword results with moderate base score
        for i, result_item in enumerate(keyword_results):
            # Handle the nested structure: {'result': {...}} or direct profile
            if isinstance(result_item, dict) and 'result' in result_item:
                profile = result_item['result']
            else:
                profile = result_item
            
            profile_id = profile.get("id", "")
            linkedin_url = profile.get("linkedin_url", "")
            
            # Use profile_id or linkedin_url for matching
            match_key = profile_id if profile_id else linkedin_url
            
            if match_key:
                keyword_rank_score = 80 - (i * 4)
                
                # Check if this profile exists in vector results (by ID or LinkedIn URL)
                found_in_vector = False
                vector_match_key = None
                
                for vector_key in fusion_profiles.keys():
                    vector_profile = fusion_profiles[vector_key]["profile"]
                    vector_id = vector_profile.get("id", "")
                    vector_linkedin = vector_profile.get("linkedin_url", "")
                    
                    # Match by ID or LinkedIn URL
                    if (profile_id and profile_id == vector_id) or \
                       (linkedin_url and linkedin_url == vector_linkedin):
                        found_in_vector = True
                        vector_match_key = vector_key
                        break
                
                if found_in_vector and vector_match_key:
                    # Profile found in both - boost fusion score
                    fusion_profiles[vector_match_key]["keyword_score"] = keyword_rank_score
                    fusion_profiles[vector_match_key]["fusion_score"] = (
                        fusion_profiles[vector_match_key]["vector_score"] * 0.6 + 
                        keyword_rank_score * 0.4 + 
                        20  # Bonus for appearing in both
                    )
                    fusion_profiles[vector_match_key]["source"] = "both"
                else:
                    # Keyword-only result
                    fusion_profiles[match_key] = {
                        "profile": profile,
                        "vector_score": 0,
                        "keyword_score": keyword_rank_score,
                        "fusion_score": keyword_rank_score * 0.4,
                        "similarity_score": 0,
                        "matching_keyphrases": [],
                        "source": "keyword"
                    }
        
        # Sort by fusion score and take top results
        sorted_profiles = sorted(
            fusion_profiles.values(), 
            key=lambda x: x["fusion_score"], 
            reverse=True
        )
        
        # Extract top profiles for final results
        final_results = []
        for item in sorted_profiles[:20]:  # Get top 15 for scoring
            profile = item["profile"]
            profile["fusion_score"] = item["fusion_score"]
            profile["vector_score"] = item["vector_score"]
            profile["keyword_score"] = item["keyword_score"]
            profile["similarity_score"] = item["similarity_score"]
            profile["matching_keyphrases"] = item["matching_keyphrases"]
            profile["search_source"] = item["source"]
            final_results.append(profile)
                
        print("Node 4: Fusion Ranking Completed")
        result = {
            "messages":state["messages"],
            "intent":state["intent"],
            "format":state["format"],
            "search_query":state.get("search_query", []),
            "sql_queries":state.get("sql_queries", []),
            "web_research_result":final_results,
            "sources_gathered":state.get("sources_gathered", []),
            "current_message_id":state.get("current_message_id", ""),
            "agent_config":state["agent_config"],
            "chat_thread_id":state["chat_thread_id"],
            "user_id":state["user_id"],
            "agent_id":state["agent_id"],
            "weave_url":state["weave_url"],
            "max_research_loops":state["max_research_loops"],
            "initial_search_query_count":state["initial_search_query_count"],
            "number_of_results_returned":state["number_of_results_returned"],
            "world_connections":state["world_connections"],
            "query_analysis":state.get("query_analysis", {}),
            "user_query":state.get("user_query", ""),
            "final_results":final_results
        }
        await redis_client.set(cache_key, result, expire=3600)
        return OverallState(**result)
        
    except Exception as e:
        raise


@traceable(project_name="Discoverminds",name="finalize_sql_answer")
async def finalize_sql_answer(state: OverallState, config: RunnableConfig):
    """Enhanced answer finalization with Yes/Maybe/No scoring, quotes, and profile photos."""
    if hasattr(state, "model_dump"):
        state = state.model_dump()
    
    print("Node 5: Finalize SQL Answer")    
    model = "gemini-2.5-flash"
    supabase_client = await get_async_supabase_client()    
    agent_config = state.get("agent_config", {})
    user_id = agent_config.get("user_id", "")
    agent_id = agent_config.get("id", "")
    chat_thread_id = state.get("chat_thread_id", "")
    current_message_id = state.get("current_message_id", "")
    
    profiles = state.get("web_research_result", [])
    query_analysis = state.get("query_analysis", {})
    user_query = get_research_topic(state["messages"])
    
    cache_key = f"graph2:finalize_sql_answer:{user_id}:{user_query}"
    
    cached_result = await redis_client.get(cache_key)
    if cached_result is not None:
        return cached_result
    
    if not profiles:
        final_message = AIMessage(content="No matching connections found for your query.")
        message_content = final_message.content
    else:
        # Enhanced scoring system with Yes/Maybe/No and quotes
        scoring_system_instruction = """You are an expert at evaluating professional profiles against search criteria.

For each profile, analyze how well it matches the user's query and provide:
1. Assign confidence scores between 0 and 1 (e.g., 0.7 for strong match, 0.4 for partial match, 0.1 for no match)

2. For each confidence score:
   - Supporting quotes from the profile data (specific text from experience, education, about section, etc.)
   - Matching traits identified with HTML-parsable titles and descriptions

3. For each keyphrase in the query, evaluate if the profile has the trait associated with that keyphrase:
   - Extract specific quotes that demonstrate the trait
   - Format trait titles and descriptions in HTML-parsable format (can use <b>, <i>, <u> tags)

4. For title_trait questions (e.g., "Is this person a good Product Manager?"):
   - Specifically evaluate if the profile demonstrates expertise in the role/skill mentioned
   - Look for direct evidence in job titles, responsibilities, and accomplishments
   - Assign to yes/maybe/no category based on strength of evidence
   - Include relevant job titles or responsibilities as matching_traits with HTML formatting

Be thorough in your analysis and provide specific evidence from the profile data.

IMPORTANT: 
- You MUST score ALL profiles provided in the input. Do not skip any profiles.
- Always assign confidence scores within the correct ranges (yes: 70-100, maybe: 40-70, no: 0-40)
- Extract the most relevant and concise quotes that clearly demonstrate why the profile matches or doesn't match
- Ensure quotes are direct excerpts from the profile, not paraphrased
- Remove any duplicate quotes across categories
- For title_trait questions, specifically evaluate if the profile has expertise in the area mentioned in the title
- In all_quotes, combine all the yes, maybe, no quotes into one list, remove duplicates
- When extracting quotes, prioritize the most compelling evidence that directly relates to the query
- Format quotes to be easily readable in the UI (avoid very long quotes)
- Format trait titles and descriptions with HTML tags for better display in the UI
- There can be multiple traits in each category (yes/maybe/no) - focus on confidence values to determine categorization
- A profile can have all three yes traits, all three no traits, all three maybe traits, or any mix
- Only use <b></b> tag, no other tags needed
- Do not use any other HTML tags

Return answer like this 

Example format:
Give this in json format
'''json
{
"profile_id": "uuid-2",
"linkedin_url": "https://www.linkedin.com/in/username2",
"all_quotes": ["5 years of <b>product management experience</b>","Launched <b>3 successful products</b>","Some experience with <b>data analytics</b>","No <b>engineering background</b> mentioned"],
"scoring": [
        {
          "confidence": 0.85,
          "traitTitle": "<b>Experienced Product Manager</b> at Top Tech Company",
          "traitDescription": "Has <b>5+ years experience</b> managing successful products at <b>Google</b>"
        },
        {
          "confidence": 0.45,
          "traitTitle": "Basic <i>UX Design</i> Knowledge",
          "traitDescription": "Has <i>fundamental understanding</i> of user experience principles"
        },
        {
          "confidence": 0.15,
          "traitTitle": "No Healthcare Industry Experience",
          "traitDescription": "Profile shows <b>no evidence</b> of healthcare sector work"
        }
      ]
      '''

All profile ids should get all the three scores, it can be permutation, can be all same scores, but they should answer the keyphrases and traits and everything. The "scoring" array should contain traits with confidence values that determine their categorization (yes/maybe/no).
Pleaasure ensure to render right json.
"""
        user_prompt = f"""User Query: "{user_query}"

Search Criteria:
- Filters: {json.dumps(query_analysis.get('filters', {}), indent=2)}
- Traits: {json.dumps(query_analysis.get('traits', {}), indent=2)}
- Keyphrases: {json.dumps(query_analysis.get('keyphrases', {}), indent=2)}

Profiles to Score:
{json.dumps(profiles, indent=2)}

 """


        # llm = GeminiChatModel(model=model, temperature=0, system_instruction=scoring_system_instruction)
        llm = GroqChatModel(model="meta-llama/llama-4-maverick-17b-128e-instruct", temperature=0, system_instruction=scoring_system_instruction)
        
        try:
            # Generate enhanced scores
            print("Node 5: Finalize SQL Answer : Scoring Profiles")
            scoring_response, usage_metadata = await llm.with_structured_output(prompt=user_prompt, schema_type=ScoredProfilesResponse)
            scored_profiles = []
            for profile in scoring_response.profiles:
                # Convert ScoringTrait objects to dicts
                scoring_dicts = [
                    {
                        "traitTitle": trait.traitTitle,
                        "traitDescription": trait.traitDescription,
                        "confidence": trait.confidence
                    }
                    for trait in profile.scoring
                ]
                scored_profiles.append({
                    "profile_id": str(profile.profile_id),
                    "linkedin_url": profile.linkedin_url,
                    "all_quotes": profile.all_quotes,
                    "scoring": scoring_dicts,
                })
            
            # Log costs
            try:
                input_tokens = usage_metadata.get("input_tokens", 0)
                output_tokens = usage_metadata.get("output_tokens", 0)
                cost_dollar = (input_tokens/1000000) * 0.15 + (output_tokens/1000000) * 0.60
                cost_rupees = cost_dollar * 85.86
                
                await supabase_client.table("chat_costs").insert({
                    "user_id": user_id, 
                    "agent_id": agent_id, 
                    "chat_thread_id": chat_thread_id,
                    "message_id": current_message_id,
                    "model": model,
                    "node": "score_profiles",
                    "model_input_tokens": float(input_tokens), 
                    "model_output_tokens": float(output_tokens), 
                    "model_cost_dollar": float(cost_dollar),
                    "model_cost_rupees": float(cost_rupees),
                    "weave_url": state["weave_url"]
                }).execute()
            except Exception as e:
                pass
                
        except Exception as e:
            llm = GeminiChatModel(model="gemini-2.5-flash", temperature=0, system_instruction=scoring_system_instruction)
            try:
                scoring_response, usage_metadata = await llm.with_structured_output(prompt=user_prompt, schema_type=ScoredProfilesResponse)
                scored_profiles = []
                if scoring_response:
                    for profile in scoring_response.profiles:
                        # Convert ScoringTrait objects to dicts for the fallback case too
                        scoring_dicts = [
                            {
                                "traitTitle": trait.traitTitle,
                                "traitDescription": trait.traitDescription,
                                "confidence": trait.confidence
                            }
                            for trait in profile.scoring
                        ]
                        scored_profiles.append({
                            "profile_id": str(profile.profile_id),
                            "linkedin_url": profile.linkedin_url,
                            "all_quotes": profile.all_quotes,
                            "scoring": scoring_dicts,
                        })
            except Exception as e:
                raise e
            
        
        # Create enhanced formatted response matching the UI requirements
        response_data = []
        
        # Create a lookup dictionary for scored profiles
        scored_profiles_dict = {profile.get("linkedin_url", ""): profile for profile in scored_profiles}
        
        # Only include profiles that have scores
        for profile in profiles:
            linkedin_url = profile.get("linkedin_url", "")
            
            # Skip profiles without a linkedin_url or without a score
            if not linkedin_url or linkedin_url not in scored_profiles_dict:
                continue
                
            score_data = scored_profiles_dict[linkedin_url]
            all_quotes = score_data.get("all_quotes", [])
            scoring = score_data.get("scoring", [])
            
            profile_data = {
                "id": profile.get("id", ""),
                "first_name": profile.get("first_name", ""),
                "last_name": profile.get("last_name", ""),
                "headline": profile.get("headline", ""),
                "company": profile.get("company", ""),
                "position": profile.get("position", ""),
                "location": profile.get("location", ""),
                "linkedin_url": linkedin_url,
                "profile_photo_url": profile.get("profile_photo_url", ""),
                "all_quotes": all_quotes,
                "scoring": scoring,
                "mutual_connection": user_id  # Show current user as mutual connection
            }
            
            response_data.append(profile_data)
        
        # Format as JSON for frontend consumption
        print("Node 5: Finalize SQL Answer Completed")
        
        # Ensure all data is JSON serializable
        for profile in response_data:
            if 'scoring' in profile and profile['scoring'] is not None:
                # Convert any non-serializable objects in scoring to dicts
                profile['scoring'] = [
                    {
                        'traitTitle': str(score.get('traitTitle', '')),
                        'traitDescription': str(score.get('traitDescription', '')),
                        'confidence': float(score.get('confidence', 0.0))
                    }
                    for score in profile['scoring']
                ]
        
        message_content = json.dumps(response_data, indent=2, ensure_ascii=False)
        final_message = AIMessage(content=message_content)
    try:
        # Update message in database
        await supabase_client.table("chat_messages").update({
            "message": message_content,
            "sources_gathered": state.get("sources_gathered", [])
        }).eq("user_id", user_id).eq("agent_id", agent_id).eq("chat_thread_id", chat_thread_id).eq("id", current_message_id).execute()
        
        invalidate_chat_messages_cache(chat_thread_id)
    except Exception as e:
        print(f"Error updating chat message: {str(e)}")
        raise  # Re-raise the exception to see the full traceback
    
    result = {
        "messages": [final_message],
        "sources_gathered": state.get("sources_gathered", []),
    }

# Add custom key functions for caching
# @traceable(project_name="Discoverminds",name="query caching inmem")
# def query_cache_key(state):
#     """Generate a cache key based on the user query.
    
#     This ensures that identical queries use cached results even if other state elements differ.
#     """
#     if hasattr(state, "model_dump"):
#         state = state.model_dump()
    
#     # Extract user query from messages
#     messages = state.get("messages", [])
#     user_query = get_research_topic(messages)
    
#     # Create a cache key based on user query and user_id to ensure user-specific caching
#     user_id = state.get("agent_config", {}).get("user_id", "")
    
#     # Return a tuple that will be used as the cache key
#     return pickle.dumps((user_query, user_id))

# @traceable(project_name="Discoverminds",name="vector caching inmem")
# def vector_search_cache_key(state):
#     """Generate a cache key for vector search based on query analysis and user ID."""
#     if hasattr(state, "model_dump"):
#         state = state.model_dump()
    
#     # Use keyphrases from query analysis for the cache key
#     query_analysis = state.get("query_analysis", {})
#     keyphrases = tuple(query_analysis.get("keyphrases", {}).get("keyphrases", []))
    
#     # Include user_id to ensure user-specific caching
#     user_id = state.get("agent_config", {}).get("user_id", "")
    
#     return pickle.dumps((keyphrases, user_id))

# @traceable(project_name="Discoverminds",name="sql search caching inmem")
# def sql_search_cache_key(state):
#     """Generate a cache key for SQL search based on query analysis and user ID."""
#     if hasattr(state, "model_dump"):
#         state = state.model_dump()
    
#     # Use filters and traits from query analysis for the cache key
#     query_analysis = state.get("query_analysis", {})
#     filters = json.dumps(query_analysis.get("filters", {}), sort_keys=True)
#     traits = json.dumps(query_analysis.get("traits", {}).get("traits", []), sort_keys=True)
    
#     # Include user_id to ensure user-specific caching
#     user_id = state.get("agent_config", {}).get("user_id", "")
    
#     return pickle.dumps((filters, traits, user_id))

# @traceable(project_name="Discoverminds",name="fusion ranking caching inmem")
# def fusion_ranking_cache_key(state):
#     """Generate a cache key for fusion ranking based on vector and SQL search results."""
#     if hasattr(state, "model_dump"):
#         state = state.model_dump()
    
#     # Use vector search and SQL search results for the cache key
#     vector_search_results = state.get("vector_search", {})
#     sql_search_results = state.get("sql_search", {})
    
#     # Convert to strings for hashing
#     vector_key = json.dumps(vector_search_results, sort_keys=True) if vector_search_results else ""
#     sql_key = json.dumps(sql_search_results, sort_keys=True) if sql_search_results else ""
    
#     # Include user_id to ensure user-specific caching
#     user_id = state.get("agent_config", {}).get("user_id", "")
    
#     return pickle.dumps((vector_key, sql_key, user_id))

# @traceable(project_name="Discoverminds",name="sql query answer caching inmem")
# def finalize_sql_answer_cache_key(state):
#     """Generate a cache key for final answer generation based on fusion ranking results."""
#     if hasattr(state, "model_dump"):
#         state = state.model_dump()
    
#     # Use fusion ranking results for the cache key
#     fusion_results = state.get("fusion_ranking", {})
    
#     # Convert to string for hashing
#     fusion_key = json.dumps(fusion_results, sort_keys=True) if fusion_results else ""
    
#     # Include user_id and original query to ensure user-specific and query-specific caching
#     user_id = state.get("agent_config", {}).get("user_id", "")
#     messages = state.get("messages", [])
#     user_query = get_research_topic(messages)
    
#     return pickle.dumps((fusion_key, user_query, user_id))

# Add custom key functions for caching
@traceable(project_name="Discoverminds",name="query caching inmem")
def query_cache_key(state):
    """Generate a cache key based on the user query.
    
    This ensures that identical queries use cached results even if other state elements differ.
    """
    if hasattr(state, "model_dump"):
        state = state.model_dump()
    
    # Extract user query from messages
    messages = state.get("messages", [])
    user_query = get_research_topic(messages)
    
    # Create a cache key based on user query and user_id to ensure user-specific caching
    user_id = state.get("agent_config", {}).get("user_id", "")
    
    # Return a tuple that will be used as the cache key
    return pickle.dumps((user_query, user_id))

@traceable(project_name="Discoverminds",name="vector caching inmem")
def vector_search_cache_key(state):
    """Generate a cache key for vector search based on query analysis and user ID."""
    if hasattr(state, "model_dump"):
        state = state.model_dump()
    
    # Use keyphrases from query analysis for the cache key
    query_analysis = state.get("query_analysis", {})
    keyphrases = tuple(query_analysis.get("keyphrases", {}).get("keyphrases", []))
    
    # Include user_id to ensure user-specific caching
    user_id = state.get("agent_config", {}).get("user_id", "")
    
    return pickle.dumps((keyphrases, user_id))

@traceable(project_name="Discoverminds",name="sql search caching inmem")
def sql_search_cache_key(state):
    """Generate a cache key for SQL search based on query analysis and user ID."""
    if hasattr(state, "model_dump"):
        state = state.model_dump()
    
    # Use filters and traits from query analysis for the cache key
    query_analysis = state.get("query_analysis", {})
    filters = json.dumps(query_analysis.get("filters", {}), sort_keys=True)
    traits = json.dumps(query_analysis.get("traits", {}).get("traits", []), sort_keys=True)
    
    # Include user_id to ensure user-specific caching
    user_id = state.get("agent_config", {}).get("user_id", "")
    
    return pickle.dumps((filters, traits, user_id))

@traceable(project_name="Discoverminds",name="fusion ranking caching inmem")
def fusion_ranking_cache_key(state):
    """Generate a cache key for fusion ranking based on vector and SQL search results."""
    if hasattr(state, "model_dump"):
        state = state.model_dump()
    
    # Use vector search and SQL search results for the cache key
    vector_search_results = state.get("vector_search", {})
    sql_search_results = state.get("sql_search", {})
    
    # Convert to strings for hashing
    vector_key = json.dumps(vector_search_results, sort_keys=True) if vector_search_results else ""
    sql_key = json.dumps(sql_search_results, sort_keys=True) if sql_search_results else ""
    
    # Include user_id to ensure user-specific caching
    user_id = state.get("agent_config", {}).get("user_id", "")
    
    return pickle.dumps((vector_key, sql_key, user_id))

@traceable(project_name="Discoverminds",name="sql query answer caching inmem")
def finalize_sql_answer_cache_key(state):
    """Generate a cache key for final answer generation based on fusion ranking results."""
    if hasattr(state, "model_dump"):
        state = state.model_dump()
    
    # Use fusion ranking results for the cache key
    fusion_results = state.get("fusion_ranking", {})
    
    # Convert to string for hashing
    fusion_key = json.dumps(fusion_results, sort_keys=True) if fusion_results else ""
    
    # Include user_id and original query to ensure user-specific and query-specific caching
    user_id = state.get("agent_config", {}).get("user_id", "")
    messages = state.get("messages", [])
    user_query = get_research_topic(messages)
    
    return pickle.dumps((fusion_key, user_query, user_id))

# Create simplified SQL-only Agent Graph
builder = StateGraph(OverallState)

# Add nodes for parallel execution with caching
builder.add_node(
    "query_analysis", 
    query_analysis
)
builder.add_node(
    "vector_search", 
    vector_search
)
builder.add_node(
    "sql_search", 
    sql_search
)
builder.add_node(
    "fusion_ranking", 
    fusion_ranking
)
builder.add_node(
    "finalize_sql_answer", 
    finalize_sql_answer
)

# Set the entrypoint
builder.add_edge(START, "query_analysis")

# Parallel execution: both vector_search and sql_search run after query_analysis
builder.add_edge("query_analysis", "vector_search")
builder.add_edge("query_analysis", "sql_search")

# Both parallel nodes feed into fusion_ranking
builder.add_edge("vector_search", "fusion_ranking")
builder.add_edge("sql_search", "fusion_ranking")

# Fusion ranking feeds into finalize_sql_answer
builder.add_edge("fusion_ranking", "finalize_sql_answer")

# Set the exit point
builder.add_edge("finalize_sql_answer", END)

# Parallel execution: both vector_search and sql_search run after query_analysis
builder.add_edge("query_analysis", "vector_search")
builder.add_edge("query_analysis", "sql_search")

# Both parallel nodes feed into fusion_ranking
builder.add_edge("vector_search", "fusion_ranking")
builder.add_edge("sql_search", "fusion_ranking")

# Final answer generation
builder.add_edge("fusion_ranking", "finalize_sql_answer")
builder.add_edge("finalize_sql_answer", END)

# Compile the graph with shared Redis cache
graph_2 = builder.compile(
    name="parallel-search-agent"
)

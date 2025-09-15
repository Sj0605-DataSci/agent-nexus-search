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
        
        user_query = state["messages"][-1].get("content", "")

        cache_key = f"graph2:query_analysis:{user_id}:{user_query}"
        
        # Try to get from cache
        cached_result = await redis_client.get(cache_key)
        if cached_result is not None:
            await supabase_client.table("chat_messages").update({
                "sub_queries": cached_result.get("query_analysis").get("keyphrases").get("keyphrases", []),
                "weave_url": state["weave_url"],
            }).eq("id", current_message_id).execute()
            
            invalidate_chat_messages_cache(chat_thread_id)
<<<<<<< HEAD
            
            # Ensure we use the current message ID, not the cached one
            cached_result_dict = cached_result if isinstance(cached_result, dict) else cached_result.model_dump()
        system_instruction = """You are an expert at analyzing search queries for professional networking and people search. 


Given a user's search query, you need to:
1. Paraphrase the query in a clear, professional manner
2. Extract relevant filters (location, work experience, company, position, skills)
3. Identify key traits the user is looking for in people
4. Extract exactly 5 important keyphrases for semantic search (or fewer if query is simple)

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
4. Exactly 5 important keyphrases for semantic matching (or fewer if query is simple)
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

# ===== NODE 2: SQL Search (Parallel) =====
@traceable(project_name="Discoverminds",name="sql_search")
async def sql_search(state: OverallState, config: RunnableConfig) -> OverallState:
    """Generate SQL queries and execute keyword search."""
    try:
        if hasattr(state, "model_dump"):
            state = state.model_dump()
        
        print("Node 2: SQL Search")
        
        query_analysis = state.get("query_analysis", {})
        agent_config = state["agent_config"]
        user_id = agent_config["user_id"]
        user_query = state["messages"][-1].get("content", "")
        current_message_id = state.get("current_message_id", "")
        chat_thread_id = state.get("chat_thread_id", "")
        supabase_client = await get_async_supabase_client()

        cache_key = f"graph2:sql_search:{user_id}:{user_query}"
        
        cached_result = await redis_client.get(cache_key)
        if cached_result is not None:
            await supabase_client.table("chat_messages").update({
                "generated_sql": cached_result.get("sql_queries"),
            }).eq("id", current_message_id).execute()
            
            invalidate_chat_messages_cache(chat_thread_id)
<<<<<<< HEAD
            cached_result_dict = cached_result if isinstance(cached_result, dict) else cached_result.model_dump()
            cached_result_dict["current_message_id"] = current_message_id

            return OverallState(**cached_result_dict)
=======
            
            return OverallState(**cached_result)
>>>>>>> b3c8499 (now cache answers too will get recorded in supabase)
        
        
        # Extract traits and filters for keyword generation
        filters = query_analysis.get("filters", {})
        traits = query_analysis.get("traits", {}).get("traits", [])
        friends_user_id="06f7e3ea-162c-46a4-a494-4459dd4bea10"
        user_ids = [user_id,friends_user_id]
        
        # Prepare search context for LLM
        search_context = {
            "filters": filters,
            "traits": traits
        }
        
        sql_system_instruction = """You are an expert SQL query generator for a connections database.

IMPORTANT: Use ONLY these exact column names from the connections table:
- id (uuid)
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
- search_tsv (tsvector)

Rules:
- Always filter by `user_id = '{user_id}'` (or `IN (...)` if multiple).
- Always require `about_section IS NOT NULL`, `experience_json IS NOT NULL`, and `embedding_generated_at IS NOT NULL`.
- Use multiple `search_tsv @@ plainto_tsquery('english', ...)` for text matching instead of multiple OR/ILIKE conditions.
- Return direct `SELECT` results (no `row_to_json` or wrappers).
- Always include `id` in the query.
- Always `ORDER BY embedding_generated_at DESC`.
- Also use rank ts_rank_cd to rank the results.
- Always `LIMIT 20`.

Template of SQL to be followed:
SELECT  
    id, user_id, first_name, last_name, headline, about_section,
    experience_json, education_json, skills, linkedin_url,
    company, position, location, profile_photo_url, embedding_generated_at,
    ts_rank_cd(
      search_tsv,
      (plainto_tsquery('english', 'keyword')
       && plainto_tsquery('english', 'keyword'))
    ) AS rank
FROM connections
WHERE user_id IN ({user_ids})
  AND about_section IS NOT NULL
  AND experience_json IS NOT NULL
  AND embedding_generated_at IS NOT NULL
  AND search_tsv @@ (
        plainto_tsquery('english', 'keyword')
    &&  plainto_tsquery('english', 'keyword')
  )
ORDER BY rank DESC, embedding_generated_at DESC
LIMIT 20;


FOLLOW USER PROMPT TO GET USER_IDS, keywords from search_context and generate SQL query.
"""

        sql_user_prompt = f"""Generate a SQL query to find connections matching these criteria:

User ID: {user_ids}
Search Context: {json.dumps(search_context, indent=2)}

Requirements:
- Always filter by `user_id IN ({user_ids})`
- Always require `about_section IS NOT NULL`, `experience_json IS NOT NULL`, and `embedding_generated_at IS NOT NULL`
- Search using full-text search: `search_tsv @@ plainto_tsquery('english', 'your terms here')`
- Return at most 20 rows, ordered by `embedding_generated_at DESC`
- Always include `id` in the query
- Do NOT use row_to_json or wrappers, return raw SELECT results

Example format:
Query: find me Designers in Delhi with 6 years of experience

SELECT  
    id, user_id, first_name, last_name, headline, about_section,
    experience_json, education_json, skills, linkedin_url,
    company, position, location, profile_photo_url, embedding_generated_at,
    ts_rank_cd(
      search_tsv,
      (plainto_tsquery('english', 'Designer')
       && plainto_tsquery('english', 'Delhi'))
    ) AS rank
FROM connections
WHERE user_id IN ({user_ids})
  AND about_section IS NOT NULL
  AND experience_json IS NOT NULL
  AND embedding_generated_at IS NOT NULL
  AND search_tsv @@ (
        plainto_tsquery('english', 'Designer')
    &&  plainto_tsquery('english', 'Delhi')
  )
ORDER BY rank DESC, embedding_generated_at DESC
LIMIT 20;
"""

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
                llm = GeminiChatModel(model="gemini-2.5-flash", temperature=0, system_instruction=sql_system_instruction)
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
            except Exception as fallback_e:
                raise fallback_e
        
<<<<<<< HEAD
        print("Node 2: SQL Search Completed")
=======
        print("Node 3: SQL Search Completed")
>>>>>>> 1669ca2 (now cache answers too will get recorded in supabase)
        current_message_id = state["current_message_id"]
        chat_thread_id = state["chat_thread_id"]

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
        await supabase_client.table("chat_messages").update({
            "generated_sql": clean_query
        }).eq("user_id", user_id).eq("id", current_message_id).execute()
        
        invalidate_chat_messages_cache(chat_thread_id)
        
        return OverallState(**result)
        
    except Exception as e:
        raise

# ===== NODE 3: Vector Search (Parallel) =====
@traceable(project_name="Discoverminds",name="vector_search")
async def vector_search(state: OverallState, config: RunnableConfig) -> OverallState:
    """Perform vector search on keyword results using basic_info_embedding and experience_embedding."""
    try:
        print("Node 3: Reranking from vectors")
        if hasattr(state, "model_dump"):
            state = state.model_dump()

        query_analysis = state.get("query_analysis", {})
        keyphrases = query_analysis.get("keyphrases", {}).get("keyphrases", [])
        agent_config = state["agent_config"]
        user_id = agent_config["user_id"]
        user_query = state["messages"][-1].get("content", "")
<<<<<<< HEAD
        current_message_id = state.get("current_message_id", "")
=======
>>>>>>> b3c8499 (now cache answers too will get recorded in supabase)
        cache_key = f"graph2:vector_search_hybrid:{user_id}:{user_query}"
        
        # Try to get from cache
        cached_result = await redis_client.get(cache_key)
        if cached_result is not None:
            cached_result_dict = cached_result if isinstance(cached_result, dict) else cached_result.model_dump()
            cached_result_dict["current_message_id"] = current_message_id
            return OverallState(**cached_result_dict)
        
        # Get SQL search results from state
        keyword_results = state.get("web_research_result", [])
        
        # Extract profile IDs from keyword results
        keyword_profile_ids = []
        for result_item in keyword_results:
            # Handle different possible structures of the results
            if isinstance(result_item, dict):
                # Direct profile object
                profile_id = result_item.get("result", {}).get("id", "")
                if profile_id:
                    keyword_profile_ids.append(profile_id)
            elif isinstance(result_item, str):
                # Just the ID as string
                keyword_profile_ids.append(result_item)
        
        # Log the extracted profile IDs
        print(f"Extracted {len(keyword_profile_ids)} profile IDs from SQL results")
        
        print(f"Node 2: Found {len(keyword_profile_ids)} profiles from keyword search")
        
        # If no keyword results, return empty results
        if not keyword_profile_ids:
            print("Node 2: No keyword results to perform vector search on")
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
        
        # Initialize Supabase client
        supabase_client = await get_async_supabase_client()
        
        # Generate embeddings for each keyphrase (limit to 5 for efficiency)
        all_vector_results = []
        print("Node 2: Generating embeddings for vector search")
        
        for i, keyphrase in enumerate(keyphrases):
            try:
                # Generate embedding using Jina
                embedding = await generate_jina_embedding(keyphrase)
                
                if not embedding:
                    continue
                if embedding:
                    print(f"Node 2: Generated embedding for keyphrase {keyphrase}")
                # Convert embedding to a list for JSON serialization
                embedding_list = embedding.tolist() if hasattr(embedding, 'tolist') else list(embedding)
                
                # Call the vector_search_profiles RPC function
                try:
                    vector_result = await supabase_client.rpc(
                        'vector_search_profiles',
                        {
                            'p_profile_ids': keyword_profile_ids,
                            'p_embedding': embedding_list,
                            'p_limit': 10
                        }
                    ).execute()
                except Exception as e:
                    print(f"Error calling vector_search_profiles RPC: {str(e)}")
                    # Create a fallback RPC function if it doesn't exist
                    create_rpc_query = f"""
                    CREATE OR REPLACE FUNCTION vector_search_profiles(
                        p_profile_ids UUID[],
                        p_embedding FLOAT[],
                        p_limit INT DEFAULT 10
                    ) RETURNS JSONB AS $$
                    DECLARE
                        result JSONB;
                    BEGIN
                        WITH vector_scores AS (
                            SELECT 
                                id, 
                                first_name, 
                                last_name, 
                                headline, 
                                about_section, 
                                experience_json, 
                                education_json, 
                                skills, 
                                linkedin_url, 
                                company, 
                                position, 
                                location, 
                                profile_photo_url,
                                1 - (basic_info_embedding <=> p_embedding::vector) AS basic_info_score,
                                1 - (experience_embedding <=> p_embedding::vector) AS experience_score
                            FROM 
                                connections
                            WHERE 
                                id = ANY(p_profile_ids)
                                AND (basic_info_embedding IS NOT NULL OR experience_embedding IS NOT NULL)
                        )
                        SELECT jsonb_agg(t) INTO result
                        FROM (
                            SELECT 
                                id, 
                                first_name, 
                                last_name, 
                                headline, 
                                about_section, 
                                experience_json, 
                                education_json, 
                                skills, 
                                linkedin_url, 
                                company, 
                                position, 
                                location, 
                                profile_photo_url,
                                COALESCE(basic_info_score, 0) AS basic_info_score,
                                COALESCE(experience_score, 0) AS experience_score,
                                GREATEST(COALESCE(basic_info_score, 0), COALESCE(experience_score, 0)) AS max_score
                            FROM 
                                vector_scores
                            ORDER BY 
                                max_score DESC
                            LIMIT p_limit
                        ) t;
                        
                        RETURN COALESCE(result, '[]'::jsonb);
                    END;
                    $$ LANGUAGE plpgsql;
                    """
                    
                    try:
                        # Try to create the RPC function
                        await supabase_client.rpc('execute_dynamic_sql', {'query_text': create_rpc_query}).execute()
                        print("Created vector_search_profiles RPC function")
                        
                        # Try the RPC call again
                        vector_result = await supabase_client.rpc(
                            'vector_search_profiles',
                            {
                                'p_profile_ids': keyword_profile_ids,
                                'p_embedding': embedding_list,
                                'p_limit': 50
                            }
                        ).execute()
                    except Exception as create_e:
                        print(f"Error creating RPC function: {str(create_e)}")
                        # Fallback to empty result
                        vector_result = type('obj', (object,), {'data': []})
                
                # Process results
                if vector_result.data:
                    for row in vector_result.data:
                        profile_id = row.get("id")
                        basic_info_score = row.get("basic_info_score", 0)
                        experience_score = row.get("experience_score", 0)
                        max_score = row.get("max_score", 0)
                        
                        if profile_id and max_score > 0:
                            all_vector_results.append({
                                "profile_id": profile_id,
                                "basic_info_score": float(basic_info_score),
                                "experience_score": float(experience_score),
                                "similarity_score": float(max_score),
                                "keyphrase": keyphrase
                            })
                
                # Clean up memory
                del embedding
                
                # Small delay to avoid rate limiting
                await asyncio.sleep(0.2)
                
            except Exception as e:
                print(f"Error in vector search for keyphrase {keyphrase}: {str(e)}")
        
        # Remove duplicates and combine scores
        unique_vector_profiles = {}
        for vec_result in all_vector_results:
            profile_id = vec_result["profile_id"]
            if profile_id not in unique_vector_profiles:
                unique_vector_profiles[profile_id] = {
                    "profile_id": profile_id,
                    "max_similarity": vec_result["similarity_score"],
                    "basic_info_score": vec_result["basic_info_score"],
                    "experience_score": vec_result["experience_score"],
                    "matching_keyphrases": [vec_result["keyphrase"]]
                }
            else:
                # Update with higher similarity score
                if vec_result["similarity_score"] > unique_vector_profiles[profile_id]["max_similarity"]:
                    unique_vector_profiles[profile_id]["max_similarity"] = vec_result["similarity_score"]
                    unique_vector_profiles[profile_id]["basic_info_score"] = vec_result["basic_info_score"]
                    unique_vector_profiles[profile_id]["experience_score"] = vec_result["experience_score"]
                
                # Add keyphrase to matching list
                if vec_result["keyphrase"] not in unique_vector_profiles[profile_id]["matching_keyphrases"]:
                    unique_vector_profiles[profile_id]["matching_keyphrases"].append(vec_result["keyphrase"])
        
        # Sort profiles by similarity score and take top 20
        sorted_profiles = sorted(
            unique_vector_profiles.items(), 
            key=lambda x: x[1]["max_similarity"], 
            reverse=True
        )[:10]
        
        # Extract profile IDs from sorted results
        vector_profile_ids = [profile_id for profile_id, _ in sorted_profiles]
        
        print(f"Node 2: Vector Search Completed - Found {len(vector_profile_ids)} profiles")
        
        # If no vector results, fall back to keyword results
        if not vector_profile_ids and keyword_profile_ids:
            print("Node 2: No vector results, falling back to keyword results")
            vector_profile_ids = keyword_profile_ids[:10]
            for profile_id in vector_profile_ids:
                unique_vector_profiles[profile_id] = {
                    "profile_id": profile_id,
                    "max_similarity": 0.5,  # Default similarity score
                    "basic_info_score": 0.5,
                    "experience_score": 0.5,
                    "matching_keyphrases": ["keyword_match"]
                }
        
        # Prepare result
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
            "vector_results": vector_profile_ids,
            "vector_similarity_data": unique_vector_profiles
        }

        await redis_client.set(cache_key, result, expire=3600)
        return OverallState(**result)
        
    except Exception as e:
        print(f"Error in vector_search: {str(e)}")
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
    
    # Get vector search results
    vector_results = state.get("vector_results", [])
    vector_similarity_data = state.get("vector_similarity_data", {})
    
    # Get keyword search results
    keyword_results = state.get("web_research_result", [])

    user_query = state["messages"][-1].get("content", "")
    
    cache_key = f"graph2:finalize_sql_answer:{user_id}:{user_query}"
    
    cached_result = await redis_client.get(cache_key)
    if cached_result is not None:
        final_message_content = cached_result.get("messages", [{}])[0].get("content", "")
        await supabase_client.table("chat_messages").update({
            "message": final_message_content,
            "sources_gathered": cached_result.get("sources_gathered")
        }).eq("user_id", user_id).eq("id", current_message_id).execute()
        
        invalidate_chat_messages_cache(chat_thread_id)
<<<<<<< HEAD
        cached_result_dict = cached_result if isinstance(cached_result, dict) else cached_result.model_dump()
        cached_result_dict["current_message_id"] = current_message_id
        
        return OverallState(**cached_result_dict)
=======
        
        return OverallState(**cached_result)
>>>>>>> b3c8499 (now cache answers too will get recorded in supabase)
    
    # Combine results from both sources
    combined_profiles = []
    
    # First add vector results with their similarity scores
    if vector_results:
        print(f"Node 5: Processing {len(vector_results)} vector results")
        for profile_id in vector_results:
            # Get the profile data from keyword results
            profile_data = None
            for result in keyword_results:
                if isinstance(result, dict) and result.get("result", {}).get("id") == profile_id:
                    profile_data = result.get("result", {})
                    break
            
            if profile_data:
                # Add similarity data from vector search
                similarity_info = vector_similarity_data.get(profile_id, {})
                profile_data["similarity_score"] = similarity_info.get("max_similarity", 0)
                profile_data["basic_info_score"] = similarity_info.get("basic_info_score", 0)
                profile_data["experience_score"] = similarity_info.get("experience_score", 0)
                profile_data["matching_keyphrases"] = similarity_info.get("matching_keyphrases", [])
                profile_data["search_source"] = "vector"
                
                combined_profiles.append(profile_data)
    
    # Sort combined profiles by similarity score (if available) or default order
    combined_profiles.sort(key=lambda x: x.get("similarity_score", 0), reverse=True)
    
    # Limit to top results based on agent config
    final_profiles = combined_profiles
    
    print(f"Node 5: Finalize SQL Answer : Using {len(final_profiles)} profiles")
    
    query_analysis = state.get("query_analysis", {})
<<<<<<< HEAD
<<<<<<< HEAD
=======
    user_query = get_research_topic(state["messages"])
    
    cache_key = f"graph2:finalize_sql_answer:{user_id}:{user_query}"
    
    cached_result = await redis_client.get(cache_key)
    if cached_result is not None:
        await supabase_client.table("chat_messages").update({
            "message": cached_result.messages,
            "sources_gathered": cached_result.sources_gathered
        }).eq("user_id", user_id).eq("id", current_message_id).execute()
        
        invalidate_chat_messages_cache(chat_thread_id)
        
        return OverallState(**cached_result)
>>>>>>> 1669ca2 (now cache answers too will get recorded in supabase)
=======
>>>>>>> b3c8499 (now cache answers too will get recorded in supabase)
    
    if not final_profiles:
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
- Also you have filters in the query analysis, also give out same filter from them for the profile
- Always give 3 scores in scoring array
- Use filters from user query for the profile

Return answer like this 

Give answer in correct json format
Example format:

'''json
{
"profile_id": "uuid-2",
"linkedin_url": "https://www.linkedin.com/in/username2",
"all_quotes": ["5 years of <b>product management experience</b>","Launched <b>3 successful products</b>","Some experience with <b>data analytics</b>","No <b>engineering background</b> mentioned"],
"scoring": [
        {
          "confidence": 0.85,
          "filter": " Suitable Filter from user query",
          "traitTitle": "<b>Experienced Product Manager</b> at Top Tech Company",
          "traitDescription": "Has <b>5+ years experience</b> managing successful products at <b>Google</b>"
        },
        {
          "confidence": 0.45,
          "filter": "Suitable Filter from user query",
          "traitTitle": "Basic <i>UX Design</i> Knowledge",
          "traitDescription": "Has <i>fundamental understanding</i> of user experience principles"
        },
        {
          "confidence": 0.15,
          "filter": "Suitable Filter from user query",
          "traitTitle": "No Healthcare Industry Experience",
          "traitDescription": "Profile shows <b>no evidence</b> of healthcare sector work"
        }
      ]
}
      '''

All profile ids should get all the three scores, it can be permutation, can be all same scores, but they should answer the keyphrases and traits and everything. The "scoring" array should contain traits with confidence values that determine their categorization (yes/maybe/no).
"""
        user_prompt = f"""User Query: "{user_query}"

Search Criteria:
- Traits: {json.dumps(query_analysis.get('traits', {}), indent=2)}
- Keyphrases: {json.dumps(query_analysis.get('keyphrases', {}), indent=2)}
- Filters: {json.dumps(query_analysis.get('filters', {}), indent=2)}

Profiles to Score:
{json.dumps(final_profiles, indent=2)}

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
                        "confidence": trait.confidence,
                        "filter": trait.filter
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
            llm = GeminiChatModel(model="gemini-2.5-pro", temperature=0, system_instruction=scoring_system_instruction)
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
                                "confidence": trait.confidence,
                                "filter": trait.filter
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
        for profile in final_profiles:
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
                        'confidence': float(score.get('confidence', 0.0)),
                        'filter': str(score.get('filter', ''))
                    }
                    for score in profile['scoring']
                ]
        
        message_content = json.dumps(response_data, indent=2, ensure_ascii=False)
        final_message = AIMessage(content=message_content)
    
    try:
        # Update message in database
        await supabase_client.table("chat_messages").update({
            "message": final_message.content,
            "sources_gathered": state.get("sources_gathered", [])
        }).eq("user_id", user_id).eq("agent_id", agent_id).eq("chat_thread_id", chat_thread_id).eq("id", current_message_id).execute()
        
        invalidate_chat_messages_cache(chat_thread_id)
    except Exception as e:
        print(f"Error updating chat message: {str(e)}")
        raise  # Re-raise the exception to see the full traceback
    
    result = {
        "messages": [final_message],
        "sources_gathered": state.get("sources_gathered", []),
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
        "vector_results": state["vector_results"],
        "vector_similarity_data": state["vector_similarity_data"]
    }
    await redis_client.set(cache_key, result, expire=3600)
    return OverallState(**result)


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
    "finalize_sql_answer", 
    finalize_sql_answer
)

# Set the entrypoint
builder.add_edge(START, "query_analysis")

# Parallel execution: both vector_search and sql_search run after query_analysis
builder.add_edge("query_analysis", "sql_search")
builder.add_edge("sql_search", "vector_search")

# Both parallel nodes feed into fusion_ranking
builder.add_edge("vector_search", "finalize_sql_answer")

# Set the exit point
builder.add_edge("finalize_sql_answer", END)

# Compile the graph with shared Redis cache
graph_2 = builder.compile(
    name="parallel-search-agent"
)

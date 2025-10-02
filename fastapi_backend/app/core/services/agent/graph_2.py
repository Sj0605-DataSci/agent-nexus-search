from typing import List, Union, Optional
from langchain_core.messages import AIMessage, HumanMessage, BaseMessage
from langgraph.graph import StateGraph, START, END
from langchain_core.runnables import RunnableConfig
from app.models.chat import OverallState
from app.core.utils.llm_utils import GeminiChatModel, GroqChatModel
from app.db.clients import get_async_supabase_client
from app.models.schemas import QueryAnalysis, ScoredProfilesResponse
from app.core.utils.cache import invalidate_chat_messages_cache
import json
import asyncio
from app.db.redis_client import redis_client
from app.core.services.agent.prompts import query_analysis_system_instruction, sql_search_system_instruction, scoring_system_instruction
from app.core.config import settings

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
        weave_url = state.get("weave_url", "")
        
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
            
            # Ensure we use the current message ID, not the cached one
            cached_result_dict = cached_result if isinstance(cached_result, dict) else cached_result.model_dump()
            cached_result_dict["current_message_id"] = current_message_id

            return OverallState(**cached_result_dict)
      

        user_prompt = f"""Analyze this search query and extract structured information:

Query: "{user_query}"
"""

        # Initialize LLM with Portkey tracing
        # Create metadata for this node
        node_metadata = {
            "_user": user_id,
            "agent_id": agent_id,
            "chat_thread_id": chat_thread_id,
            "message_id": current_message_id,
            "node_name": "query_analysis",
            "node_number": "1",
            "user_query": user_query[:200]  # Truncate for size
        }
        
        # llm = GeminiChatModel(model=model, temperature=0, system_instruction=system_instruction, trace_id=trace_id, metadata=node_metadata)
        llm = GroqChatModel(
            model="meta-llama/llama-4-maverick-17b-128e-instruct", 
            temperature=0, 
            system_instruction=query_analysis_system_instruction,
            trace_id=weave_url,
            metadata=node_metadata
        )

        
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
            # Extract filter lists from SearchFilters object and add labels
            filter_lists = []
            if response.filters.location:
                filter_lists.extend([f"filter:location:{item}" for item in response.filters.location])
            if response.filters.work_experience:
                filter_lists.extend([f"filter:work_experience:{item}" for item in response.filters.work_experience])
            if response.filters.company:
                filter_lists.extend([f"filter:company:{item}" for item in response.filters.company])
            if response.filters.position:
                filter_lists.extend([f"filter:position:{item}" for item in response.filters.position])
            if response.filters.skills:
                filter_lists.extend([f"filter:skills:{item}" for item in response.filters.skills])
            
            # Extract trait lists from SearchTraits object and add labels
            trait_lists = [f"trait:{item}" for item in response.traits.traits] if response.traits.traits else []
            
            # Add labels to keyphrases
            keyphrase_lists = [f"keyphrase:{item}" for item in response.keyphrases.keyphrases]
            
            # Combine all labeled lists
            await supabase_client.table("chat_messages").update({
                "sub_queries": keyphrase_lists + filter_lists + trait_lists,
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
        
        if user_id == settings.FOUNDERS_USERID:
            await redis_client.set(cache_key, result, expire=2628288)
        else:
            await redis_client.set(cache_key, result, expire=3600)
        return OverallState(**result)
        
    except Exception as e:
        raise

# ===== NODE 2: SQL Search =====
async def sql_search(state: OverallState, config: RunnableConfig) -> OverallState:
    """Generate SQL queries and execute keyword search."""
    try:
        if hasattr(state, "model_dump"):
            state = state.model_dump()
        
        print("Node 2: SQL Search")
        query_analysis = state.get("query_analysis", {})
        agent_config = state["agent_config"]
        agent_id = agent_config["id"]
        user_id = agent_config["user_id"]
        user_query = state["messages"][-1].get("content", "")
        current_message_id = state.get("current_message_id", "")
        chat_thread_id = state.get("chat_thread_id", "")
        supabase_client = await get_async_supabase_client()
        weave_url = state.get("weave_url", "")

        cache_key = f"graph2:sql_search:{user_id}:{user_query}"
        
        cached_result = await redis_client.get(cache_key)
        if cached_result is not None:
            await supabase_client.table("chat_messages").update({
                "generated_sql": cached_result.get("sql_queries"),
            }).eq("id", current_message_id).execute()
            
            invalidate_chat_messages_cache(chat_thread_id)
            cached_result_dict = cached_result if isinstance(cached_result, dict) else cached_result.model_dump()
            cached_result_dict["current_message_id"] = current_message_id

            return OverallState(**cached_result_dict)
        
        
        # Extract traits and filters for keyword generation
        filters = query_analysis.get("filters", {})
        traits = query_analysis.get("traits", {}).get("traits", [])
        
        # Get all friends of the current user (where status is accepted)
        friend_ids = []
        try:
            # Query 1: Get friends where user is requester
            requester_friends = await supabase_client.table("friendships").select("addressee_id")\
                .eq("requester_id", str(user_id))\
                .eq("status", "accepted")\
                .execute()
            
            # Query 2: Get friends where user is addressee
            addressee_friends = await supabase_client.table("friendships").select("requester_id")\
                .eq("addressee_id", str(user_id))\
                .eq("status", "accepted")\
                .execute()
            
            # Extract friend IDs from both queries
            if requester_friends.data:
                friend_ids.extend([item["addressee_id"] for item in requester_friends.data])
            
            if addressee_friends.data:
                friend_ids.extend([item["requester_id"] for item in addressee_friends.data])
            
            # Include the user's own ID
            user_ids = [user_id] + friend_ids
        except Exception:
            user_ids = [user_id]  # Fallback to just the user's ID


        response = await supabase_client.table("profiles").select("founders_connection").eq("id", user_id).execute()
        founders_connections = response.data[0]["founders_connection"]
        if founders_connections:
            founders_ids = [settings.SANYAM_USERID, settings.ASHISH_USERID]
            user_ids.extend(founders_ids)
        
        # Prepare search context for LLM
        search_context = {
            "filters": filters,
            "traits": traits
        }
        node_metadata = {
            "_user": user_id,
            "agent_id": agent_id,
            "chat_thread_id": chat_thread_id,
            "message_id": current_message_id,
            "node_name": "sql_search",
            "node_number": "2",
            "user_query": user_query[:200]  # Truncate for size
        }
        
        # llm = GeminiChatModel(model=model, temperature=0, system_instruction=system_instruction, trace_id=trace_id, metadata=node_metadata)

        sql_user_prompt = f"""Generate a SQL query to find connections matching these criteria:

User ID: {user_ids}
Search Context: {json.dumps(search_context, indent=2)}
"""

        keyword_results = []
        generated_sql = ""
        try:            
            # sql_llm = GeminiChatModel(model="gemini-2.5-flash-lite", temperature=0, system_instruction=sql_system_instruction)
            llm = GroqChatModel(
                model="meta-llama/llama-4-maverick-17b-128e-instruct", 
                temperature=0, 
                system_instruction=sql_search_system_instruction,
                trace_id=weave_url,
                metadata=node_metadata
            )            
            sql_response = await llm.ainvoke(sql_user_prompt)
            
            generated_sql = sql_response.content.strip()
            # Clean up the SQL (remove markdown formatting if present)
            if "```sql" in generated_sql:
                generated_sql = generated_sql.split("```sql")[1].split("```")[0].strip()
            elif "```" in generated_sql:
                generated_sql = generated_sql.split("```")[1].strip()
            
            # Clean the SQL query by removing trailing semicolon
            clean_query = generated_sql.strip().rstrip(';')

            await supabase_client.table("chat_messages").update({
                "generated_sql": clean_query
            }).eq("user_id", user_id).eq("id", current_message_id).execute()
            
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
            await supabase_client.table("chat_messages").update({
                "error": "Node: Sql search failed with 1st time groq" + str(e)
            }).eq("id", current_message_id).execute()
            
            # Fallback: get basic results without complex filtering
            try:
                llm = GeminiChatModel(
                model="gemini-2.5-pro", 
                temperature=0, 
                system_instruction=sql_search_system_instruction + "\n\n" + "Error: " + str(e),
                trace_id=weave_url,
                metadata=node_metadata
            )

                sql_response = await llm.ainvoke(sql_user_prompt)
            
                generated_sql = sql_response.content.strip()
                # Clean up the SQL (remove markdown formatting if present)
                if "```sql" in generated_sql:
                    generated_sql = generated_sql.split("```sql")[1].split("```")[0].strip()
                elif "```" in generated_sql:
                    generated_sql = generated_sql.split("```")[1].strip()
            
                # Clean the SQL query by removing trailing semicolon
                clean_query = generated_sql.strip().rstrip(';')

                await supabase_client.table("chat_messages").update({
            "generated_sql": clean_query
            }).eq("user_id", user_id).eq("id", current_message_id).execute()
            
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
                await supabase_client.table("chat_messages").update({
                    "error": "Node: Sql search failed with 2nd time openai oss" + str(fallback_e)
                }).eq("id", current_message_id).execute()
                raise fallback_e
        
        print("Node 2: SQL Search Completed")
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

        if user_id == settings.FOUNDERS_USERID:
            await redis_client.set(cache_key, result, expire=2628288)
        else:
            await redis_client.set(cache_key, result, expire=3600)
        
        invalidate_chat_messages_cache(chat_thread_id)
        
        return OverallState(**result)
        
    except Exception as e:
        raise

# ===== NODE 3: Vector Search =====
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
        current_message_id = state.get("current_message_id", "")
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
        
        print(f"Node 3: Found {len(keyword_profile_ids)} profiles from keyword search")
        
        # If no keyword results, return empty results
        if not keyword_profile_ids:
            print("Node 3: No keyword results to perform vector search on")
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
            if user_id == settings.FOUNDERS_USERID:
                await redis_client.set(cache_key, result, expire=2628288)
            else:
                await redis_client.set(cache_key, result, expire=3600)
            return OverallState(**result)
        
        # Initialize Supabase client
        supabase_client = await get_async_supabase_client()
        
        # Generate embeddings for each keyphrase (limit to 5 for efficiency)
        all_vector_results = []
        print("Node 3: Generating embeddings for vector search")
        
        for i, keyphrase in enumerate(keyphrases):
            try:
                # Generate embedding using Jina
                embedding = await generate_jina_embedding(keyphrase)
                
                if not embedding:
                    continue
                if embedding:
                    print(f"Node 3: Generated embedding for keyphrase {keyphrase}")
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
                    await supabase_client.table("chat_messages").update({
                    "error": "Node 3: Error calling vector_search_profiles RPC: " + str(e)
                }).eq("id", current_message_id).execute()
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
                        await supabase_client.table("chat_messages").update({
                        "error": "Node 3: Error creating RPC function: " + str(create_e)
                        }).eq("id", current_message_id).execute()
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
        
        print(f"Node 3: Vector Search Completed - Found {len(vector_profile_ids)} profiles")
        
        # If no vector results, fall back to keyword results
        if not vector_profile_ids and keyword_profile_ids:
            print("Node 3: No vector results, falling back to keyword results")
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

        if user_id == settings.FOUNDERS_USERID:
            await redis_client.set(cache_key, result, expire=2628288)
        else:
            await redis_client.set(cache_key, result, expire=3600)
        return OverallState(**result)
        
    except Exception as e:
        print(f"Error in vector_search: {str(e)}")
        await supabase_client.table("chat_messages").update({
        "error": "Node 3: Error in vector_search: " + str(e)
        }).eq("id", current_message_id).execute()
        raise

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

# ===== NODE 4: Finalize SQL Answer =====
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
    weave_url = state.get("weave_url", "")
    
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
        cached_result_dict = cached_result if isinstance(cached_result, dict) else cached_result.model_dump()
        cached_result_dict["current_message_id"] = current_message_id
        
        return OverallState(**cached_result_dict)
    
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
    
    if not final_profiles:
        final_message = AIMessage(content="No matching connections found for your query.")
        message_content = final_message.content
    else:
        # Enhanced scoring system with Yes/Maybe/No and quotes
        user_prompt = f"""User Query: "{user_query}"

Search Criteria:
- Traits: {json.dumps(query_analysis.get('traits', {}), indent=2)}
- Keyphrases: {json.dumps(query_analysis.get('keyphrases', {}), indent=2)}
- Filters: {json.dumps(query_analysis.get('filters', {}), indent=2)}

Profiles to Score:
{json.dumps(final_profiles, indent=2)}

 """


        # llm = GeminiChatModel(model=model, temperature=0, system_instruction=scoring_system_instruction)
        node_metadata = {
            "_user": user_id,
            "agent_id": agent_id,
            "chat_thread_id": chat_thread_id,
            "message_id": current_message_id,
            "node_name": "scoring",
            "node_number": "5",
            "user_query": user_query[:200]  # Truncate for size
        }
        llm = GroqChatModel(model="meta-llama/llama-4-maverick-17b-128e-instruct", temperature=0, system_instruction=scoring_system_instruction, metadata=node_metadata, trace_id=weave_url)
        
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
            await supabase_client.table("chat_messages").update({
            "error": "Node 4: Error in score_profiles with groq: " + str(e)
            }).eq("id", current_message_id).execute()
            llm = GeminiChatModel(model="gemini-2.5-pro", temperature=0, system_instruction=scoring_system_instruction, metadata=node_metadata, trace_id=weave_url)
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
                await supabase_client.table("chat_messages").update({
                "error": "Node 4: Error in score_profiles with gemini: " + str(e)
                }).eq("id", current_message_id).execute()
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
    if user_id == settings.FOUNDERS_USERID:
            await redis_client.set(cache_key, result, expire=2628288)
    else:
            await redis_client.set(cache_key, result, expire=3600)
    return OverallState(**result)

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

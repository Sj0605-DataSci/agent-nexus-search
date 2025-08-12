from typing import List, Union
from langchain_core.messages import AIMessage, HumanMessage, BaseMessage
from langgraph.types import Send
from langgraph.graph import StateGraph, START, END
from langchain_core.runnables import RunnableConfig
from app.models.chat import OverallState, ReflectionState, WebSearchState, Reflection, QueryWriterOutput, ReflectionOutput
from app.core.utils.llm_utils import GeminiChatModel
from app.db.clients import get_async_supabase_client
from tavily import TavilyClient
from app.core.config import settings
from app.core.services.agent.configuration import Configuration
from app.core.services.agent.prompts import (
    get_current_date,
    query_writer_system_instruction,
    query_writer_user_prompt,
    reflection_system_instruction,
    reflection_user_prompt,
    optimised_query_system_instruction,
    optimised_query_user_prompt,
    sql_query_system_instruction,
    sql_query_user_prompt,
    reflection_sql_system_instruction,
    reflection_sql_user_prompt,
    answer_table_system_instruction,
    answer_table_user_prompt,
)
from app.models.schemas import PersonDetailsResponse
import weave
from typing import List
import asyncio
from concurrent.futures import ThreadPoolExecutor
from app.core.utils.cache import invalidate_chat_messages_cache


if settings.GOOGLE_API_KEY is None:
    raise ValueError("GOOGLE_API_KEY is not set")


@weave.op
def get_research_topic(messages: List[Union[BaseMessage, dict]]) -> str:
    """
    Get the research topic from the messages.
    """
    # check if request has a history and combine the messages into a single string
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


@weave.op
async def generate_query(state: OverallState, config: RunnableConfig) -> WebSearchState:
    """LangGraph node that generates search queries based on the User's question.

    Uses Gemini 2.0 Flash to create an optimized search queries for web research based on
    the User's question.

    Args:
        state: Current graph state containing the User's question
        config: Configuration for the runnable, including LLM provider settings

    Returns:
        Dictionary with state update, including search_query key containing the generated queries
    """
    try:
        if hasattr(state, "model_dump"):
            state = state.model_dump()

        supabase_client = await get_async_supabase_client()

        messages = state["messages"]

        if isinstance(messages[0], dict):
            main_query = messages[0].get("content", "")
        else:
            main_query = messages[0].content
        
        agent_config = state["agent_config"]
        agent_id = agent_config["id"]
        user_id = agent_config["user_id"]
        num_results = agent_config.get("number_of_results_returned", 5)  # Default to 5 if missing
        chat_thread_id = state["chat_thread_id"]
        current_message_id = state.get("current_message_id", "")
        
        # Log agent config for debugging
        print(f"Agent config in generate_query: {agent_config}")
        print(f"Number of results returned: {num_results}")

    # check for custom initial search query count
        initial_search_query_count = state["initial_search_query_count"]
        current_date = get_current_date()

        if state["world_connections"]=="world":
            # Format system instruction
            system_instruction = query_writer_system_instruction.format(
                current_date=current_date,
                agent_config=agent_config,
                number_queries=initial_search_query_count
            )
            # Format user prompt
            user_prompt = query_writer_user_prompt.format(
                research_topic=get_research_topic(state["messages"])
            )
        elif state["world_connections"]=="connections":
            # Format system instruction
            system_instruction = optimised_query_system_instruction.format(
                number_queries=initial_search_query_count
            )
            # Format user prompt
            user_prompt = optimised_query_user_prompt.format(
                research_topic=get_research_topic(state["messages"])
            )
            
        # Create LLM with system instruction
        llm = GeminiChatModel(
            model="gemini-2.5-flash",
            temperature=0,
            system_instruction=system_instruction
        )
    
    # Generate the search queries
        response, usage_metadata = await llm.with_structured_output(schema_type=QueryWriterOutput, prompt=user_prompt)
        
        # Convert to expected format
        search_queries = []
        for query in response.query:  # Access the 'query' field of the Pydantic model
            search_queries.append({
                "query": query, 
                "rationale": response.rationale
            })
        
        # Log to Supabase
        try:
            # Extract just the query strings for logging
            query_strings = [q["query"] for q in search_queries]
            response = await supabase_client.table("chat_messages").update({
                "sub_queries": query_strings, 
                "weave_url": state["weave_url"],
            }).eq("id", current_message_id).execute()
            
            # Invalidate chat messages cache for this thread
            invalidate_chat_messages_cache(chat_thread_id)
                
            input_tokens = usage_metadata.get("input_tokens") or usage_metadata["input_tokens"]
            output_tokens = usage_metadata.get("output_tokens") or usage_metadata["output_tokens"]
                
            cost_dollar=(input_tokens/1000000) * 0.3 + (output_tokens/1000000) * 2.5
            cost_rupees = cost_dollar * 85.86
            await supabase_client.table("chat_costs").insert({
                    "user_id": user_id, 
                    "agent_id": agent_id, 
                    "chat_thread_id": chat_thread_id,
                    "message_id": current_message_id,
                    "model": "gemini-2.5-flash",
                    "node": "generate_query",
                    "model_input_tokens": float(input_tokens), 
                    "model_output_tokens": float(output_tokens), 
                    "model_cost_dollar": float(cost_dollar),
                    "model_cost_rupees": float(cost_rupees),
                    "weave_url": state["weave_url"]
                }).execute()    
        except Exception as e:
            print(f"Error inserting data into Supabase: {e}")
    
    # Return WebSearchState
        return WebSearchState(
            messages=state["messages"],
            intent=state["intent"],
            format=state["format"],
            search_query=search_queries, 
            agent_id=agent_id, 
            current_message_id=state["current_message_id"],
            agent_config=agent_config,
            sql_queries=[],
            chat_thread_id=chat_thread_id, 
            user_id=state["user_id"], 
            weave_url=state["weave_url"], 
            max_research_loops=state["max_research_loops"], 
            number_of_results_returned=num_results, 
            initial_search_query_count=state["initial_search_query_count"],
            world_connections=state["world_connections"]
        )
    except Exception as e:
        print(f"Error generating search queries: {e}")
        raise    

@weave.op
def continue_to_web_research(state: WebSearchState):
    """LangGraph node that sends the search queries to the web research node.

    This is used to spawn n number of web research nodes, one for each search query.
    """
    if hasattr(state, "model_dump"):
        state = state.model_dump()

    agent_config = state["agent_config"]
    agent_id = agent_config["id"]

    if state["world_connections"] == "world":       
        # For true parallel processing, we should use a single Send to a parallel processor
        return Send("web_research", WebSearchState(
            messages=state["messages"],
            weave_url=state["weave_url"],
            current_message_id=state["current_message_id"],
            search_query=state["search_query"],  # Pass all queries at once
            intent=state["intent"],
            format=state["format"],
            id=0,
            sql_queries=[],
            chat_thread_id=state["chat_thread_id"],
            user_id=state["user_id"],
            agent_id=agent_id,
            agent_config=agent_config,
            world_connections=state["world_connections"],
            number_of_results_returned=state["number_of_results_returned"],
            initial_search_query_count=state["initial_search_query_count"],
            max_research_loops=state["max_research_loops"]
        ))
    elif state["world_connections"] == "connections":
        return [
            Send("sql_query_generation", WebSearchState(
            messages=state["messages"],
            weave_url=state["weave_url"],
            current_message_id=state["current_message_id"],
            search_query=search_query.query if hasattr(search_query, "query") else search_query,
            intent=state["intent"],
            format=state["format"],
            id=int(idx),
            sql_queries=[],
            chat_thread_id=state["chat_thread_id"],
            user_id=state["user_id"],
            agent_id=agent_id,
            agent_config=agent_config,
            world_connections=state["world_connections"],
            number_of_results_returned=state["number_of_results_returned"],
            initial_search_query_count=state["initial_search_query_count"],
            max_research_loops=state["max_research_loops"]
        ))
        for idx, search_query in enumerate(state["search_query"])
    ]

@weave.op
async def web_research(state: WebSearchState, config: RunnableConfig) -> OverallState:
    """Web research node that processes multiple search queries concurrently.
    
    This function performs true parallel processing of multiple search queries using asyncio.gather()
    to significantly reduce total processing time while maintaining the same data format as web_research.
    """
    if hasattr(state, "model_dump"):
        num_results = state.number_of_results_returned
        state = state.model_dump()
    else:
        num_results = state["number_of_results_returned"]
    
    search_queries = state.get("search_query", [])
    if not isinstance(search_queries, list):
        search_queries = [search_queries]
    
    # Initialize Tavily API client
    tavily_api_key = settings.TAVILY_API_KEY
    tavilly_search = TavilyClient(api_key=tavily_api_key)
    print(tavily_api_key)
    
    # Create single ThreadPoolExecutor for all operations
    # Use semaphore to control concurrent Tavily API calls
    max_concurrent_searches = min(8, len(search_queries))  # Use all 8 cores efficiently
    search_semaphore = asyncio.Semaphore(max_concurrent_searches)
    
    # Single ThreadPoolExecutor for all CPU-bound operations
    executor = ThreadPoolExecutor(max_workers=8)
    
    async def search_single_query(query_data, idx):
        """Process a single search query asynchronously with optimized resource usage."""
        async with search_semaphore:  # Control concurrent API calls
            try:
                # Extract query string (same logic as web_research)
                if isinstance(query_data, dict):
                    if "query" in query_data:
                        if isinstance(query_data["query"], list):
                            query = query_data["query"][0]
                        else:
                            query = query_data["query"]
                    else:
                        query = str(query_data)
                elif isinstance(query_data, str):
                    query = query_data
                else:
                    query = str(query_data)
                
                print(f"Using search query {idx + 1}: {query}")
                
                # Use shared ThreadPoolExecutor for CPU-bound Tavily API calls
                loop = asyncio.get_event_loop()
                search_results = await loop.run_in_executor(
                    executor,
                    lambda: tavilly_search.search(
                        query=query,
                        max_results=num_results,
                        include_raw_content=True,
                        search_depth="advanced",
                        include_domains=[],
                        exclude_domains=[]
                    )
                )
                
                print(f"Search results for query {idx + 1}:", search_results)
                
                # Process search results from Tavily API (same logic as web_research)
                processed_results = []
                
                if isinstance(search_results, dict) and 'results' in search_results:
                    tavily_results = search_results['results']
                    
                    for result in tavily_results:
                        processed_result = {
                            "url": result.get("url", ""),
                            "title": result.get("title", "No title"),
                            "content": result.get("content", ""),
                            "raw_content": result.get("raw_content", ""),
                            "score": result.get("score", 0.0),
                        }
                        processed_results.append(processed_result)
                
                # Check if we need to fetch more content for any results
                urls_to_fetch = []
                for result in processed_results:
                    if result.get("url"):
                        urls_to_fetch.append(result.get("url"))
                
                # Fetch additional content if needed (same logic as web_research)
                url_to_content = {}
                if urls_to_fetch:
                    try:
                        extraction_results = await loop.run_in_executor(
                            executor,
                            lambda: tavilly_search.extract(
                                urls=urls_to_fetch,
                                include_raw_content=True,
                                extract_depth="advanced",
                                format="text",
                            )
                        )
                        
                        # Process extraction results
                        if extraction_results:
                            if isinstance(extraction_results, dict) and 'results' in extraction_results:
                                for extract_result in extraction_results['results']:
                                    url = extract_result.get('url', '')
                                    if url:
                                        url_to_content[url] = extract_result
                            elif isinstance(extraction_results, list):
                                for extract_result in extraction_results:
                                    url = extract_result.get('url', '')
                                    if url:
                                        url_to_content[url] = extract_result
                    except Exception as e:
                        print(f"Error extracting content for query {idx + 1}: {e}")
                
                # Update processed results with extracted content
                for i, result in enumerate(processed_results):
                    url = result.get("url")
                    if url in url_to_content:
                        extracted_content = url_to_content[url]
                        processed_results[i]["raw_content"] = extracted_content.get("raw_content", result.get("raw_content", ""))
                        if not processed_results[i].get("content") and extracted_content.get("content"):
                            processed_results[i]["content"] = extracted_content.get("content")
                
                # Format the search results into a readable text (same format as web_research)
                response_text = f"Research on: {query}\n\n"
                print(f"Response text for query {idx + 1}:", response_text)
                
                # Process search results (same logic as web_research)
                for i, result in enumerate(processed_results):
                    content_to_show = ""
                    if result.get("content"):
                        content_to_show = content_to_show + result.get("content")
                    if result.get("raw_content"):
                        content_to_show = content_to_show + result.get("raw_content")
                    if not content_to_show:
                        content_to_show = "No content available"
                    
                    response_text += f"Source {i+1}: {result.get('title', 'No title')}\n"
                    response_text += f"URL: {result.get('url')}\n"
                    response_text += f"Content: {content_to_show}\n\n"
                    print(f"Updated response text for query {idx + 1}:", response_text)
                
                # Create citation structure (same logic as web_research)
                resolved_urls = []
                for i, result in enumerate(processed_results):
                    if "url" in result:
                        resolved_urls.append({
                            "original_url": result["url"],
                            "short_url": f"[{i+1}]",
                            "id": i
                        })
                
                # Format citations
                citations = []
                for i, url_data in enumerate(resolved_urls):
                    citations.append({
                        "segments": [{
                            "value": url_data["original_url"],
                            "short_url": url_data["short_url"],
                            "title": processed_results[i].get("title", "No title") if i < len(processed_results) else ""
                        }]
                    })
                
                # Add citation markers to the text
                modified_text = response_text
                for i, url_data in enumerate(resolved_urls):
                    if i < len(processed_results):
                        modified_text = modified_text.replace(
                            f"URL: {processed_results[i].get('url')}", 
                            f"URL: {url_data['short_url']}"
                        )
                
                # Collect sources with metadata (same format as web_research)
                sources_gathered = []
                for citation in citations:
                    for item in citation["segments"]:
                        sources_gathered.append(item)
                
                return {
                    "query_index": idx,
                    "query": query,
                    "sources_gathered": sources_gathered,
                    "modified_text": modified_text,
                    "processed_results": processed_results
                }
                
            except Exception as e:
                print(f"Error processing query {idx + 1}: {e}")
                return {
                    "query_index": idx,
                    "query": query if 'query' in locals() else str(query_data),
                    "sources_gathered": [],
                    "modified_text": f"Error processing query {idx + 1}: {str(e)}\n\n",
                    "processed_results": []
                }
    
    try:
        # Execute all searches in parallel
        print(f"Starting parallel processing of {len(search_queries)} queries...")
        start_time = asyncio.get_event_loop().time()
        
        # Use asyncio.gather for true parallel execution
        results = await asyncio.gather(
            *[search_single_query(query, idx) for idx, query in enumerate(search_queries)],
            return_exceptions=True
        )
        
        end_time = asyncio.get_event_loop().time()
        print(f"Parallel processing completed in {end_time - start_time:.2f} seconds")
        
    finally:
        # Clean up the executor
        executor.shutdown(wait=False)
    
    # Aggregate all results (same format as web_research)
    all_sources_gathered = []
    all_modified_texts = []
    
    for result in results:
        if isinstance(result, dict):
            all_sources_gathered.extend(result.get("sources_gathered", []))
            if result.get("modified_text"):
                all_modified_texts.append(result.get("modified_text"))
        else:
            # Handle exceptions
            print(f"Exception in parallel processing: {result}")
            if hasattr(result, '__str__'):
                all_modified_texts.append(f"Error in parallel processing: {str(result)}\n\n")
    
    # Combine all modified texts
    combined_modified_text = "\n".join(all_modified_texts) if all_modified_texts else ""
    
    # Return aggregated state (same format as web_research)
    return OverallState(
        sources_gathered=all_sources_gathered,
        intent=state["intent"],
        messages=state.get("messages", []),
        weave_url=state["weave_url"],
        current_message_id=state.get("current_message_id", ""),
        max_research_loops=state.get("max_research_loops", 0),
        agent_config=state.get("agent_config", {}),
        world_connections=state.get("world_connections", ""),
        format=state.get("format", ""),
        search_query=state.get("search_query", []) if isinstance(state.get("search_query", []), list) else ([state.get("search_query", [])] if state.get("search_query") else []),
        sql_queries=state.get("sql_queries", []) if isinstance(state.get("sql_queries", []), list) else [state.get("sql_queries", [])],
        web_research_result=[combined_modified_text],
        user_id=state.get("user_id", ""),
        agent_id=state.get("agent_config", {}).get("id", ""),
        chat_thread_id=state.get("chat_thread_id", ""),
        initial_search_query_count=state.get("initial_search_query_count", 0),
        number_of_results_returned=num_results
    )

@weave.op
async def sql_query_generation(state:WebSearchState) -> OverallState:
    if hasattr(state, "model_dump"):
        state = state.model_dump()

    supabase_client = await get_async_supabase_client()
    if settings.ENVIRONMENT == "STAGING":
        model = "gemini-2.5-flash"
    else:
        model = "gemini-2.5-pro" 

    
    user_id = state["user_id"]
    agent_id = state["agent_config"]["id"]  
    chat_thread_id = state["chat_thread_id"]
    message_id = state["current_message_id"]    

    sql_queries = []
    
    # Format system instruction
    system_instruction = sql_query_system_instruction.format(
        user_id=state["user_id"],
        number_of_results_returned=state["number_of_results_returned"]
    )
    
    # Create LLM with system instruction
    llm = GeminiChatModel(
        model=model,
        temperature=0,
        system_instruction=system_instruction
    )

    # Handle both single dict and list of dicts for search_query
    search_queries = state["search_query"]
    if isinstance(search_queries, dict):
        search_queries = [search_queries]  # Convert single dict to list
    
    for idx, search_query in enumerate(search_queries):
        # Extract the actual query string from the dictionary
        query_text = search_query["query"] if isinstance(search_query, dict) else search_query
        print(f"Processing query: {query_text}")
        
        # Format user prompt
        user_prompt = sql_query_user_prompt.format(
            user_id=state["user_id"],
            subquery=query_text
        )
    
        # Generate the search queries
        response = await llm.ainvoke(user_prompt)
        usage_metadata = response.usage_metadata

        input_tokens = usage_metadata.get("input_tokens") or usage_metadata["input_tokens"]
        output_tokens = usage_metadata.get("output_tokens") or usage_metadata["output_tokens"]
        
        if model == "gemini-2.5-flash":
            input_tokens_cost = (input_tokens/1000000) * 0.15
            output_tokens_cost = (output_tokens/1000000) * 0.60
        elif model == "gemini-2.5-pro":
            if input_tokens <= 200000:
                input_tokens_cost = (input_tokens/1000000) * 1.25
            else:
                input_tokens_cost = (input_tokens/1000000) * 2.5
            if output_tokens <= 200000:
                output_tokens_cost = (output_tokens/1000000) * 10
            else:
                output_tokens_cost = (output_tokens/1000000) * 15
        
        cost_dollar = input_tokens_cost + output_tokens_cost
        cost_rupees = cost_dollar * 85.86
        await supabase_client.table("chat_costs").insert({
                    "user_id": user_id, 
                    "agent_id": agent_id, 
                    "chat_thread_id": chat_thread_id,
                    "message_id": message_id,
                    "model": model,
                    "node": "sql_query_generation",
                    "weave_url": state["weave_url"],    
                    "model_input_tokens": float(input_tokens), 
                    "model_output_tokens": float(output_tokens), 
                    "model_cost_dollar": float(cost_dollar),
                    "model_cost_rupees": float(cost_rupees)
                }).execute() 
        # Access the response content correctly
        if hasattr(response, 'content'):
            sql_query = response.content.strip()
        elif hasattr(response, 'text'):
            sql_query = response.text.strip() if callable(response.text) else response.text
        else:
            sql_query = str(response).strip()
            
        # Clean up the response if it contains markdown code blocks
        if "```sql" in sql_query:
            sql_query = sql_query.split("```sql")[1].split("```")[0].strip()
        elif "```" in sql_query:
            sql_query = sql_query.split("```")[1].strip()
    
        sql_queries.append(sql_query)
        
    return OverallState(
        messages=state.get("messages", []),
        current_message_id=state.get("current_message_id", ""),
        intent=state["intent"],
        format=state.get("format", ""),
        weave_url=state["weave_url"],
        search_query=state.get("search_query", []) if isinstance(state.get("search_query", []), list) else ([state.get("search_query", [])] if state.get("search_query") else []),
        sql_queries=sql_queries,
        web_research_result=state.get("web_research_result", []),
        sources_gathered=state.get("sources_gathered", []),
        research_loop_count=state.get("research_loop_count", 0),
        max_research_loops=state["max_research_loops"],
        initial_search_query_count=state["initial_search_query_count"],
        agent_config=state["agent_config"],
        world_connections=state["world_connections"],
        user_id=state["user_id"],
        agent_id=state["agent_config"]["id"],
        chat_thread_id=state["chat_thread_id"],
        number_of_results_returned=state["number_of_results_returned"],
    )    
    
@weave.op
async def sql_query_execution(state: OverallState) -> OverallState:
    if hasattr(state, "model_dump"):
        state = state.model_dump()
    
    # Execute SQL queries against Supabase
    query_results = []
    supabase_client = await get_async_supabase_client()
    
    for sql_query in state.get("sql_queries", []) if isinstance(state.get("sql_queries", []), list) else [state.get("sql_queries", [])]:
        try:
            print(f"Executing SQL query: {sql_query}")
            
            # Clean the SQL query by removing trailing semicolon
            clean_query = sql_query.strip().rstrip(';')
            
            # Execute the SQL query using a modified approach
            # Wrap the query to return JSON to avoid type mismatch
            json_query = f"SELECT to_jsonb(t) FROM ({clean_query}) t"
            
            try:
                # Execute with JSON wrapper to ensure consistent return type
                result = await supabase_client.rpc('execute_dynamic_sql', {'query_text': json_query}).execute()
                
                if result.data:
                    # Extract the actual data from the JSONB wrapper
                    for row in result.data:
                        if isinstance(row, dict) and 'to_jsonb' in row:
                            query_results.append(row['to_jsonb'])
                        else:
                            query_results.append(row)
                    print(f"Query returned {len(result.data)} results")
                else:
                    print("Query returned no results")
                    
            except Exception as rpc_error:
                print(f"RPC execution failed: {rpc_error}")
                # Fallback: try direct table query if it's a simple SELECT
                if sql_query.strip().upper().startswith('SELECT') and 'connections' in sql_query.lower():
                    try:
                        # Extract table and conditions for direct query
                        result = await supabase_client.table('connections').select('*').eq('user_id', state.get('user_id', '')).limit(1).execute()
                        if result.data:
                            query_results.extend(result.data)
                            print(f"Fallback query returned {len(result.data)} results")
                    except Exception as fallback_error:
                        print(f"Fallback query also failed: {fallback_error}")
                
        except Exception as e:
            print(f"Error executing SQL query '{sql_query}': {e}")
            # Continue with other queries even if one fails
            continue
    
    return OverallState(
        messages=state.get("messages", []),
        current_message_id=state.get("current_message_id", ""),
        weave_url=state["weave_url"],
        search_query=state.get("search_query", []) if isinstance(state.get("search_query", []), list) else ([state.get("search_query", [])] if state.get("search_query") else []),
        sql_queries=state.get("sql_queries", []) if isinstance(state.get("sql_queries", []), list) else [state.get("sql_queries", [])],
        web_research_result=query_results,
        intent=state["intent"],
        initial_search_query_count=state["initial_search_query_count"],
        format=state.get("format", ""),
        sources_gathered=state.get("sources_gathered", []),
        research_loop_count=state.get("research_loop_count", 0),
        max_research_loops=state.get("max_research_loops", 0),
        user_id=state.get("user_id", ""),
        agent_config=state.get("agent_config", {}),
        chat_thread_id=state.get("chat_thread_id", ""),
        number_of_results_returned=state.get("number_of_results_returned", 0),
        world_connections=state.get("world_connections", ""),
    )

# async def get_extra_info(state: OverallState) -> OverallState:
#     if hasattr(state, "model_dump"):
#         state = state.model_dump()

#     extra_info = ""
#     if state["query_results"]:
#         url_extractor = urls.format
    
    
#     return OverallState(
#         sql_queries=state["sql_queries"],
#         messages=state["messages"],
#         search_query=state["search_query"],
#         web_research_result=state["web_research_result"],
#         intent=state["intent"],
#         format=state["format"],
#         sources_gathered=state["sources_gathered"],
#         research_loop_count=state["research_loop_count"],
#         max_research_loops=state["max_research_loops"],
#         user_id=state["user_id"],
#         agent_config=state["agent_config"],
#         chat_thread_id=state["chat_thread_id"],
#         number_of_results_returned=state["number_of_results_returned"],
#         world_connections=state["world_connections"],
#     )
    

@weave.op
async def reflection(state: OverallState, config: RunnableConfig) -> ReflectionState:
    """LangGraph node that identifies knowledge gaps and generates potential follow-up queries.

    Analyzes the current summary to identify areas for further research and generates
    potential follow-up queries. Uses structured output to extract
    the follow-up query in JSON format.

    Args:
        state: Current graph state containing the running summary and research topic
        config: Configuration for the runnable, including LLM provider settings

    Returns:
        Dictionary with state update, including search_query key containing the generated follow-up query
    """
    if hasattr(state, "model_dump"):
        state = state.model_dump()
    
    if settings.ENVIRONMENT == "STAGING":
        model = "gemini-2.5-flash"
    else:
        model = "gemini-2.5-pro"    

    supabase_client = await get_async_supabase_client()
    configurable = Configuration.from_runnable_config(config)
    user_id = state["user_id"]
    agent_id = state["agent_config"]["id"]
    chat_thread_id = state["chat_thread_id"]
    current_message_id = state["current_message_id"]
    # Increment the research loop count and get the reasoning model
    state["research_loop_count"] = state["research_loop_count"] + 1

    # Format the prompt with enhanced context
    research_topic = get_research_topic(state["messages"])
    
    summaries = state["web_research_result"]
    
    if state["sources_gathered"] and state["world_connections"] == "world":
        # Format system instruction
        system_instruction = reflection_system_instruction.format(
            agent_config=state["agent_config"],
            number_queries=state["initial_search_query_count"]
        )
        # Format user prompt
        user_prompt = reflection_user_prompt.format(
            research_topic=research_topic,
            summaries="\n\n---\n\n".join(summaries)
        )
    elif state["world_connections"] == "connections":
        # Format system instruction
        system_instruction = reflection_sql_system_instruction.format(
            number_queries=state["initial_search_query_count"]
        )
        # Format user prompt
        user_prompt = reflection_sql_user_prompt.format(
            research_topic=research_topic,
            summaries="\n\n---\n\n".join(str(summaries))
        )
        
    llm = GeminiChatModel(
            model=model,
            temperature=0,
            system_instruction=system_instruction
        )
    response, usage_metadata = await llm.with_structured_output(prompt=user_prompt, schema_type=ReflectionOutput) 
    
    input_tokens = usage_metadata.get("input_tokens") or usage_metadata["input_tokens"]
    output_tokens = usage_metadata.get("output_tokens") or usage_metadata["output_tokens"]

    if model == "gemini-2.5-flash":
        input_tokens_cost = (input_tokens/1000000) * 0.15
        output_tokens_cost = (output_tokens/1000000) * 0.60
    elif model == "gemini-2.5-pro":
        if input_tokens <= 200000:
            input_tokens_cost = (input_tokens/1000000) * 1.25
        else:
            input_tokens_cost = (input_tokens/1000000) * 2.5
        if output_tokens <= 200000:
            output_tokens_cost = (output_tokens/1000000) * 10
        else:
            output_tokens_cost = (output_tokens/1000000) * 15
    
    cost_dollar=input_tokens_cost + output_tokens_cost
    cost_rupees = cost_dollar * 85.86
    await supabase_client.table("chat_costs").insert({
                "user_id": user_id, 
                "agent_id": agent_id, 
                "chat_thread_id": chat_thread_id,
                "message_id": current_message_id,
                "model": model,
                "node": "reflection",
                "weave_url": state["weave_url"],
                "model_input_tokens": float(input_tokens), 
                "model_output_tokens": float(output_tokens), 
                "model_cost_dollar": float(cost_dollar),
                "model_cost_rupees": float(cost_rupees)
            }).execute() 
    return Reflection(
            is_sufficient=response.is_sufficient,
            current_message_id=state["current_message_id"],
            messages=state["messages"],
            weave_url=state["weave_url"],
            max_research_loops=state["max_research_loops"],
            knowledge_gap=response.knowledge_gap,
            follow_up_queries=response.follow_up_queries,
            research_loop_count=state["research_loop_count"],
            number_of_ran_queries=len(state["search_query"]),
            user_id=state["user_id"],
            world_connections=state["world_connections"],
            agent_id=state["agent_config"]["id"],
            chat_thread_id=state["chat_thread_id"]
        )

@weave.op
async def evaluate_research(
    state: ReflectionState,
) -> OverallState:
    """LangGraph routing function that determines the next step in the research flow.

    Controls the research loop by deciding whether to continue gathering information
    or to finalize the summary based on the configured maximum number of research loops.

    Args:
        state: Current graph state containing the research loop count
        config: Configuration for the runnable, including max_research_loops setting

    Returns:
        String literal indicating the next node to visit ("web_research" or "finalize_summary")
    """
    if hasattr(state, "model_dump"):
        state = state.model_dump()

    user_id = state["user_id"]
    agent_id = state["agent_config"]["id"]
    world_connections = state["world_connections"]

    try:
        max_research_loops = state["max_research_loops"]
    except Exception as e:
        max_research_loops = 1

    if state["is_sufficient"] or state["research_loop_count"] >= max_research_loops:
        return "finalize_answer"
    elif world_connections == "world":
        return [
            Send(
                "web_research",
                WebSearchState(
                    messages=state["messages"],
                    weave_url=state["weave_url"],
                    current_message_id=state["current_message_id"],
                    search_query=follow_up_query,
                    id=state["number_of_ran_queries"] + int(idx),
                    format=state["format"],
                    intent=state["intent"],
                    chat_thread_id=state["chat_thread_id"],
                    user_id=state["user_id"],
                    agent_id=state["agent_config"]["id"],
                    agent_config=state["agent_config"],
                    number_of_results_returned=state["number_of_results_returned"],
                    max_research_loops=state["max_research_loops"]
                )
            )
            for idx, follow_up_query in enumerate(state["follow_up_queries"])
        ]
    elif world_connections == "connections":
        return [
            Send(
                "sql_query_generation",
                WebSearchState(
                    messages=state["messages"],
                    weave_url=state["weave_url"],
                    current_message_id=state["current_message_id"],
                    search_query=follow_up_query,
                    id=state["number_of_ran_queries"] + int(idx),
                    format=state["format"],
                    intent=state["intent"],
                    chat_thread_id=state["chat_thread_id"],
                    user_id=state["user_id"],
                    agent_id=state["agent_config"]["id"],
                    agent_config=state["agent_config"],
                    number_of_results_returned=state["number_of_results_returned"],
                    max_research_loops=state["max_research_loops"]
                )
            )
            for idx, follow_up_query in enumerate(state["follow_up_queries"])
        ]


@weave.op
async def finalize_answer(state: OverallState, config: RunnableConfig):
    """LangGraph node that finalizes the research summary.

    Prepares the final output by deduplicating and formatting sources, then
    combining them with the running summary to create a well-structured
    research report with proper citations.

    Args:
        state: Current graph state containing the running summary and sources gathered

    Returns:
        Dictionary with state update, including running_summary key containing the formatted final summary with sources
    """
    if hasattr(state, "model_dump"):
        state = state.model_dump()
    
    # Fix citation numbering - renumber sources_gathered to have sequential citations
    sources_gathered = state.get("sources_gathered", [])
    renumbered_sources = []
    if settings.ENVIRONMENT == "STAGING":
        model = "gemini-2.5-flash"
    else:
        model = "gemini-2.5-pro"
    
    for idx, source in enumerate(sources_gathered):
        # Create a new source with sequential numbering
        renumbered_source = source.copy()
        renumbered_source["short_url"] = f"[{idx + 1}]"
        renumbered_sources.append(renumbered_source)
    
    # Update state with renumbered sources
    state["sources_gathered"] = renumbered_sources
    
    # Also update web_research_result to use the new citation numbers
    if "web_research_result" in state and state["web_research_result"]:
        updated_research_results = []
        for result_text in state["web_research_result"]:
            updated_text = result_text
            # Replace old citation numbers with new sequential ones
            for old_idx, source in enumerate(sources_gathered):
                if "short_url" in source:
                    old_citation = source["short_url"]
                    new_citation = f"[{old_idx + 1}]"
                    # Only replace if they're different
                    if old_citation != new_citation:
                        updated_text = updated_text.replace(old_citation, new_citation)
            updated_research_results.append(updated_text)
        state["web_research_result"] = updated_research_results
    
    # Format the prompt
    current_date = get_current_date()

    if state["intent"] == "search" and state["world_connections"] == "world" and state["format"] == "table":
        # Format system instruction
        system_instruction = answer_table_system_instruction.format(
            agent_config=state["agent_config"],
            current_date=current_date,
            format=state.get("format", "table")
        )
        # Format user prompt
        user_prompt_table = answer_table_user_prompt.format(
            research_topic=get_research_topic(state["messages"]),
            summaries=str(state["web_research_result"]),
            links=state["sources_gathered"]
        )
    elif state["intent"] == "search" and state["world_connections"] == "connections" and state["format"] == "table":
        # Format system instruction
        system_instruction = answer_table_system_instruction.format(
            agent_config=state["agent_config"],
            current_date=current_date,
            format=state.get("format", "table")
        )
        # Format user prompt
        user_prompt_table = answer_table_user_prompt.format(
            research_topic=get_research_topic(state["messages"]),
            summaries=str(state["web_research_result"]),
            links=state["sources_gathered"]
        )

    supabase_client = await get_async_supabase_client()    
    agent_config = state.get("agent_config", {})
    user_id = agent_config.get("user_id", "")
    agent_id = agent_config.get("id", "")
    chat_thread_id = state.get("chat_thread_id", "")
    current_message_id = state.get("current_message_id", "")

    # Use Gemini client with system instruction
    llm = GeminiChatModel(
        model=model,
        temperature=0,
        system_instruction=system_instruction
    )
    result_table, usage_metadata_table = await llm.with_structured_output(prompt=user_prompt_table, schema_type=PersonDetailsResponse)
    usage_metadata = usage_metadata_table
    input_tokens = usage_metadata.get("input_tokens") or usage_metadata["input_tokens"]
    output_tokens = usage_metadata.get("output_tokens") or usage_metadata["output_tokens"]
    
    # Convert PersonDetailsResponse to a string format
    formatted_content = ""
    for person in result_table.content:
            formatted_content += f"FName : {person.fname}\n"
            formatted_content += f"LName : {person.lname}\n"
            formatted_content += f"Social links : {', '.join(person.social_links)}\n"
            formatted_content += f"Email : {person.email}\n"
            formatted_content += f"Phone No : {person.phone_no}\n"
            formatted_content += f"Score : {person.score}\n"
            formatted_content += f"Reason : {person.reason}\n"
        
    final_message = AIMessage(content=formatted_content.strip())
    
    message_content = final_message.content
    
    try:
        # Use the global Supabase client directly
        await supabase_client.table("chat_messages").update({
            "message": message_content,
            "sources_gathered": state["sources_gathered"]
        }).eq("user_id", user_id).eq("agent_id", agent_id).eq("chat_thread_id", chat_thread_id).eq("id", current_message_id).execute()
        
        # Invalidate chat messages cache for this thread
        invalidate_chat_messages_cache(chat_thread_id)

        if model == "gemini-2.5-flash":
            input_tokens_cost = (input_tokens/1000000) * 0.15
            output_tokens_cost = (output_tokens/1000000) * 0.60
        elif model == "gemini-2.5-pro":
            if input_tokens <= 200000:
                input_tokens_cost = (input_tokens/1000000) * 1.25
            else:
                input_tokens_cost = (input_tokens/1000000) * 2.5
            if output_tokens <= 200000:
                output_tokens_cost = (output_tokens/1000000) * 10
            else:
                output_tokens_cost = (output_tokens/1000000) * 15
        
        cost_dollar=input_tokens_cost + output_tokens_cost
        cost_rupees = cost_dollar * 85.86
        
        await supabase_client.table("chat_costs").insert({
            "user_id": user_id, 
                "agent_id": agent_id, 
                "chat_thread_id": chat_thread_id,
                "message_id": current_message_id,
                "model": model,
                "node": "finalize_answer",
                "weave_url": state["weave_url"],
                "model_input_tokens": float(input_tokens), 
                "model_output_tokens": float(output_tokens), 
                "model_cost_dollar": float(cost_dollar),
                "model_cost_rupees": float(cost_rupees),
        }).execute()
    except Exception as e:
        print(f"Error inserting data into Supabase: {e}")

    return {
        "messages": [final_message],
        "sources_gathered": state["sources_gathered"],
    }


# Create our Agent Graph
builder = StateGraph(OverallState, config_schema=Configuration)

# Define the nodes we will cycle between
builder.add_node("generate_query", generate_query)
builder.add_node("sql_query_generation", sql_query_generation)
builder.add_node("sql_query_execution", sql_query_execution)
builder.add_node("reflection", reflection)
builder.add_node("finalize_answer", finalize_answer)
builder.add_node("web_research", web_research)

# Set the entrypoint as `generate_query`
# This means that this node is the first one called
builder.add_edge(START, "generate_query")
# Add conditional edge to continue with search queries in a parallel branch
builder.add_conditional_edges(
    "generate_query", continue_to_web_research, ["sql_query_generation", "web_research"]
)

# Reflect on the web research
# builder.add_edge("web_research", "reflection")
builder.add_edge("sql_query_generation", "sql_query_execution")
builder.add_edge("sql_query_execution", "reflection")
builder.add_edge("web_research", "reflection")
# Evaluate the research
builder.add_conditional_edges(
    "reflection", evaluate_research, ["web_research", "finalize_answer", "sql_query_generation"]
)
# Finalize the answer
builder.add_edge("finalize_answer", END)

graph = builder.compile(name="pro-search-agent")
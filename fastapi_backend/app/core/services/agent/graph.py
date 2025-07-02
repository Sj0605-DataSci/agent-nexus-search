from typing import List, Union
from langchain_core.messages import AIMessage, HumanMessage, BaseMessage
from langgraph.types import Send
from langgraph.graph import StateGraph
from langgraph.graph import START, END
from langchain_core.runnables import RunnableConfig
from app.models.chat import OverallState, QueryGenerationState, ReflectionState, WebSearchState, SearchQueryList, Reflection, IntentClassifierState
from app.core.utils.llm_utils import GeminiChatModel
from app.db.clients import get_supabase_client
import json
import re
from tavily import TavilyClient
from app.core.config import settings


from app.core.services.agent.configuration import Configuration
from app.core.services.agent.prompts import (
    get_current_date,
    query_writer_instructions,
    reflection_instructions,
    answer_instructions,
)
from uuid import UUID, uuid4

if settings.GOOGLE_API_KEY is None:
    raise ValueError("GOOGLE_API_KEY is not set")

supabase_client = get_supabase_client()


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


# Nodes
async def intent_classifier(state: OverallState, config: RunnableConfig) -> OverallState:
    """LangGraph node that classifies the User's intent.
    
    Determines if the user's message requires web search or can be answered directly.
    """
    if hasattr(state, "model_dump"):
        state = state.model_dump()
    
    # Get the latest user message
    latest_message = ""
    if state["messages"]:
        last_message = state["messages"][-1]
        if isinstance(last_message, dict):
            latest_message = last_message.get("content", "")
        else:
            latest_message = last_message.content if hasattr(last_message, "content") else ""
    
    # Use LLM to classify the intent
    llm = GeminiChatModel(model="gemini-2.0-flash", temperature=0)
    
    # Create a prompt for intent classification
    prompt_content = f"""
        Classify the user's message intent. Is this a greeting, general question, or search query?
        
        User message: "{latest_message}"
        
        If this is a greeting (like hello, hi) or a simple question that doesn't require web search,
        respond with "direct_answer".
        
        If this is a search query or requires looking up information, respond with "search".
        
        Just respond with either "direct_answer" or "search" - nothing else.
        """
    
    # Get the classification
    response = llm.invoke(prompt_content)
    intent = "direct_answer" if "direct_answer" in response.content.lower() else "search"
    
    # Update the state with the classified intent
    return OverallState(
        intent=intent,
        messages=state.get("messages", []),
        search_query=state.get("search_query", []),
        web_research_result=state.get("web_research_result", []),
        user_id=state.get("user_id", ""),
        agent_id=state.get("agent_config", {}).get("id", ""),
        chat_thread_id=str(uuid4()),
        number_of_results_returned=state.get("number_of_results_returned", 1),
        format=state.get("format", "table"),
        sources_gathered=state.get("sources_gathered", []),
        initial_search_query_count=state.get("initial_search_query_count", 0),
        research_loop_count=state.get("research_loop_count", 0),
        max_research_loops=state.get("max_research_loops", 3),
        agent_config=state.get("agent_config", {}),
    )


def continue_to_query_generation(state: OverallState):
    """Router function that decides whether to proceed with search or direct answer."""
    if hasattr(state, "model_dump"):
        state = state.model_dump()
    if state["intent"] == "search":
        return "generate_query"
    else:
        return "finalize_answer"


async def generate_query(state: OverallState, config: RunnableConfig) -> QueryGenerationState:
    """LangGraph node that generates search queries based on the User's question.

    Uses Gemini 2.0 Flash to create an optimized search queries for web research based on
    the User's question.

    Args:
        state: Current graph state containing the User's question
        config: Configuration for the runnable, including LLM provider settings

    Returns:
        Dictionary with state update, including search_query key containing the generated queries
    """
    configurable = Configuration.from_runnable_config(config)
    if hasattr(state, "model_dump"):
        state = state.model_dump()


    # Use Gemini client
    llm = GeminiChatModel(
        model="gemini-2.0-flash",
        temperature=1.0
    )

    messages = state["messages"]
    
    # Handle different message formats
    if isinstance(messages[0], dict):
        main_query = messages[0].get("content", "")
    else:
        main_query = messages[0].content
        
    agent_config = state["agent_config"]
    agent_id = agent_config["id"]
    user_id = agent_config["user_id"]
    num_results = agent_config["number_of_results_returned"]

    # check for custom initial search query count
    try :
        initial_search_query_count = supabase_client.table("hired_agents").select("initial_search_query_count").eq("user_id", user_id).eq("id", agent_id).execute().data[0]["initial_search_query_count"]    
    except Exception as e:
        initial_search_query_count = 1
    current_date = get_current_date()
    formatted_prompt = query_writer_instructions.format(
        current_date=current_date,
        research_topic=get_research_topic(state["messages"]),
        agent_config=agent_config,
        number_queries=initial_search_query_count,
    )
    
    # Generate the search queries
    response = llm.invoke(formatted_prompt)
    print(response)
    
    # Parse the JSON response manually
    import json
    import re
    
    print(f"Raw response: {response.content}")
    
    # First try to extract JSON from the response if it's in a code block
    json_match = re.search(r'```json\s*(.+?)\s*```', response.content, re.DOTALL)
    if json_match:
        json_str = json_match.group(1)
    else:
        # Try to find JSON without code block markers
        json_match = re.search(r'\{[\s\S]*?\}', response.content, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
        else:
            # Fallback to a simple query if parsing fails
            print("No JSON found in response, using fallback")
            return {"search_query": [{"query": get_research_topic(state["messages"]), "rationale": "Direct search based on research topic."}]}
    
    print(f"Extracted JSON string: {json_str}")
    
    try:
        # Clean the string - replace escaped newlines, handle single quotes
        json_str = json_str.replace('\n', ' ').replace('\\n', ' ')
        
        # Try to parse as is
        try:
            result_dict = json.loads(json_str)
        except json.JSONDecodeError:
            # If that fails, try to fix common issues
            # Replace single quotes with double quotes for JSON compliance
            json_str = re.sub(r"'([^']*)'\s*:", r'"\1":', json_str)
            json_str = re.sub(r":\s*'([^']*)'(,|\})", r':"\1"\2', json_str)
            result_dict = json.loads(json_str)
            
        queries = result_dict.get("query", [])
        sub_query_count = len(queries)
        rationale = result_dict.get("rationale", "")
        
        # Convert to the expected format
        search_queries = []
        sub_queries = []
        for query in queries:
            search_queries.append({"query": query, "rationale": rationale})
            sub_queries.append(query)
        
        if not search_queries:
            # Fallback if no queries were found
            search_queries = [{"query": get_research_topic(state["messages"]), "rationale": "Direct search based on research topic."}]
        
        try:
            # Use the global Supabase client directly
            supabase_client.table("chat_messages").insert({
                "user_id": user_id, 
                "agent_id": agent_id, 
                "chat_thread_id": chat_thread_id, 
                "sub_queries": sub_queries, 
                "main_query": main_query
            }).execute()
        except Exception as e:
            print(f"Error inserting data into Supabase: {e}")
            
        return WebSearchState(search_query=search_queries, agent_id=agent_id, chat_thread_id=chat_thread_id, user_id=state["user_id"], max_research_loops=state["max_research_loops"], number_of_results_returned=num_results)

    except json.JSONDecodeError:
        # Fallback to a simple query if JSON parsing fails
        return WebSearchState(search_query=[{"query": get_research_topic(state["messages"]), "rationale": "Direct search based on research topic."}], agent_id=agent_id, chat_thread_id=chat_thread_id, user_id=state["user_id"], max_research_loops=state["max_research_loops"], number_of_results_returned=num_results)


def continue_to_web_research(state: QueryGenerationState):
    """LangGraph node that sends the search queries to the web research node.

    This is used to spawn n number of web research nodes, one for each search query.
    """
    if hasattr(state, "model_dump"):
        state = state.model_dump()
    return [
        Send("web_research", WebSearchState(
            search_query=search_query.query if hasattr(search_query, "query") else search_query,
            id=int(idx),
            chat_thread_id=state["chat_thread_id"],
            user_id=state["user_id"],
            agent_id=state["agent_id"],
            number_of_results_returned=state["number_of_results_returned"]
        ))
        for idx, search_query in enumerate(state["search_query"])
    ]


async def web_research(state: WebSearchState, config: RunnableConfig) -> OverallState:
    """LangGraph node that performs web research using the Exa API.

    Executes a web search using the Exa API to retrieve relevant content and formats it
    with proper citations for further processing.

    Args:
        state: Current graph state containing the search query and research loop count
        config: Configuration for the runnable, including search API settings

    Returns:
        Dictionary with state update, including sources_gathered, research_loop_count, and web_research_results
    """
    # Convert to dict if it's a Pydantic model
    if hasattr(state, "model_dump"):
        # Get the number of results before converting to dict
        num_results = state.number_of_results_returned
        state = state.model_dump()
    else:
        # Fallback if it's already a dict
        num_results = state["number_of_results_returned"]
    
    # Initialize Exa API client
    tavily_api_key = settings.TAVILY_API_KEY
    tavilly_search = TavilyClient(api_key=tavily_api_key)    
    # Extract the query from the state
    search_query = state.get("search_query") if isinstance(state, dict) else state.search_query
    
    if isinstance(search_query, dict):
        # Handle dictionary format
        if "query" in search_query:
            if isinstance(search_query["query"], list):
                query = search_query["query"][0]
            else:
                query = search_query["query"]
    elif isinstance(search_query, str):
        # Handle string format
        query = search_query
    else:
        # Default fallback
        query = ""
    
    print(f"Using search query: {query}")
    
    # Perform search with Exa API
    search_results = tavilly_search.search(
        query=query,
        max_results=state["number_of_results_returned"],
        include_raw_content=True,
        search_depth="basic",
        include_domains=["linkedin.com","github.com","medium.com","twitter.com"],
        exclude_domains=["facebook.com","instagram.com"],
        
    )

    print(search_results)
    
    # Process search results from Tavily API
    processed_results = []
    
    # Handle the search results based on Tavily API structure
    if isinstance(search_results, dict) and 'results' in search_results:
        # Extract results from Tavily API response
        tavily_results = search_results['results']
        
        for result in tavily_results:
            processed_result = {
                "url": result.get("url", ""),
                "title": result.get("title", "No title"),
                "content": result.get("content", ""),
                "raw_content": result.get("raw_content", ""),
                "score": result.get("relevance_score", 0.0),
                "summary": result.get("summary", "")
            }
            processed_results.append(processed_result)
    
    # Check if we need to fetch more content for any results
    urls_to_fetch = []
    for result in processed_results:
        if result.get("url"):
            urls_to_fetch.append(result.get("url"))
    
    # Fetch additional content if needed
    url_to_content = {}
    if urls_to_fetch:
        try:
            extraction_results = tavilly_search.extract(
                urls=urls_to_fetch,
                include_raw_content=True,
                extract_depth="advanced",
                format="text",
            )
            
            # Process extraction results
            if extraction_results:
                # Handle the extraction result based on its structure
                if isinstance(extraction_results, dict) and 'results' in extraction_results:
                    # New API format
                    for extract_result in extraction_results['results']:
                        url = extract_result.get('url', '')
                        if url:
                            url_to_content[url] = extract_result
                elif isinstance(extraction_results, list):
                    # Old API format
                    for extract_result in extraction_results:
                        url = extract_result.get('url', '')
                        if url:
                            url_to_content[url] = extract_result
        except Exception as e:
            print(f"Error extracting content: {e}")
    
    # Update processed results with extracted content
    for i, result in enumerate(processed_results):
        url = result.get("url")
        if url in url_to_content:
            extracted_content = url_to_content[url]
            processed_results[i]["raw_content"] = extracted_content.get("raw_content", result.get("raw_content", ""))
            if not processed_results[i].get("content") and extracted_content.get("content"):
                processed_results[i]["content"] = extracted_content.get("content")
    
    # Format the search results into a readable text
    response_text = f"Research on: {query}\n\n"
    print(response_text)
    
    # Process search results
    for i, result in enumerate(processed_results):
        # Use summary if available, otherwise use content or raw_content
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
        print(response_text)
    
    # Create citation structure
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
    
    # Collect sources with metadata
    sources_gathered = []
    for citation in citations:
        for item in citation["segments"]:
            sources_gathered.append(item)

    return WebSearchState(
        sources_gathered=sources_gathered,
        search_query=[state["search_query"]],
        web_research_result=[modified_text],
        user_id=state["user_id"],
        agent_id=state["agent_id"],
        chat_thread_id=state["chat_thread_id"],
        number_of_results_returned=num_results
    )


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

    configurable = Configuration.from_runnable_config(config)
    # Increment the research loop count and get the reasoning model
    state["research_loop_count"] = state["research_loop_count"] + 1

    # Format the prompt with enhanced context
    research_topic = get_research_topic(state["messages"])
    
    # Add metadata about the search process to help with reflection
    summaries = state["web_research_result"]
    
    # Add information about sources if available
    if state["sources_gathered"]:
        source_info = "\n\nSources used:\n"
        for i, source in enumerate(state["sources_gathered"]):
            source_info += f"- {source.get('short_url', f'[{i+1}]')}: {source.get('title', 'Unknown')} ({source.get('value', 'No URL')})\n"
        summaries.append(source_info)
    
    # Format the prompt with all available context
    formatted_prompt = reflection_instructions.format(
        research_topic=research_topic,
        summaries="\n\n---\n\n".join(summaries)
    )
    # Use Gemini client
    llm = GeminiChatModel(
        model="gemini-2.0-flash",
        temperature=1.0
    )
    response = llm.invoke(formatted_prompt)
    
    # Parse the JSON response manually
    import json
    import re
    
    # Extract JSON from the response
    json_match = re.search(r'```json\s*(.+?)\s*```', response.content, re.DOTALL)
    if not json_match:
        # Try without code block markers
        json_match = re.search(r'\{\s*".*"\s*:.+\}', response.content, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
        else:
            # Fallback values if parsing fails
            return Reflection(
                is_sufficient=False,
                knowledge_gap="Unable to parse reflection response. Need more information.",
                follow_up_queries=[get_research_topic(state["messages"])],
                research_loop_count=state["research_loop_count"],
                number_of_ran_queries=len(state["search_query"]),
                user_id=state["user_id"],
                agent_id=state["agent_config"]["id"],
                chat_thread_id=state["chat_thread_id"]
            )
    else:
        json_str = json_match.group(1)
    
    try:
        result_dict = json.loads(json_str)
        
        # Create a Reflection model with values from the result_dict
        return Reflection(
            is_sufficient=result_dict.get("is_sufficient", False),
            knowledge_gap=result_dict.get("knowledge_gap", ""),
            follow_up_queries=result_dict.get("follow_up_queries", []),
            research_loop_count=state["research_loop_count"],
            number_of_ran_queries=len(state["search_query"]),
            user_id=state["user_id"],
            agent_id=state["agent_config"]["id"],
            chat_thread_id=state["chat_thread_id"]
        )
    except json.JSONDecodeError:
        # Fallback values if JSON parsing fails
        return Reflection(
            is_sufficient=False,
            knowledge_gap="Unable to parse reflection response. Need more information.",
            follow_up_queries=[get_research_topic(state["messages"])],
            research_loop_count=state["research_loop_count"],
            number_of_ran_queries=len(state["search_query"]),
            user_id=state["user_id"],
            agent_id=state["agent_config"]["id"],
            chat_thread_id=state["chat_thread_id"]
        )


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
    agent_id = state["agent_id"]

    try:
        max_research_loops_response = supabase_client.table("hired_agents").select("max_research_loops").eq("user_id", user_id).eq("id", agent_id).execute()
        max_research_loops = max_research_loops_response.data[0]["max_research_loops"]
    except Exception as e:
        max_research_loops = 1

    if state["is_sufficient"] or state["research_loop_count"] >= max_research_loops:
        return "finalize_answer"
    else:
        return [
            Send(
                "web_research",
                WebSearchState(
                    search_query=follow_up_query,
                    id=state["number_of_ran_queries"] + int(idx),
                    chat_thread_id=state["chat_thread_id"],
                    user_id=state["user_id"],
                    agent_id=state["agent_id"],
                    number_of_results_returned=state["number_of_results_returned"]
                )
            )
            for idx, follow_up_query in enumerate(state["follow_up_queries"])
        ]


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
    # Format the prompt
    current_date = get_current_date()
    if state["intent"] == "search":
        formatted_prompt = answer_instructions.format(
            current_date=current_date,
            research_topic=get_research_topic(state["messages"]),
            summaries="\n---\n\n".join(state["web_research_result"]),
            format=state.get("format", "table")
        )
    else:
        formatted_prompt = answer_instructions.format(
            current_date=current_date,
            research_topic=state.get("messages", []),
            summaries="",
            format=state.get("format", "table")
        )
    
    agent_config = state.get("agent_config", {})
    user_id = agent_config.get("user_id", "")
    agent_id = agent_config.get("id", "")
    chat_thread_id = state.get("chat_thread_id", str(uuid4()))

    # Use Gemini client
    llm = GeminiChatModel(
        model="gemini-2.0-flash",
        temperature=0
    )
    result = llm.invoke(formatted_prompt)
    
    final_message = AIMessage(content=result.content)
    
    # Try to parse the content as JSON if it's in JSON format and format is table
    message_content = final_message.content
    parsed_content = None
    
    # Only try to parse JSON if format is table
    if state["format"] == "table" and "```json" in message_content:
        try:
            # Extract JSON from code block
            json_match = re.search(r'```json\s*(.+?)\s*```', message_content, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
                parsed_content = json.loads(json_str)
                # Use the parsed JSON instead of the raw string for database storage
                message_content = parsed_content
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON from LLM response: {e}")
            # Fall back to using the original content
    
    try:
        # Use the global Supabase client directly
        supabase_client.table("chat_messages").update({
            "message": message_content, 
            "sources_gathered": state["sources_gathered"]
        }).eq("user_id", user_id).eq("agent_id", agent_id).eq("chat_thread_id", chat_thread_id).execute()
    except Exception as e:
        print(f"Error inserting data into Supabase: {e}")
        # Continue with the flow even if database operation fails
        
    # For the return value, we need to ensure we're returning a proper message object
    # If we're in chat format, return the original message
    # If we're in table format and successfully parsed JSON, return the original message too
    # The frontend will handle displaying the content appropriately based on format
    return {
        "messages": [final_message],
        "sources_gathered": state["sources_gathered"],
    }


# Create our Agent Graph
builder = StateGraph(OverallState, config_schema=Configuration)

# Define the nodes we will cycle between
builder.add_node("intent_classifier", intent_classifier)
builder.add_node("generate_query", generate_query)
builder.add_node("web_research", web_research)
builder.add_node("reflection", reflection)
builder.add_node("finalize_answer", finalize_answer)

# Set the entrypoint as `intent_classifier`
# This means that this node is the first one called
builder.add_edge(START, "intent_classifier")
# Add conditional edge to continue with search queries in a parallel branch
builder.add_conditional_edges(
    "generate_query", continue_to_web_research, ["web_research"]
)

builder.add_conditional_edges(
    "intent_classifier", continue_to_query_generation, ["generate_query", "finalize_answer"]
)
# Reflect on the web research
builder.add_edge("web_research", "reflection")
# Evaluate the research
builder.add_conditional_edges(
    "reflection", evaluate_research, ["web_research", "finalize_answer"]
)
# Finalize the answer
builder.add_edge("finalize_answer", END)

graph = builder.compile(name="pro-search-agent")
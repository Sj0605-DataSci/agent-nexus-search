from typing import List, Union
from langchain_core.messages import AIMessage, HumanMessage, BaseMessage
from langgraph.types import Send
from langgraph.graph import StateGraph, START, END
from langchain_core.runnables import RunnableConfig
from app.models.chat import OverallState, WebSearchState, QueryWriterOutput
from app.core.utils.llm_utils import GeminiChatModel
from app.db.clients import get_async_supabase_client
from app.core.config import settings
from app.core.services.agent.configuration import Configuration
from app.core.services.agent.prompts import (
    get_current_date,
    optimised_query_system_instruction,
    optimised_query_user_prompt,
    sql_query_system_instruction,
    sql_query_user_prompt,
    answer_table_system_instruction,
    answer_table_user_prompt,
)
from app.models.schemas import PersonDetailsResponse
import weave
from app.core.utils.cache import invalidate_chat_messages_cache


if settings.GOOGLE_API_KEY is None:
    raise ValueError("GOOGLE_API_KEY is not set")


@weave.op
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


@weave.op
async def generate_sql_queries(state: OverallState, config: RunnableConfig) -> OverallState:
    """Fast SQL query generation node - combines query generation and execution for speed."""
    try:
        if hasattr(state, "model_dump"):
            state = state.model_dump()

        supabase_client = await get_async_supabase_client()
        
        # Use fast model for quick response
        model = "gemini-2.5-flash"
        
        agent_config = state["agent_config"]
        agent_id = agent_config["id"]
        user_id = agent_config["user_id"]
        chat_thread_id = state["chat_thread_id"]
        current_message_id = state.get("current_message_id", "")
        
        # Generate optimized search queries first
        initial_search_query_count = state.get("initial_search_query_count", 3)
        
        # Format system instruction for query optimization
        system_instruction = optimised_query_system_instruction.format(
            number_queries=initial_search_query_count
        )
        
        # Format user prompt
        user_prompt = optimised_query_user_prompt.format(
            research_topic=get_research_topic(state["messages"])
        )
        
        # Create LLM with system instruction
        llm = GeminiChatModel(
            model=model,
            temperature=0,
            system_instruction=system_instruction
        )
        
        # Generate the search queries
        response, usage_metadata = await llm.with_structured_output(
            schema_type=QueryWriterOutput, 
            prompt=user_prompt
        )
        
        # Convert to expected format
        search_queries = []
        for query in response.query:
            search_queries.append({
                "query": query, 
                "rationale": response.rationale
            })
        
        # Log query generation to Supabase
        try:
            query_strings = [q["query"] for q in search_queries]
            await supabase_client.table("chat_messages").update({
                "sub_queries": query_strings, 
                "weave_url": state["weave_url"],
            }).eq("id", current_message_id).execute()
            
            # Invalidate chat messages cache for this thread
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
                "node": "generate_sql_queries",
                "model_input_tokens": float(input_tokens), 
                "model_output_tokens": float(output_tokens), 
                "model_cost_dollar": float(cost_dollar),
                "model_cost_rupees": float(cost_rupees),
                "weave_url": state["weave_url"]
            }).execute()
        except Exception as e:
            pass
        
        # Now generate SQL queries for each search query
        sql_queries = []
        
        # Format system instruction for SQL generation
        sql_system_instruction = sql_query_system_instruction.format(
            user_id=user_id,
            number_of_results_returned=state.get("number_of_results_returned", 10)
        )
        
        # Create SQL LLM
        sql_llm = GeminiChatModel(
            model=model,
            temperature=0,
            system_instruction=sql_system_instruction
        )
        
        # Generate SQL for each query
        for search_query in search_queries:
            query_text = search_query["query"]
            
            # Format user prompt for SQL
            sql_user_prompt = sql_query_user_prompt.format(
                user_id=user_id,
                subquery=query_text
            )
            
            # Generate SQL query
            sql_response = await sql_llm.ainvoke(sql_user_prompt)
            sql_usage_metadata = sql_response.usage_metadata
            
            # Extract SQL content
            if hasattr(sql_response, 'content'):
                sql_query = sql_response.content.strip()
            else:
                sql_query = str(sql_response).strip()
            
            # Clean up SQL query
            if "```sql" in sql_query:
                sql_query = sql_query.split("```sql")[1].split("```")[0].strip()
            elif "```" in sql_query:
                sql_query = sql_query.split("```")[1].strip()
            
            sql_queries.append(sql_query)
            
            # Log SQL generation costs
            try:
                sql_input_tokens = sql_usage_metadata.get("input_tokens", 0)
                sql_output_tokens = sql_usage_metadata.get("output_tokens", 0)
                sql_cost_dollar = (sql_input_tokens/1000000) * 0.15 + (sql_output_tokens/1000000) * 0.60
                sql_cost_rupees = sql_cost_dollar * 85.86
                
                await supabase_client.table("chat_costs").insert({
                    "user_id": user_id, 
                    "agent_id": agent_id, 
                    "chat_thread_id": chat_thread_id,
                    "message_id": current_message_id,
                    "model": model,
                    "node": "sql_generation",
                    "model_input_tokens": float(sql_input_tokens), 
                    "model_output_tokens": float(sql_output_tokens), 
                    "model_cost_dollar": float(sql_cost_dollar),
                    "model_cost_rupees": float(sql_cost_rupees),
                    "weave_url": state["weave_url"]
                }).execute()
            except Exception as e:
                pass
        
        # Execute SQL queries immediately
        query_results = []
        for sql_query in sql_queries:
            try:
                # Clean the SQL query
                clean_query = sql_query.strip().rstrip(';')
                
                # Execute with JSON wrapper
                json_query = f"SELECT to_jsonb(t) FROM ({clean_query}) t"
                
                try:
                    result = await supabase_client.rpc('execute_dynamic_sql', {'query_text': json_query}).execute()
                    
                    if result.data:
                        for row in result.data:
                            if isinstance(row, dict) and 'to_jsonb' in row:
                                query_results.append(row['to_jsonb'])
                            else:
                                query_results.append(row)
                except Exception as e:
                    # Fallback for simple SELECT queries
                    if sql_query.strip().upper().startswith('SELECT') and 'connections' in sql_query.lower():
                        try:
                            result = await supabase_client.table('connections').select('*').eq('user_id', user_id).limit(10).execute()
                            if result.data:
                                query_results.extend(result.data)
                        except Exception as fallback_error:
                            pass
            except Exception as e:
                pass
        
        # Return updated state with results
        return OverallState(
            messages=state["messages"],
            intent=state["intent"],
            format=state.get("format", "table"),
            search_query=search_queries,
            sql_queries=sql_queries,
            web_research_result=query_results,
            sources_gathered=[],
            current_message_id=current_message_id,
            agent_config=agent_config,
            chat_thread_id=chat_thread_id,
            user_id=user_id,
            agent_id=agent_id,
            weave_url=state["weave_url"],
            max_research_loops=state.get("max_research_loops", 1),
            initial_search_query_count=initial_search_query_count,
            number_of_results_returned=state.get("number_of_results_returned", 10),
            world_connections="connections"
        )
        
    except Exception as e:
        raise


@weave.op
async def finalize_sql_answer(state: OverallState, config: RunnableConfig):
    """Fast answer finalization for SQL results - preserves all SQL data and only adds LLM scoring."""
    if hasattr(state, "model_dump"):
        state = state.model_dump()
    
    # Use fast model
    model = "gemini-2.5-pro"
    
    supabase_client = await get_async_supabase_client()    
    agent_config = state.get("agent_config", {})
    user_id = agent_config.get("user_id", "")
    agent_id = agent_config.get("id", "")
    chat_thread_id = state.get("chat_thread_id", "")
    current_message_id = state.get("current_message_id", "")
    
    # Get SQL results
    sql_results = state.get("web_research_result", [])
    
    if not sql_results:
        # No results found
        final_message = AIMessage(content="No matching connections found for your query.")
        message_content = final_message.content
    else:
        # Create system instruction for scoring only
        scoring_system_instruction = f"""You are an AI assistant that analyzes connection data and provides relevance scores and reasoning.

Given a user query and connection data, you will:
1. Analyze how well each connection matches the user's query
2. Provide a relevance score (0-100) for each connection
3. Provide clear reasoning for each score

Return your response as a JSON array where each object has:
- "index": the position in the original data (0-based)
- "score": relevance score (0-100)
- "reason": brief explanation of why this connection is relevant

Be concise but specific in your reasoning."""
        
        # Create user prompt with SQL results and user query
        user_query = get_research_topic(state["messages"])
        scoring_user_prompt = f"""User Query: {user_query}

Connection Data:
{str(sql_results)}

Analyze each connection and provide scores and reasoning based on how well they match the user's query."""
        
        # Use Gemini client for scoring only
        llm = GeminiChatModel(
            model=model,
            temperature=0,
            system_instruction=scoring_system_instruction
        )
        
        try:
            # Get LLM scoring
            scoring_response = await llm.ainvoke(scoring_user_prompt)
            usage_metadata = scoring_response.usage_metadata
            
            # Parse LLM response to extract scores and reasoning
            scoring_content = scoring_response.content
            
            # Try to extract JSON from the response
            import json
            import re
            
            scores_and_reasons = []
            try:
                # Look for JSON array in the response
                json_match = re.search(r'\[.*\]', scoring_content, re.DOTALL)
                if json_match:
                    scores_data = json.loads(json_match.group())
                    scores_and_reasons = scores_data
                else:
                    # Fallback: create default scores
                    for i in range(len(sql_results)):
                        scores_and_reasons.append({
                            "index": i,
                            "score": 50,
                            "reason": "Connection matches query criteria"
                        })
            except:
                # Fallback: create default scores
                for i in range(len(sql_results)):
                    scores_and_reasons.append({
                        "index": i,
                        "score": 50,
                        "reason": "Connection matches query criteria"
                    })
            
            # Combine SQL results with LLM scores
            formatted_content = ""
            print(sql_results)
            for i, result in enumerate(sql_results):
                # Find corresponding score and reason
                score_data = next((item for item in scores_and_reasons if item.get("index") == i), 
                                {"score": 50, "reason": "Connection matches query criteria"})
                
                # Extract fields from SQL result
                if isinstance(result, dict):
                    fname = result["result"].get("first_name", "N/A")
                    lname = result["result"].get("last_name", "N/A")
                    email = result["result"].get("email_address", "N/A")
                    company = result["result"].get("company", "N/A")
                    position = result["result"].get("position", "N/A")
                    linkedin_url = result["result"].get("linkedin_url", "N/A")
                    headline = result["result"].get("headline", "N/A")
                else:
                    fname = lname = email = company = position = linkedin_url = headline = "N/A"
                
                formatted_content += f"FName : {fname}\n"
                formatted_content += f"LName : {lname}\n"
                formatted_content += f"Social links : {linkedin_url}\n"
                formatted_content += f"Email : {email}\n"
                formatted_content += f"Company : {company}\n"
                formatted_content += f"Position : {position}\n"
                formatted_content += f"Headline : {headline}\n"
                formatted_content += f"Score : {score_data.get('score', 50)}\n"
                formatted_content += f"Reason : {score_data.get('reason', 'Connection matches query criteria')}\n\n"
            
        except Exception as e:
            # Fallback: format SQL results without LLM scoring
            formatted_content = ""
            for i, result in enumerate(sql_results):
                if isinstance(result, dict):
                    fname = result["result"].get("first_name", "N/A")
                    lname = result["result"].get("last_name", "N/A")
                    email = result["result"].get("email_address", "N/A")
                    company = result["result"].get("company", "N/A")
                    position = result["result"].get("position", "N/A")
                    linkedin_url = result["result"].get("linkedin_url", "N/A")
                    headline = result["result"].get("headline", "N/A")
                else:
                    fname = lname = email = company = position = linkedin_url = headline = "N/A"
                
                formatted_content += f"FName : {fname}\n"
                formatted_content += f"LName : {lname}\n"
                formatted_content += f"Social links : {linkedin_url}\n"
                formatted_content += f"Email : {email}\n"
                formatted_content += f"Company : {company}\n"
                formatted_content += f"Position : {position}\n"
                formatted_content += f"Headline : {headline}\n"
                formatted_content += f"Score : 50\n"
                formatted_content += f"Reason : Connection matches query criteria\n\n"
            
            # Set default usage metadata
            usage_metadata = {"input_tokens": 0, "output_tokens": 0}
        
        final_message = AIMessage(content=formatted_content.strip())
        message_content = final_message.content
    
    try:
        # Update message in database
        await supabase_client.table("chat_messages").update({
            "message": message_content,
            "sources_gathered": state.get("sources_gathered", [])
        }).eq("user_id", user_id).eq("agent_id", agent_id).eq("chat_thread_id", chat_thread_id).eq("id", current_message_id).execute()
        
        # Invalidate chat messages cache
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
            "node": "finalize_sql_answer",
            "weave_url": state["weave_url"],
            "model_input_tokens": float(input_tokens), 
            "model_output_tokens": float(output_tokens), 
            "model_cost_dollar": float(cost_dollar),
            "model_cost_rupees": float(cost_rupees),
        }).execute()
    except Exception as e:
        pass
    
    return {
        "messages": [final_message],
        "sources_gathered": state.get("sources_gathered", []),
    }


# Create simplified SQL-only Agent Graph
builder = StateGraph(OverallState, config_schema=Configuration)

# Define nodes - only 2 nodes for maximum speed
builder.add_node("generate_sql_queries", generate_sql_queries)
builder.add_node("finalize_sql_answer", finalize_sql_answer)

# Set the entrypoint
builder.add_edge(START, "generate_sql_queries")

# Direct edge to finalization - no reflection loop for speed
builder.add_edge("generate_sql_queries", "finalize_sql_answer")

# Finalize the answer
builder.add_edge("finalize_sql_answer", END)

# Compile the simplified graph
graph_2 = builder.compile(name="fast-sql-agent")

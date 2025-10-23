"""
Tally Product Query Agent with LangGraph and Tool Calling
----------------------------------------------------------
This agent uses LangGraph to process product queries with intelligent tool calling.
It can search for products in the database and answer questions about them.
"""

import json
from typing import TypedDict, Annotated, Sequence
from langgraph.graph import StateGraph, END
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, ToolMessage
from langchain_core.tools import tool
from app.db.clients import get_supabase_client
from app.core.utils.llm_utils import GroqChatModel
from app.core.structured_logger import get_structured_logger

logger = get_structured_logger(__name__)

# ============================================================================
# STATE DEFINITION
# ============================================================================

class TallyState(TypedDict):
    """State for the Tally product query agent."""
    messages: Annotated[Sequence[BaseMessage], "The messages in the conversation"]
    trace_id: str  # Trace ID for tracking all LLM calls in this query
    query: str
    product_info: dict | None
    final_answer: str | None
    user_id: str | None


# ============================================================================
# TOOLS - Supabase Product Search
# ============================================================================

@tool
def search_product_by_name(product_name: str, user_id: str) -> str:
    """
    Search for a product in the stock_items table by name.
    Returns product information including name, quantity, and rate.
    
    Args:
        product_name: The name of the product to search for (case-insensitive)
        user_id: The ID of the user making the request
    
    Returns:
        JSON string with product information or error message
    """
    try:
        logger.info("search_product_by_name", product_name=product_name)
        
        # Get Supabase client
        supabase = get_supabase_client()
        
        # Search for product (case-insensitive using the lowercase column)
        product_name_lower = product_name.lower().strip()
        
        # Extract keywords from search query
        import re
        keywords = re.findall(r'\w+', product_name_lower)
        # Remove very short words (less than 2 chars) and common words
        keywords = [k for k in keywords if len(k) >= 2 and k not in ['the', 'and', 'or', 'for', 'with', 'mtr', 'meter', 'mtrs']]
        
        logger.info("search_keywords_extracted", 
                   original=product_name,
                   keywords=keywords)
        
        # Try exact/partial match first (fast path)
        response = supabase.table('stock_items') \
            .select('item_name, quantity, rate') \
            .ilike('item_name_lower', f'%{product_name_lower}%') \
            .eq('user_id', user_id) \
            .limit(20) \
            .execute()
        
        # If no results and we have multiple keywords, use SQL AND conditions
        if (not response.data or len(response.data) == 0) and len(keywords) > 1:
            logger.info("trying_keyword_sql_search", keywords=keywords)
            
            # Build SQL query with AND conditions for each keyword
            # All keywords must be present in the product name
            query = supabase.table('stock_items') \
                .select('item_name, quantity, rate') \
                .eq('user_id', user_id)
            
            # Chain multiple ILIKE conditions (AND logic)
            for keyword in keywords:
                query = query.ilike('item_name_lower', f'%{keyword}%')
            
            response = query.limit(50).execute()
            
            logger.info("keyword_sql_search_results",
                       keywords=keywords,
                       results_count=len(response.data) if response.data else 0)
        
        if response.data and len(response.data) > 0:
            logger.info("search_product_found", 
                       product_name=product_name,
                       results_count=len(response.data))
            return json.dumps({
                "success": True,
                "products": response.data,
                "count": len(response.data)
            })
        else:
            logger.info("search_product_not_found", product_name=product_name)
            return json.dumps({
                "success": False,
                "message": f"No products found matching '{product_name}'"
            })
            
    except Exception as e:
        logger.error("search_product_error",
                    product_name=product_name,
                    error=str(e))
        return json.dumps({
            "success": False,
            "error": str(e)
        })


@tool
def search_party_by_name(party_name: str, user_id: str) -> str:
    """
    Search for a party/customer in the party_performance table by name.
    Returns party information including payment performance.
    
    Args:
        party_name: The name of the party/customer to search for (case-insensitive)
        user_id: The ID of the user making the request
    
    Returns:
        JSON string with party information or error message
    """
    try:
        logger.info("search_party_by_name", party_name=party_name)
        
        # Get Supabase client
        supabase = get_supabase_client()
        
        # Search for party (case-insensitive using the lowercase column)
        party_name_lower = party_name.lower().strip()
        
        # Use ILIKE for partial matching
        response = supabase.table('party_performance') \
            .select('party_name, payment_performance_days, payment_performance_text') \
            .ilike('party_name_lower', f'%{party_name_lower}%') \
            .limit(20) \
            .eq('user_id', user_id) \
            .execute()
        
        if response.data and len(response.data) > 0:
            logger.info("search_party_found",
                       party_name=party_name,
                       results_count=len(response.data))
            return json.dumps({
                "success": True,
                "parties": response.data,
                "count": len(response.data)
            })
        else:
            logger.info("search_party_not_found", party_name=party_name)
            return json.dumps({
                "success": False,
                "message": f"No parties found matching '{party_name}'"
            })
            
    except Exception as e:
        logger.error("search_party_error",
                    party_name=party_name,
                    error=str(e))
        return json.dumps({
            "success": False,
            "error": str(e)
        })


@tool
def calculate_price_with_percentage(base_price: float, percentage_adjustment: float, operation: str = "add") -> str:
    """
    Calculate adjusted price based on percentage increase or decrease.
    
    This tool helps calculate final prices after applying percentage adjustments
    based on party payment performance or other business rules.
    
    Args:
        base_price: The original/base price of the product
        percentage_adjustment: The percentage to add or subtract (e.g., 0.5 for 0.5%)
        operation: Either "add" to increase price or "subtract" to decrease price (default: "add")
    
    Returns:
        JSON string with calculation details
    
    Examples:
        - calculate_price_with_percentage(100, 0.5, "add") -> 100.50 (adds 0.5%)
        - calculate_price_with_percentage(100, 2, "subtract") -> 98.00 (subtracts 2%)
    """
    try:
        logger.info("calculate_price_with_percentage",
                   base_price=base_price,
                   percentage_adjustment=percentage_adjustment,
                   operation=operation)
        
        # Validate inputs
        if base_price < 0:
            return json.dumps({
                "success": False,
                "error": "Base price cannot be negative"
            })
        
        if percentage_adjustment < 0:
            return json.dumps({
                "success": False,
                "error": "Percentage adjustment cannot be negative"
            })
        
        if operation not in ["add", "subtract"]:
            return json.dumps({
                "success": False,
                "error": "Operation must be either 'add' or 'subtract'"
            })
        
        # Calculate percentage amount
        percentage_amount = (percentage_adjustment / 100) * base_price
        
        # Apply operation
        if operation == "add":
            final_price = base_price + percentage_amount
        else:  # subtract
            final_price = base_price - percentage_amount
        
        # Round to 2 decimal places
        final_price = round(final_price, 2)
        percentage_amount = round(percentage_amount, 2)
        
        logger.info("calculate_price_result",
                   base_price=base_price,
                   percentage_adjustment=percentage_adjustment,
                   operation=operation,
                   final_price=final_price)
        
        return json.dumps({
            "success": True,
            "base_price": base_price,
            "percentage_adjustment": percentage_adjustment,
            "operation": operation,
            "percentage_amount": percentage_amount,
            "final_price": final_price,
            "calculation": f"{base_price} {'+' if operation == 'add' else '-'} ({percentage_adjustment}% of {base_price}) = {final_price}"
        })
        
    except Exception as e:
        logger.error("calculate_price_error",
                    base_price=base_price,
                    percentage_adjustment=percentage_adjustment,
                    operation=operation,
                    error=str(e))
        return json.dumps({
            "success": False,
            "error": str(e)
        })


# def send_whatsapp_message_sync(phone_number: str, message: str) -> str:
#     """
#     Synchronous wrapper for sending WhatsApp messages.
#     This is called by the tool system.
#     """
#     try:
#         from app.core.services.whatsapp_service import whatsapp_service
#         import httpx
#         import os
        
#         logger.info(
#             "AI agent sending WhatsApp message",
#             phone_number=phone_number,
#             message_preview=message[:50] + "..." if len(message) > 50 else message
#         )
        
#         # Use synchronous HTTP client instead
#         token = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
#         phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
        
#         if not token or not phone_number_id:
#             return "❌ WhatsApp credentials not configured"
        
#         url = f"https://graph.facebook.com/v24.0/{phone_number_id}/messages"
        
#         headers = {
#             "Authorization": f"Bearer {token}",
#             "Content-Type": "application/json"
#         }
        
#         payload = {
#             "messaging_product": "whatsapp",
#             "recipient_type": "individual",
#             "to": phone_number.replace("+", "").strip(),
#             "type": "text",
#             "text": {
#                 "preview_url": False,
#                 "body": message
#             }
#         }
        
#         # Use sync httpx client
#         with httpx.Client(timeout=30.0) as client:
#             response = client.post(url, json=payload, headers=headers)
#             response_data = response.json()
            
#             if response.status_code == 200:
#                 message_id = response_data.get("messages", [{}])[0].get("id")
#                 logger.info("Message sent successfully", to=phone_number, message_id=message_id)
#                 return f"✅ Message sent successfully to {phone_number}. Message ID: {message_id}"
#             else:
#                 error = response_data.get("error", {}).get("message", "Unknown error")
#                 logger.error("Failed to send message", status=response.status_code, error=error)
#                 return f"❌ Failed to send message: {error}"
    
#     except Exception as e:
#         logger.error("Error in WhatsApp tool", phone_number=phone_number, error=str(e), exc_info=True)
#         return f"❌ Error sending message: {str(e)}"


# @tool
# def send_whatsapp_message(phone_number: str, message: str) -> str:
#     """
#     Send a WhatsApp message to a user.
    
#     Use this tool when you need to send a response or notification to a user via WhatsApp.
#     The phone number should include the country code without the + sign.
    
#     Args:
#         phone_number: Recipient's phone number with country code (e.g., 919311626289 for India)
#         message: The text message to send
    
#     Returns:
#         Success or error message
#     """
#     return send_whatsapp_message_sync(phone_number, message)


# ============================================================================
# LLM WITH TOOLS
# ============================================================================

# Define tools for LangChain
langchain_tools = [
    search_product_by_name, 
    search_party_by_name, 
    calculate_price_with_percentage
    # send_whatsapp_message  # WhatsApp messaging tool
]

# Convert LangChain tools to OpenAI format for Groq
def convert_langchain_tools_to_openai(tools):
    """Convert LangChain tools to OpenAI tool format."""
    openai_tools = []
    for tool in tools:
        openai_tools.append({
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.args_schema.schema() if hasattr(tool, 'args_schema') and tool.args_schema else {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            }
        })
    return openai_tools

openai_tools = convert_langchain_tools_to_openai(langchain_tools)


# ============================================================================
# GRAPH NODES
# ============================================================================

async def agent_node(state: TallyState) -> TallyState:
    """
    Main agent node that decides whether to use tools or respond directly.
    """
    try:
        logger.info("agent_node_started")
        
        messages = state["messages"]
        trace_id = state.get("trace_id", "unknown")
        user_id = state.get("user_id", "unknown")

        # System prompt for the agent
        system_prompt = """You are a helpful customer support assistant of PADAMSHREE INFOTECH for product queries related to pricing and quantity.

Your role:
- Help users find product information (name, quantity, rate/price)
- Answer questions about products in a friendly, conversational way
- If a user asks about a product, use the search_product_by_name tool
- If a user mentions that he/she is from a party/customer, use the search_party_by_name tool to get party performance metric
- If the user is just chatting casually, respond naturally without using tools
- Always be polite and helpful

Use user id: {user_id} when calling tools.

IMPORTANT PRICING RULES:
1. When a customer identifies themselves as being from a specific party/company:
   - First, search for the party using search_party_by_name tool
   - Check their payment_performance_days
   - If payment_performance_days > 40 days: Add 0.5% to all product prices
   - If payment_performance_days <= 40 days: Use original prices
   - Use the calculate_price_with_percentage tool to adjust prices accurately

2. Price Calculation Process:
   - Get base price from product search
   - If adjustment needed, use: calculate_price_with_percentage(base_price, 0.5, "add")
   - Present the adjusted price naturally without mentioning the adjustment reason

3. NEVER mention to customers:
   - Party performance metrics
   - Payment performance days
   - Quantity of the item / stock
   - Why prices are being adjusted
   - That you're adding percentage due to payment history
   - Any internal business logic

When presenting product information:
- Show the product name clearly
- Display the final price prominently (in ₹ Rupees)
- If multiple products match, show all of them
- Present adjusted prices as if they are the normal prices

Examples:
- Customer says "I'm from ABC Company, what's the price of RTX3060?"
  → Search party "ABC Company" → Check payment days → If >40 days, calculate adjusted price → Show final price naturally
  
- Customer asks "What is the price of RAM?"
  → If no party mentioned, show original prices

Remember: Be conversational and friendly, not robotic! Never reveal internal pricing logic."""

        system_prompt = system_prompt.format(user_id=user_id)
        
        # Create LLM instance with trace_id for this specific call
        llm = GroqChatModel(
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            system_instruction=system_prompt,
            trace_id=trace_id,
            metadata={
                "node": "agent_node",
                "query": state.get("query", "")[:100]
            }
        )
        
        # Convert LangChain messages to OpenAI format
        openai_messages = []
        for msg in messages:
            if isinstance(msg, HumanMessage):
                openai_messages.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                content = msg.content if msg.content else ""
                message_dict = {"role": "assistant", "content": content}
                # Add tool calls if present
                if hasattr(msg, 'tool_calls') and msg.tool_calls:
                    # Convert tool calls to OpenAI format with required 'type' field
                    formatted_tool_calls = []
                    for tc in msg.tool_calls:
                        formatted_tool_calls.append({
                            "id": tc["id"],
                            "type": "function",  # Required by OpenAI/Groq API
                            "function": {
                                "name": tc["name"],
                                "arguments": json.dumps(tc["args"])
                            }
                        })
                    message_dict["tool_calls"] = formatted_tool_calls
                openai_messages.append(message_dict)
            elif isinstance(msg, ToolMessage):
                openai_messages.append({
                    "role": "tool",
                    "tool_call_id": msg.tool_call_id,
                    "content": msg.content
                })
        
        # Call LLM with tools
        response = await llm.with_tools(openai_messages, openai_tools)
        
        # Convert response to AIMessage
        content = response.get("content") or ""  # Ensure content is never None
        tool_calls_data = response.get("tool_calls", [])
        
        # Format tool calls for LangChain
        tool_calls = []
        if tool_calls_data:
            for tc in tool_calls_data:
                tool_calls.append({
                    "id": tc.id,
                    "name": tc.function.name,
                    "args": json.loads(tc.function.arguments)
                })
        
        # Create AIMessage with content (required, cannot be None)
        ai_message = AIMessage(content=content if content else "")
        if tool_calls:
            ai_message.tool_calls = tool_calls
        
        logger.info("agent_node_response",
                   has_tool_calls=bool(tool_calls))
        
        return {
            **state,
            "messages": messages + [ai_message]
        }
        
    except Exception as e:
        logger.error("agent_node_error", error=str(e))
        raise


async def tool_node(state: TallyState) -> TallyState:
    """
    Execute tools requested by the agent.
    """
    try:
        logger.info("tool_node_started")
        
        messages = state["messages"]
        last_message = messages[-1]
        
        tool_messages = []
        
        # Execute each tool call
        for tool_call in last_message.tool_calls:
            tool_name = tool_call["name"]
            tool_args = tool_call["args"]
            
            logger.info("executing_tool",
                       tool_name=tool_name,
                       tool_args=tool_args)
            
            # Find and execute the tool
            tool_func = None
            for t in langchain_tools:
                if t.name == tool_name:
                    tool_func = t
                    break
            
            if tool_func:
                result = tool_func.invoke(tool_args)
                tool_messages.append(
                    ToolMessage(
                        content=result,
                        tool_call_id=tool_call["id"]
                    )
                )
            else:
                logger.error("tool_not_found", tool_name=tool_name)
                tool_messages.append(
                    ToolMessage(
                        content=f"Error: Tool '{tool_name}' not found",
                        tool_call_id=tool_call["id"]
                    )
                )
        
        return {
            **state,
            "messages": messages + tool_messages
        }
        
    except Exception as e:
        logger.error("tool_node_error", error=str(e))
        raise


def should_continue(state: TallyState) -> str:
    """
    Determine if we should continue to tools or end.
    """
    messages = state["messages"]
    last_message = messages[-1]
    
    # If there are tool calls, continue to tool node
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        return "tools"
    
    # Otherwise, end
    return "end"


# ============================================================================
# BUILD GRAPH
# ============================================================================

def create_tally_graph():
    """Create the Tally product query graph."""
    
    workflow = StateGraph(TallyState)
    
    # Add nodes
    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", tool_node)
    
    # Set entry point
    workflow.set_entry_point("agent")
    
    # Add conditional edges
    workflow.add_conditional_edges(
        "agent",
        should_continue,
        {
            "tools": "tools",
            "end": END
        }
    )
    
    # After tools, go back to agent
    workflow.add_edge("tools", "agent")
    
    return workflow.compile()


# Create the graph instance
tally_graph = create_tally_graph()


# ============================================================================
# STREAMING FUNCTION
# ============================================================================

async def process_tally_query_stream(query: str, user_id: str):
    """
    Process a tally query and stream responses.
    
    Args:
        query: User's query about products or parties
        
    Yields:
        Event dictionaries with type and content
    """
    import uuid
    
    try:
        # Generate a unique trace_id for this entire query
        trace_id = f"tally_query_{uuid.uuid4().hex[:16]}"
        
        logger.info("process_tally_query_stream_started", 
                   query=query,
                   trace_id=trace_id)
        
        # Yield thinking event
        yield {
            "type": "thinking",
            "content": {"message": "Processing your query..."}
        }
        
        # Initialize state with trace_id
        initial_state = {
            "messages": [HumanMessage(content=query)],
            "query": query,
            "user_id": user_id,
            "trace_id": trace_id,  # Pass trace_id through state
            "product_info": None,
            "final_answer": None
        }
        
        # Run the graph and stream events
        final_state = None
        async for event in tally_graph.astream(initial_state):
            # Log only the event keys, not the full event (contains non-serializable objects)
            logger.info("graph_event", event_keys=list(event.keys()))
            
            # Stream intermediate steps
            if "agent" in event:
                agent_state = event["agent"]
                last_message = agent_state["messages"][-1]
                
                if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
                    yield {
                        "type": "tool_call",
                        "content": {
                            "message": "Searching database...",
                            "tools": [tc["name"] for tc in last_message.tool_calls]
                        }
                    }
            
            if "tools" in event:
                yield {
                    "type": "tool_result",
                    "content": {"message": "Found results, generating response..."}
                }
            
            final_state = event
        
        # Extract final answer
        if final_state:
            # Get the last state from the event
            last_key = list(final_state.keys())[-1]
            state = final_state[last_key]
            
            messages = state["messages"]
            final_message = messages[-1]
            
            if isinstance(final_message, AIMessage):
                answer = final_message.content
                
                # Yield the final answer
                yield {
                    "type": "answer",
                    "content": {"message": answer}
                }
        
        # Yield done event
        yield {
            "type": "done",
            "content": {"message": "Query completed"}
        }
        
        logger.info("process_tally_query_stream_completed", query=query)
        
    except Exception as e:
        logger.error("process_tally_query_stream_error",
                    query=query,
                    error=str(e))
        yield {
            "type": "error",
            "content": {"message": f"Error processing query: {str(e)}"}
        }

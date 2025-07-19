from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Dict, Any, Union, Optional, Annotated
from uuid import UUID
from pydantic import BaseModel, Field
from langgraph.graph import add_messages
from typing_extensions import Annotated
import operator
from typing import Literal


class IntentClassifierState(BaseModel):
    """State for the intent classifier node."""
    intent: Annotated[str, lambda x, y: y or x] = Field(default="search", description="The classified intent: 'search' or 'direct_answer'")
    user_id: Annotated[str, lambda x, y: y or x] = Field(default="", description="User ID")
    agent_id: Annotated[str, lambda x, y: y or x] = Field(default="", description="Agent ID")
    chat_thread_id: Annotated[str, lambda x, y: y or x] = Field(default="", description="Chat thread ID")
    number_of_results_returned: Annotated[int, lambda x, y: y or x] = Field(default=3, description="Number of results to return")
    format: Annotated[str, lambda x, y: y or x] = Field(default="table", description="Response format: 'table' or 'chat'")
    messages: Annotated[List[Any], lambda x, y: y or x] = Field(default_factory=list, description="Messages in the conversation")

class OverallState(BaseModel):
    messages: Annotated[list, add_messages] = Field(
        description="A list of messages in the conversation."
    )
    current_message_id: Annotated[str, lambda x, y: y or x] = Field(
        description="The ID of the current message."
    )
    search_query: Annotated[list, operator.add] = Field(
        description="A list of search queries to be used for web research."
    )
    web_research_result: Annotated[list, operator.add] = Field(
        description="A list of web research results."
    )
    intent: Annotated[str, lambda x, y: y or x] = Field(default="search", description="The classified intent: 'search' or 'direct_answer'")
    format: Annotated[str, lambda x, y: y or x] = Field(default="table", description="Response format: 'table' or 'chat'")
    sources_gathered: Annotated[list, operator.add] = Field(
        description="A list of sources used in the research.",
        default_factory=list
    )
    research_loop_count: Annotated[int, lambda x, y: y or x] = Field(
        description="The number of research loops that have been executed.",
        default=0
    )
    max_research_loops: Annotated[int, lambda x, y: y or x] = Field(
        description="The maximum number of research loops that can be executed."
    )
    user_id: Annotated[str, lambda x, y: y or x] = Field(
        description="The ID of the user."
    )
    agent_config: Annotated[Dict[str, Any], lambda x, y: y or x] = Field(
        description="The configuration for the agent."
    )
    chat_thread_id: Annotated[Optional[str], lambda x, y: y or x] = Field(
        description="The ID of the chat thread."
    )
    number_of_results_returned: Annotated[int, lambda x, y: y or x] = Field(
        description="The number of results returned."
    )
    world_connections: Annotated[str, lambda x, y: y or x] = Field(
        description="The world connections to be used."
    )
    sql_queries: Annotated[Optional[list], operator.add] = Field(
        description="The SQL queries to be used for web research.",
        default_factory=list
    )
    initial_search_query_count: Annotated[int, lambda x, y: y or x] = Field(
        description="The initial search query count."
    )
    weave_url: Annotated[str, lambda x, y: y or x] = Field(
        description="The URL of the Weave graph."
    )

class ReflectionState(BaseModel):
    messages: Annotated[list, add_messages] = Field(
        description="A list of messages in the conversation."
    )
    current_message_id: Annotated[str, lambda x, y: y or x] = Field(
        description="The ID of the current message."
    )
    intent: Annotated[str, lambda x, y: y or x] = Field(
        description="The intent of the web search."
    )
    format: Annotated[str, lambda x, y: y or x] = Field(
        description="The intent of the web search."
    )
    is_sufficient: Annotated[bool, lambda x, y: y or x] = Field(
        description="Whether the provided summaries are sufficient to answer the user's question."
    )
    knowledge_gap: Annotated[str, lambda x, y: y or x] = Field(
        description="A description of what information is missing or needs clarification."
    )
    follow_up_queries: Annotated[list, operator.add] = Field(
        description="A list of follow-up queries to address the knowledge gap."
    )
    research_loop_count: Annotated[int, lambda x, y: y or x] = Field(
        description="The number of research loops that have been executed."
    )
    number_of_ran_queries: Annotated[int, lambda x, y: y or x] = Field(
        description="The number of queries that have been executed."
    )
    max_research_loops: Annotated[int, lambda x, y: y or x] = Field(
        description="The maximum number of research loops that have been executed."
    )
    number_of_results_returned: Annotated[int, lambda x, y: y or x] = Field(
        description="The number of results returned."
    )
    user_id: Annotated[str, lambda x, y: y or x] = Field(
        description="The ID of the user."
    )
    agent_id: Annotated[str, lambda x, y: y or x] = Field(
        description="The ID of the agent."
    )
    chat_thread_id: Annotated[str, lambda x, y: y or x] = Field(
        description="The ID of the chat thread."
    )
    world_connections: Annotated[str, lambda x, y: y or x] = Field(
        description="The world connections to be used."
    )
    agent_config: Annotated[Dict[str, Any], lambda x, y: y or x] = Field(
        description="The agent configuration."
    )
    weave_url: Annotated[str, lambda x, y: y or x] = Field(
        description="The URL of the Weave graph."
    )

class Query(BaseModel):
    query: Annotated[str, lambda x, y: y or x] = Field(
        description="The search query to be used for web research."
    )
    rationale: Annotated[str, lambda x, y: y or x] = Field(
        description="A brief explanation of why this query is relevant to the research topic."
    )


class QueryGenerationState(BaseModel):
    search_query: Annotated[list[Query], lambda x, y: y or x] = Field(
        description="A list of search queries to be used for web research."
    )
    max_research_loops: Annotated[int, lambda x, y: y or x] = Field(
        description="The maximum number of research loops that have been executed."
    )
    chat_thread_id: Annotated[str, lambda x, y: y or x] = Field(
        description="The ID of the chat thread."
    )
    user_id: Annotated[str, lambda x, y: y or x] = Field(
        description="The ID of the user."
    )
    agent_id: Annotated[str, lambda x, y: y or x] = Field(
        description="The ID of the agent."
    )
    initial_search_query_count: Annotated[int, lambda x, y: y or x] = Field(
        description="The initial search query count."
    )
    number_of_results_returned: Annotated[int, lambda x, y: y or x] = Field(
        description="The number of results returned."
    )


class WebSearchState(BaseModel):
    messages: Annotated[list, add_messages] = Field(
        description="A list of messages in the conversation."
    )
    current_message_id: Annotated[str, lambda x, y: y or x] = Field(
        description="The ID of the current message."
    )
    intent: Annotated[str, lambda x, y: y or x] = Field(
        description="The intent of the web search.", default="search"
    )
    format: Annotated[str, lambda x, y: y or x] = Field(
        description="The format of the web search."
    )
    search_query: Annotated[Any, lambda x, y: y or x] = Field(
        description="The search query to be used for web research. Can be a string, list, or dictionary."
    )
    sql_queries: Annotated[Optional[list], operator.add] = Field(
        description="The SQL queries to be used for web research.",
        default_factory=list
    )
    id: Annotated[Optional[Union[str, int]], lambda x, y: y or x] = Field(
        description="The ID of the web search. Can be a string or integer.",
        default=None
    )
    chat_thread_id: Annotated[str, lambda x, y: y or x] = Field(
        description="The ID of the chat thread."
    )
    user_id: Annotated[str, lambda x, y: y or x] = Field(
        description="The ID of the user."
    )
    agent_id: Annotated[str, lambda x, y: y or x] = Field(
        description="The ID of the agent."
    )
    initial_search_query_count: Annotated[int, lambda x, y: y or x] = Field(
        description="The initial search query count.",
        default=0
    )
    number_of_results_returned: Annotated[int, lambda x, y: y or x] = Field(
        description="The number of results returned."
    )
    sources_gathered: Annotated[List[Any], lambda x, y: y or x] = Field(
        description="A list of sources used in the research.",
        default_factory=list
    )
    web_research_result: Annotated[List[str], lambda x, y: y or x] = Field(
        description="A list of web research results.",
        default_factory=list
    )
    world_connections: Annotated[str, lambda x, y: y or x] = Field(
        description="The world connections to be used.",
        default="world"
    )
    agent_config: Annotated[Dict[str, Any], lambda x, y: y or x] = Field(
        description="The configuration for the agent."
    )
    max_research_loops: Annotated[int, lambda x, y: y or x] = Field(
        description="The maximum number of research loops that have been executed."
    )
    weave_url: Annotated[str, lambda x, y: y or x] = Field(
        description="The URL of the Weave graph."
    )


@dataclass(kw_only=True)
class SearchStateOutput:
    running_summary: Annotated[str, lambda x, y: y or x] = field(default=None)  # Final report


class SearchQueryList(BaseModel):
    query: Annotated[List[str], lambda x, y: y or x] = Field(
        description="A list of search queries to be used for web research."
    )
    rationale: Annotated[str, lambda x, y: y or x] = Field(
        description="A brief explanation of why these queries are relevant to the research topic."
    )


class Reflection(BaseModel):
    is_sufficient: Annotated[bool, lambda x, y: y or x] = Field(
        description="Whether the provided summaries are sufficient to answer the user's question."
    )
    knowledge_gap: Annotated[str, lambda x, y: y or x] = Field(
        description="A description of what information is missing or needs clarification."
    )
    follow_up_queries: Annotated[List[str], lambda x, y: y or x] = Field(
        description="A list of follow-up queries to address the knowledge gap."
    )
    number_of_ran_queries: Annotated[int, lambda x, y: y or x] = Field(
        description="The number of queries that have been executed."
    )
    research_loop_count: Annotated[int, lambda x, y: y or x] = Field(
        description="The number of research loops that have been executed."
    )
    user_id: Annotated[str, lambda x, y: y or x] = Field(
        description="The ID of the user."
    )
    agent_id: Annotated[str, lambda x, y: y or x] = Field(
        description="The ID of the agent."
    )
    chat_thread_id: Annotated[str, lambda x, y: y or x] = Field(
        description="The ID of the chat thread."
    )
    weave_url: Annotated[str, lambda x, y: y or x] = Field(
        description="The URL of the Weave graph."
    )


class Source(BaseModel):
    """Model for a source used in research"""
    title: str = Field(description="Title of the source")
    value: str = Field(description="URL of the source")
    short_url: str = Field(description="Short URL for citation")
    score: float = Field(description="Relevance score of the source")
    summary: str = Field(description="Summary of the source content", default="")


class ChatRequest(BaseModel):
    """Model for chat request from client"""
    agent_id: Annotated[str, lambda x, y: y or x] = Field(description="ID of the agent being used")
    messages: Annotated[Union[str, List[Dict[str, Any]]], lambda x, y: y or x] = Field(description="Message content or list of messages in the conversation")
    format: Annotated[str, lambda x, y: y or x] = Field(description="The format of the response.", default="table")
    search_mode: Annotated[str, lambda x, y: y or x] = Field(description="The search mode to be used.", default="basic")
    world_connections: Annotated[str, lambda x, y: y or x] = Field(description="The search mode to be used.", default="world")
    thread_id: Annotated[str, lambda x, y: y or x] = Field(description="The ID of the thread.")


class StreamingChatRequest(ChatRequest):
    """Model for streaming chat request from client"""
    stream: Annotated[bool, lambda x, y: y or x] = Field(description="Whether to stream the response", default=True)
    search_mode: Annotated[str, lambda x, y: y or x] = Field(description="The search mode to be used.", default="basic")
    world_connections: Annotated[str, lambda x, y: y or x] = Field(description="The search mode to be used.", default="world")
    thread_id: Annotated[str, lambda x, y: y or x] = Field(description="The ID of the thread.")


class ChatResponse(BaseModel):
    """Model for chat response to client"""
    messages: Annotated[List[Dict[str, Any]], lambda x, y: y or x] = Field(description="List of messages including the new response")
    sources_gathered: Annotated[List[Source], lambda x, y: y or x] = Field(description="Sources used in the research", default_factory=list)
    search_query: Annotated[List[str], lambda x, y: y or x] = Field(description="Search queries used", default_factory=list)
    web_research_result: Annotated[List[str], lambda x, y: y or x] = Field(description="Research results", default_factory=list)


class StreamingChatUpdate(BaseModel):
    """Model for streaming chat updates"""
    type: str = Field(description="Type of update: 'thinking', 'message', 'source', 'done'")
    content: Dict[str, Any] = Field(description="Content of the update")


# Define the intent classification schema
class IntentClassification(BaseModel):
    """Schema for intent classification results."""
    answer: Literal["direct_answer", "search"] = Field(
        default="direct_answer",
        description="The classified intent of the user's message"
    )

# Define the query writer output schema
class QueryWriterOutput(BaseModel):
    """Schema for query writer output."""
    rationale: str = Field(
        description="Brief explanation of why these queries are relevant"
    )
    query: List[str] = Field(
        description="A list of search queries"
    )

# Define the reflection output schema
class ReflectionOutput(BaseModel):
    """Schema for reflection output."""
    is_sufficient: bool = Field(
        description="Whether the summaries are sufficient to fulfill the research objective"
    )
    knowledge_gap: str = Field(
        description="Brief explanation of the knowledge gap"
    )
    follow_up_queries: List[str] = Field(
        description="A list of follow-up search queries"
    )
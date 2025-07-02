from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Dict, Any, Union, Optional, Annotated
from uuid import UUID
from pydantic import BaseModel, Field
from langgraph.graph import add_messages
from typing_extensions import Annotated
import operator


class IntentClassifierState(BaseModel):
    """State for the intent classifier node."""
    intent: str = Field(default="search", description="The classified intent: 'search' or 'direct_answer'")
    user_id: str = Field(default="", description="User ID")
    agent_id: str = Field(default="", description="Agent ID")
    chat_thread_id: str = Field(default="", description="Chat thread ID")
    number_of_results_returned: int = Field(default=3, description="Number of results to return")
    format: str = Field(default="table", description="Response format: 'table' or 'chat'")
    messages: List[Any] = Field(default_factory=list, description="Messages in the conversation")

class OverallState(BaseModel):
    messages: Annotated[list, add_messages] = Field(
        description="A list of messages in the conversation."
    )
    search_query: Annotated[list, operator.add] = Field(
        description="A list of search queries to be used for web research."
    )
    web_research_result: Annotated[list, operator.add] = Field(
        description="A list of web research results."
    )
    intent: str = Field(default="search", description="The classified intent: 'search' or 'direct_answer'")
    format: str = Field(default="table", description="Response format: 'table' or 'chat'")
    sources_gathered: Annotated[list, operator.add] = Field(
        description="A list of sources used in the research."
    )
    initial_search_query_count: int = Field(
        description="The number of initial search queries to be used for web research."
    )
    research_loop_count: int = Field(
        description="The number of research loops that have been executed."
    )
    max_research_loops: int = Field(
        description="The maximum number of research loops that can be executed."
    )
    user_id: str = Field(
        description="The ID of the user."
    )
    agent_config: Dict[str, Any] = Field(
        description="The configuration for the agent."
    )
    chat_thread_id: Optional[str] = Field(
        description="The ID of the chat thread."
    )
    number_of_results_returned: int = Field(
        description="The number of results returned."
    )
    format: str = Field(
        description="The format of the response."
    )


class ReflectionState(BaseModel):
    is_sufficient: bool = Field(
        description="Whether the provided summaries are sufficient to answer the user's question."
    )
    knowledge_gap: str = Field(
        description="A description of what information is missing or needs clarification."
    )
    follow_up_queries: Annotated[list, operator.add] = Field(
        description="A list of follow-up queries to address the knowledge gap."
    )
    research_loop_count: int = Field(
        description="The number of research loops that have been executed."
    )
    number_of_ran_queries: int = Field(
        description="The number of queries that have been executed."
    )
    max_research_loops: int = Field(
        description="The maximum number of research loops that have been executed."
    )
    number_of_results_returned: int = Field(
        description="The number of results returned."
    )
    user_id: str = Field(
        description="The ID of the user."
    )
    agent_id: str = Field(
        description="The ID of the agent."
    )
    chat_thread_id: str = Field(
        description="The ID of the chat thread."
    )


class Query(BaseModel):
    query: str = Field(
        description="The search query to be used for web research."
    )
    rationale: str = Field(
        description="A brief explanation of why this query is relevant to the research topic."
    )


class QueryGenerationState(BaseModel):
    search_query: list[Query] = Field(
        description="A list of search queries to be used for web research."
    )
    max_research_loops: int = Field(
        description="The maximum number of research loops that have been executed."
    )
    chat_thread_id: str = Field(
        description="The ID of the chat thread."
    )
    user_id: str = Field(
        description="The ID of the user."
    )
    agent_id: str = Field(
        description="The ID of the agent."
    )
    initial_search_query_count: int = Field(
        description="The initial search query count."
    )
    number_of_results_returned: int = Field(
        description="The number of results returned."
    )


class WebSearchState(BaseModel):
    search_query: Any = Field(
        description="The search query to be used for web research. Can be a string, list, or dictionary."
    )
    id: Optional[Union[str, int]] = Field(
        description="The ID of the web search. Can be a string or integer.",
        default=None
    )
    chat_thread_id: str = Field(
        description="The ID of the chat thread."
    )
    user_id: str = Field(
        description="The ID of the user."
    )
    agent_id: str = Field(
        description="The ID of the agent."
    )
    initial_search_sub_query_count: int = Field(
        description="The initial search sub query count.",
        default=0
    )
    number_of_results_returned: int = Field(
        description="The number of results returned."
    )
    sources_gathered: List[Any] = Field(
        description="A list of sources used in the research.",
        default_factory=list
    )
    web_research_result: List[str] = Field(
        description="A list of web research results.",
        default_factory=list
    )


@dataclass(kw_only=True)
class SearchStateOutput:
    running_summary: str = field(default=None)  # Final report


class SearchQueryList(BaseModel):
    query: List[str] = Field(
        description="A list of search queries to be used for web research."
    )
    rationale: str = Field(
        description="A brief explanation of why these queries are relevant to the research topic."
    )


class Reflection(BaseModel):
    is_sufficient: bool = Field(
        description="Whether the provided summaries are sufficient to answer the user's question."
    )
    knowledge_gap: str = Field(
        description="A description of what information is missing or needs clarification."
    )
    follow_up_queries: List[str] = Field(
        description="A list of follow-up queries to address the knowledge gap."
    )
    number_of_ran_queries: int = Field(
        description="The number of queries that have been executed."
    )
    research_loop_count: int = Field(
        description="The number of research loops that have been executed."
    )
    user_id: str = Field(
        description="The ID of the user."
    )
    agent_id: str = Field(
        description="The ID of the agent."
    )
    chat_thread_id: str = Field(
        description="The ID of the chat thread."
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
    user_id: str = Field(description="ID of the user")
    agent_id: str = Field(description="ID of the agent being used")
    messages: Union[str, List[Dict[str, Any]]] = Field(description="Message content or list of messages in the conversation")
    format: str = Field(description="The format of the response.", default="table")


class StreamingChatRequest(ChatRequest):
    """Model for streaming chat request from client"""
    stream: bool = Field(description="Whether to stream the response", default=True)


class ChatResponse(BaseModel):
    """Model for chat response to client"""
    messages: List[Dict[str, Any]] = Field(description="List of messages including the new response")
    sources_gathered: List[Source] = Field(description="Sources used in the research", default_factory=list)
    search_query: List[str] = Field(description="Search queries used", default_factory=list)
    web_research_result: List[str] = Field(description="Research results", default_factory=list)


class StreamingChatUpdate(BaseModel):
    """Model for streaming chat updates"""
    type: str = Field(description="Type of update: 'thinking', 'message', 'source', 'done'")
    content: Dict[str, Any] = Field(description="Content of the update")
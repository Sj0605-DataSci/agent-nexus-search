from __future__ import annotations
from dataclasses import dataclass, field
from typing import TypedDict, List, Dict, Any, Union
from pydantic import BaseModel, Field
from langgraph.graph import add_messages
from typing_extensions import Annotated
import operator


class OverallState(TypedDict):
    messages: Annotated[list, add_messages]
    search_query: Annotated[list, operator.add]
    web_research_result: Annotated[list, operator.add]
    sources_gathered: Annotated[list, operator.add]
    initial_search_query_count: int
    max_research_loops: int
    research_loop_count: int
    agent_config: Dict[str, Any]


class ReflectionState(TypedDict):
    is_sufficient: bool
    knowledge_gap: str
    follow_up_queries: Annotated[list, operator.add]
    research_loop_count: int
    number_of_ran_queries: int


class Query(TypedDict):
    query: str
    rationale: str


class QueryGenerationState(TypedDict):
    search_query: list[Query]


class WebSearchState(TypedDict):
    search_query: str
    id: str


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
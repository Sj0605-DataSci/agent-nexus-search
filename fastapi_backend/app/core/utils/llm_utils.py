import os
import asyncio
from typing import Any, List, Dict, AsyncIterator, Optional, Tuple
from openai import OpenAI, AsyncOpenAI
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.messages import AIMessage, BaseMessage, ChatMessage, HumanMessage, SystemMessage

class OpenRouterChatModel(BaseChatModel):
    """Custom chat model that uses OpenAI client with OpenRouter API"""
    
    # Define model fields
    client: Any = None  # OpenAI client
    model: str = "anthropic/claude-3-opus:beta"
    site_url: str = "https://agent-nexus-search.com"
    site_name: str = "Discover new Minds"
    streaming: bool = False
    
    def __init__(self, api_key: str = None, model: str = "anthropic/claude-3-opus:beta", 
                 site_url: str = "https://agent-nexus-search.com", 
                 site_name: str = "Discover new Minds", 
                 streaming: bool = False, **kwargs):
        """Initialize with OpenRouter API key"""
        super().__init__(**kwargs)
        
        # Use provided API key or get from environment
        if api_key is None:
            api_key = os.getenv("OPENROUTER_API_KEY")
            if api_key is None:
                raise ValueError("OPENROUTER_API_KEY is not set in environment and no API key provided")
        
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key
        )
        self.model = model
        self.site_url = site_url
        self.site_name = site_name
        self.streaming = streaming
    
    def _generate(self, messages: List[BaseMessage], **kwargs) -> ChatResult:
        """Generate chat completion using OpenRouter API"""
        try:
            message_dicts = [self._convert_message_to_dict(m) for m in messages]
            
            # Check if streaming is enabled in kwargs and override instance setting if provided
            streaming = kwargs.get("streaming", self.streaming)
            
            completion = self.client.chat.completions.create(
                extra_headers={
                    "HTTP-Referer": self.site_url,
                    "X-Title": self.site_name,
                },
                model=self.model,
                messages=message_dicts,
                stream=streaming
            )
            
            # Handle streaming response
            if streaming:
                # For streaming, we collect the chunks and combine them
                content = ""
                for chunk in completion:
                    if chunk.choices and len(chunk.choices) > 0:
                        if chunk.choices[0].delta.content:
                            content += chunk.choices[0].delta.content
                
                generation = ChatGeneration(
                    message=AIMessage(content=content),
                    generation_info={"finish_reason": "stop"}  # Assuming successful completion
                )
            else:
                # For non-streaming, handle as before
                message = completion.choices[0].message
                generation = ChatGeneration(
                    message=AIMessage(content=message.content),
                    generation_info={"finish_reason": completion.choices[0].finish_reason}
                )
            
            return ChatResult(generations=[generation])
        except Exception as e:
            raise e
    
    def _convert_message_to_dict(self, message: BaseMessage) -> dict:
        """Convert a LangChain message to a dict format for OpenAI API"""
        if isinstance(message, AIMessage):
            return {"role": "assistant", "content": message.content}
        elif isinstance(message, SystemMessage):
            return {"role": "system", "content": message.content}
        elif isinstance(message, HumanMessage):
            return {"role": "user", "content": message.content}
        elif isinstance(message, ChatMessage):
            return {"role": message.role, "content": message.content}
        else:
            # Default to user for other types
            return {"role": "user", "content": message.content}
    
    async def _astream(
        self, messages: List[BaseMessage], stop: Optional[List[str]] = None, **kwargs
    ) -> AsyncIterator[ChatGeneration]:
        """Async stream chat completions and yield generations as they come.
        
        This is the key method that enables token-by-token streaming in LangGraph.
        """
        message_dicts = [self._convert_message_to_dict(m) for m in messages]
        
        # Create async client if needed
        async_client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=self.client.api_key
        )
        
        try:
            # Start streaming completion
            stream = await async_client.chat.completions.create(
                extra_headers={
                    "HTTP-Referer": self.site_url,
                    "X-Title": self.site_name,
                },
                model=self.model,
                messages=message_dicts,
                stream=True,
                stop=stop,
            )
            
            # Process streaming chunks
            async for chunk in stream:
                if not chunk.choices:
                    continue
                    
                choice = chunk.choices[0]
                if not choice.delta or not choice.delta.content:
                    continue
                    
                # Create a generation with the delta content
                chunk_message = AIMessage(content=choice.delta.content or "")
                yield ChatGeneration(
                    message=chunk_message,
                    generation_info={
                        "finish_reason": choice.finish_reason,
                    },
                )
                
        except Exception as e:
            # Log and re-raise any exceptions
            import logging
            logging.error(f"Error in OpenRouterChatModel._astream: {str(e)}")
            raise e
        
    @property
    def _llm_type(self) -> str:
        """Return type of LLM"""
        return "openrouter-chat"

def get_openrouter_llm(model: str = "mistralai/mistral-small-3.2-24b-instruct:free", streaming: bool = True) -> OpenRouterChatModel:
    """Helper function to get an OpenRouter LLM instance
    
    Args:
        model: The model to use from OpenRouter
        streaming: Whether to enable streaming mode for token-by-token output
        
    Returns:
        An OpenRouterChatModel instance configured with the specified parameters
    """
    return OpenRouterChatModel(
        model=model,
        site_url="https://agent-nexus-search.com",
        site_name="Discover new Minds",
        streaming=streaming
    )
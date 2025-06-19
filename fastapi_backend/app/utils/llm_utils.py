import os
from typing import Any, List, Dict
from openai import OpenAI
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.messages import AIMessage, BaseMessage

class OpenRouterChatModel(BaseChatModel):
    """Custom chat model that uses OpenAI client with OpenRouter API"""
    
    # Define model fields
    client: Any = None  # OpenAI client
    model: str = "anthropic/claude-3-opus:beta"
    site_url: str = "https://agent-nexus-search.com"
    site_name: str = "Agent Nexus Search"
    
    def __init__(self, api_key: str = None, model: str = "anthropic/claude-3-opus:beta", 
                 site_url: str = "https://agent-nexus-search.com", 
                 site_name: str = "Agent Nexus Search", **kwargs):
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
    
    def _generate(self, messages: List[BaseMessage], **kwargs) -> ChatResult:
        """Generate chat completion using OpenRouter API"""
        try:
            message_dicts = [self._convert_message_to_dict(m) for m in messages]
            
            completion = self.client.chat.completions.create(
                extra_headers={
                    "HTTP-Referer": self.site_url,
                    "X-Title": self.site_name,
                },
                model=self.model,
                messages=message_dicts
            )
            
            message = completion.choices[0].message
            
            generation = ChatGeneration(
                message=AIMessage(content=message.content),
                generation_info={"finish_reason": completion.choices[0].finish_reason}
            )
            
            return ChatResult(generations=[generation])
        except Exception as e:
            raise e
    
    def _convert_message_to_dict(self, message: BaseMessage) -> dict:
        """Convert LangChain message to OpenAI message format"""
        if hasattr(message, "role"):
            role = message.role
        else:
            role = message.type
            
        if role == "human":
            role = "user"
        elif role == "ai":
            role = "assistant"
        elif role == "system":
            role = "system"
        else:
            role = "user"  # Default to user for other types
            
        return {"role": role, "content": message.content}
        
    @property
    def _llm_type(self) -> str:
        """Return type of LLM"""
        return "openrouter-chat"

def get_openrouter_llm(model: str = "moonshotai/kimi-dev-72b:free") -> OpenRouterChatModel:
    """Helper function to get an OpenRouter LLM instance"""
    return OpenRouterChatModel(
        model=model,
        site_url="https://agent-nexus-search.com",
        site_name="Agent Nexus Search"
    )
from openai import AsyncOpenAI
from app.core.config import settings
from typing import Type, TypeVar, List, Dict, Any, Union, AsyncGenerator
import json
from langsmith import traceable

T = TypeVar('T')

GOOGLE_API_KEY = settings.GOOGLE_API_KEY
GROQ_API_KEY = settings.GROQ_API_KEY

# OpenAI-compatible Gemini Chat Model wrapper
class GeminiChatModel:
    def __init__(self, model="gemini-2.5-flash", temperature=0, thinking_budget=0, system_instruction=None):
        self.client = AsyncOpenAI(
            api_key=GOOGLE_API_KEY,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
        )
        self.model = model
        self.temperature = temperature
        self.thinking_budget = thinking_budget
        self.system_instruction = system_instruction
    
    def _prepare_messages(self, messages: Union[str, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        """Convert various message formats to OpenAI format"""
        openai_messages = []
        
        # Add system instruction if provided
        if self.system_instruction:
            openai_messages.append({"role": "system", "content": self.system_instruction})
        
        # Handle different input formats
        if isinstance(messages, str):
            openai_messages.append({"role": "user", "content": messages})
        elif isinstance(messages, list):
            for msg in messages:
                if hasattr(msg, 'content'):  # LangChain message objects
                    role = "user" if msg.__class__.__name__ == "HumanMessage" else "assistant"
                    openai_messages.append({"role": role, "content": msg.content})
                elif isinstance(msg, dict):  # Already in OpenAI format
                    openai_messages.append(msg)
        
        return openai_messages
    @traceable(project_name="Discoverminds", name="GeminiChatModel.with_structured_output")
    async def with_structured_output(self, schema_type: Type[T], prompt: Union[str, List[Dict[str, Any]]]) -> tuple[T, Dict[str, Any]]:
        """Get structured output from the model using a Pydantic schema
        
        Args:
            schema_type: A Pydantic model class that defines the output structure
            prompt: The prompt to send to the model
            
        Returns:
            A tuple containing:
            - An instance of the Pydantic model populated with the model's response
            - The usage metadata from the response
        """
        messages = self._prepare_messages(prompt)
        
        # Use OpenAI's structured output with Pydantic models
        response = await self.client.beta.chat.completions.parse(
            model=self.model,
            messages=messages,
            response_format=schema_type,
            temperature=self.temperature,
        )
        
        # Extract usage metadata
        usage_metadata = {
            "input_tokens": response.usage.prompt_tokens,
            "output_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens
        }
        
        return response.choices[0].message.parsed, usage_metadata
    
    @traceable(project_name="Discoverminds", name="GeminiChatModel.ainvoke")
    async def ainvoke(self, messages: Union[str, List[Dict[str, Any]]]) -> Any:
        """Invoke the model with messages and return response"""
        openai_messages = self._prepare_messages(messages)
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=openai_messages,
            temperature=self.temperature,
        )
        
        # Create a response object that mimics LangChain's AIMessage for compatibility
        class CompatibleResponse:
            def __init__(self, content, usage_metadata):
                self.content = content
                self.usage_metadata = usage_metadata
        
        usage_metadata = {
            "input_tokens": response.usage.prompt_tokens,
            "output_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens
        }
        
        return CompatibleResponse(response.choices[0].message.content, usage_metadata)
    
    @traceable(project_name="Discoverminds", name="GeminiChatModel.astream")
    async def astream(self, messages: Union[str, List[Dict[str, Any]]]) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream responses from the model"""
        openai_messages = self._prepare_messages(messages)
        
        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=openai_messages,
            temperature=self.temperature,
            stream=True
        )
        
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield {
                    "content": chunk.choices[0].delta.content,
                    "type": "content"
                }
    
    @traceable(project_name="Discoverminds", name="GeminiChatModel.with_tools")
    async def with_tools(self, messages: Union[str, List[Dict[str, Any]]], tools: List[Dict[str, Any]], tool_choice: str = "auto") -> Dict[str, Any]:
        """Invoke the model with tool calling capabilities
        
        Args:
            messages: The messages to send to the model
            tools: List of tool definitions in OpenAI format
            tool_choice: Tool choice strategy ("auto", "none", or specific tool)
            
        Returns:
            Response with potential tool calls
        """
        openai_messages = self._prepare_messages(messages)
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=openai_messages,
            tools=tools,
            tool_choice=tool_choice,
            temperature=self.temperature,
        )
        
        message = response.choices[0].message
        
        return {
            "content": message.content,
            "tool_calls": message.tool_calls if hasattr(message, 'tool_calls') else None,
            "usage": {
                "input_tokens": response.usage.prompt_tokens,
                "output_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        }


# Tool calling helper functions
def create_tool_definition(name: str, description: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Create a tool definition in OpenAI format
    
    Args:
        name: Function name
        description: Function description
        parameters: JSON schema for function parameters
        
    Returns:
        Tool definition dictionary
    """
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": parameters
        }
    }


def extract_tool_calls(response: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract tool calls from model response
    
    Args:
        response: Model response containing potential tool calls
        
    Returns:
        List of tool call dictionaries
    """
    tool_calls = response.get("tool_calls", [])
    if not tool_calls:
        return []
    
    extracted_calls = []
    for tool_call in tool_calls:
        extracted_calls.append({
            "id": tool_call.id,
            "name": tool_call.function.name,
            "arguments": json.loads(tool_call.function.arguments)
        })
    
    return extracted_calls


def create_tool_response_message(tool_call_id: str, content: str) -> Dict[str, Any]:
    """Create a tool response message for continuing the conversation
    
    Args:
        tool_call_id: ID of the tool call being responded to
        content: Result of the tool execution
        
    Returns:
        Tool response message in OpenAI format
    """
    return {
        "role": "tool",
        "tool_call_id": tool_call_id,
        "content": content
    }
# OpenAI-compatible Gemini Chat Model wrapper
class GroqChatModel:
    def __init__(self, model="llama-3.1-8b-instant", temperature=0, thinking_budget=0, system_instruction=None):
        self.client = AsyncOpenAI(
            api_key=GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1"
        )
        self.model = model
        self.temperature = temperature
        self.thinking_budget = thinking_budget
        self.system_instruction = system_instruction
    
    def _prepare_messages(self, messages: Union[str, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        """Convert various message formats to OpenAI format"""
        openai_messages = []
        
        # Add system instruction if provided
        if self.system_instruction:
            openai_messages.append({"role": "system", "content": self.system_instruction})
        
        # Handle different input formats
        if isinstance(messages, str):
            openai_messages.append({"role": "user", "content": messages})
        elif isinstance(messages, list):
            for msg in messages:
                if hasattr(msg, 'content'):  # LangChain message objects
                    role = "user" if msg.__class__.__name__ == "HumanMessage" else "assistant"
                    openai_messages.append({"role": role, "content": msg.content})
                elif isinstance(msg, dict):  # Already in OpenAI format
                    openai_messages.append(msg)
        
        return openai_messages
    
    @traceable(project_name="Discoverminds", name="GroqChatModel.with_structured_output")
    async def with_structured_output(self, schema_type: Type[T], prompt: Union[str, List[Dict[str, Any]]]) -> tuple[T, Dict[str, Any]]:
        """Get structured output from the model using a Pydantic schema
        
        Args:
            schema_type: A Pydantic model class that defines the output structure
            prompt: The prompt to send to the model
            
        Returns:
            A tuple containing:
            - An instance of the Pydantic model populated with the model's response
            - The usage metadata from the response
        """
        messages = self._prepare_messages(prompt)
        
        # Use OpenAI's structured output with Pydantic models
        response = await self.client.beta.chat.completions.parse(
            model=self.model,
            messages=messages,
            response_format=schema_type,
            temperature=self.temperature,
        )
        
        # Extract usage metadata
        usage_metadata = {
            "input_tokens": response.usage.prompt_tokens,
            "output_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens
        }
        
        return response.choices[0].message.parsed, usage_metadata
    
    @traceable(project_name="Discoverminds", name="GroqChatModel.ainvoke")
    async def ainvoke(self, messages: Union[str, List[Dict[str, Any]]]) -> Any:
        """Invoke the model with messages and return response"""
        openai_messages = self._prepare_messages(messages)
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=openai_messages,
            temperature=self.temperature,
        )
        
        # Create a response object that mimics LangChain's AIMessage for compatibility
        class CompatibleResponse:
            def __init__(self, content, usage_metadata):
                self.content = content
                self.usage_metadata = usage_metadata
        
        usage_metadata = {
            "input_tokens": response.usage.prompt_tokens,
            "output_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens
        }
        
        return CompatibleResponse(response.choices[0].message.content, usage_metadata)
    
    @traceable(project_name="Discoverminds", name="GroqChatModel.astream")
    async def astream(self, messages: Union[str, List[Dict[str, Any]]]) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream responses from the model"""
        openai_messages = self._prepare_messages(messages)
        
        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=openai_messages,
            temperature=self.temperature,
            stream=True
        )
        
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield {
                    "content": chunk.choices[0].delta.content,
                    "type": "content"
                }
    
    @traceable(project_name="Discoverminds", name="GroqChatModel.with_tools")
    async def with_tools(self, messages: Union[str, List[Dict[str, Any]]], tools: List[Dict[str, Any]], tool_choice: str = "auto") -> Dict[str, Any]:
        """Invoke the model with tool calling capabilities
        
        Args:
            messages: The messages to send to the model
            tools: List of tool definitions in OpenAI format
            tool_choice: Tool choice strategy ("auto", "none", or specific tool)
            
        Returns:
            Response with potential tool calls
        """
        openai_messages = self._prepare_messages(messages)
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=openai_messages,
            tools=tools,
            tool_choice=tool_choice,
            temperature=self.temperature,
        )
        
        message = response.choices[0].message
        
        return {
            "content": message.content,
            "tool_calls": message.tool_calls if hasattr(message, 'tool_calls') else None,
            "usage": {
                "input_tokens": response.usage.prompt_tokens,
                "output_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        }


# Tool calling helper functions
def create_tool_definition(name: str, description: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Create a tool definition in OpenAI format
    
    Args:
        name: Function name
        description: Function description
        parameters: JSON schema for function parameters
        
    Returns:
        Tool definition dictionary
    """
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": parameters
        }
    }


def extract_tool_calls(response: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract tool calls from model response
    
    Args:
        response: Model response containing potential tool calls
        
    Returns:
        List of tool call dictionaries
    """
    tool_calls = response.get("tool_calls", [])
    if not tool_calls:
        return []
    
    extracted_calls = []
    for tool_call in tool_calls:
        extracted_calls.append({
            "id": tool_call.id,
            "name": tool_call.function.name,
            "arguments": json.loads(tool_call.function.arguments)
        })
    
    return extracted_calls


def create_tool_response_message(tool_call_id: str, content: str) -> Dict[str, Any]:
    """Create a tool response message for continuing the conversation
    
    Args:
        tool_call_id: ID of the tool call being responded to
        content: Result of the tool execution
        
    Returns:
        Tool response message in OpenAI format
    """
    return {
        "role": "tool",
        "tool_call_id": tool_call_id,
        "content": content
    }    


# if __name__ == "__main__":
#     import asyncio
    
#     async def test_async_stream():
#         gemini = GeminiChatModel()
#         async for chunk in gemini.astream([HumanMessage(content="Hello, how are you?")]):
#             print(chunk.content)
    
#     # For synchronous streaming
#     print("Synchronous streaming:")
#     gemini = GeminiChatModel()
#     for chunk in gemini.stream([HumanMessage(content="Hello, how are you?")]):
#         print(chunk.content)
    
#     # For asynchronous streaming 
#     print("\nAsynchronous streaming:")
#     asyncio.run(test_async_stream())

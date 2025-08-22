"""
Examples demonstrating OpenAI client usage with Gemini API
Shows structured output, tool calling, streaming, and async capabilities
"""

import asyncio
import sys
import os
from typing import List
from pydantic import BaseModel

# Add the parent directory to the Python path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.utils.llm_utils import (
    GeminiChatModel, 
    create_tool_definition, 
    extract_tool_calls, 
    create_tool_response_message
)

# Example Pydantic models for structured output
class PersonInfo(BaseModel):
    name: str
    age: int
    occupation: str
    skills: List[str]

class WeatherInfo(BaseModel):
    location: str
    temperature: int
    condition: str
    humidity: int

# Example 1: Basic chat completion
async def example_basic_chat():
    """Basic chat completion example"""
    print("=== Basic Chat Example ===")
    
    llm = GeminiChatModel(
        model="gemini-2.5-flash",
        temperature=0.7,
        system_instruction="You are a helpful AI assistant."
    )
    
    response = await llm.ainvoke("Explain quantum computing in simple terms.")
    print(f"Response: {response.content}")
    print(f"Tokens used: {response.usage_metadata}")
    print()

# Example 2: Structured output
async def example_structured_output():
    """Structured output example using Pydantic models"""
    print("=== Structured Output Example ===")
    
    llm = GeminiChatModel(
        model="gemini-2.5-flash",
        system_instruction="Extract person information from the given text."
    )
    
    prompt = """
    John Smith is a 35-year-old software engineer who works at Google. 
    He specializes in machine learning, Python programming, and cloud architecture.
    """
    
    person_info, usage = await llm.with_structured_output(PersonInfo, prompt)
    print(f"Extracted info: {person_info}")
    print(f"Name: {person_info.name}")
    print(f"Skills: {', '.join(person_info.skills)}")
    print(f"Usage: {usage}")
    print()

# Example 3: Tool calling
async def example_tool_calling():
    """Tool calling example with weather function"""
    print("=== Tool Calling Example ===")
    
    llm = GeminiChatModel(
        model="gemini-2.5-flash",
        system_instruction="You are a helpful assistant that can get weather information."
    )
    
    # Define a weather tool
    weather_tool = create_tool_definition(
        name="get_weather",
        description="Get current weather information for a location",
        parameters={
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "The city and state/country, e.g. 'San Francisco, CA'"
                },
                "unit": {
                    "type": "string",
                    "enum": ["celsius", "fahrenheit"],
                    "description": "Temperature unit"
                }
            },
            "required": ["location"]
        }
    )
    
    # Make a request that should trigger tool calling
    response = await llm.with_tools(
        messages="What's the weather like in New York City?",
        tools=[weather_tool],
        tool_choice="auto"
    )
    
    print(f"Response content: {response['content']}")
    
    # Check if tools were called
    if response['tool_calls']:
        tool_calls = extract_tool_calls(response)
        print(f"Tool calls made: {tool_calls}")
        
        # Simulate tool execution and continue conversation
        for tool_call in tool_calls:
            if tool_call['name'] == 'get_weather':
                # Simulate weather API response
                weather_result = {
                    "location": tool_call['arguments']['location'],
                    "temperature": 72,
                    "condition": "Sunny",
                    "humidity": 45
                }
                
                # Create tool response message
                tool_response = create_tool_response_message(
                    tool_call['id'], 
                    f"Weather in {weather_result['location']}: {weather_result['temperature']}°F, {weather_result['condition']}, Humidity: {weather_result['humidity']}%"
                )
                
                print(f"Tool response: {tool_response}")
    
    print(f"Usage: {response['usage']}")
    print()

# Example 4: Streaming responses
async def example_streaming():
    """Streaming response example"""
    print("=== Streaming Example ===")
    
    llm = GeminiChatModel(
        model="gemini-2.5-flash",
        system_instruction="You are a creative storyteller."
    )
    
    print("Streaming story about AI:")
    async for chunk in llm.astream("Tell me a short story about an AI that learns to paint."):
        print(chunk['content'], end='', flush=True)
    
    print("\n")

# Example 5: Complex conversation with multiple turns
async def example_conversation():
    """Multi-turn conversation example"""
    print("=== Multi-turn Conversation Example ===")
    
    llm = GeminiChatModel(
        model="gemini-2.5-flash",
        system_instruction="You are a helpful coding assistant."
    )
    
    # Conversation history
    messages = [
        {"role": "user", "content": "How do I create a REST API in Python?"},
        {"role": "assistant", "content": "You can create a REST API in Python using frameworks like FastAPI or Flask. FastAPI is modern and includes automatic API documentation."},
        {"role": "user", "content": "Show me a simple FastAPI example"}
    ]
    
    response = await llm.ainvoke(messages)
    print(f"Assistant: {response.content}")
    print()

# Example 6: Advanced tool calling with multiple tools
async def example_advanced_tools():
    """Advanced tool calling with multiple tools"""
    print("=== Advanced Tool Calling Example ===")
    
    llm = GeminiChatModel(
        model="gemini-2.5-flash",
        system_instruction="You are a helpful assistant with access to weather and calculator tools."
    )
    
    # Define multiple tools
    weather_tool = create_tool_definition(
        name="get_weather",
        description="Get weather information",
        parameters={
            "type": "object",
            "properties": {
                "location": {"type": "string", "description": "Location name"}
            },
            "required": ["location"]
        }
    )
    
    calculator_tool = create_tool_definition(
        name="calculate",
        description="Perform mathematical calculations",
        parameters={
            "type": "object",
            "properties": {
                "expression": {"type": "string", "description": "Mathematical expression to evaluate"}
            },
            "required": ["expression"]
        }
    )
    
    response = await llm.with_tools(
        messages="What's the weather in Tokyo and what's 25 * 4?",
        tools=[weather_tool, calculator_tool],
        tool_choice="auto"
    )
    
    if response['tool_calls']:
        tool_calls = extract_tool_calls(response)
        print(f"Tools called: {[call['name'] for call in tool_calls]}")
        for call in tool_calls:
            print(f"- {call['name']}: {call['arguments']}")
    
    print()

# Run all examples
async def main():
    """Run all examples"""
    print("OpenAI Client with Gemini API - Comprehensive Examples\n")
    
    try:
        await example_basic_chat()
        await example_structured_output()
        await example_tool_calling()
        await example_streaming()
        await example_conversation()
        await example_advanced_tools()
        
        print("✅ All examples completed successfully!")
        
    except Exception as e:
        print(f"❌ Error running examples: {e}")

if __name__ == "__main__":
    asyncio.run(main())

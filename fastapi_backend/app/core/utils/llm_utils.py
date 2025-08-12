from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage
from app.core.config import settings
from typing import Type, TypeVar, List
import weave
from langchain_core.messages import BaseMessage

T = TypeVar('T')

GOOGLE_API_KEY = settings.GOOGLE_API_KEY

# LangChain Gemini Chat Model wrapper
class GeminiChatModel:
    def __init__(self, model="gemini-2.5-flash", temperature=0, thinking_budget=0, system_instruction=None):
        # Prepare model_kwargs for system_instruction if provided
        model_kwargs = {}
        if system_instruction:
            model_kwargs["system_instruction"] = system_instruction
            
        if model == "gemini-2.5-flash":
            self.model = ChatGoogleGenerativeAI(
                model=model,
                temperature=temperature,
                google_api_key=GOOGLE_API_KEY,
                thinking_budget=thinking_budget,
                model_kwargs=model_kwargs
            )
        elif model == "gemini-2.5-pro":
            self.model = ChatGoogleGenerativeAI(
                model=model,
                temperature=temperature,
                google_api_key=GOOGLE_API_KEY,
                model_kwargs=model_kwargs
            )
    
    @weave.op
    async def with_structured_output(self, schema_type: Type[T], prompt):
        """Get structured output from the model using a Pydantic schema
        
        Args:
            schema_type: A Pydantic model class that defines the output structure
            prompt: The prompt to send to the model
            
        Returns:
            A tuple containing:
            - An instance of the Pydantic model populated with the model's response
            - The usage metadata from the raw response
        """
        # Use the include_raw parameter to get both structured output and raw response
        structured_llm = self.model.with_structured_output(schema_type, include_raw=True)
        
        # Check if we have a system instruction in model_kwargs
        system_instruction = None
        if hasattr(self.model, 'model_kwargs') and 'system_instruction' in self.model.model_kwargs:
            system_instruction = self.model.model_kwargs['system_instruction']
        
        # If we have a system instruction, combine it with the user prompt
        # This is a workaround because system instructions don't work well with structured output
        if system_instruction and isinstance(prompt, str):
            combined_prompt = f"{system_instruction}\n\n{prompt}"
            response = await structured_llm.ainvoke([HumanMessage(content=combined_prompt)])
        elif isinstance(prompt, str):
            response = await structured_llm.ainvoke([HumanMessage(content=prompt)])
        else:
            response = await structured_llm.ainvoke(prompt)
            
        # Return the parsed output and usage metadata from raw response
        return response["parsed"], response["raw"].usage_metadata

    @weave.op
    async def ainvoke(self, messages: List[BaseMessage]) -> AIMessage:
        return await self.model.ainvoke(messages)
        


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

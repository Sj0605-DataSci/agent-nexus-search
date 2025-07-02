from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage
from app.core.config import settings

GOOGLE_API_KEY = settings.GOOGLE_API_KEY

# LangChain Gemini Chat Model wrapper
class GeminiChatModel:
    def __init__(self, model="gemini-2.0-flash", temperature=0):
        self.model = ChatGoogleGenerativeAI(
            model=model,
            temperature=temperature,
            google_api_key=GOOGLE_API_KEY,
            convert_system_message_to_human=True
        )
    
    def invoke(self, prompt):
        return self.model.invoke([HumanMessage(content=prompt)])
    
    def stream(self, prompt):
        """Stream the response from the model"""
        return self.model.stream([HumanMessage(content=prompt)])
    
    def astream(self, prompt):
        """Stream the response from the model asynchronously"""
        return self.model.astream([HumanMessage(content=prompt)])
    


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


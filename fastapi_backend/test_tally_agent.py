"""
Test script for Tally Product Query Agent
"""

import asyncio
import sys

async def test_tally_agent():
    """Test the tally agent with sample queries."""
    
    from app.core.services.agent.graph_tally import process_tally_query_stream
    
    # Test queries
    test_queries = [
        "What is the price of RTX3060?",
        "Do you have any networking racks?",
        "Tell me about 16gb ddr5 ram",
        "Hello, how are you?",  # Casual chat
        "What products do you have with 'graphic card' in the name?"
    ]
    
    print("=" * 80)
    print("TALLY PRODUCT QUERY AGENT - TEST")
    print("=" * 80)
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n\n{'='*80}")
        print(f"TEST {i}: {query}")
        print('='*80)
        
        try:
            async for event in process_tally_query_stream(query):
                event_type = event.get("type")
                content = event.get("content", {})
                message = content.get("message", "")
                
                if event_type == "thinking":
                    print(f"🤔 {message}")
                elif event_type == "tool_call":
                    tools = content.get("tools", [])
                    print(f"🔧 {message} - Tools: {', '.join(tools)}")
                elif event_type == "tool_result":
                    print(f"✅ {message}")
                elif event_type == "answer":
                    print(f"\n💬 ANSWER:\n{message}")
                elif event_type == "done":
                    print(f"\n✓ {message}")
                elif event_type == "error":
                    print(f"\n❌ ERROR: {message}")
        
        except Exception as e:
            print(f"\n❌ ERROR: {e}")
        
        # Wait a bit between queries
        await asyncio.sleep(1)
    
    print("\n\n" + "="*80)
    print("ALL TESTS COMPLETED")
    print("="*80)


if __name__ == "__main__":
    asyncio.run(test_tally_agent())

"""
Test the calculator tool for price adjustments
"""

import asyncio
from app.core.services.agent.graph_tally import process_tally_query_stream

async def test_calculator():
    """Test the calculator tool with various scenarios."""
    
    test_queries = [
        # Test 1: Customer from a party with >40 days payment performance
        "Hi, I'm from 2bytes Infotech. What is the price of RTX3060?",
        
        # Test 2: Regular query without party mention
        "What is the price of RTX3060?",
        
        # Test 3: Multiple products with party
        "I'm from 2bytes Infotech, show me all graphic cards",
    ]
    
    print("=" * 80)
    print("CALCULATOR TOOL TEST - Price Adjustments Based on Party Performance")
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
        
        await asyncio.sleep(1)
    
    print("\n\n" + "="*80)
    print("ALL TESTS COMPLETED")
    print("="*80)
    print("\n📊 Expected Behavior:")
    print("- Test 1: Should search party '2bytes Infotech', check payment days (2 days)")
    print("          Since 2 < 40, should show ORIGINAL prices")
    print("- Test 2: No party mentioned, should show ORIGINAL prices")
    print("- Test 3: Should search party, check payment days, adjust if needed")


if __name__ == "__main__":
    asyncio.run(test_calculator())

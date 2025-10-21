"""
Test that all LLM calls in a single query use the same trace_id
"""

import asyncio
from app.core.services.agent.graph_tally import process_tally_query_stream

async def test_trace_id():
    """Test that trace_id is consistent across all LLM calls."""
    
    query = "I'm from 2bytes Infotech. What is the price of RTX3060?"
    
    print("=" * 80)
    print("TRACE ID TEST - Single Query Should Have One Trace ID")
    print("=" * 80)
    print(f"\nQuery: {query}\n")
    print("Expected: All LLM calls should use the same trace_id")
    print("Check Portkey dashboard - you should see ONE trace with multiple spans\n")
    print("=" * 80)
    
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
    
    print("\n" + "="*80)
    print("TEST COMPLETED")
    print("="*80)
    print("\n📊 Check Portkey Dashboard:")
    print("- You should see ONE trace_id (starting with 'tally_query_')")
    print("- That trace should contain multiple spans:")
    print("  1. Initial agent call (deciding to use tools)")
    print("  2. Second agent call (generating final response)")
    print("- Each span should have metadata showing which node it came from")


if __name__ == "__main__":
    asyncio.run(test_trace_id())

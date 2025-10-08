"""
SQL Timeout Testing and Debugging
==================================
This file helps debug SQL timeout issues with Supabase RPC calls.

Usage:
1. Paste your SQL query in the TEST_SQL_QUERY variable below
2. Run: python -m app.core.services.agent.test_sql_timeout
3. Check the output for timeout errors and execution time
"""

import asyncio
import time
from typing import Dict, Any
from app.db.clients import get_async_supabase_client

# ============================================
# PASTE YOUR SQL QUERY HERE FOR TESTING
# ============================================
TEST_SQL_QUERY = """
SELECT 
  id,
  first_name,
  last_name,
  linkedin_url,
  email_address,
  company,
  position,
  headline,
  about_section,
  experience_json,
  education_json,
  skills,
  location,
  profile_photo_url,
  embedding_generated_at
FROM connections
WHERE user_id IN (
  '9de99011-8221-4fed-80f8-18cf72539739',
  '06f7e3ea-162c-46a4-a494-4459dd4bea10',
  '54fe4f63-bfc8-4cf0-a882-d4e76d9fb1a5'
)
AND about_section IS NOT NULL
AND experience_json IS NOT NULL
AND embedding_generated_at IS NOT NULL
AND search_tsv @@ (
  plainto_tsquery('english', 'Bengaluru')
  || plainto_tsquery('english', 'Senior Technical Lead')
  || plainto_tsquery('english', 'Technical Leadership')
  || plainto_tsquery('english', 'Experienced Professional')
)
ORDER BY embedding_generated_at DESC
LIMIT 20"""

# ============================================
# Configuration
# ============================================
TIMEOUT_SECONDS = 1200  # Adjust timeout duration


async def test_sql_execution(
    sql_query: str,
    timeout: int = TIMEOUT_SECONDS,
    use_jsonb_wrapper: bool = True
) -> Dict[str, Any]:
    """
    Test SQL query execution with timeout handling.
    
    Args:
        sql_query: The SQL query to test
        timeout: Timeout in seconds
        use_jsonb_wrapper: Whether to wrap query with to_jsonb()
        
    Returns:
        Dict with execution results and metrics
    """
    # Use the same async client as the rest of the application
    supabase_client = await get_async_supabase_client()
    
    result = {
        "success": False,
        "execution_time": 0,
        "row_count": 0,
        "error": None,
        "timeout_occurred": False,
        "query_used": sql_query
    }
    
    start_time = time.time()  # Initialize at the beginning
    
    try:
        # Clean and prepare query
        clean_query = sql_query.strip()
        if clean_query.endswith(';'):
            clean_query = clean_query[:-1]
        
        # Wrap with to_jsonb if needed
        if use_jsonb_wrapper:
            json_query = f"SELECT to_jsonb(t) FROM ({clean_query}) t"
        else:
            json_query = clean_query
            
        result["query_used"] = json_query
        
        print(f"Starting SQL execution test - Query length: {len(json_query)}, Timeout: {timeout}s")
        
        # Execute with timeout
        
        try:
            response = await asyncio.wait_for(
                supabase_client.rpc('execute_dynamic_sql', {'query_text': json_query}).execute(),
                timeout=timeout
            )
            
            execution_time = time.time() - start_time
            result["execution_time"] = execution_time
            result["success"] = True
            
            if response.data:
                result["row_count"] = len(response.data)
                
                # Parse the response based on RPC function structure
                parsed_data = []
                for row in response.data:
                    if isinstance(row, dict):
                        # Check for error response
                        if 'error' in row and 'query' in row:
                            result["error"] = f"RPC Error: {row.get('error')}"
                            result["success"] = False
                            break
                        # Extract 'result' field if present (new RPC structure)
                        if 'result' in row:
                            parsed_data.append(row['result'])
                        # Extract 'to_jsonb' field if present (old structure)
                        elif 'to_jsonb' in row:
                            parsed_data.append(row['to_jsonb'])
                        else:
                            parsed_data.append(row)
                    else:
                        parsed_data.append(row)
                
                result["sample_data"] = parsed_data[:3] if len(parsed_data) > 0 else []
                
            print(f"SQL execution successful - Time: {execution_time:.2f}s, Rows: {result['row_count']}")
                       
        except asyncio.TimeoutError:
            execution_time = time.time() - start_time
            result["execution_time"] = execution_time
            result["timeout_occurred"] = True
            result["error"] = f"Query timed out after {timeout} seconds"
            
            print(f"SQL execution timeout - Time: {execution_time:.2f}s, Timeout: {timeout}s")
                        
    except Exception as e:
        execution_time = time.time() - start_time
        result["execution_time"] = execution_time
        result["error"] = str(e)
        
        print(f"SQL execution error - Error: {str(e)}, Time: {execution_time:.2f}s")
    
    return result


async def test_query_variations(base_query: str) -> None:
    """
    Test different variations of the query to identify issues.
    """
    print("\n" + "="*80)
    print("SQL TIMEOUT DEBUGGING TEST")
    print("="*80 + "\n")
    
    # Test 1: Original query with JSONB wrapper
    print("Test 1: Query with to_jsonb() wrapper")
    print("-" * 80)
    result1 = await test_sql_execution(base_query, use_jsonb_wrapper=True)
    print_result(result1)
    
    # Test 2: Query without JSONB wrapper
    print("\nTest 2: Query without to_jsonb() wrapper")
    print("-" * 80)
    result2 = await test_sql_execution(base_query, use_jsonb_wrapper=False)
    print_result(result2)
    
    # Test 3: Simple count query
    count_query = f"SELECT COUNT(*) FROM ({base_query.strip().rstrip(';')}) t"
    print("\nTest 3: Count query (to check if data exists)")
    print("-" * 80)
    result3 = await test_sql_execution(count_query, use_jsonb_wrapper=False)
    print_result(result3)
    
    # Test 4: Limited query
    if "LIMIT" not in base_query.upper():
        limited_query = base_query.strip().rstrip(';') + " LIMIT 5"
        print("\nTest 4: Query with LIMIT 5")
        print("-" * 80)
        result4 = await test_sql_execution(limited_query, use_jsonb_wrapper=True)
        print_result(result4)
    
    # Summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"Test 1 (with JSONB): {'✅ Success' if result1['success'] else '❌ Failed'} - {result1['execution_time']:.2f}s")
    print(f"Test 2 (without JSONB): {'✅ Success' if result2['success'] else '❌ Failed'} - {result2['execution_time']:.2f}s")
    print(f"Test 3 (count): {'✅ Success' if result3['success'] else '❌ Failed'} - {result3['execution_time']:.2f}s")
    
    # Recommendations
    print("\n" + "="*80)
    print("RECOMMENDATIONS")
    print("="*80)
    
    if result1['timeout_occurred'] or result2['timeout_occurred']:
        print("⚠️  TIMEOUT DETECTED:")
        print("   - Query is taking too long to execute")
        print("   - Consider adding indexes to the connections table")
        print("   - Check if WHERE clauses are using indexed columns")
        print("   - Reduce LIMIT or add more specific filters")
        
    if result1['success'] and not result2['success']:
        print("⚠️  JSONB wrapper causing issues")
        
    if result2['success'] and not result1['success']:
        print("⚠️  Query works without JSONB wrapper - consider alternative approach")
        
    if result3['success'] and result3['row_count'] == 0:
        print("⚠️  Query returns no results - check WHERE conditions")


def print_result(result: Dict[str, Any]) -> None:
    """Pretty print test result."""
    if result['success']:
        print(f"✅ Success")
        print(f"   Execution Time: {result['execution_time']:.2f}s")
        print(f"   Rows Returned: {result['row_count']}")
        if result.get('sample_data'):
            print(f"   Sample Data: {result['sample_data'][0] if result['sample_data'] else 'None'}")
    else:
        print(f"❌ Failed")
        print(f"   Execution Time: {result['execution_time']:.2f}s")
        if result['timeout_occurred']:
            print(f"   ⏱️  TIMEOUT: {result['error']}")
        else:
            print(f"   Error: {result['error']}")


async def main():
    """Main test runner."""
    # Check if query is set
    if "your-user-id" in TEST_SQL_QUERY or TEST_SQL_QUERY.strip().startswith("--"):
        print("\nInstructions:")
        print("1. Open this file: test_sql_timeout.py")
        print("2. Replace TEST_SQL_QUERY with your actual SQL query")
        print("4. Run again: python -m app.core.services.agent.test_sql_timeout\n")
        return
    
    # Run tests
    await test_query_variations(TEST_SQL_QUERY)


if __name__ == "__main__":
    asyncio.run(main())

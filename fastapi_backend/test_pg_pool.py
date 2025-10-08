"""
Test script for PostgreSQL connection pool.
Run this to verify the direct PostgreSQL connection works.
"""
import asyncio
import sys
from app.db.pg_pool import get_pg_pool, execute_query, execute_query_one, close_pg_pool

async def test_connection_pool():
    """Test the PostgreSQL connection pool."""
    print("=" * 60)
    print("Testing PostgreSQL Connection Pool")
    print("=" * 60)
    
    try:
        # Test 1: Get connection pool
        print("\n1️⃣ Testing connection pool initialization...")
        pool = await get_pg_pool()
        print(f"✅ Connection pool created: {pool}")
        print(f"   - Min connections: {pool._minsize}")
        print(f"   - Max connections: {pool._maxsize}")
        
        # Test 2: Simple query
        print("\n2️⃣ Testing simple query...")
        result = await execute_query("SELECT 1 as test, 'Hello' as message", timeout=5.0)
        print(f"✅ Query executed successfully")
        print(f"   - Result: {[dict(r) for r in result]}")
        
        # Test 3: Query with parameter
        print("\n3️⃣ Testing parameterized query...")
        result = await execute_query(
            "SELECT $1::text as name, $2::int as age",
            "John Doe",
            30,
            timeout=5.0
        )
        print(f"✅ Parameterized query executed successfully")
        print(f"   - Result: {[dict(r) for r in result]}")
        
        # Test 4: Single row query
        print("\n4️⃣ Testing single row query...")
        result = await execute_query_one(
            "SELECT current_database() as db, current_user as user",
            timeout=5.0
        )
        print(f"✅ Single row query executed successfully")
        print(f"   - Database: {result['db']}")
        print(f"   - User: {result['user']}")
        
        # Test 5: Check connections table exists
        print("\n5️⃣ Testing connections table access...")
        result = await execute_query(
            "SELECT COUNT(*) as count FROM connections LIMIT 1",
            timeout=5.0
        )
        count = result[0]['count'] if result else 0
        print(f"✅ Connections table accessible")
        print(f"   - Total connections: {count}")
        
        # Test 6: Check friendships table exists
        print("\n6️⃣ Testing friendships table access...")
        result = await execute_query(
            "SELECT COUNT(*) as count FROM friendships LIMIT 1",
            timeout=5.0
        )
        count = result[0]['count'] if result else 0
        print(f"✅ Friendships table accessible")
        print(f"   - Total friendships: {count}")
        
        # Test 7: Check profiles table exists
        print("\n7️⃣ Testing profiles table access...")
        result = await execute_query(
            "SELECT COUNT(*) as count FROM profiles LIMIT 1",
            timeout=5.0
        )
        count = result[0]['count'] if result else 0
        print(f"✅ Profiles table accessible")
        print(f"   - Total profiles: {count}")
        
        print("\n" + "=" * 60)
        print("🎉 All tests passed successfully!")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print("\n" + "=" * 60)
        print(f"❌ Test failed: {e}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # Clean up
        print("\n🧹 Closing connection pool...")
        await close_pg_pool()
        print("✅ Connection pool closed")


if __name__ == "__main__":
    success = asyncio.run(test_connection_pool())
    sys.exit(0 if success else 1)

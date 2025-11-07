"""
Direct PostgreSQL connection pool using asyncpg.
This bypasses Supabase's REST API layer for better performance and timeout control.
"""
import asyncpg
from typing import Optional
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Global connection pool
_pg_pool: Optional[asyncpg.Pool] = None


async def init_pg_pool() -> asyncpg.Pool:
    """Initialize the PostgreSQL connection pool."""
    global _pg_pool
    
    if _pg_pool is not None:
        return _pg_pool
    
    logger.info(f"Creating PostgreSQL connection pool for environment: {settings.ENVIRONMENT}")
    logger.info(f"Connecting to: {settings.SUPABASE_HOST}:{settings.SUPABASE_PORT}/{settings.SUPABASE_DBNAME}")
    
    try:
        _pg_pool = await asyncpg.create_pool(
            host=settings.SUPABASE_HOST,
            port=int(settings.SUPABASE_PORT),
            user=settings.SUPABASE_USER,
            password=settings.SUPABASE_PASSWORD,
            database=settings.SUPABASE_DBNAME,
            # Connection pool settings
            min_size=1,  # Reduced from 2 - minimum connections to keep open
            max_size=5,  # Reduced from 10 - maximum connections in pool
            # Timeout settings (in seconds)
            command_timeout=1200.0,  # 20 minutes for long-running queries
            timeout=30.0,  # Connection timeout
            # SSL settings for Supabase
            ssl='require'
        )
        
        logger.info("✅ PostgreSQL connection pool created successfully")
        return _pg_pool
        
    except Exception as e:
        logger.error(f"❌ Failed to create PostgreSQL connection pool: {e}")
        raise


async def get_pg_pool() -> asyncpg.Pool:
    """Get the global PostgreSQL connection pool, initializing if needed."""
    global _pg_pool
    
    if _pg_pool is None:
        _pg_pool = await init_pg_pool()
    
    return _pg_pool


async def close_pg_pool():
    """Close the PostgreSQL connection pool."""
    global _pg_pool
    
    if _pg_pool is not None:
        await _pg_pool.close()
        _pg_pool = None
        logger.info("PostgreSQL connection pool closed")


async def execute_query(query: str, *args, timeout: float = 1200.0):
    """
    Execute a SQL query and return results.
    
    Args:
        query: SQL query string
        *args: Query parameters
        timeout: Query timeout in seconds (default 20 minutes)
        
    Returns:
        List of records from the query
    """
    pool = await get_pg_pool()
    
    async with pool.acquire() as conn:
        try:
            # Set statement timeout for this query
            await conn.execute(f'SET statement_timeout = {int(timeout * 1000)}')
            
            # Execute query
            records = await conn.fetch(query, *args, timeout=timeout)
            return records
            
        except asyncpg.QueryCanceledError:
            logger.error(f"Query canceled due to timeout ({timeout}s)")
            raise
        except asyncpg.PostgresError as e:
            logger.error(f"PostgreSQL error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error executing query: {e}")
            raise


async def execute_query_one(query: str, *args, timeout: float = 30.0):
    """
    Execute a SQL query and return a single record.
    
    Args:
        query: SQL query string
        *args: Query parameters
        timeout: Query timeout in seconds (default 30s)
        
    Returns:
        Single record from the query or None
    """
    pool = await get_pg_pool()
    
    async with pool.acquire() as conn:
        try:
            await conn.execute(f'SET statement_timeout = {int(timeout * 1000)}')
            record = await conn.fetchrow(query, *args, timeout=timeout)
            return record
            
        except asyncpg.QueryCanceledError:
            logger.error(f"Query canceled due to timeout ({timeout}s)")
            raise
        except asyncpg.PostgresError as e:
            logger.error(f"PostgreSQL error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error executing query: {e}")
            raise


async def execute_update(query: str, *args, timeout: float = 30.0):
    """
    Execute an UPDATE/INSERT/DELETE query.
    
    Args:
        query: SQL query string
        *args: Query parameters
        timeout: Query timeout in seconds (default 30s)
        
    Returns:
        Status message from the query
    """
    pool = await get_pg_pool()
    
    async with pool.acquire() as conn:
        try:
            await conn.execute(f'SET statement_timeout = {int(timeout * 1000)}')
            result = await conn.execute(query, *args, timeout=timeout)
            return result
            
        except asyncpg.QueryCanceledError:
            logger.error(f"Query canceled due to timeout ({timeout}s)")
            raise
        except asyncpg.PostgresError as e:
            logger.error(f"PostgreSQL error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error executing update: {e}")
            raise

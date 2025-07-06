import json
import logging
from typing import Any, Dict, List, Optional, TypeVar, Union, Generic
import redis.asyncio as redis
from redis.asyncio.connection import ConnectionPool
from datetime import datetime, date
from uuid import UUID
import traceback

logger = logging.getLogger(__name__)

# Type variable for generic cache operations
T = TypeVar('T')

class RedisClient:
    """Singleton Redis client for caching operations"""
    _instance = None
    _pool = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RedisClient, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    async def initialize(self, host: str = 'localhost', port: int = 6379, db: int = 0, 
                        password: Optional[str] = None, url: str = None):
        """Initialize the Redis connection pool"""
        if self._initialized:
            return
            
        try:
            # Use URL if provided (Railway provides REDIS_URL)
            if url:
                logger.info(f"Initializing Redis with URL: {url.replace('redis://', '').split('@')[0]}...@...")
                self._pool = redis.ConnectionPool.from_url(
                    url,
                    decode_responses=True
                )
            else:
                self._pool = redis.ConnectionPool(
                    host=host,
                    port=port,
                    db=db,
                    password=password,
                    decode_responses=True  # Changed to True for JSON serialization
                )
            self._initialized = True
            logger.info(f"Redis connection pool initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Redis connection pool: {str(e)}")
            raise
    
    async def get_client(self) -> redis.Redis:
        """Get a Redis client from the pool"""
        if not self._initialized:
            await self.initialize()
        return redis.Redis(connection_pool=self._pool)
    
    def _json_serializer(self, obj):
        """Custom JSON serializer to handle special types"""
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        elif isinstance(obj, UUID):
            return str(obj)
        else:
            try:
                # Try to convert to dict if it has a dict method or __dict__ attribute
                if hasattr(obj, "dict") and callable(getattr(obj, "dict")):
                    return obj.dict()
                elif hasattr(obj, "model_dump") and callable(getattr(obj, "model_dump")):
                    return obj.model_dump()
                elif hasattr(obj, "__dict__"):
                    return obj.__dict__
                else:
                    return str(obj)
            except Exception:
                return str(obj)
    
    async def set(self, key: str, value: Any, expire: int = 3600) -> bool:
        """
        Set a value in Redis cache
        
        Args:
            key: Cache key
            value: Value to cache (will be serialized to JSON)
            expire: Expiration time in seconds (default: 1 hour)
            
        Returns:
            bool: True if successful
        """
        try:
            client = await self.get_client()
            try:
                # Use custom JSON serializer to handle special types
                serialized = json.dumps(value, default=self._json_serializer)
                await client.set(key, serialized, ex=expire)
                logger.debug(f"Cache set: {key} (expires in {expire}s)")
                return True
            except Exception as json_error:
                logger.error(f"JSON serialization failed for key {key}: {str(json_error)}")
                logger.error(traceback.format_exc())
                # Fall back to string representation if JSON serialization fails
                await client.set(key, str(value), ex=expire)
                logger.debug(f"Cache set as string: {key} (expires in {expire}s)")
                return True
        except Exception as e:
            logger.error(f"Cache set failed for key {key}: {str(e)}")
            return False
    
    async def get(self, key: str, default: Any = None) -> Any:
        """
        Get a value from Redis cache
        
        Args:
            key: Cache key
            default: Default value if key doesn't exist
            
        Returns:
            The cached value or default if not found
        """
        try:
            client = await self.get_client()
            cached = await client.get(key)
            
            if cached is None:
                logger.debug(f"Cache miss: {key}")
                return default
            
            try:
                # Try to parse as JSON
                value = json.loads(cached)
                logger.debug(f"Cache hit: {key}")
                return value
            except json.JSONDecodeError:
                # If not valid JSON, return as is
                logger.debug(f"Cache hit (non-JSON): {key}")
                return cached
        except Exception as e:
            logger.error(f"Cache get failed for key {key}: {str(e)}")
            return default
    
    async def delete(self, key: str) -> bool:
        """
        Delete a value from Redis cache
        
        Args:
            key: Cache key
            
        Returns:
            bool: True if key was deleted
        """
        try:
            client = await self.get_client()
            result = await client.delete(key)
            logger.debug(f"Cache delete: {key} (result: {result})")
            return result > 0
        except Exception as e:
            logger.error(f"Cache delete failed for key {key}: {str(e)}")
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching pattern
        
        Args:
            pattern: Pattern to match (e.g., "user:*:profile")
            
        Returns:
            int: Number of keys deleted
        """
        try:
            client = await self.get_client()
            keys = await client.keys(pattern)
            
            if not keys:
                return 0
                
            count = await client.delete(*keys)
            logger.debug(f"Cache delete pattern: {pattern} (deleted {count} keys)")
            return count
        except Exception as e:
            logger.error(f"Cache delete pattern failed for {pattern}: {str(e)}")
            return 0
    
    async def exists(self, key: str) -> bool:
        """Check if a key exists in the cache"""
        try:
            client = await self.get_client()
            return await client.exists(key) > 0
        except Exception as e:
            logger.error(f"Cache exists check failed for key {key}: {str(e)}")
            return False
    
    async def ttl(self, key: str) -> int:
        """Get the remaining time to live for a key in seconds"""
        try:
            client = await self.get_client()
            return await client.ttl(key)
        except Exception as e:
            logger.error(f"Cache TTL check failed for key {key}: {str(e)}")
            return -2  # -2 means key does not exist
    
    async def health_check(self) -> bool:
        """Check if Redis is reachable and functioning"""
        try:
            client = await self.get_client()
            pong = await client.ping()
            return pong is True
        except Exception as e:
            logger.error(f"Redis health check failed: {str(e)}")
            return False

# Singleton instance
redis_client = RedisClient()

# Helper functions for common cache operations
async def cache_set(key: str, value: Any, expire: int = 3600) -> bool:
    """Set a value in cache"""
    return await redis_client.set(key, value, expire)

async def cache_get(key: str, default: Any = None) -> Any:
    """Get a value from cache"""
    return await redis_client.get(key, default)

async def cache_delete(key: str) -> bool:
    """Delete a value from cache"""
    return await redis_client.delete(key)

async def cache_invalidate_pattern(pattern: str) -> int:
    """Invalidate all cache entries matching pattern"""
    return await redis_client.delete_pattern(pattern)

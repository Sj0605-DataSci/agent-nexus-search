import asyncio
import json
import logging
import traceback
from functools import wraps
from typing import Any, Callable, Optional, TypeVar
from datetime import datetime, date
from uuid import UUID

import redis.asyncio as redis
from redis.asyncio.connection import ConnectionPool

logger = logging.getLogger(__name__)

# Type variable for generic cache operations
T = TypeVar("T")


class RedisClient:
    """Singleton Redis client for caching operations"""

    _instance = None
    _pool: Optional[ConnectionPool] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RedisClient, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    async def initialize(
        self,
        host: str = "localhost",
        port: int = 6379,
        db: int = 0,
        password: Optional[str] = None,
        url: str = None,
    ):
        """Initialize the Redis connection pool"""
        if self._initialized:
            return

        try:
            if url:
                logger.info(
                    f"Initializing Redis with URL: {url.replace('redis://', '').split('@')[0]}...@..."
                )
                self._pool = redis.ConnectionPool.from_url(
                    url,
                    decode_responses=True,
                    max_connections=5,  # Reduced from 20 to save memory
                    retry_on_timeout=True,
                    socket_keepalive=True,
                    socket_keepalive_options={},
                    health_check_interval=30,
                )
            else:
                self._pool = redis.ConnectionPool(
                    host=host,
                    port=port,
                    db=db,
                    password=password,
                    decode_responses=True,
                    max_connections=5,  # Reduced from 20 to save memory
                    retry_on_timeout=True,
                    socket_keepalive=True,
                    socket_keepalive_options={},
                    health_check_interval=30,
                )
            self._initialized = True
            logger.info("Redis connection pool initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Redis connection pool: {str(e)}")
            raise

    async def get_client(self) -> redis.Redis:
        """Get a Redis client from the pool"""
        if not self._initialized:
            await self.initialize()
        return redis.Redis(connection_pool=self._pool)

    async def close(self):
        """Close the Redis connection pool"""
        if self._pool:
            try:
                await self._pool.disconnect()
                logger.info("Redis connection pool closed")
            except Exception as e:
                logger.error(f"Error closing Redis connection pool: {str(e)}")
            finally:
                self._pool = None
                self._initialized = False

    def _json_serializer(self, obj):
        """Custom JSON serializer to handle special types"""
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        elif isinstance(obj, UUID):
            return str(obj)
        elif hasattr(obj, "dict") and callable(getattr(obj, "dict")):
            return obj.dict()
        elif hasattr(obj, "model_dump") and callable(getattr(obj, "model_dump")):
            return obj.model_dump()
        elif hasattr(obj, "__dict__"):
            return obj.__dict__
        return str(obj)

    async def set(self, key: str, value: Any, expire: int = 3600) -> bool:
        """Set a value in Redis cache"""
        try:
            client = await self.get_client()
            try:
                serialized = json.dumps(value, default=self._json_serializer)
                await client.set(key, serialized, ex=expire)
                logger.debug(f"Cache set: {key} (expires in {expire}s)")
                return True
            except Exception as json_error:
                logger.error(f"JSON serialization failed for key {key}: {str(json_error)}")
                logger.error(traceback.format_exc())
                await client.set(key, str(value), ex=expire)
                return True
        except Exception as e:
            logger.error(f"Cache set failed for key {key}: {str(e)}")
            return False

    async def get(self, key: str, default: Any = None) -> Any:
        """Get a value from Redis cache"""
        try:
            client = await self.get_client()
            cached = await client.get(key)
            if cached is None:
                return default
            try:
                return json.loads(cached)
            except json.JSONDecodeError:
                return cached
        except Exception as e:
            logger.error(f"Cache get failed for key {key}: {str(e)}")
            return default

    async def delete(self, key: str) -> bool:
        """Delete a value from Redis cache"""
        try:
            client = await self.get_client()
            return (await client.delete(key)) > 0
        except Exception as e:
            logger.error(f"Cache delete failed for key {key}: {str(e)}")
            return False

    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        try:
            client = await self.get_client()
            keys = await client.keys(pattern)
            if not keys:
                return 0
            return await client.delete(*keys)
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
            return -2

    async def health_check(self) -> bool:
        """Check if Redis is reachable and functioning"""
        try:
            client = await self.get_client()
            return await client.ping() is True
        except Exception as e:
            logger.error(f"Redis health check failed: {str(e)}")
            return False


# Singleton instance
redis_client = RedisClient()


# Helper functions
async def cache_set(key: str, value: Any, expire: int = 3600) -> bool:
    return await redis_client.set(key, value, expire)


async def cache_get(key: str, default: Any = None) -> Any:
    return await redis_client.get(key, default)


async def cache_delete(key: str) -> bool:
    return await redis_client.delete(key)


async def cache_invalidate_pattern(pattern: str) -> int:
    return await redis_client.delete_pattern(pattern)
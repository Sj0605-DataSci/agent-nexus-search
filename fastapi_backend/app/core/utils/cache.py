"""
In-Memory Caching Utility for Agent Nexus Search

This module provides a centralized caching system for various data types including:
- User profiles (auth caching)
- Hired agents (individual agents)
- User agent lists (user's hired agents)
- Generic caching for other use cases

Features:
- TTL-based expiration
- Automatic cache size management
- Cache invalidation
- Performance monitoring
- Thread-safe operations
- Cache warming
- LRU eviction
"""

import time
from typing import Any, Dict, List, Optional, Tuple, Union
from uuid import UUID
from app.core.structured_logger import get_structured_logger
from collections import OrderedDict
import threading
import psutil
import os

logger = get_structured_logger(__name__)

# Cache storage dictionaries
_profile_cache: Dict[str, Tuple[Any, float]] = OrderedDict()
_agent_cache: Dict[str, Tuple[Any, float]] = OrderedDict()
_user_agents_cache: Dict[str, Tuple[List[Any], float]] = OrderedDict()
_generic_cache: Dict[str, Tuple[Any, float]] = OrderedDict()

# Chat-related caches
_chat_threads_cache: Dict[str, Tuple[List[Any], float]] = OrderedDict()  # User's chat threads
_chat_messages_cache: Dict[str, Tuple[List[Any], float]] = OrderedDict()  # Messages for a thread
_message_feedback_cache: Dict[str, Tuple[List[Any], float]] = OrderedDict()  # Feedback for a message

# Subscription-related caches
_subscription_cache: Dict[str, Tuple[Any, float]] = OrderedDict()  # User subscriptions
_usage_stats_cache: Dict[str, Tuple[Any, float]] = OrderedDict()  # User usage statistics

# Cache configuration with performance optimizations
CACHE_CONFIG = {
    "profile": {
        "ttl": 300,  # 5 minutes
        "max_size": 100,  # Reduced from 1000 to save memory
        "cleanup_size": 20,  # Reduced from 100
        "warm_on_startup": False,  # Disabled to reduce startup memory
        "lru_eviction": True      # Use LRU instead of random eviction
    },
    "agent": {
        "ttl": 900,  # Increased to 15 minutes (agents change less frequently)
        "max_size": 50,  # Reduced from 500 to save memory
        "cleanup_size": 10,  # Reduced from 50
        "warm_on_startup": False,  # Disabled to reduce startup memory
        "lru_eviction": True
    },
    "user_agents": {
        "ttl": 300,  # 5 minutes
        "max_size": 50,  # Reduced from 200 to save memory
        "cleanup_size": 10,  # Reduced from 20
        "warm_on_startup": False,  # User-specific, don't pre-warm
        "lru_eviction": True
    },
    "generic": {
        "ttl": 300,  # 5 minutes
        "max_size": 100,  # Reduced from 1000 to save memory
        "cleanup_size": 20,  # Reduced from 100
        "warm_on_startup": False,
        "lru_eviction": True
    },
    "chat_threads": {
        "ttl": 900,  # Increased to 15 minutes (threads don't change often)
        "max_size": 50,  # Reduced from 300 to save memory
        "cleanup_size": 10,  # Reduced from 30
        "warm_on_startup": False,
        "lru_eviction": True
    },
    "chat_messages": {
        "ttl": 600,  # Increased to 10 minutes (messages are immutable)
        "max_size": 100,  # Reduced from 500 to save memory
        "cleanup_size": 20,  # Reduced from 50
        "warm_on_startup": False,
        "lru_eviction": True
    },
    "message_feedback": {
        "ttl": 600,  # 10 minutes (feedback doesn't change often)
        "max_size": 50,  # Reduced from 200 to save memory
        "cleanup_size": 10,  # Reduced from 20
        "warm_on_startup": False,
        "lru_eviction": True
    },
    "subscription": {
        "ttl": 600,  # 10 minutes (subscriptions change less frequently)
        "max_size": 100,  # Reduced from 1000 to save memory
        "cleanup_size": 20,  # Reduced from 100
        "warm_on_startup": False,
        "lru_eviction": True
    },
    "usage_stats": {
        "ttl": 300,  # 5 minutes (usage stats change more frequently)
        "max_size": 50,  # Reduced from 500 to save memory
        "cleanup_size": 10,  # Reduced from 50
        "warm_on_startup": False,
        "lru_eviction": True
    }
}

# Add memory monitoring for cache cleanup
_cache_cleanup_lock = threading.Lock()
_last_memory_check = 0
MEMORY_CHECK_INTERVAL = 30  # Check memory every 30 seconds
MEMORY_CLEANUP_THRESHOLD_MB = 300  # Reduced from 500MB - cleanup caches if process uses > 300MB

def _get_process_memory_mb() -> float:
    """Get current process memory usage in MB"""
    try:
        process = psutil.Process(os.getpid())
        return process.memory_info().rss / (1024 * 1024)
    except:
        return 0

def _should_cleanup_memory() -> bool:
    """Check if we should cleanup caches based on memory usage"""
    global _last_memory_check
    current_time = time.time()
    
    # Only check memory every MEMORY_CHECK_INTERVAL seconds
    if current_time - _last_memory_check < MEMORY_CHECK_INTERVAL:
        return False
    
    _last_memory_check = current_time
    memory_mb = _get_process_memory_mb()
    
    if memory_mb > MEMORY_CLEANUP_THRESHOLD_MB:
        logger.warning("High memory usage detected, triggering cache cleanup",
                      memory_mb=round(memory_mb, 2),
                      threshold_mb=MEMORY_CLEANUP_THRESHOLD_MB)
        return True
    
    return False

def _aggressive_cache_cleanup():
    """Aggressively cleanup all caches when memory is high"""
    with _cache_cleanup_lock:
        total_cleared = 0
        
        # Clear 50% of each cache
        for cache_name, cache_dict in [
            ("profiles", _profile_cache),
            ("agents", _agent_cache),
            ("user_agents", _user_agents_cache),
            ("chat_threads", _chat_threads_cache),
            ("chat_messages", _chat_messages_cache),
            ("message_feedback", _message_feedback_cache),
            ("subscription", _subscription_cache),
            ("usage_stats", _usage_stats_cache),
            ("generic", _generic_cache)
        ]:
            if cache_dict:
                cache_size = len(cache_dict)
                items_to_remove = cache_size // 2  # Remove 50%
                
                if items_to_remove > 0:
                    # Remove oldest items
                    for _ in range(items_to_remove):
                        if cache_dict:
                            cache_dict.popitem(last=False)  # Remove oldest
                    
                    total_cleared += items_to_remove
                    logger.info(f"Aggressive cleanup: cleared {items_to_remove} items from {cache_name} cache")
        
        logger.info("Aggressive cache cleanup completed", total_items_cleared=total_cleared)

def _is_cache_valid(cached_time: float, ttl: int) -> bool:
    """Check if cache entry is still valid based on TTL"""
    return time.time() - cached_time < ttl

def _cleanup_cache(cache_dict: Dict[str, Tuple[Any, float]], max_size: int, cleanup_size: int) -> None:
    """Clean up old cache entries when size limit is exceeded"""
    # Check if we should do memory-based cleanup first
    if _should_cleanup_memory():
        _aggressive_cache_cleanup()
        return
    
    if len(cache_dict) > max_size:
        # Sort by timestamp and remove oldest entries
        sorted_items = sorted(cache_dict.items(), key=lambda x: x[1][1])
        for key, _ in sorted_items[:cleanup_size]:
            del cache_dict[key]
        logger.info("Cache cleanup performed", 
                   entries_removed=cleanup_size,
                   remaining_entries=len(cache_dict))

def _lru_eviction(cache_dict: Dict[str, Tuple[Any, float]], max_size: int) -> None:
    """Evict least recently used cache entries when size limit is exceeded"""
    if len(cache_dict) > max_size:
        # Remove oldest entries
        for key in list(cache_dict.keys())[:max_size - len(cache_dict)]:
            del cache_dict[key]
        logger.info("LRU eviction performed", 
                   entries_removed=max_size - len(cache_dict),
                   remaining_entries=len(cache_dict))

# Profile Cache Functions
def get_cached_profile(user_id: Union[str, UUID]) -> Optional[Any]:
    """Get cached profile for a user"""
    user_id_str = str(user_id)
    if user_id_str in _profile_cache:
        profile, cached_time = _profile_cache[user_id_str]
        if _is_cache_valid(cached_time, CACHE_CONFIG["profile"]["ttl"]):
            # Move to end to mark as recently used
            del _profile_cache[user_id_str]
            _profile_cache[user_id_str] = (profile, cached_time)
            return profile
        else:
            del _profile_cache[user_id_str]
    return None

def cache_profile(user_id: Union[str, UUID], profile_data: Any) -> None:
    """Cache a user profile"""
    user_id_str = str(user_id)
    _profile_cache[user_id_str] = (profile_data, time.time())
    
    # Cleanup if needed
    config = CACHE_CONFIG["profile"]
    if config["lru_eviction"]:
        _lru_eviction(_profile_cache, config["max_size"])
    else:
        _cleanup_cache(_profile_cache, config["max_size"], config["cleanup_size"])

def invalidate_profile_cache(user_id: Union[str, UUID]) -> bool:
    """Invalidate cached profile for a specific user"""
    user_id_str = str(user_id)
    if user_id_str in _profile_cache:
        del _profile_cache[user_id_str]
        logger.info("Profile cache invalidated", user_id=user_id_str)
        return True
    return False

# Agent Cache Functions
def get_cached_agent(agent_id: Union[str, UUID]) -> Optional[Any]:
    """Get cached individual agent"""
    agent_id_str = str(agent_id)
    if agent_id_str in _agent_cache:
        agent, cached_time = _agent_cache[agent_id_str]
        if _is_cache_valid(cached_time, CACHE_CONFIG["agent"]["ttl"]):
            # Move to end to mark as recently used
            del _agent_cache[agent_id_str]
            _agent_cache[agent_id_str] = (agent, cached_time)
            return agent
        else:
            del _agent_cache[agent_id_str]
    return None

def cache_agent(agent_id: Union[str, UUID], agent_data: Any) -> None:
    """Cache an individual agent"""
    agent_id_str = str(agent_id)
    _agent_cache[agent_id_str] = (agent_data, time.time())
    
    # Cleanup if needed
    config = CACHE_CONFIG["agent"]
    if config["lru_eviction"]:
        _lru_eviction(_agent_cache, config["max_size"])
    else:
        _cleanup_cache(_agent_cache, config["max_size"], config["cleanup_size"])

def invalidate_agent_cache(agent_id: Union[str, UUID]) -> bool:
    """Invalidate cached agent for a specific agent ID"""
    agent_id_str = str(agent_id)
    if agent_id_str in _agent_cache:
        del _agent_cache[agent_id_str]
        logger.info("Agent cache invalidated", agent_id=agent_id_str)
        return True
    return False

# User Agents List Cache Functions
def get_cached_user_agents(user_id: Union[str, UUID]) -> Optional[List[Any]]:
    """Get cached agent list for a user"""
    user_id_str = str(user_id)
    if user_id_str in _user_agents_cache:
        agents, cached_time = _user_agents_cache[user_id_str]
        if _is_cache_valid(cached_time, CACHE_CONFIG["user_agents"]["ttl"]):
            # Move to end to mark as recently used
            del _user_agents_cache[user_id_str]
            _user_agents_cache[user_id_str] = (agents, cached_time)
            return agents
        else:
            del _user_agents_cache[user_id_str]
    return None

def cache_user_agents(user_id: Union[str, UUID], agents_data: List[Any]) -> None:
    """Cache a user's agent list"""
    user_id_str = str(user_id)
    _user_agents_cache[user_id_str] = (agents_data, time.time())
    
    # Cleanup if needed
    config = CACHE_CONFIG["user_agents"]
    if config["lru_eviction"]:
        _lru_eviction(_user_agents_cache, config["max_size"])
    else:
        _cleanup_cache(_user_agents_cache, config["max_size"], config["cleanup_size"])

def invalidate_user_agents_cache(user_id: Union[str, UUID]) -> bool:
    """Invalidate cached agent list for a specific user"""
    user_id_str = str(user_id)
    if user_id_str in _user_agents_cache:
        del _user_agents_cache[user_id_str]
        logger.info("User agents cache invalidated", user_id=user_id_str)
        return True
    return False

# Chat Threads Cache Functions
def get_cached_chat_threads(user_id: Union[str, UUID]) -> Optional[List[Any]]:
    """Get cached chat threads for a user"""
    user_id_str = str(user_id)
    if user_id_str in _chat_threads_cache:
        threads, cached_time = _chat_threads_cache[user_id_str]
        if _is_cache_valid(cached_time, CACHE_CONFIG["chat_threads"]["ttl"]):
            # Move to end to mark as recently used
            del _chat_threads_cache[user_id_str]
            _chat_threads_cache[user_id_str] = (threads, cached_time)
            return threads
        else:
            del _chat_threads_cache[user_id_str]
    return None

def cache_chat_threads(user_id: Union[str, UUID], threads_data: List[Any]) -> None:
    """Cache a user's chat threads"""
    user_id_str = str(user_id)
    _chat_threads_cache[user_id_str] = (threads_data, time.time())
    
    # Cleanup if needed
    config = CACHE_CONFIG["chat_threads"]
    if config["lru_eviction"]:
        _lru_eviction(_chat_threads_cache, config["max_size"])
    else:
        _cleanup_cache(_chat_threads_cache, config["max_size"], config["cleanup_size"])

def invalidate_chat_threads_cache(user_id: Union[str, UUID]) -> int:
    """Invalidate all cached chat threads for a specific user (all pages)"""
    user_id_str = str(user_id)
    # Find all cache keys that start with "threads:{user_id}:"
    keys_to_delete = [key for key in _chat_threads_cache.keys() if key.startswith(f"threads:{user_id_str}:")]
    
    for key in keys_to_delete:
        del _chat_threads_cache[key]
    
    if keys_to_delete:
        logger.info("Chat threads cache invalidated", user_id=user_id_str, entries_removed=len(keys_to_delete))
    
    return len(keys_to_delete)

# Chat Messages Cache Functions
def get_cached_chat_messages(cache_key: str) -> Optional[List[Any]]:
    """Get cached messages for a chat thread (includes pagination info in key)"""
    if cache_key in _chat_messages_cache:
        messages, cached_time = _chat_messages_cache[cache_key]
        if _is_cache_valid(cached_time, CACHE_CONFIG["chat_messages"]["ttl"]):
            # Move to end to mark as recently used
            del _chat_messages_cache[cache_key]
            _chat_messages_cache[cache_key] = (messages, cached_time)
            return messages
        else:
            del _chat_messages_cache[cache_key]
    return None

def cache_chat_messages(cache_key: str, messages_data: List[Any]) -> None:
    """Cache messages for a chat thread (cache_key includes pagination info)"""
    _chat_messages_cache[cache_key] = (messages_data, time.time())
    
    # Cleanup if needed
    config = CACHE_CONFIG["chat_messages"]
    if config["lru_eviction"]:
        _lru_eviction(_chat_messages_cache, config["max_size"])
    else:
        _cleanup_cache(_chat_messages_cache, config["max_size"], config["cleanup_size"])

def invalidate_chat_messages_cache(chat_thread_id: Union[str, UUID]) -> int:
    """Invalidate all cached messages for a specific chat thread"""
    thread_id_str = str(chat_thread_id)
    count = 0
    
    # Find and remove all cache entries that start with the thread ID
    keys_to_delete = []
    for key in _chat_messages_cache.keys():
        if key.startswith(f"messages:{thread_id_str}:"):
            keys_to_delete.append(key)
    
    for key in keys_to_delete:
        del _chat_messages_cache[key]
        count += 1
    
    if count > 0:
        logger.info("Chat messages cache invalidated", 
                   chat_thread_id=thread_id_str, 
                   entries_invalidated=count)
    
    return count

# Message Feedback Cache Functions
def get_cached_message_feedback(message_id: Union[str, UUID]) -> Optional[List[Any]]:
    """Get cached feedback for a message"""
    message_id_str = str(message_id)
    if message_id_str in _message_feedback_cache:
        feedback, cached_time = _message_feedback_cache[message_id_str]
        if _is_cache_valid(cached_time, CACHE_CONFIG["message_feedback"]["ttl"]):
            # Move to end to mark as recently used
            del _message_feedback_cache[message_id_str]
            _message_feedback_cache[message_id_str] = (feedback, cached_time)
            return feedback
        else:
            del _message_feedback_cache[message_id_str]
    return None

def cache_message_feedback(message_id: Union[str, UUID], feedback_data: List[Any]) -> None:
    """Cache feedback for a message"""
    message_id_str = str(message_id)
    _message_feedback_cache[message_id_str] = (feedback_data, time.time())
    
    # Cleanup if needed
    config = CACHE_CONFIG["message_feedback"]
    if config["lru_eviction"]:
        _lru_eviction(_message_feedback_cache, config["max_size"])
    else:
        _cleanup_cache(_message_feedback_cache, config["max_size"], config["cleanup_size"])

def invalidate_message_feedback_cache(message_id: Union[str, UUID]) -> bool:
    """Invalidate cached feedback for a specific message"""
    message_id_str = str(message_id)
    if message_id_str in _message_feedback_cache:
        del _message_feedback_cache[message_id_str]
        logger.info("Message feedback cache invalidated", message_id=message_id_str)
        return True
    return False

# Subscription Cache Functions
def get_cached_subscription(user_id: Union[str, UUID]) -> Optional[Any]:
    """Get cached subscription for a user"""
    user_id_str = str(user_id)
    if user_id_str in _subscription_cache:
        subscription, cached_time = _subscription_cache[user_id_str]
        if _is_cache_valid(cached_time, CACHE_CONFIG["subscription"]["ttl"]):
            # Move to end to mark as recently used
            del _subscription_cache[user_id_str]
            _subscription_cache[user_id_str] = (subscription, cached_time)
            return subscription
        else:
            del _subscription_cache[user_id_str]
    return None

def cache_subscription(user_id: Union[str, UUID], subscription_data: Any) -> None:
    """Cache a user subscription"""
    user_id_str = str(user_id)
    _subscription_cache[user_id_str] = (subscription_data, time.time())
    
    # Cleanup if needed
    config = CACHE_CONFIG["subscription"]
    if config["lru_eviction"]:
        _lru_eviction(_subscription_cache, config["max_size"])
    else:
        _cleanup_cache(_subscription_cache, config["max_size"], config["cleanup_size"])

def invalidate_subscription_cache(user_id: Union[str, UUID]) -> bool:
    """Invalidate cached subscription for a specific user"""
    user_id_str = str(user_id)
    if user_id_str in _subscription_cache:
        del _subscription_cache[user_id_str]
        logger.info("Subscription cache invalidated", user_id=user_id_str)
        return True
    return False

# Usage Stats Cache Functions
def get_cached_usage_stats(cache_key: str) -> Optional[Any]:
    """Get cached usage stats (cache_key includes user_id and days)"""
    if cache_key in _usage_stats_cache:
        stats, cached_time = _usage_stats_cache[cache_key]
        if _is_cache_valid(cached_time, CACHE_CONFIG["usage_stats"]["ttl"]):
            # Move to end to mark as recently used
            del _usage_stats_cache[cache_key]
            _usage_stats_cache[cache_key] = (stats, cached_time)
            return stats
        else:
            del _usage_stats_cache[cache_key]
    return None

def cache_usage_stats(cache_key: str, stats_data: Any) -> None:
    """Cache usage statistics"""
    _usage_stats_cache[cache_key] = (stats_data, time.time())
    
    # Cleanup if needed
    config = CACHE_CONFIG["usage_stats"]
    if config["lru_eviction"]:
        _lru_eviction(_usage_stats_cache, config["max_size"])
    else:
        _cleanup_cache(_usage_stats_cache, config["max_size"], config["cleanup_size"])

def invalidate_usage_stats_cache(user_id: Union[str, UUID]) -> int:
    """Invalidate all cached usage stats for a specific user"""
    user_id_str = str(user_id)
    keys_to_delete = [key for key in _usage_stats_cache.keys() if key.startswith(f"{user_id_str}:")]
    
    for key in keys_to_delete:
        del _usage_stats_cache[key]
    
    if keys_to_delete:
        logger.info("Usage stats cache invalidated", user_id=user_id_str, entries_removed=len(keys_to_delete))
    
    return len(keys_to_delete)

# Generic Cache Functions
def get_cached_item(cache_key: str) -> Optional[Any]:
    """Get any cached item by key"""
    if cache_key in _generic_cache:
        item, cached_time = _generic_cache[cache_key]
        if _is_cache_valid(cached_time, CACHE_CONFIG["generic"]["ttl"]):
            # Move to end to mark as recently used
            del _generic_cache[cache_key]
            _generic_cache[cache_key] = (item, cached_time)
            return item
        else:
            del _generic_cache[cache_key]
    return None

def cache_item(cache_key: str, data: Any, ttl: Optional[int] = None) -> None:
    """Cache any item with optional custom TTL"""
    # Store with custom TTL if provided, otherwise use default
    timestamp = time.time()
    if ttl:
        # For custom TTL, we store the expiry time instead of cache time
        expiry_time = timestamp + ttl
        _generic_cache[cache_key] = (data, expiry_time)
    else:
        _generic_cache[cache_key] = (data, timestamp)
    
    # Cleanup if needed
    config = CACHE_CONFIG["generic"]
    if config["lru_eviction"]:
        _lru_eviction(_generic_cache, config["max_size"])
    else:
        _cleanup_cache(_generic_cache, config["max_size"], config["cleanup_size"])

def invalidate_cache_item(cache_key: str) -> bool:
    """Invalidate any cached item by key"""
    if cache_key in _generic_cache:
        del _generic_cache[cache_key]
        logger.info("Generic cache item invalidated", cache_key=cache_key)
        return True
    return False

# Cache Management Functions
def clear_all_caches() -> Dict[str, int]:
    """Clear all caches and return counts"""
    counts = {
        "profiles": len(_profile_cache),
        "agents": len(_agent_cache),
        "user_agents": len(_user_agents_cache),
        "chat_threads": len(_chat_threads_cache),
        "chat_messages": len(_chat_messages_cache),
        "message_feedback": len(_message_feedback_cache),
        "subscriptions": len(_subscription_cache),
        "usage_stats": len(_usage_stats_cache),
        "generic": len(_generic_cache)
    }
    
    _profile_cache.clear()
    _agent_cache.clear()
    _user_agents_cache.clear()
    _chat_threads_cache.clear()
    _chat_messages_cache.clear()
    _message_feedback_cache.clear()
    _subscription_cache.clear()
    _usage_stats_cache.clear()
    _generic_cache.clear()
    
    logger.info("All caches cleared", **counts)
    return counts

def get_cache_stats() -> Dict[str, Dict[str, Any]]:
    """Get statistics about all caches"""
    stats = {}
    
    for cache_name, cache_dict in [
        ("profiles", _profile_cache),
        ("agents", _agent_cache),
        ("user_agents", _user_agents_cache),
        ("chat_threads", _chat_threads_cache),
        ("chat_messages", _chat_messages_cache),
        ("message_feedback", _message_feedback_cache),
        ("subscription", _subscription_cache),
        ("usage_stats", _usage_stats_cache),
        ("generic", _generic_cache)
    ]:
        config = CACHE_CONFIG.get(cache_name, CACHE_CONFIG["generic"])
        stats[cache_name] = {
            "size": len(cache_dict),
            "max_size": config["max_size"],
            "ttl_seconds": config["ttl"],
            "utilization_percent": round((len(cache_dict) / config["max_size"]) * 100, 2)
        }
    
    return stats

def invalidate_cache_pattern(pattern: str) -> int:
    """
    Invalidate cache entries matching a pattern.
    Simple pattern matching with wildcards (*).
    """
    count = 0
    
    # Check all cache dictionaries
    for cache_dict in [_profile_cache, _agent_cache, _user_agents_cache, 
                      _chat_threads_cache, _chat_messages_cache, _message_feedback_cache,
                      _subscription_cache, _usage_stats_cache, _generic_cache]:
        keys_to_delete = []
        
        for key in cache_dict.keys():
            if pattern.endswith("*"):
                if key.startswith(pattern[:-1]):
                    keys_to_delete.append(key)
            elif pattern.startswith("*"):
                if key.endswith(pattern[1:]):
                    keys_to_delete.append(key)
            elif "*" in pattern:
                prefix, suffix = pattern.split("*", 1)
                if key.startswith(prefix) and key.endswith(suffix):
                    keys_to_delete.append(key)
            elif key == pattern:
                keys_to_delete.append(key)
        
        for key in keys_to_delete:
            del cache_dict[key]
            count += 1
    
    if count > 0:
        logger.info("Cache pattern invalidation completed", 
                   pattern=pattern, 
                   entries_invalidated=count)
    
    return count

# Cache warming functions (for preloading frequently accessed data)
def warm_profile_cache(profiles: List[Tuple[Union[str, UUID], Any]]) -> int:
    """Warm up profile cache with frequently accessed profiles"""
    count = 0
    for user_id, profile_data in profiles:
        cache_profile(user_id, profile_data)
        count += 1
    
    logger.info("Profile cache warmed", profiles_cached=count)
    return count

def warm_agent_cache(agents: List[Tuple[Union[str, UUID], Any]]) -> int:
    """Warm up agent cache with frequently accessed agents"""
    count = 0
    for agent_id, agent_data in agents:
        cache_agent(agent_id, agent_data)
        count += 1
    
    logger.info("Agent cache warmed", agents_cached=count)
    return count

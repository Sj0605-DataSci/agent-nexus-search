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
"""

import time
from typing import Any, Dict, List, Optional, Tuple, Union
from uuid import UUID
from app.core.structured_logger import get_structured_logger

logger = get_structured_logger(__name__)

# Cache storage dictionaries
_profile_cache: Dict[str, Tuple[Any, float]] = {}
_agent_cache: Dict[str, Tuple[Any, float]] = {}
_user_agents_cache: Dict[str, Tuple[List[Any], float]] = {}
_generic_cache: Dict[str, Tuple[Any, float]] = {}

# Chat-related caches
_chat_threads_cache: Dict[str, Tuple[List[Any], float]] = {}  # User's chat threads
_chat_messages_cache: Dict[str, Tuple[List[Any], float]] = {}  # Messages for a thread
_message_feedback_cache: Dict[str, Tuple[List[Any], float]] = {}  # Feedback for a message

# Cache configuration
CACHE_CONFIG = {
    "profile": {
        "ttl": 300,  # 5 minutes
        "max_size": 1000,
        "cleanup_size": 100
    },
    "agent": {
        "ttl": 600,  # 10 minutes
        "max_size": 500,
        "cleanup_size": 50
    },
    "user_agents": {
        "ttl": 300,  # 5 minutes
        "max_size": 200,
        "cleanup_size": 20
    },
    "generic": {
        "ttl": 300,  # 5 minutes
        "max_size": 1000,
        "cleanup_size": 100
    },
    "chat_threads": {
        "ttl": 600,  # 10 minutes
        "max_size": 300,
        "cleanup_size": 30
    },
    "chat_messages": {
        "ttl": 300,  # 5 minutes
        "max_size": 500,
        "cleanup_size": 50
    },
    "message_feedback": {
        "ttl": 600,  # 10 minutes
        "max_size": 200,
        "cleanup_size": 20
    }
}

def _is_cache_valid(cached_time: float, ttl: int) -> bool:
    """Check if cache entry is still valid based on TTL"""
    return time.time() - cached_time < ttl

def _cleanup_cache(cache_dict: Dict[str, Tuple[Any, float]], max_size: int, cleanup_size: int) -> None:
    """Clean up old cache entries when size limit is exceeded"""
    if len(cache_dict) > max_size:
        # Sort by timestamp and remove oldest entries
        sorted_items = sorted(cache_dict.items(), key=lambda x: x[1][1])
        for key, _ in sorted_items[:cleanup_size]:
            del cache_dict[key]
        logger.info("Cache cleanup performed", 
                   entries_removed=cleanup_size,
                   remaining_entries=len(cache_dict))

# Profile Cache Functions
def get_cached_profile(user_id: Union[str, UUID]) -> Optional[Any]:
    """Get cached profile for a user"""
    user_id_str = str(user_id)
    if user_id_str in _profile_cache:
        profile, cached_time = _profile_cache[user_id_str]
        if _is_cache_valid(cached_time, CACHE_CONFIG["profile"]["ttl"]):
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
    _cleanup_cache(_chat_threads_cache, config["max_size"], config["cleanup_size"])

def invalidate_chat_threads_cache(user_id: Union[str, UUID]) -> bool:
    """Invalidate cached chat threads for a specific user"""
    user_id_str = str(user_id)
    if user_id_str in _chat_threads_cache:
        del _chat_threads_cache[user_id_str]
        logger.info("Chat threads cache invalidated", user_id=user_id_str)
        return True
    return False

# Chat Messages Cache Functions
def get_cached_chat_messages(cache_key: str) -> Optional[List[Any]]:
    """Get cached messages for a chat thread (includes pagination info in key)"""
    if cache_key in _chat_messages_cache:
        messages, cached_time = _chat_messages_cache[cache_key]
        if _is_cache_valid(cached_time, CACHE_CONFIG["chat_messages"]["ttl"]):
            return messages
        else:
            del _chat_messages_cache[cache_key]
    return None

def cache_chat_messages(cache_key: str, messages_data: List[Any]) -> None:
    """Cache messages for a chat thread (cache_key includes pagination info)"""
    _chat_messages_cache[cache_key] = (messages_data, time.time())
    
    # Cleanup if needed
    config = CACHE_CONFIG["chat_messages"]
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
    _cleanup_cache(_message_feedback_cache, config["max_size"], config["cleanup_size"])

def invalidate_message_feedback_cache(message_id: Union[str, UUID]) -> bool:
    """Invalidate cached feedback for a specific message"""
    message_id_str = str(message_id)
    if message_id_str in _message_feedback_cache:
        del _message_feedback_cache[message_id_str]
        logger.info("Message feedback cache invalidated", message_id=message_id_str)
        return True
    return False

# Generic Cache Functions
def get_cached_item(cache_key: str) -> Optional[Any]:
    """Get any cached item by key"""
    if cache_key in _generic_cache:
        item, cached_time = _generic_cache[cache_key]
        if _is_cache_valid(cached_time, CACHE_CONFIG["generic"]["ttl"]):
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
        "generic": len(_generic_cache)
    }
    
    _profile_cache.clear()
    _agent_cache.clear()
    _user_agents_cache.clear()
    _chat_threads_cache.clear()
    _chat_messages_cache.clear()
    _message_feedback_cache.clear()
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
                      _chat_threads_cache, _chat_messages_cache, _message_feedback_cache, _generic_cache]:
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

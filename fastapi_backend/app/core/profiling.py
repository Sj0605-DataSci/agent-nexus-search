import time
import functools
import logging
import statistics
from typing import Dict, List, Any, Callable, TypeVar, Awaitable
import asyncio

from app.core.structured_logger import get_structured_logger

logger = get_structured_logger(__name__)

# Global storage for profiling data
_stats: Dict[str, Dict[str, Any]] = {}

def get_stats() -> Dict[str, Dict[str, Any]]:
    """
    Get a copy of the current profiling statistics.
    
    Returns:
        Dict[str, Dict[str, Any]]: The profiling statistics.
    """
    # Calculate statistics for each function
    result = {}
    for name, data in _stats.items():
        times = data.get("times", [])
        if times:
            result[name] = {
                "count": data["count"],
                "avg_ms": statistics.mean(times),
                "min_ms": min(times),
                "max_ms": max(times),
                "median_ms": statistics.median(times),
                "total_ms": sum(times),
                "std_dev_ms": statistics.stdev(times) if len(times) > 1 else 0
            }
    return result

def reset_stats() -> None:
    """Reset all profiling statistics."""
    global _stats
    _stats = {}

def record_execution_time(name: str, execution_time_ms: float) -> None:
    """
    Record the execution time for a function or operation.
    
    Args:
        name: The name of the function or operation.
        execution_time_ms: The execution time in milliseconds.
    """
    if name not in _stats:
        _stats[name] = {"count": 0, "times": []}
    
    _stats[name]["count"] += 1
    _stats[name]["times"].append(execution_time_ms)
    
    # Log the execution time
    logger.info(f"PROFILING: {name}", execution_time_ms=execution_time_ms)

# Type variable for generic function
F = TypeVar('F', bound=Callable[..., Any])
AF = TypeVar('AF', bound=Callable[..., Awaitable[Any]])

def profile_sync(name: str) -> Callable[[F], F]:
    """
    Decorator to profile synchronous functions
    
    Args:
        name: A unique name for this profiling point
        
    Returns:
        Decorated function that logs execution time
    """
    def decorator(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                execution_time = (time.time() - start_time) * 1000  # Convert to ms
                
                # Record the execution time
                record_execution_time(name, execution_time)
        return wrapper
    return decorator

def profile_async(name: str) -> Callable[[AF], AF]:
    """
    Decorator to profile asynchronous functions
    
    Args:
        name: A unique name for this profiling point
        
    Returns:
        Decorated async function that logs execution time
    """
    def decorator(func: AF) -> AF:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                execution_time = (time.time() - start_time) * 1000  # Convert to ms
                
                # Record the execution time
                record_execution_time(name, execution_time)
        return wrapper
    return decorator

class AsyncTimer:
    """Async context manager for timing code blocks"""
    
    def __init__(self, name: str):
        self.name = name
        self.start_time = None
        
    async def __aenter__(self):
        self.start_time = time.time()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        execution_time = (time.time() - self.start_time) * 1000  # Convert to ms
        
        # Record the execution time
        record_execution_time(self.name, execution_time)

class Timer:
    """Synchronous context manager for timing code blocks"""
    
    def __init__(self, name: str):
        self.name = name
        self.start_time = None
        
    def __enter__(self):
        self.start_time = time.time()
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        execution_time = (time.time() - self.start_time) * 1000  # Convert to ms
        
        # Record the execution time
        record_execution_time(self.name, execution_time)

# Function to record HTTP request timing
def record_request_time(method: str, path: str, execution_time_ms: float) -> None:
    """
    Record the execution time for an HTTP request.
    
    Args:
        method: The HTTP method (GET, POST, etc.)
        path: The request path
        execution_time_ms: The execution time in milliseconds
    """
    # Normalize the path by removing query parameters and trailing slashes
    normalized_path = path.split('?')[0].rstrip('/')
    
    # Create a name for the request timing
    name = f"http.request.{method}.{normalized_path}"
    
    # Record the timing
    record_execution_time(name, execution_time_ms)

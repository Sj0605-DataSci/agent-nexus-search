import time
import functools
import logging
import statistics
from typing import Dict, List, Any, Callable, TypeVar, Awaitable
import asyncio

from app.core.structured_logger import get_structured_logger

logger = get_structured_logger(__name__)

# Type variable for generic function
F = TypeVar('F', bound=Callable[..., Any])
AF = TypeVar('AF', bound=Callable[..., Awaitable[Any]])

# Global storage for profiling data
profiling_data: Dict[str, List[float]] = {}

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
                
                # Store profiling data
                if name not in profiling_data:
                    profiling_data[name] = []
                profiling_data[name].append(execution_time)
                
                # Log the execution time
                logger.info(f"PROFILING: {name}", 
                           execution_time_ms=execution_time,
                           function_name=func.__name__)
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
                
                # Store profiling data
                if name not in profiling_data:
                    profiling_data[name] = []
                profiling_data[name].append(execution_time)
                
                # Log the execution time
                logger.info(f"PROFILING: {name}", 
                           execution_time_ms=execution_time,
                           function_name=func.__name__)
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
        
        # Store profiling data
        if self.name not in profiling_data:
            profiling_data[self.name] = []
        profiling_data[self.name].append(execution_time)
        
        # Log the execution time
        logger.info(f"PROFILING: {self.name}", 
                   execution_time_ms=execution_time)


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
        
        # Store profiling data
        if self.name not in profiling_data:
            profiling_data[self.name] = []
        profiling_data[self.name].append(execution_time)
        
        # Log the execution time
        logger.info(f"PROFILING: {self.name}", 
                   execution_time_ms=execution_time)

def get_profiling_stats() -> Dict[str, Dict[str, float]]:
    """
    Get statistics for all profiled operations
    
    Returns:
        Dictionary with statistics for each profiled operation
    """
    stats = {}
    
    for name, times in profiling_data.items():
        if not times:
            continue
            
        stats[name] = {
            "count": len(times),
            "avg_ms": statistics.mean(times),
            "min_ms": min(times),
            "max_ms": max(times),
            "median_ms": statistics.median(times),
            "total_ms": sum(times)
        }
        
        # Add standard deviation if we have more than one sample
        if len(times) > 1:
            stats[name]["std_dev_ms"] = statistics.stdev(times)
        
    return stats

def reset_profiling_data():
    """Clear all profiling data"""
    global profiling_data
    profiling_data = {}

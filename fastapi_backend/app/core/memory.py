import gc
import logging
import time
import os
import psutil
import tracemalloc
from typing import Callable, Dict, Optional
from functools import wraps

from app.core.structured_logger import get_structured_logger

logger = get_structured_logger(__name__)

# Enable tracemalloc for memory snapshots
tracemalloc.start(25)  # Keep 25 frames for each allocation

def get_memory_usage() -> Dict[str, float]:
    """Get current memory usage in MB"""
    process = psutil.Process(os.getpid())
    memory_info = process.memory_info()
    return {
        "rss": memory_info.rss / (1024 * 1024),  # Resident Set Size in MB
        "vms": memory_info.vms / (1024 * 1024),  # Virtual Memory Size in MB
    }

def log_memory_usage(label: str = "Memory usage"):
    """Log current memory usage"""
    memory = get_memory_usage()
    logger.info(label,
               rss_mb=round(memory['rss'], 2),
               vms_mb=round(memory['vms'], 2))

def force_garbage_collection():
    """Force a garbage collection cycle and log memory before and after"""
    log_memory_usage("Memory before GC")
    
    # Get counts before collection
    counts_before = gc.get_count()
    
    # Force collection
    start_time = time.time()
    collected = gc.collect(generation=2)  # Full collection
    duration = time.time() - start_time
    
    # Get counts after collection
    counts_after = gc.get_count()
    
    log_memory_usage("Memory after GC")
    logger.info("Garbage collection completed",
               objects_collected=collected,
               duration_seconds=round(duration, 4),
               counts_before=counts_before,
               counts_after=counts_after)
    
    return collected

def memory_intensive(func: Callable) -> Callable:
    """Decorator for memory-intensive functions that forces GC after execution"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_memory = get_memory_usage()
        start_time = time.time()
        
        try:
            result = await func(*args, **kwargs)
            return result
        finally:
            duration = time.time() - start_time
            end_memory = get_memory_usage()
            memory_diff = end_memory["rss"] - start_memory["rss"]
            
            logger.info("Memory intensive function completed",
                       function_name=func.__name__,
                       duration_seconds=round(duration, 4),
                       memory_used_mb=round(memory_diff, 2),
                       start_rss_mb=round(start_memory["rss"], 2),
                       end_rss_mb=round(end_memory["rss"], 2))
            
            # If significant memory was used, force garbage collection
            if memory_diff > 10:  # More than 10MB
                logger.info("Triggering garbage collection due to high memory usage",
                           function_name=func.__name__,
                           memory_used_mb=round(memory_diff, 2))
                force_garbage_collection()
    
    return wrapper

def take_memory_snapshot(name: str = None) -> tracemalloc.Snapshot:
    """Take a memory snapshot for later comparison"""
    snapshot = tracemalloc.take_snapshot()
    if name:
        logger.info("Memory snapshot taken",
                   snapshot_name=name,
                   total_traces=len(snapshot.traces))
    return snapshot

def compare_memory_snapshots(snapshot1: tracemalloc.Snapshot, snapshot2: tracemalloc.Snapshot, limit: int = 10):
    """Compare two memory snapshots and log the differences"""
    top_stats = snapshot2.compare_to(snapshot1, 'lineno')
    
    logger.info("Memory increase since previous snapshot",
               total_differences=len(top_stats),
               showing_top=min(limit, len(top_stats)))
    
    for i, stat in enumerate(top_stats[:limit]):
        logger.info("Memory difference detail",
                   rank=i + 1,
                   size_diff_kb=round(stat.size_diff / 1024, 1),
                   traceback_line=stat.traceback.format()[0] if stat.traceback.format() else "Unknown")

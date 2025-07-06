import gc
import logging
import time
import os
import psutil
import tracemalloc
from typing import Callable, Dict, Optional
from functools import wraps

logger = logging.getLogger(__name__)

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
    logger.info(f"{label}: RSS={memory['rss']:.2f}MB, VMS={memory['vms']:.2f}MB")

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
    logger.info(f"GC: collected {collected} objects in {duration:.4f}s. "
                f"Counts before: {counts_before}, after: {counts_after}")
    
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
            
            logger.info(f"Function {func.__name__} took {duration:.4f}s and used {memory_diff:.2f}MB of memory")
            
            # If significant memory was used, force garbage collection
            if memory_diff > 10:  # More than 10MB
                force_garbage_collection()
    
    return wrapper

def take_memory_snapshot(name: str = None) -> tracemalloc.Snapshot:
    """Take a memory snapshot for later comparison"""
    snapshot = tracemalloc.take_snapshot()
    if name:
        logger.info(f"Memory snapshot taken: {name}")
    return snapshot

def compare_memory_snapshots(snapshot1: tracemalloc.Snapshot, snapshot2: tracemalloc.Snapshot, limit: int = 10):
    """Compare two memory snapshots and log the differences"""
    top_stats = snapshot2.compare_to(snapshot1, 'lineno')
    
    logger.info("Memory increase since previous snapshot:")
    for stat in top_stats[:limit]:
        logger.info(f"{stat.size_diff / 1024:.1f} KB: {stat.traceback.format()[0]}")

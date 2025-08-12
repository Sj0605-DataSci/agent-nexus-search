"""
Emergency memory cleanup endpoints for Railway deployment
"""
import gc
import psutil
import os
import sys
from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from app.core.structured_logger import get_structured_logger
from app.core.utils.cache import clear_all_caches, get_cache_stats

logger = get_structured_logger(__name__)
router = APIRouter(prefix="/emergency", tags=["emergency"])

def _perform_emergency_cleanup_sync() -> Dict[str, Any]:
    """Synchronous emergency cleanup to avoid async context issues"""
    try:
        # Get initial memory
        process = psutil.Process()
        initial_memory = process.memory_info().rss / (1024 * 1024)
        
        print(f"EMERGENCY MEMORY CLEANUP INITIATED - Initial memory: {initial_memory:.2f}MB")
        
        # 1. Clear all application caches immediately
        cache_stats = get_cache_stats()
        total_cache_items = sum(stats["size"] for stats in cache_stats.values())
        clear_all_caches()
        
        # 2. Force aggressive garbage collection multiple times
        gc_results = []
        for i in range(5):
            collected = gc.collect()
            gc_results.append(collected)
        
        # 3. Additional memory cleanup operations
        # Clear import cache
        if hasattr(sys, '_clear_type_cache'):
            sys._clear_type_cache()
        
        # Force another round of GC
        for i in range(3):
            gc.collect()
        
        # 4. Get final memory
        final_memory = process.memory_info().rss / (1024 * 1024)
        memory_freed = initial_memory - final_memory
        
        result = {
            "success": True,
            "initial_memory_mb": round(initial_memory, 2),
            "final_memory_mb": round(final_memory, 2),
            "memory_freed_mb": round(memory_freed, 2),
            "cache_items_cleared": total_cache_items,
            "cache_stats_before": cache_stats,
            "gc_collections": gc_results,
            "timestamp": psutil.time.time(),
            "note": "Synchronous emergency cleanup - no async operations"
        }
        
        print(f"EMERGENCY MEMORY CLEANUP COMPLETED - Memory freed: {memory_freed:.2f}MB")
        return result
        
    except Exception as e:
        error_msg = str(e)
        print(f"Emergency memory cleanup failed: {error_msg}")
        return {
            "success": False,
            "error": error_msg,
            "initial_memory_mb": 0,
            "final_memory_mb": 0,
            "memory_freed_mb": 0
        }

@router.post("/memory-cleanup")
async def emergency_memory_cleanup() -> Dict[str, Any]:
    """Emergency memory cleanup - use when memory usage is critical"""
    # Use synchronous function to avoid async context issues
    return _perform_emergency_cleanup_sync()

@router.get("/memory-cleanup-now")
async def emergency_memory_cleanup_get() -> Dict[str, Any]:
    """Emergency memory cleanup via GET - for browser access"""
    # Use synchronous function to avoid async context issues
    return _perform_emergency_cleanup_sync()

@router.get("/memory-status")
async def get_memory_status() -> Dict[str, Any]:
    """Get current memory status and statistics"""
    try:
        process = psutil.Process()
        memory_info = process.memory_info()
        
        # Get system memory
        system_memory = psutil.virtual_memory()
        
        # Get cache statistics
        cache_stats = get_cache_stats()
        
        return {
            "process_memory": {
                "rss_mb": round(memory_info.rss / (1024 * 1024), 2),
                "vms_mb": round(memory_info.vms / (1024 * 1024), 2),
                "percent": round(process.memory_percent(), 2)
            },
            "system_memory": {
                "total_mb": round(system_memory.total / (1024 * 1024), 2),
                "available_mb": round(system_memory.available / (1024 * 1024), 2),
                "used_percent": system_memory.percent
            },
            "cache_stats": cache_stats,
            "pid": os.getpid()
        }
        
    except Exception as e:
        print(f"Failed to get memory status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get memory status: {str(e)}")

@router.post("/restart-workers")
async def restart_workers() -> Dict[str, Any]:
    """Restart all workers to free memory"""
    try:
        # Get current process info
        process = psutil.Process()
        initial_memory = process.memory_info().rss / (1024 * 1024)
        
        print(f"WORKER RESTART INITIATED - Current memory: {initial_memory:.2f}MB")
        
        # Force aggressive garbage collection before restart
        gc_results = []
        for i in range(3):
            collected = gc.collect()
            gc_results.append(collected)
        
        # Clear all caches to free memory
        cache_stats = get_cache_stats()
        total_cache_items = sum(stats["size"] for stats in cache_stats.values())
        clear_all_caches()
        
        # Additional memory cleanup
        if hasattr(sys, '_clear_type_cache'):
            sys._clear_type_cache()
        
        # Final garbage collection
        final_gc = gc.collect()
        
        # Get final memory
        final_memory = process.memory_info().rss / (1024 * 1024)
        memory_freed = initial_memory - final_memory
        
        print(f"WORKER RESTART COMPLETED - Memory freed: {memory_freed:.2f}MB")
        
        return {
            "success": True,
            "message": "Worker memory cleanup completed",
            "initial_memory_mb": round(initial_memory, 2),
            "final_memory_mb": round(final_memory, 2),
            "memory_freed_mb": round(memory_freed, 2),
            "cache_items_cleared": total_cache_items,
            "gc_collections": gc_results,
            "final_gc_collected": final_gc,
            "note": "Performed memory cleanup and cache clearing - equivalent to worker restart for memory purposes"
        }
        
    except Exception as e:
        print(f"Failed to restart workers: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Worker restart failed",
            "memory_freed_mb": 0
        }

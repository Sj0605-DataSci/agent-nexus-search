"""
Emergency memory cleanup endpoints for Railway deployment
"""
import gc
import psutil
import os
from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from app.core.structured_logger import get_structured_logger
from app.core.utils.cache import clear_all_caches, get_cache_stats
from app.core.memory_optimizer import memory_optimizer, force_cleanup
import time

logger = get_structured_logger(__name__)
router = APIRouter(prefix="/emergency", tags=["emergency"])

async def _perform_emergency_cleanup() -> Dict[str, Any]:
    """Internal function to perform emergency cleanup"""
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
        
        # 3. Simple memory cleanup without using memory optimizer to avoid logging conflicts
        import sys
        sys.modules.clear()  # Clear module cache
        
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
            "timestamp": time.time(),
            "note": "Emergency cleanup bypassed memory optimizer to avoid logging conflicts"
        }
        
        print(f"EMERGENCY MEMORY CLEANUP COMPLETED - Memory freed: {memory_freed:.2f}MB")
        return result
        
    except Exception as e:
        error_msg = str(e)
        print(f"Emergency memory cleanup failed: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Emergency cleanup failed: {error_msg}")

@router.post("/memory-cleanup")
async def emergency_memory_cleanup() -> Dict[str, Any]:
    """Emergency memory cleanup - use when memory usage is critical"""
    return await _perform_emergency_cleanup()

@router.get("/memory-cleanup-now")
async def emergency_memory_cleanup_get() -> Dict[str, Any]:
    """Emergency memory cleanup via GET - for browser access"""
    return await _perform_emergency_cleanup()

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
        
        # Get memory optimizer stats
        optimizer_stats = memory_optimizer.get_stats()
        
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
            "optimizer_stats": optimizer_stats,
            "pid": os.getpid()
        }
        
    except Exception as e:
        logger.error("Failed to get memory status", error_msg=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get memory status: {str(e)}")

@router.post("/restart-workers")
async def restart_workers() -> Dict[str, Any]:
    """Restart all workers to free memory"""
    try:
        from app.core.worker_manager import WorkerManager
        worker_manager = WorkerManager()
        
        # Force restart all workers
        await worker_manager._restart_workers_for_memory()
        
        return {
            "success": True,
            "message": "All workers restarted for memory cleanup",
            "chat_workers": len(worker_manager.chat_workers),
            "connection_workers": len(worker_manager.connection_workers)
        }
        
    except Exception as e:
        logger.error("Failed to restart workers", error_msg=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to restart workers: {str(e)}")

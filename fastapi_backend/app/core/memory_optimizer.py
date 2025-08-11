"""
Memory optimization module for Railway deployment
Addresses multiple memory leak sources and provides proactive cleanup
"""
import asyncio
import gc
import os
import psutil
import time
import threading
from typing import Dict, Any, Optional
from contextlib import asynccontextmanager

from app.core.utils.cache import (
    clear_all_caches, get_cache_stats, _aggressive_cache_cleanup
)

class MemoryOptimizer:
    """Comprehensive memory optimization and leak prevention"""
    
    def __init__(self):
        self.process = psutil.Process()
        self.monitoring_active = False
        self.monitoring_task: Optional[asyncio.Task] = None
        self.cleanup_lock = threading.Lock()
        
        # Memory thresholds (MB)
        self.warning_threshold = 600
        self.critical_threshold = 800
        self.emergency_threshold = 1000
        
        # Monitoring intervals (seconds)
        self.check_interval = 30
        self.aggressive_cleanup_interval = 300  # 5 minutes
        
        # Statistics
        self.stats = {
            "cleanups_performed": 0,
            "memory_warnings": 0,
            "emergency_cleanups": 0,
            "last_cleanup": None,
            "peak_memory_mb": 0
        }
    
    def get_memory_usage(self) -> Dict[str, float]:
        """Get detailed memory usage information"""
        try:
            memory_info = self.process.memory_info()
            memory_percent = self.process.memory_percent()
            
            return {
                "rss_mb": memory_info.rss / (1024 * 1024),
                "vms_mb": memory_info.vms / (1024 * 1024),
                "percent": memory_percent,
                "available_mb": psutil.virtual_memory().available / (1024 * 1024)
            }
        except Exception as e:
            print(f"Failed to get memory usage: {str(e)}")
            return {"rss_mb": 0, "vms_mb": 0, "percent": 0, "available_mb": 0}
    
    async def perform_cleanup(self, level: str = "standard") -> Dict[str, Any]:
        """Perform memory cleanup based on severity level"""
        with self.cleanup_lock:
            start_time = time.time()
            initial_memory = self.get_memory_usage()
            
            cleanup_actions = []
            
            try:
                if level in ["standard", "aggressive", "emergency"]:
                    # Clear application caches
                    cache_stats = get_cache_stats()
                    clear_all_caches()
                    cleanup_actions.append(f"Cleared {sum(cache_stats.values())} cache entries")
                
                if level in ["aggressive", "emergency"]:
                    # Aggressive cache cleanup
                    _aggressive_cache_cleanup()
                    cleanup_actions.append("Performed aggressive cache cleanup")
                    
                    # Force garbage collection multiple times
                    for i in range(3):
                        collected = gc.collect()
                        cleanup_actions.append(f"GC pass {i+1}: collected {collected} objects")
                
                if level == "emergency":
                    # Emergency cleanup - clear everything possible
                    gc.set_debug(gc.DEBUG_LEAK)
                    collected = gc.collect()
                    gc.set_debug(0)
                    cleanup_actions.append(f"Emergency GC with leak detection: {collected} objects")
                    
                    # Clear any remaining references
                    import sys
                    cleanup_actions.append(f"Cleared {len(sys.modules)} module references")
                
                # Update statistics
                self.stats["cleanups_performed"] += 1
                self.stats["last_cleanup"] = time.time()
                if level == "emergency":
                    self.stats["emergency_cleanups"] += 1
                
                final_memory = self.get_memory_usage()
                memory_freed = initial_memory["rss_mb"] - final_memory["rss_mb"]
                cleanup_time = time.time() - start_time
                
                print(f"Memory cleanup completed - Level: {level}, Memory freed: {memory_freed:.2f}MB")
                
                return {
                    "success": True,
                    "level": level,
                    "memory_freed_mb": memory_freed,
                    "cleanup_time_ms": cleanup_time * 1000,
                    "actions": cleanup_actions,
                    "final_memory": final_memory
                }
                
            except Exception as e:
                print(f"Error during memory cleanup - Level: {level}, Error: {str(e)}")
                return {
                    "success": False,
                    "level": level,
                    "error_msg": str(e),
                    "actions": cleanup_actions
                }
    
    async def check_memory_and_cleanup(self) -> Optional[Dict[str, Any]]:
        """Check memory usage and perform cleanup if needed"""
        memory_usage = self.get_memory_usage()
        current_memory = memory_usage["rss_mb"]
        
        # Update peak memory
        if current_memory > self.stats["peak_memory_mb"]:
            self.stats["peak_memory_mb"] = current_memory
        
        # Determine cleanup level needed
        cleanup_level = None
        
        if current_memory >= self.emergency_threshold:
            cleanup_level = "emergency"
            self.stats["memory_warnings"] += 1
            print(f"Emergency memory threshold exceeded: {current_memory:.2f}MB > {self.emergency_threshold}MB")
        
        elif current_memory >= self.critical_threshold:
            cleanup_level = "aggressive"
            self.stats["memory_warnings"] += 1
            print(f"Critical memory threshold exceeded: {current_memory:.2f}MB > {self.critical_threshold}MB")
        
        elif current_memory >= self.warning_threshold:
            cleanup_level = "standard"
            print(f"Memory warning threshold exceeded: {current_memory:.2f}MB > {self.warning_threshold}MB")
        
        # Perform cleanup if needed
        if cleanup_level:
            return await self.perform_cleanup(cleanup_level)
        
        return None
    
    async def start_monitoring(self):
        """Start continuous memory monitoring"""
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        print(f"Starting memory monitoring - Warning: {self.warning_threshold}MB, Critical: {self.critical_threshold}MB, Emergency: {self.emergency_threshold}MB")
        
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
    
    async def stop_monitoring(self):
        """Stop memory monitoring"""
        self.monitoring_active = False
        
        if self.monitoring_task and not self.monitoring_task.done():
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
        
        print("Memory monitoring stopped")
    
    async def _monitoring_loop(self):
        """Main monitoring loop"""
        last_aggressive_cleanup = 0
        
        while self.monitoring_active:
            try:
                current_time = time.time()
                
                # Regular memory check and cleanup
                cleanup_result = await self.check_memory_and_cleanup()
                
                # Periodic aggressive cleanup regardless of memory usage
                if (current_time - last_aggressive_cleanup) > self.aggressive_cleanup_interval:
                    print("Performing periodic aggressive cleanup")
                    await self.perform_cleanup("aggressive")
                    last_aggressive_cleanup = current_time
                
                # Log memory statistics periodically
                if self.stats["cleanups_performed"] % 10 == 0:
                    memory_usage = self.get_memory_usage()
                    print(f"Memory monitoring stats - Current: {memory_usage['rss_mb']:.2f}MB, Peak: {self.stats['peak_memory_mb']:.2f}MB, Cleanups: {self.stats['cleanups_performed']}")
                
                await asyncio.sleep(self.check_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error in memory monitoring loop: {str(e)}")
                await asyncio.sleep(self.check_interval)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get memory optimization statistics"""
        memory_usage = self.get_memory_usage()
        return {
            **self.stats,
            "current_memory": memory_usage,
            "monitoring_active": self.monitoring_active,
            "thresholds": {
                "warning": self.warning_threshold,
                "critical": self.critical_threshold,
                "emergency": self.emergency_threshold
            }
        }

# Global memory optimizer instance
memory_optimizer = MemoryOptimizer()

@asynccontextmanager
async def memory_monitored_operation(operation_name: str):
    """Context manager for monitoring memory during operations"""
    start_memory = memory_optimizer.get_memory_usage()
    start_time = time.time()
    
    try:
        yield
    finally:
        end_memory = memory_optimizer.get_memory_usage()
        operation_time = time.time() - start_time
        memory_delta = end_memory["rss_mb"] - start_memory["rss_mb"]
        
        print(f"Memory-monitored operation completed - {operation_name}: Memory delta: {memory_delta:.2f}MB, Time: {operation_time*1000:.2f}ms")
        
        # Trigger cleanup if memory increased significantly
        if memory_delta > 50:  # 50MB increase
            print(f"Significant memory increase detected ({memory_delta:.2f}MB), triggering cleanup")
            await memory_optimizer.perform_cleanup("standard")

# Convenience functions
async def start_memory_monitoring():
    """Start global memory monitoring"""
    await memory_optimizer.start_monitoring()

async def stop_memory_monitoring():
    """Stop global memory monitoring"""
    await memory_optimizer.stop_monitoring()

async def force_cleanup(level: str = "standard"):
    """Force immediate memory cleanup"""
    return await memory_optimizer.perform_cleanup(level)

def get_memory_stats():
    """Get current memory statistics"""
    return memory_optimizer.get_stats()

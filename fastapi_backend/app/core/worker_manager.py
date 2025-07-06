"""
Worker manager for handling background worker processes
"""
import asyncio
import logging
import os
from typing import List, Dict, Any
import signal
import psutil

from app.core.worker import ChatWorker
from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)

class WorkerManager:
    """Manager for background worker processes"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        """Singleton pattern implementation"""
        if cls._instance is None:
            cls._instance = super(WorkerManager, cls).__new__(cls)
            cls._instance.workers = []
            cls._instance._initialized = False
        return cls._instance
    
    async def initialize(self, num_workers: int = None):
        """Initialize the worker manager"""
        if self._initialized:
            return
            
        # Determine number of workers based on CPU count or settings
        if num_workers is None:
            # Default to CPU count - 1, with minimum of 1
            cpu_count = os.cpu_count() or 2
            num_workers = max(1, min(cpu_count - 1, 2))  # Cap at 2 for Railway free tier
            
            # Check if we're on Railway free tier (512MB RAM)
            try:
                mem_info = psutil.virtual_memory()
                if mem_info.total < 1024 * 1024 * 1024:  # Less than 1GB RAM
                    # Reduce workers for low memory environments
                    num_workers = 1
            except:
                pass
        
        logger.info(f"Initializing worker manager with {num_workers} workers")
        
        # Create and start workers
        for _ in range(num_workers):
            worker = ChatWorker()
            task = asyncio.create_task(worker.start())
            self.workers.append({"worker": worker, "task": task})
        
        self._initialized = True
        logger.info("Worker manager initialized")
    
    async def shutdown(self):
        """Shutdown all workers"""
        if not self._initialized:
            return
            
        logger.info("Shutting down worker manager")
        
        # Stop all workers
        for worker_info in self.workers:
            worker = worker_info["worker"]
            task = worker_info["task"]
            
            # Stop the worker
            await worker.stop()
            
            # Cancel the task if it's still running
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        
        self.workers = []
        self._initialized = False
        logger.info("Worker manager shutdown complete")
    
    def get_status(self) -> Dict[str, Any]:
        """Get status information about workers"""
        return {
            "initialized": self._initialized,
            "worker_count": len(self.workers),
            "workers": [
                {
                    "id": w["worker"].worker_id,
                    "running": w["worker"].running,
                    "current_task": w["worker"].current_task["request_id"] if w["worker"].current_task else None
                }
                for w in self.workers
            ]
        }

# Singleton instance
worker_manager = WorkerManager()

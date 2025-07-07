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
from app.core.connection_worker import ConnectionWorker
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
            cls._instance.chat_workers = []
            cls._instance.connection_workers = []
            cls._instance._initialized = False
            import time
            cls._instance.start_time = time.time()
        return cls._instance
    
    async def initialize(self):
        """Initialize the worker manager"""
        if self._initialized:
            return
            
        # Determine number of workers based on available CPU cores
        cpu_count = os.cpu_count() or 1
        
        # For Railway free tier with limited resources, use only 1 worker
        # Adjust this logic based on your deployment environment
        self.num_chat_workers = min(cpu_count, 1)  # Limit to 1 chat worker for resource constraints
        self.num_connection_workers = 1  # Only need 1 connection worker
        
        logger.info(f"Initializing worker manager with {self.num_chat_workers} chat workers and {self.num_connection_workers} connection workers")
        
        # Create and start chat workers
        for _ in range(self.num_chat_workers):
            await self._start_chat_worker()
            
        # Create and start connection workers
        for _ in range(self.num_connection_workers):
            await self._start_connection_worker()
            
        # Start worker monitoring task
        self._monitor_task = asyncio.create_task(self._monitor_workers())
            
        self._initialized = True
        logger.info("Worker manager initialized")
    
    async def _start_chat_worker(self):
        """Start a new chat worker"""
        worker = ChatWorker()
        task = asyncio.create_task(worker.start())
        self.chat_workers.append({"worker": worker, "task": task, "type": "chat"})
        return worker, task
        
    async def _start_connection_worker(self):
        """Start a new connection worker"""
        worker = ConnectionWorker()
        task = asyncio.create_task(worker.start())
        self.connection_workers.append({"worker": worker, "task": task, "type": "connection"})
        return worker, task
        
    async def _stop_chat_worker(self, worker_index):
        """Stop a specific chat worker by index"""
        if worker_index >= len(self.chat_workers):
            return
            
        worker_info = self.chat_workers[worker_index]
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
                
        # Remove from workers list
        self.chat_workers.pop(worker_index)
        
    async def _stop_connection_worker(self, worker_index):
        """Stop a specific connection worker by index"""
        if worker_index >= len(self.connection_workers):
            return
            
        worker_info = self.connection_workers[worker_index]
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
                
        # Remove from workers list
        self.connection_workers.pop(worker_index)
    
    async def _monitor_workers(self):
        """Monitor workers and restart if needed"""
        while True:
            try:
                # Check chat workers
                if len(self.chat_workers) < self.num_chat_workers:
                    logger.warning(f"Chat worker count ({len(self.chat_workers)}) below target ({self.num_chat_workers}), starting new worker")
                    await self._start_chat_worker()
                
                # Check connection workers
                if len(self.connection_workers) < self.num_connection_workers:
                    logger.warning(f"Connection worker count ({len(self.connection_workers)}) below target ({self.num_connection_workers}), starting new worker")
                    await self._start_connection_worker()
                
                # Check each chat worker's health
                for i, worker_info in enumerate(self.chat_workers):
                    worker = worker_info["worker"]
                    task = worker_info["task"]
                    
                    # Check if task is done or worker is not running
                    if task.done() or not worker.running:
                        logger.warning(f"Chat worker {worker.worker_id} is not running, restarting...")
                        await self._stop_chat_worker(i)
                        await self._start_chat_worker()
                        break  # Break since we modified the list
                        
                    # Check if worker requested restart due to high memory
                    if hasattr(worker, 'request_restart') and worker.request_restart:
                        logger.warning(f"Chat worker {worker.worker_id} requested restart, complying...")
                        await self._stop_chat_worker(i)
                        await self._start_chat_worker()
                        break  # Break since we modified the list
                        
                # Check each connection worker's health
                for i, worker_info in enumerate(self.connection_workers):
                    worker = worker_info["worker"]
                    task = worker_info["task"]
                    
                    # Check if task is done or worker is not running
                    if task.done() or not worker.running:
                        logger.warning(f"Connection worker {worker.worker_id} is not running, restarting...")
                        await self._stop_connection_worker(i)
                        await self._start_connection_worker()
                        break  # Break since we modified the list
            except Exception as e:
                logger.error(f"Error in worker monitoring: {str(e)}")
                
            # Check every 30 seconds
            await asyncio.sleep(30)
    
    async def shutdown(self):
        """Shutdown all workers"""
        if not self._initialized:
            return
            
        logger.info("Shutting down worker manager")
        
        # Cancel the monitor task
        if hasattr(self, '_monitor_task') and self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
        
        # Stop all chat workers
        for i in range(len(self.chat_workers) - 1, -1, -1):
            await self._stop_chat_worker(i)
            
        # Stop all connection workers
        for i in range(len(self.connection_workers) - 1, -1, -1):
            await self._stop_connection_worker(i)
        
        self.chat_workers = []
        self.connection_workers = []
        self._initialized = False
        logger.info("Worker manager shutdown complete")
    
    def get_status(self) -> Dict[str, Any]:
        """Get status information about workers"""
        return {
            "initialized": self._initialized,
            "chat_worker_count": len(self.chat_workers),
            "connection_worker_count": len(self.connection_workers),
            "chat_workers": [
                {
                    "id": w["worker"].worker_id,
                    "running": w["worker"].running,
                    "current_task": w["worker"].current_task["request_id"] if w["worker"].current_task else None
                }
                for w in self.chat_workers
            ],
            "connection_workers": [
                {
                    "id": w["worker"].worker_id,
                    "running": w["worker"].running,
                    "current_task": w["worker"].current_task["file_id"] if w["worker"].current_task else None
                }
                for w in self.connection_workers
            ]
        }

# Singleton instance
worker_manager = WorkerManager()

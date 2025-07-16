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
from app.core.structured_logger import get_structured_logger

# Configure logging
logger = get_structured_logger(__name__)

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
        
        logger.info("Initializing worker manager",
                   num_chat_workers=self.num_chat_workers,
                   num_connection_workers=self.num_connection_workers,
                   cpu_count=cpu_count)
        
        # Create and start chat workers
        for _ in range(self.num_chat_workers):
            await self._start_chat_worker()
            
        # Create and start connection workers
        for _ in range(self.num_connection_workers):
            await self._start_connection_worker()
            
        # Start worker monitoring task
        self._monitor_task = asyncio.create_task(self._monitor_workers())
            
        self._initialized = True
        logger.info("Worker manager initialized successfully",
                   chat_workers_started=len(self.chat_workers),
                   connection_workers_started=len(self.connection_workers))
    
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
                # Check if we need to start more workers
                if len(self.chat_workers) < self.num_chat_workers:
                    logger.warning("Chat worker count below target, starting new worker",
                                  current_count=len(self.chat_workers),
                                  target_count=self.num_chat_workers)
                    await self._start_chat_worker()
                    
                if len(self.connection_workers) < self.num_connection_workers:
                    logger.warning("Connection worker count below target, starting new worker",
                                  current_count=len(self.connection_workers),
                                  target_count=self.num_connection_workers)
                    await self._start_connection_worker()
                
                # Check each chat worker's health
                for i, worker_info in enumerate(self.chat_workers):
                    worker = worker_info["worker"]
                    task = worker_info["task"]
                    
                    # Check if task is done or worker is not running
                    if task.done() or not worker.running:
                        logger.warning("Chat worker not running, restarting",
                                     worker_id=worker.worker_id,
                                     task_done=task.done(),
                                     worker_running=worker.running)
                        await self._stop_chat_worker(i)
                        await self._start_chat_worker()
                        break  # Break since we modified the list
                        
                    # Check if worker requested restart due to high memory
                    if hasattr(worker, 'request_restart') and worker.request_restart:
                        logger.warning("Chat worker requested restart, complying",
                                     worker_id=worker.worker_id,
                                     restart_reason="high_memory")
                        await self._stop_chat_worker(i)
                        await self._start_chat_worker()
                        break  # Break since we modified the list
                        
                # Check each connection worker's health
                for i, worker_info in enumerate(self.connection_workers):
                    worker = worker_info["worker"]
                    task = worker_info["task"]
                    
                    # Check if task is done or worker is not running
                    if task.done() or not worker.running:
                        logger.warning("Connection worker not running, restarting",
                                     worker_id=worker.worker_id,
                                     task_done=task.done(),
                                     worker_running=worker.running)
                        await self._stop_connection_worker(i)
                        await self._start_connection_worker()
                        break  # Break since we modified the list
            except Exception as e:
                logger.exception("Error in worker monitoring",
                               exception_type=type(e).__name__,
                               error_message=str(e))
                
            # Check every 30 seconds
            await asyncio.sleep(30)
    
    async def shutdown(self):
        """Shutdown all workers"""
        if not self._initialized:
            return
            
        logger.info("Shutting down worker manager",
                   chat_workers_count=len(self.chat_workers),
                   connection_workers_count=len(self.connection_workers))
        
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
        logger.info("Worker manager shutdown complete",
                   final_chat_workers_count=len(self.chat_workers),
                   final_connection_workers_count=len(self.connection_workers))
    
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

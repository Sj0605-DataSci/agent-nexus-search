"""
Worker manager for handling background worker processes
"""
import asyncio
import logging
import os
from typing import List, Dict, Any
import signal
import psutil
import gc
import time

from app.core.worker import ChatWorker
from app.core.connection_worker import ConnectionWorker
from app.core.enrichment_worker import EnrichmentWorker
from app.core.auto_enrichment_worker import AutoEnrichmentWorker
from app.core.embedding_worker import EmbeddingWorker
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
            cls._instance.enrichment_workers = []
            cls._instance.auto_enrichment_workers = []
            cls._instance.embedding_workers = []
            cls._instance._initialized = False
            cls._instance.start_time = time.time()
            cls._instance.worker_memory_threshold = 600  # MB per worker before restart
            cls._instance.last_memory_check = 0
            cls._instance.memory_check_interval = 60  # Check every 60 seconds
        return cls._instance
    
    async def initialize(self):
        """Initialize the worker manager"""
        if self._initialized:
            return
            
        # Determine number of workers based on available CPU cores and deployment type
        cpu_count = os.cpu_count() or 1
        
        # Check if running as dedicated worker process
        process_type = os.getenv("PROCESS_TYPE", "web")
        
        if process_type == "worker":
            # Dedicated worker process - can use more resources
            self.num_chat_workers = min(cpu_count // 2, 4)  # Use half the cores, max 4
            self.num_connection_workers = 1  # Only need 1 connection worker
            self.num_enrichment_workers = 1  # Only need 1 enrichment worker
            self.num_auto_enrichment_workers = 4  # Only need 1 auto enrichment worker
            self.num_embedding_workers = 4  # Use 3 embedding workers for parallel processing
            logger.info("Running as dedicated worker process")
        else:
            # Running alongside web process - use minimal resources
            self.num_chat_workers = 1  # Minimal for web process
            self.num_connection_workers = 1
            self.num_enrichment_workers = 2
            self.num_auto_enrichment_workers = 2
            self.num_embedding_workers = 2  # Use 2 embedding workers for web process
            logger.info("Running alongside web process")
        
        logger.info("Initializing worker manager",
                   num_chat_workers=self.num_chat_workers,
                   num_connection_workers=self.num_connection_workers,
                   num_enrichment_workers=self.num_enrichment_workers,
                   num_auto_enrichment_workers=self.num_auto_enrichment_workers,
                   num_embedding_workers=self.num_embedding_workers,
                   cpu_count=cpu_count,
                   process_type=process_type)
        
        # Create and start chat workers
        for _ in range(self.num_chat_workers):
            await self._start_chat_worker()
            
        # Create and start connection workers
        for _ in range(self.num_connection_workers):
            await self._start_connection_worker()
            
        # Create and start enrichment workers
        for _ in range(self.num_enrichment_workers):
            await self._start_enrichment_worker()
            
        # Create and start auto enrichment workers
        for _ in range(self.num_auto_enrichment_workers):
            await self._start_auto_enrichment_worker()
            
        # Create and start embedding workers
        for _ in range(self.num_embedding_workers):
            await self._start_embedding_worker()
            
        # Start worker monitoring task
        self._monitor_task = asyncio.create_task(self._monitor_workers())
            
        self._initialized = True
        logger.info("Worker manager initialized successfully",
                   chat_workers_started=len(self.chat_workers),
                   connection_workers_started=len(self.connection_workers),
                   enrichment_workers_started=len(self.enrichment_workers),
                   auto_enrichment_workers_started=len(self.auto_enrichment_workers),
                   embedding_workers_started=len(self.embedding_workers))
    
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
        
    async def _start_enrichment_worker(self):
        """Start a new enrichment worker"""
        worker = EnrichmentWorker()
        task = asyncio.create_task(worker.start())
        self.enrichment_workers.append({"worker": worker, "task": task, "type": "enrichment"})
        return worker, task
        
    async def _start_auto_enrichment_worker(self):
        """Start a new auto enrichment worker"""
        worker = AutoEnrichmentWorker()
        task = asyncio.create_task(worker.start())
        self.auto_enrichment_workers.append({"worker": worker, "task": task, "type": "auto_enrichment"})
        return worker, task
        
    async def _start_embedding_worker(self):
        """Start a new embedding worker"""
        worker = EmbeddingWorker()
        task = asyncio.create_task(worker.start())
        self.embedding_workers.append({"worker": worker, "task": task, "type": "embedding"})
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
        
    async def _stop_enrichment_worker(self, worker_index):
        """Stop a specific enrichment worker by index"""
        if worker_index >= len(self.enrichment_workers):
            return
            
        worker_info = self.enrichment_workers[worker_index]
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
        self.enrichment_workers.pop(worker_index)
        
    async def _stop_auto_enrichment_worker(self, worker_index):
        """Stop a specific auto enrichment worker by index"""
        if worker_index >= len(self.auto_enrichment_workers):
            return
            
        worker_info = self.auto_enrichment_workers[worker_index]
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
        self.auto_enrichment_workers.pop(worker_index)
        
    async def _stop_embedding_worker(self, worker_index):
        """Stop a specific embedding worker by index"""
        if worker_index >= len(self.embedding_workers):
            return
            
        worker_info = self.embedding_workers[worker_index]
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
        self.embedding_workers.pop(worker_index)
    
    async def _monitor_workers(self):
        """Monitor workers and restart if needed"""
        while True:
            try:
                current_time = time.time()
                
                # Check memory usage periodically (DISABLED)
                # if current_time - self.last_memory_check > self.memory_check_interval:
                #     await self._check_worker_memory()
                #     self.last_memory_check = current_time
                
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
                    
                if len(self.enrichment_workers) < self.num_enrichment_workers:
                    logger.warning("Enrichment worker count below target, starting new worker",
                                  current_count=len(self.enrichment_workers),
                                  target_count=self.num_enrichment_workers)
                    await self._start_enrichment_worker()
                    
                if len(self.auto_enrichment_workers) < self.num_auto_enrichment_workers:
                    logger.warning("Auto enrichment worker count below target, starting new worker",
                                  current_count=len(self.auto_enrichment_workers),
                                  target_count=self.num_auto_enrichment_workers)
                    await self._start_auto_enrichment_worker()
                    
                if len(self.embedding_workers) < self.num_embedding_workers:
                    logger.warning("Embedding worker count below target, starting new worker",
                                  current_count=len(self.embedding_workers),
                                  target_count=self.num_embedding_workers)
                    await self._start_embedding_worker()
                
                # Check for dead workers and restart them
                await self._check_dead_workers()
                
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                logger.error("Error in worker monitoring", error=str(e), exc_info=True)
                await asyncio.sleep(60)  # Wait longer on error

    async def _check_worker_memory(self):
        """Check memory usage of workers and restart if necessary"""
        try:
            process = psutil.Process()
            memory_mb = process.memory_info().rss / (1024 * 1024)
            
            logger.info("Worker memory check", 
                       total_memory_mb=round(memory_mb, 2),
                       chat_workers=len(self.chat_workers),
                       connection_workers=len(self.connection_workers),
                       enrichment_workers=len(self.enrichment_workers),
                       auto_enrichment_workers=len(self.auto_enrichment_workers),
                       embedding_workers=len(self.embedding_workers))
            
            # If total memory is high, restart workers to free memory
            if memory_mb > self.worker_memory_threshold:
                logger.warning("High memory usage detected, restarting workers",
                             memory_mb=round(memory_mb, 2),
                             threshold_mb=self.worker_memory_threshold)
                
                await self._restart_workers_for_memory()
                
                # Force garbage collection
                gc.collect()
                
        except Exception as e:
            logger.error("Error checking worker memory", error=str(e))

    async def _restart_workers_for_memory(self):
        """Restart workers to free memory"""
        try:
            # Restart chat workers one by one to avoid service interruption
            workers_to_restart = min(len(self.chat_workers), 2)  # Restart max 2 at a time
            
            for i in range(workers_to_restart):
                if self.chat_workers:
                    logger.info(f"Restarting chat worker {i} for memory cleanup")
                    await self._stop_chat_worker(0)  # Stop first worker
                    await asyncio.sleep(2)  # Brief pause
                    await self._start_chat_worker()  # Start new worker
            
            # Restart connection workers if needed
            if len(self.connection_workers) > 0:
                logger.info("Restarting connection worker for memory cleanup")
                await self._stop_connection_worker(0)
                await asyncio.sleep(2)
                await self._start_connection_worker()
                
            # Restart enrichment workers if needed
            if len(self.enrichment_workers) > 0:
                logger.info("Restarting enrichment worker for memory cleanup")
                await self._stop_enrichment_worker(0)
                await asyncio.sleep(2)
                await self._start_enrichment_worker()
                
            # Restart auto enrichment workers if needed
            if len(self.auto_enrichment_workers) > 0:
                logger.info("Restarting auto enrichment worker for memory cleanup")
                await self._stop_auto_enrichment_worker(0)
                await asyncio.sleep(2)
                await self._start_auto_enrichment_worker()
                
            # Restart embedding workers if needed
            if len(self.embedding_workers) > 0:
                logger.info("Restarting embedding worker for memory cleanup")
                await self._stop_embedding_worker(0)
                await asyncio.sleep(2)
                await self._start_embedding_worker()
                
        except Exception as e:
            logger.error("Error restarting workers for memory", error=str(e))

    async def _check_dead_workers(self):
        """Check for dead workers and restart them"""
        # Check chat workers
        dead_chat_workers = []
        for i, worker_info in enumerate(self.chat_workers):
            task = worker_info["task"]
            if task.done():
                dead_chat_workers.append(i)
        
        # Remove dead workers (in reverse order to maintain indices)
        for i in reversed(dead_chat_workers):
            logger.warning("Found dead chat worker, removing", worker_index=i)
            await self._stop_chat_worker(i)
        
        # Check connection workers
        dead_connection_workers = []
        for i, worker_info in enumerate(self.connection_workers):
            task = worker_info["task"]
            if task.done():
                dead_connection_workers.append(i)
        
        # Remove dead workers (in reverse order to maintain indices)
        for i in reversed(dead_connection_workers):
            logger.warning("Found dead connection worker, removing", worker_index=i)
            await self._stop_connection_worker(i)
            
        # Check enrichment workers
        dead_enrichment_workers = []
        for i, worker_info in enumerate(self.enrichment_workers):
            task = worker_info["task"]
            if task.done():
                dead_enrichment_workers.append(i)
        
        # Remove dead workers (in reverse order to maintain indices)
        for i in reversed(dead_enrichment_workers):
            logger.warning("Found dead enrichment worker, removing", worker_index=i)
            await self._stop_enrichment_worker(i)
            
        # Check auto enrichment workers
        dead_auto_enrichment_workers = []
        for i, worker_info in enumerate(self.auto_enrichment_workers):
            task = worker_info["task"]
            if task.done():
                dead_auto_enrichment_workers.append(i)
        
        # Remove dead workers (in reverse order to maintain indices)
        for i in reversed(dead_auto_enrichment_workers):
            logger.warning("Found dead auto enrichment worker, removing", worker_index=i)
            await self._stop_auto_enrichment_worker(i)
            
        # Check embedding workers
        dead_embedding_workers = []
        for i, worker_info in enumerate(self.embedding_workers):
            task = worker_info["task"]
            if task.done():
                dead_embedding_workers.append(i)
        
        # Remove dead workers (in reverse order to maintain indices)
        for i in reversed(dead_embedding_workers):
            logger.warning("Found dead embedding worker, removing", worker_index=i)
            await self._stop_embedding_worker(i)

    async def shutdown(self):
        """Shutdown all workers"""
        if not self._initialized:
            return
            
        logger.info("Shutting down worker manager",
                   chat_workers_count=len(self.chat_workers),
                   connection_workers_count=len(self.connection_workers),
                   enrichment_workers_count=len(self.enrichment_workers),
                   auto_enrichment_workers_count=len(self.auto_enrichment_workers),
                   embedding_workers_count=len(self.embedding_workers))
        
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
            
        # Stop all enrichment workers
        for i in range(len(self.enrichment_workers) - 1, -1, -1):
            await self._stop_enrichment_worker(i)
            
        # Stop all auto enrichment workers
        for i in range(len(self.auto_enrichment_workers) - 1, -1, -1):
            await self._stop_auto_enrichment_worker(i)
            
        # Stop all embedding workers
        for i in range(len(self.embedding_workers) - 1, -1, -1):
            await self._stop_embedding_worker(i)
        
        self.chat_workers = []
        self.connection_workers = []
        self.enrichment_workers = []
        self.auto_enrichment_workers = []
        self.embedding_workers = []
        self._initialized = False
        logger.info("Worker manager shutdown complete",
                   final_chat_workers_count=len(self.chat_workers),
                   final_connection_workers_count=len(self.connection_workers),
                   final_enrichment_workers_count=len(self.enrichment_workers),
                   final_auto_enrichment_workers_count=len(self.auto_enrichment_workers),
                   final_embedding_workers_count=len(self.embedding_workers))
    
    def get_status(self) -> Dict[str, Any]:
        """Get status information about workers"""
        return {
            "initialized": self._initialized,
            "chat_worker_count": len(self.chat_workers),
            "connection_worker_count": len(self.connection_workers),
            "enrichment_worker_count": len(self.enrichment_workers),
            "auto_enrichment_worker_count": len(self.auto_enrichment_workers),
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
            ],
            "enrichment_workers": [
                {
                    "id": w["worker"].worker_id,
                    "running": w["worker"].running,
                    "current_task": w["worker"].current_task["file_id"] if w["worker"].current_task else None
                }
                for w in self.enrichment_workers
            ],
            "auto_enrichment_workers": [
                {
                    "id": w["worker"].worker_id,
                    "running": w["worker"].running,
                    "current_task": w["worker"].current_task["task_id"] if w["worker"].current_task else None
                }
                for w in self.auto_enrichment_workers
            ]
        }

# Singleton instance
worker_manager = WorkerManager()

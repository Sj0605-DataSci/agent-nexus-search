#!/usr/bin/env python3
"""
Dedicated worker startup script for background processing
This runs separately from the web application
"""
import asyncio
import signal
import sys
import logging
from app.core.worker_manager import worker_manager
from app.core.structured_logger import get_structured_logger

logger = get_structured_logger(__name__)

class WorkerProcess:
    def __init__(self):
        self.shutdown_event = asyncio.Event()
        
    async def start(self):
        """Start the worker process"""
        logger.info("Starting dedicated worker process")
        
        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        try:
            # Initialize worker manager
            await worker_manager.initialize()
            logger.info("Worker manager initialized successfully")
            
            # Wait for shutdown signal
            await self.shutdown_event.wait()
            
        except Exception as e:
            logger.error(f"Error in worker process: {str(e)}")
            raise
        finally:
            # Cleanup
            await worker_manager.shutdown()
            logger.info("Worker process shutdown complete")
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"Received signal {signum}, initiating shutdown")
        self.shutdown_event.set()

async def main():
    """Main entry point for worker process"""
    worker_process = WorkerProcess()
    try:
        await worker_process.start()
    except KeyboardInterrupt:
        logger.info("Worker process interrupted by user")
    except Exception as e:
        logger.error(f"Worker process failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())

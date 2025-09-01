#!/usr/bin/env python3
import os
import signal
import sys
import logging
import traceback
from logging.handlers import RotatingFileHandler

def setup_logging():
    """Set up logging configuration"""
    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    # Configure root logger
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    # File handler with rotation
    file_handler = RotatingFileHandler(
        os.path.join(log_dir, 'app.log'),
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ))
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s'
    )
    )
    
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger

def handle_exception(exc_type, exc_value, exc_traceback):
    """Handle uncaught exceptions"""
    if issubclass(exc_type, KeyboardInterrupt):
        sys.__excepthook__(exc_type, exc_value, exc_traceback)
        return
    
    logger = logging.getLogger()
    logger.critical("Uncaught exception", exc_info=(exc_type, exc_value, exc_traceback))

# Set up logging and exception handling
logger = setup_logging()
sys.excepthook = handle_exception

def run_development():
    """Run development server with Gunicorn + UvicornWorker"""
    try:
        logger.info("Starting development server...")
        
        # Set environment variables for memory optimization
        os.environ.setdefault("MALLOC_ARENA_MAX", "2")
        os.environ.setdefault("PYTHONUNBUFFERED", "1")
        os.environ.setdefault("PYTHONDONTWRITEBYTECODE", "1")
        os.environ.setdefault("PYTHONHASHSEED", "random")
        os.environ.setdefault("WEB_CONCURRENCY", "1")  # Reduced to 1 worker for debugging
        
        # Gunicorn command matching Dockerfile
        cmd = [
            "gunicorn",
            "--log-level=debug",  # Enable debug logging
            "--capture-output",   # Capture stdout/stderr in logs
            "--enable-stdio-inheritance",
            "--preload",          # Preload the application before forking workers
            "--worker-class", "uvicorn.workers.UvicornWorker",
            "--workers", "1",     # Start with 1 worker for debugging
            "--bind", "0.0.0.0:8000",
            "--timeout", "3600",
            "--graceful-timeout", "300",
            "--worker-tmp-dir", "/tmp",
            "--reload",
            "--access-logfile", "-",
            "--error-logfile", "-",
            "app.main:app"
        ]
        
        logger.info(f"Starting server with command: {' '.join(cmd)}")
        logger.info(f"Server will be available at: http://0.0.0.0:8000")
        logger.info("Press Ctrl+C to stop the server")
        
        try:
            import subprocess
            process = subprocess.Popen(cmd)
            process.wait()
        except KeyboardInterrupt:
            logger.info("\nServer stopped by user")
            if process:
                process.terminate()
        except subprocess.CalledProcessError as e:
            logger.error(f"Error running server: {e}")
            logger.error(f"Command output: {e.output if hasattr(e, 'output') else 'No output'}")
            sys.exit(1)
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            logger.error(traceback.format_exc())
            sys.exit(1)
            
    except Exception as e:
        logger.critical(f"Fatal error in run_development: {str(e)}")
        logger.critical(traceback.format_exc())
        sys.exit(1)

def run_simple():
    """Run simple uvicorn server (fallback)"""
    import uvicorn
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        loop="uvloop",
        http="httptools"
    )

if __name__ == "__main__":
    try:
        # Check if gunicorn is available
        try:
            import gunicorn
            run_development()
        except ImportError:
            logger.info("Gunicorn not found, falling back to simple uvicorn server...")
            run_simple()
    except Exception as e:
        logger.critical(f"Unhandled exception in main: {str(e)}")
        logger.critical(traceback.format_exc())
        sys.exit(1)
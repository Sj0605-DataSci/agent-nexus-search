#!/usr/bin/env python3
import os
import signal
import sys
import logging
import traceback
import argparse
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
        
        # Hardcoded to 1 worker for minimal memory usage
        num_workers = "1"
        
        # Set environment variables for memory optimization
        os.environ.setdefault("MALLOC_ARENA_MAX", "2")
        os.environ.setdefault("PYTHONUNBUFFERED", "1")
        os.environ.setdefault("PYTHONDONTWRITEBYTECODE", "1")
        os.environ.setdefault("PYTHONHASHSEED", "random")
        
        # Gunicorn command with memory leak prevention
        cmd = [
            "gunicorn",
            "--log-level=info",   # Reduced from debug to info for less overhead
            "--capture-output",   # Capture stdout/stderr in logs
            "--enable-stdio-inheritance",
            "--worker-class", "uvicorn.workers.UvicornWorker",
            "--workers", num_workers,  # Configurable worker count
            "--bind", "0.0.0.0:8000",
            "--timeout", "1200",  # 20 minutes timeout
            "--graceful-timeout", "30",
            "--worker-tmp-dir", "/tmp",      # Use /tmp on macOS
            "--max-requests", "500",         # Allow 500 requests before restart (reduced for memory)
            "--max-requests-jitter", "50",   # Jitter for restart timing
            "--worker-connections", "500",   # Limit connections per worker (reduced for memory)
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
    """Run simple uvicorn server with single worker (ideal for ngrok)"""
    try:
        import uvicorn
        logger.info("Starting simple uvicorn server (single worker)...")
        logger.info("This mode is ideal for ngrok tunneling")
        logger.info("Server will be available at: http://0.0.0.0:8000")
        logger.info("Press Ctrl+C to stop the server")
        
        uvicorn.run(
            "app.main:app", 
            host="0.0.0.0", 
            port=8000, 
            reload=True,
            loop="uvloop",
            http="httptools",
            log_level="info"
        )
    except KeyboardInterrupt:
        logger.info("\nServer stopped by user")
    except Exception as e:
        logger.error(f"Error running simple server: {str(e)}")
        logger.error(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    # Parse command-line arguments
    parser = argparse.ArgumentParser(
        description='Run FastAPI development server',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run.py                    # Auto-detect (gunicorn if available, else uvicorn)
  python run.py --simple           # Single worker with uvicorn (for ngrok)
  python run.py --gunicorn         # Single worker with gunicorn (minimal memory)
  python run.py --workers 1        # Custom number of workers (default: 1)
        """
    )
    
    parser.add_argument(
        '--simple',
        action='store_true',
        help='Run with single worker using uvicorn (ideal for ngrok testing)'
    )
    
    parser.add_argument(
        '--gunicorn',
        action='store_true',
        help='Force use of gunicorn with multiple workers'
    )
    
    parser.add_argument(
        '--workers',
        type=int,
        default=1,
        help='Number of gunicorn workers (default: 1)'
    )
    
    args = parser.parse_args()
    
    try:
        if args.simple:
            # User explicitly wants simple single-worker mode
            logger.info("Running in SIMPLE mode (single worker)")
            run_simple()
        elif args.gunicorn:
            # User explicitly wants gunicorn
            try:
                import gunicorn
                logger.info(f"Running in GUNICORN mode ({args.workers} workers)")
                # Update worker count if custom value provided
                if args.workers != 1:
                    os.environ["WEB_CONCURRENCY"] = str(args.workers)
                run_development()
            except ImportError:
                logger.error("Gunicorn not installed. Install with: pip install gunicorn")
                logger.info("Falling back to simple uvicorn server...")
                run_simple()
        else:
            # Auto-detect mode (default behavior)
            try:
                import gunicorn
                logger.info(f"Auto-detected gunicorn. Running with 1 worker for minimal memory")
                logger.info("Tip: Use --simple flag for single worker mode (better for ngrok)")
                run_development()
            except ImportError:
                logger.info("Gunicorn not found, using simple uvicorn server...")
                run_simple()
    except Exception as e:
        logger.critical(f"Unhandled exception in main: {str(e)}")
        logger.critical(traceback.format_exc())
        sys.exit(1)
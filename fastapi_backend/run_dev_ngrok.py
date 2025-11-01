#!/usr/bin/env python3
"""
Development server with ngrok support - uses single worker to avoid conflicts
"""
import os
import sys
import logging

def setup_logging():
    """Set up logging configuration"""
    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    return logging.getLogger()

logger = setup_logging()

def run_with_ngrok():
    """Run development server with single worker for ngrok compatibility"""
    try:
        logger.info("Starting development server with ngrok support (single worker)...")
        
        # Set environment variables
        os.environ.setdefault("ENABLE_NGROK", "true")
        os.environ.setdefault("PYTHONUNBUFFERED", "1")
        
        # Use uvicorn directly with single worker for ngrok compatibility
        import uvicorn
        
        logger.info("Starting server on http://0.0.0.0:8000")
        logger.info("Ngrok tunnel will be created automatically")
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
        logger.error(f"Error running server: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    run_with_ngrok()

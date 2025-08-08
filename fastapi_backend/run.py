import os
import subprocess
import sys

def run_development():
    """Run development server with Gunicorn + UvicornWorker"""
    # Set environment variables for memory optimization
    os.environ.setdefault("MALLOC_ARENA_MAX", "2")
    os.environ.setdefault("PYTHONUNBUFFERED", "1")
    os.environ.setdefault("WEB_CONCURRENCY", "2")
    
    # Gunicorn command matching Dockerfile
    cmd = [
        "gunicorn",
        "app.main:app",
        "-w", os.environ.get("WEB_CONCURRENCY", "2"),
        "-k", "uvicorn.workers.UvicornWorker",
        "--bind", "0.0.0.0:8000",
        "--max-requests", "1000",
        "--max-requests-jitter", "100",
        "--preload",
        "--reload",  # Enable reload for development
        "--access-logfile", "-",  # Log to stdout
        "--error-logfile", "-"    # Log errors to stdout
    ]
    
    print("Starting development server with Gunicorn + UvicornWorker...")
    print(f"Command: {' '.join(cmd)}")
    print("Server will be available at: http://0.0.0.0:8000")
    print("Press Ctrl+C to stop the server")
    
    try:
        subprocess.run(cmd, check=True)
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"Error running server: {e}")
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
    # Check if gunicorn is available
    try:
        import gunicorn
        run_development()
    except ImportError:
        print("Gunicorn not found, falling back to simple uvicorn server...")
        run_simple()

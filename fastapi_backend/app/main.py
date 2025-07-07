import logging
import os
import gc
from fastapi import FastAPI, Request, Response, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import traceback
from typing import Callable, Union
from app.db.clients import get_async_supabase_client
from fastapi.responses import JSONResponse
from fastapi.middleware.gzip import GZipMiddleware
from app.db.redis_client import redis_client

from app.models.schemas import StandardResponse, StandardJSONResponse

from app.api.routes import agent_templates, hired_agents, profiles, auth, chat, worker_status, connections_processing
from app.core.config import settings
from app.core.memory import log_memory_usage, force_garbage_collection, take_memory_snapshot

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="FastAPI backend for Agent Search application",
    version="0.1.0",
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "https://www.discoverminds.ai", "https://www.discoverminds.ai/"],  # Include localhost development URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Add Gzip compression middleware
app.add_middleware(
    GZipMiddleware,
    minimum_size=1000  # Only compress responses larger than 1KB
)

# Custom exception handlers to convert exceptions to StandardResponse format
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.error(f"HTTP Exception: {exc.detail}")
    return StandardJSONResponse(StandardResponse(
        success=False,
        status_code=exc.status_code,
        message=str(exc.detail),
        data=None
    ))

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation Error: {exc.errors()}")
    return StandardJSONResponse(StandardResponse(
        success=False,
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        message="Validation error",
        data=exc.errors()
    ))

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error(f"Database Error: {str(exc)}")
    logger.error(traceback.format_exc())
    return StandardJSONResponse(StandardResponse(
        success=False,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        message="Database error",
        data=str(exc)
    ))

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unexpected Error: {str(exc)}")
    logger.error(traceback.format_exc())
    return StandardJSONResponse(StandardResponse(
        success=False,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        message="An unexpected error occurred",
        data=str(exc)
    ))

# Include routers
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(agent_templates.router, prefix="/api", tags=["agent_templates"])
app.include_router(hired_agents.router, prefix="/api", tags=["hired_agents"])
app.include_router(profiles.router, prefix="/api", tags=["profiles"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(worker_status.router, prefix="/api", tags=["worker"])
app.include_router(connections_processing.router, prefix="/api", tags=["connections_processing"])

@app.get("/")
async def root():
    return {"message": "Welcome to Agent Search API"}

# Redis client initialization
@app.on_event("startup")
async def startup_db_client():
    """Initialize database client on startup"""
    try:
        # Log initial memory state
        logger.info("Application starting up - Initial memory state:")
        log_memory_usage("Startup memory")
        take_memory_snapshot("startup")
        
        # Set garbage collection thresholds for more aggressive collection
        # Default is (700, 10, 10) - lower numbers mean more frequent collection
        old_thresholds = gc.get_threshold()
        gc.set_threshold(500, 10, 10)
        logger.info(f"GC thresholds changed from {old_thresholds} to {gc.get_threshold()}")
        
        # Initialize the Supabase client
        client = await get_async_supabase_client()
        logger.info("Supabase client initialized")
        
        # Initialize Redis client
        await redis_client.initialize(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD,
            url=settings.REDIS_URL if settings.REDIS_URL else None
        )
        logger.info("Redis client initialized")
        
        # Initialize worker manager for background processing
        from app.core.worker_manager import worker_manager
        # Worker manager is configured to use 1 worker for Railway free tier
        await worker_manager.initialize()
        logger.info("Worker manager initialized")
        
        # Log memory after initialization
        log_memory_usage("After client initialization")
    except Exception as e:
        logger.error(f"Error initializing database client: {str(e)}")
        # Don't crash the app, but log the error allow app to start even if Redis is not available

@app.on_event("shutdown")
async def shutdown_db_client():
    """Cleanup on shutdown"""
    try:
        # Log memory state before shutdown
        logger.info("Application shutting down - Memory state:")
        log_memory_usage("Shutdown memory")
        take_memory_snapshot("shutdown")
        
        # Shutdown worker manager
        try:
            from app.core.worker_manager import worker_manager
            await worker_manager.shutdown()
            logger.info("Worker manager shutdown complete")
        except Exception as worker_error:
            logger.error(f"Error shutting down worker manager: {str(worker_error)}")
        
        # Force garbage collection to free up memory
        force_garbage_collection()
        
        # Log memory after garbage collection
        log_memory_usage("After garbage collection")
    except Exception as e:
        logger.error(f"Error during shutdown: {str(e)}")

@app.get("/health")
async def health():
    try:
        # Check Supabase connection
        supabase = await get_async_supabase_client()
        # Try a simple query to verify connection
        response = await supabase.from_("profiles").select("count", count="exact").limit(1).execute()
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "healthy",
                "message": "Agent Search API is healthy",
                "database": "connected"
            }
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "message": "Agent Search API is unhealthy",
                "database": "disconnected",
                "error": str(e)
            }
        )
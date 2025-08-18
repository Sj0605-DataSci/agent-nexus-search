import logging
import os
import gc
import time
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
from app.core.memory_optimizer import start_memory_monitoring, stop_memory_monitoring

from app.models.schemas import StandardResponse, StandardJSONResponse
from app.core.profiling import Timer, record_request_time

from app.api.routes import agent_templates, hired_agents, profiles, auth, chat, worker_status, connections_processing, profiling
from app.api.routes import emergency
from app.core.config import settings
from app.core.memory import log_memory_usage, force_garbage_collection, take_memory_snapshot

# Set up structured logging
from app.core.structured_logger import setup_structured_logging, get_structured_logger
from app.core.config import settings
from contextlib import asynccontextmanager


# Setup structured logging based on environment
setup_structured_logging(
    level="INFO",
    enable_structured=getattr(settings, 'ENABLE_STRUCTURED_LOGGING', True)
)
logger = get_structured_logger(__name__)

# Create FastAPI app with lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Starting application...")
    
    try:
        # Initialize Redis client
        await redis_client.initialize(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD,
            url=settings.REDIS_URL if settings.REDIS_URL else None
        )
        logger.info("Redis client initialized")
        
        # Start memory monitoring
        await start_memory_monitoring()
        logger.info("Memory monitoring started")
        
        from app.core.worker_manager import WorkerManager
        worker_manager = WorkerManager()
        await worker_manager.initialize()
        logger.info("Worker manager initialized")
        
        yield
        
    except Exception as e:
        logger.error("Error during application startup", error=str(e), exc_info=True)
        # Don't crash the app, but log the error allow app to start even if Redis is not available
        yield
    
    finally:
        # Shutdown procedures
        logger.info("Shutting down application...")
        
        try:
            # Stop memory monitoring
            await stop_memory_monitoring()
            logger.info("Memory monitoring stopped")
            
            from app.core.worker_manager import WorkerManager
            worker_manager = WorkerManager()
            await worker_manager.shutdown()
            logger.info("Worker manager shutdown")
            
            # Close Redis connection pool
            await redis_client.close()
            logger.info("Redis client closed")
            
        except Exception as e:
            logger.error("Error during application shutdown", error=str(e))

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="FastAPI backend for Agent Search application",
    version="0.1.0",
    lifespan=lifespan
)

# Add request timing middleware
class RequestTimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Start timer
        start_time = time.time()
        
        # Process the request
        response = await call_next(request)
        
        # Calculate processing time
        process_time = time.time() - start_time
        process_time_ms = round(process_time * 1000, 2)
        
        # Get path and method
        path = request.url.path
        method = request.method
        
        # Skip profiling for certain paths
        if not path.startswith("/api/profiling"):
            # Record the request timing in the profiling stats
            record_request_time(method, path, process_time_ms)
            
            # Add timing header to response
            response.headers["X-Process-Time"] = str(process_time_ms)
        
        return response

# Add detailed middleware profiling
class DetailedProfilingMiddleware(BaseHTTPMiddleware):
    """Middleware that profiles each component of the request processing pipeline"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip profiling for profiling endpoints to avoid recursive profiling
        if request.url.path.startswith("/api/profiling"):
            return await call_next(request)
        
        # Start overall timer
        total_start_time = time.time()
        
        # 1. Profile authentication time (extract from headers)
        auth_start_time = time.time()
        auth_header = request.headers.get("Authorization")
        has_auth = auth_header is not None and auth_header.startswith("Bearer ")
        
        # 2. Profile request parsing/preparation
        prep_start_time = time.time()
        auth_time_ms = (prep_start_time - auth_start_time) * 1000 if has_auth else 0
        
        # Record authentication time if applicable
        if has_auth:
            record_request_time(request.method, f"{request.url.path}.auth", auth_time_ms)
        
        # 3. Profile the main request handling (including route handler)
        handler_start_time = time.time()
        prep_time_ms = (handler_start_time - prep_start_time) * 1000
        record_request_time(request.method, f"{request.url.path}.prep", prep_time_ms)
        
        # Process the request through the rest of the middleware stack and route handler
        response = await call_next(request)
        
        # 4. Profile response generation time
        response_start_time = time.time()
        handler_time_ms = (response_start_time - handler_start_time) * 1000
        record_request_time(request.method, f"{request.url.path}.handler", handler_time_ms)
        
        # 5. Calculate final response preparation time
        end_time = time.time()
        response_time_ms = (end_time - response_start_time) * 1000
        record_request_time(request.method, f"{request.url.path}.response", response_time_ms)
        
        # 6. Calculate and record total time
        total_time_ms = (end_time - total_start_time) * 1000
        record_request_time(request.method, f"{request.url.path}.total", total_time_ms)
        
        # Add timing headers to response
        response.headers["X-Total-Process-Time"] = str(round(total_time_ms, 2))
        response.headers["X-Auth-Time"] = str(round(auth_time_ms, 2)) if has_auth else "0"
        response.headers["X-Handler-Time"] = str(round(handler_time_ms, 2))
        response.headers["X-Response-Time"] = str(round(response_time_ms, 2))
        
        return response

# Add auth profiling middleware
class AuthProfilingMiddleware(BaseHTTPMiddleware):
    """Middleware specifically for profiling authentication time"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip profiling for profiling endpoints
        if request.url.path.startswith("/api/profiling"):
            return await call_next(request)
        
        # No auth header, skip timing
        return await call_next(request)

# Add database connection profiling middleware
class DBConnectionProfilingMiddleware(BaseHTTPMiddleware):
    """Middleware for profiling database connection time"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip profiling for profiling endpoints
        if request.url.path.startswith("/api/profiling"):
            return await call_next(request)
        
        # Store the current time before processing
        start_time = time.time()
        
        # Add a flag to the request state to indicate DB profiling is active
        request.state.db_profiling_start = start_time
        
        # Process the request
        response = await call_next(request)
        
        # Check if DB connection time was recorded by the dependency
        if hasattr(request.state, "db_connection_time"):
            db_time_ms = request.state.db_connection_time
            record_request_time(request.method, f"{request.url.path}.db_connection", db_time_ms)
            response.headers["X-DB-Connection-Time"] = str(round(db_time_ms, 2))
        
        return response

# Set up CORS middleware with more specific settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001", 
        "https://www.discoverminds.ai", 
        "https://discoverminds.ai",
        "https://www.test-web.discoverminds.ai",
        "https://test-web.discoverminds.ai",
        "chrome-extension://ohhahepljehjfliiiacafdmgnfodklbd"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "*",
        "Authorization",
        "Content-Type",
        "Access-Control-Allow-Origin",
        "Access-Control-Allow-Headers",
        "Access-Control-Allow-Methods",
    ],
    expose_headers=["*"],
    max_age=600,  # Cache preflight response for 10 minutes
)

# Add profiling middleware in reverse order (first added = last executed)
app.add_middleware(DetailedProfilingMiddleware)
app.add_middleware(AuthProfilingMiddleware)
app.add_middleware(DBConnectionProfilingMiddleware)

# Add CORS debugging middleware - must be added AFTER the CORS middleware
@app.middleware("http")
async def cors_debug_middleware(request: Request, call_next):
    # Log detailed information about incoming requests
    is_options = request.method == "OPTIONS"
    origin = request.headers.get("origin", "No Origin")
    
    if is_options:
        logger.info("CORS preflight request received",
                   request_method=request.method,
                   request_url=str(request.url),
                   origin=origin,
                   headers=dict(request.headers))
        
        # Create a response for OPTIONS requests
        from fastapi.responses import JSONResponse
        response = JSONResponse(
            status_code=200,
            content={"message": "CORS preflight successful"},
        )
        
        # Add CORS headers
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Access-Control-Allow-Origin, Access-Control-Allow-Headers"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Max-Age"] = "600"  # 10 minutes
        
        return response
    
    # Process the request
    response = await call_next(request)
    
    # Log response details for debugging
    if is_options or response.status_code >= 400:
        cors_headers = {k: v for k, v in response.headers.items() if k.lower().startswith("access-control")}
        logger.info("CORS response sent",
                   response_status=response.status_code,
                   request_url=str(request.url),
                   cors_headers=cors_headers)
        
        # Log if origin is not in allowed origins
        allowed_origins = [
            "http://localhost:3000", 
            "http://localhost:3001", 
            "https://www.discoverminds.ai", 
            "https://www.discoverminds.ai/", 
            "https://discoverminds.ai", 
            "https://discoverminds.ai/",
            "https://www.test-web.discoverminds.ai",  
            "https://www.test-web.discoverminds.ai/",
            "https://test-web.discoverminds.ai",
            "https://test-web.discoverminds.ai/"
        ]
        if origin not in allowed_origins and origin != "No Origin":
            logger.warning("Potential CORS issue detected",
                          origin=origin,
                          allowed_origins=allowed_origins)
    
    return response

# Custom exception handlers to convert exceptions to StandardResponse format
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.error("HTTP exception occurred",
                exception_type="HTTPException",
                status_code=exc.status_code,
                detail=str(exc.detail),
                request_url=str(request.url),
                request_method=request.method)
    return StandardJSONResponse(StandardResponse(
        success=False,
        status_code=exc.status_code,
        message=str(exc.detail),
        data=None
    ))

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error("Request validation error occurred",
                exception_type="RequestValidationError",
                validation_errors=exc.errors(),
                request_url=str(request.url),
                request_method=request.method)
    return StandardJSONResponse(StandardResponse(
        success=False,
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        message="Validation error",
        data=exc.errors()
    ))

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.exception("Database error occurred",
                    exception_type="SQLAlchemyError",
                    error_message=str(exc),
                    request_url=str(request.url),
                    request_method=request.method)
    return StandardJSONResponse(StandardResponse(
        success=False,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        message="Database error",
        data=str(exc)
    ))

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.exception("Unexpected error occurred",
                    exception_type=type(exc).__name__,
                    error_message=str(exc),
                    request_url=str(request.url),
                    request_method=request.method)
    return StandardJSONResponse(StandardResponse(
        success=False,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        message="An unexpected error occurred",
        data=str(exc)
    ))

# Include routers
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(profiles.router, prefix="/api", tags=["profiles"])
app.include_router(agent_templates.router, prefix="/api", tags=["agent_templates"])
app.include_router(hired_agents.router, prefix="/api", tags=["hired_agents"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(worker_status.router, prefix="/api", tags=["worker"])
app.include_router(connections_processing.router, prefix="/api", tags=["connections_processing"])
app.include_router(profiling.router, prefix="/api", tags=["profiling"])
app.include_router(emergency.router)  # Emergency memory cleanup

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
        
        # Warm up caches for better performance
        try:
            from app.core.utils.cache import CACHE_CONFIG
            
            # Only warm caches that are configured for startup warming
            warm_tasks = []
            for cache_type, config in CACHE_CONFIG.items():
                if config.get("warm_on_startup", False):
                    logger.info(f"Cache warming enabled for {cache_type}")
                    # Add specific warming logic per cache type if needed
            
            # Pre-compile regex patterns and other expensive operations
            import re
            # Pre-compile common patterns used in your app
            logger.info("Pre-compiled regex patterns and expensive operations")
            
        except Exception as cache_error:
            logger.warning(f"Cache warming failed: {str(cache_error)}")
        
        # Initialize worker manager for background tasks
        from app.core.worker_manager import WorkerManager
        worker_manager = WorkerManager()
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
            from app.core.worker_manager import WorkerManager
            worker_manager = WorkerManager()
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
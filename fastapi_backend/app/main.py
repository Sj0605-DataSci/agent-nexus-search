from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import traceback

from app.api.routes import agent_templates, hired_agents, profiles, auth, chat
from app.core.config import settings
from app.core.exceptions import validation_exception_handler, sqlalchemy_exception_handler, general_exception_handler

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Custom middleware to log redirects and other responses
class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Log request details
        logger.info(f"Request: {request.method} {request.url.path} - Headers: {request.headers}")
        
        # Process the request and get the response
        try:
            response = await call_next(request)
            
            # Log detailed information for redirects
            if 300 <= response.status_code < 400:
                logger.warning(f"REDIRECT {response.status_code} detected for {request.method} {request.url.path}")
                logger.warning(f"Redirect location: {response.headers.get('location', 'No location header')}")
                logger.warning(f"Request headers: {request.headers}")
                logger.warning(f"Response headers: {response.headers}")
                
                # Log the stack trace to see where the redirect is coming from
                logger.warning(f"Redirect stack trace: {traceback.format_stack()}")
            
            # Log response status for all requests
            logger.info(f"Response: {request.method} {request.url.path} - Status: {response.status_code}")
            
            return response
        except Exception as e:
            logger.error(f"Error processing request {request.method} {request.url.path}: {str(e)}")
            logger.error(traceback.format_exc())
            raise

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="FastAPI backend for Agent Search application",
    version="0.1.0",
)

# Add logging middleware first (before CORS) to capture all requests and responses
app.add_middleware(LoggingMiddleware)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],  # Include localhost development URLs
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
    expose_headers=["Content-Type"],
    max_age=600,  # Cache preflight requests for 10 minutes
)

# Set up exception handlers
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# Include routers
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(agent_templates.router, prefix="/api", tags=["agent_templates"])
app.include_router(hired_agents.router, prefix="/api", tags=["hired_agents"])
app.include_router(profiles.router, prefix="/api", tags=["profiles"])
app.include_router(chat.router, prefix="/api", tags=["chat"])

@app.get("/")
async def root():
    return {"message": "Welcome to Agent Search API"}

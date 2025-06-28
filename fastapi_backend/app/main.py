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

from app.models.schemas import StandardResponse, StandardJSONResponse

from app.api.routes import agent_templates, hired_agents, profiles, auth, chat
from app.core.config import settings

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
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*", "https://www.discoverminds.ai"],  # Include localhost development URLs
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
    expose_headers=["Content-Type"],
    max_age=600,  # Cache preflight requests for 10 minutes
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

@app.get("/")
async def root():
    return {"message": "Welcome to Agent Search API"}

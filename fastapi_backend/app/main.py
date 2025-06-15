from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
import logging

from app.api.routes import agent_templates, hired_agents, profiles, auth
from app.core.config import settings
from app.core.exceptions import validation_exception_handler, sqlalchemy_exception_handler, general_exception_handler

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
    allow_origins=["*"],  # Allow all origins for now, can be restricted later
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

@app.get("/")
async def root():
    return {"message": "Welcome to Agent Search API"}

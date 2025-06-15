from typing import List
from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Agent Search API"
    API_V1_STR: str = "/api"
    
    # Database settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/agent_search")
    
    # Supabase settings
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://wznveojncixcptajnjom.supabase.co")
    SUPABASE_PROJECT_ID: str = os.getenv("SUPABASE_PROJECT_ID", "wznveojncixcptajnjom")
    SUPABASE_JWT_SECRET: str = os.getenv(
        "SUPABASE_JWT_SECRET", 
        # This is a placeholder - you should set the actual JWT secret in .env file
        "your-supabase-jwt-secret"
    )
    
    # JWT settings
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    SUPABASE_JWT_EXPIRY: int = int(os.getenv("SUPABASE_JWT_EXPIRY", "3600"))
    
    # CORS settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",  # Next.js frontend
        "http://localhost:5173",  # Vite frontend (default port)
        "http://localhost:8000",  # FastAPI backend (for development)
    ]

    class Config:
        case_sensitive = True


settings = Settings()

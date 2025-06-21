from typing import List
from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Agent Search API"
    API_V1_STR: str = "/api"
    
    # Database settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # Supabase settings
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_PROJECT_ID: str = os.getenv("SUPABASE_PROJECT_ID", "")
    SUPABASE_JWT_SECRET: str = os.getenv(
        "SUPABASE_JWT_SECRET", 
        ""
    )
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")

    # OpenRouter settings
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")

    USER: str = os.getenv("user", "")
    PASSWORD: str = os.getenv("password", "")
    HOST: str = os.getenv("host", "")
    PORT: str = os.getenv("port", "")
    DBNAME: str = os.getenv("dbname", "")

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

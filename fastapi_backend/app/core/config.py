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

    # Supabase settings
    SUPABASE_USER: str = os.getenv("SUPABASE_USER", "")
    SUPABASE_PASSWORD: str = os.getenv("SUPABASE_PASSWORD", "")
    SUPABASE_HOST: str = os.getenv("SUPABASE_HOST", "")
    SUPABASE_PORT: str = os.getenv("SUPABASE_PORT", "")
    SUPABASE_DBNAME: str = os.getenv("SUPABASE_DBNAME", "")

    # JWT settings
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    SUPABASE_JWT_EXPIRY: int = int(os.getenv("SUPABASE_JWT_EXPIRY", "3600"))
    TAVILY_API_KEY: str = os.getenv("TAVILY_API_KEY", "")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    # Use Railway Redis environment variables if available
    REDIS_HOST: str = os.getenv("REDISHOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDISPORT", "6379"))
    REDIS_PASSWORD: str = os.getenv("REDISPASSWORD", "password")
    REDIS_URL: str = os.getenv("REDIS_URL", "")

    class Config:
        case_sensitive = True


settings = Settings()

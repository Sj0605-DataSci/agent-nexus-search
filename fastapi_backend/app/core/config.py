from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

load_dotenv()

# Determine environment
ENVIRONMENT = os.getenv("ENVIRONMENT")

class Settings(BaseSettings):
    PROJECT_NAME: str = "Agent Search API"
    API_V1_STR: str = "/api"
    
    # Environment
    ENVIRONMENT: str = ENVIRONMENT
    
    # Database settings
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # Supabase settings - dynamically select based on environment
    @property
    def SUPABASE_URL(self) -> str:
        return os.getenv("STAGING_SUPABASE_URL", "") if ENVIRONMENT == "STAGING" else os.getenv("SUPABASE_URL", "")
    
    @property
    def SUPABASE_PROJECT_ID(self) -> str:
        return os.getenv("STAGING_SUPABASE_PROJECT_ID", "") if ENVIRONMENT == "STAGING" else os.getenv("SUPABASE_PROJECT_ID", "")
    
    @property
    def SUPABASE_JWT_SECRET(self) -> str:
        return os.getenv("STAGING_SUPABASE_JWT_SECRET", "") if ENVIRONMENT == "STAGING" else os.getenv("SUPABASE_JWT_SECRET", "")
    
    @property
    def SUPABASE_ANON_KEY(self) -> str:
        return os.getenv("STAGING_SUPABASE_ANON_KEY", "") if ENVIRONMENT == "STAGING" else os.getenv("SUPABASE_ANON_KEY", "")
    
    # OpenRouter settings
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")

    # Supabase database connection settings
    @property
    def SUPABASE_USER(self) -> str:
        return os.getenv("STAGING_SUPABASE_USER", "") if ENVIRONMENT == "STAGING" else os.getenv("SUPABASE_USER", "")
    
    @property
    def SUPABASE_PASSWORD(self) -> str:
        return os.getenv("STAGING_SUPABASE_PASSWORD", "") if ENVIRONMENT == "STAGING" else os.getenv("SUPABASE_PASSWORD", "")
    
    @property
    def SUPABASE_HOST(self) -> str:
        return os.getenv("STAGING_SUPABASE_HOST", "") if ENVIRONMENT == "STAGING" else os.getenv("SUPABASE_HOST", "")
    
    @property
    def SUPABASE_PORT(self) -> str:
        return os.getenv("STAGING_SUPABASE_PORT", "") if ENVIRONMENT == "STAGING" else os.getenv("SUPABASE_PORT", "")
    
    @property
    def SUPABASE_DBNAME(self) -> str:
        return os.getenv("STAGING_SUPABASE_DBNAME", "") if ENVIRONMENT == "STAGING" else os.getenv("SUPABASE_DBNAME", "")

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
    WANDB_API_KEY: str = os.getenv("WANDB_API_KEY", "")
    
    # Logging settings
    ENABLE_STRUCTURED_LOGGING: bool = os.getenv("ENABLE_STRUCTURED_LOGGING", "true").lower() == "true"

    class Config:
        case_sensitive = True


settings = Settings()

from pydantic_settings import BaseSettings
from pydantic import Field
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
    def FRONTEND_URL(self) -> str:
        return os.getenv("STAGING_FRONTEND_URL", "") if ENVIRONMENT == "STAGING" else os.getenv("FRONTEND_URL", "")    

    @property
    def RESET_PASSWORD_FRONTEND_URL(self) -> str:
        return os.getenv("STAGING_RESET_PASSWORD_FRONTEND_URL", "") if ENVIRONMENT == "STAGING" else os.getenv("RESET_PASSWORD_FRONTEND_URL", "")    
    
    @property
    def SUPABASE_PROJECT_ID(self) -> str:
        return os.getenv("STAGING_SUPABASE_PROJECT_ID", "") if ENVIRONMENT == "STAGING" else os.getenv("SUPABASE_PROJECT_ID", "")
    
    @property
    def SUPABASE_JWT_SECRET(self) -> str:
        return os.getenv("STAGING_SUPABASE_JWT_SECRET", "") if ENVIRONMENT == "STAGING" else os.getenv("SUPABASE_JWT_SECRET", "")
    
    @property
    def SUPABASE_ANON_KEY(self) -> str:
        return os.getenv("STAGING_SUPABASE_ANON_KEY", "") if ENVIRONMENT == "STAGING" else os.getenv("SUPABASE_ANON_KEY", "")
    
    @property
    def SUPABASE_SERVICE_ROLE_KEY(self) -> str:
        return os.getenv("STAGING_SUPABASE_SERVICE_ROLE_KEY", "") if ENVIRONMENT == "STAGING" else os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


    
    # OpenRouter settings
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    
    # LinkedIn OAuth settings
    LINKEDIN_CLIENT_ID: str = os.getenv("LINKEDIN_CLIENT_ID", "")
    LINKEDIN_CLIENT_SECRET: str = os.getenv("LINKEDIN_CLIENT_SECRET", "")

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

    @property
    def SANYAM_USERID(self) -> str:
        return os.getenv("STAGING_SANYAM_USERID", "") if ENVIRONMENT == "STAGING" else os.getenv("SANYAM_USERID", "")

    @property
    def ASHISH_USERID(self) -> str:
        return os.getenv("STAGING_ASHISH_USERID", "") if ENVIRONMENT == "STAGING" else os.getenv("ASHISH_USERID", "")

    @property
    def FOUNDERS_USERID(self) -> str:
        return os.getenv("STAGING_FOUNDERS_USERID", "") if ENVIRONMENT == "STAGING" else os.getenv("FOUNDERS_USERID", "")
    
    @property
    def FOUNDERS_AGENTID(self) -> str:
        return os.getenv("STAGING_FOUNDERS_AGENTID", "") if ENVIRONMENT == "STAGING" else os.getenv("FOUNDERS_AGENTID", "")


    # JWT settings
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    SUPABASE_JWT_EXPIRY: int = int(os.getenv("SUPABASE_JWT_EXPIRY", "3600"))
    
    # LinkedIn Enrichment API Keys
    TAVILY_API_KEY: str = os.getenv("TAVILY_API_KEY", "")
    APIFY_API_KEY: str = os.getenv("APIFY_API_KEY", "")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    JINA_API_KEY: str = os.getenv("JINA_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    
    # Portkey settings
    PORTKEY_API_KEY: str = os.getenv("PORTKEY_API_KEY", "")
    PORTKEY_ENABLED: bool = os.getenv("PORTKEY_ENABLED", "true").lower() == "true"
    
    # Use Railway Redis environment variables if available
    REDIS_HOST: str = os.getenv("REDISHOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDISPORT", "6379"))
    REDIS_PASSWORD: str = os.getenv("REDISPASSWORD", "password")
    REDIS_URL: str = os.getenv("REDIS_URL", "")
    WANDB_API_KEY: str = os.getenv("WANDB_API_KEY", "")

    LANGSMITH_PROJ_ID: str = os.getenv("LANGSMITH_PROJ_ID","")
    LANGSMITH_ORG_ID: str = os.getenv("LANGSMITH_ORG_ID","")
    LANGSMITH_WORKSPACE_ID: str = os.getenv("LANGSMITH_WORKSPACE_ID","")
    # MAXIM_API_KEY: str = os.getenv("MAXIM_API_KEY","")
    # MAXIM_LOGGER_ID: str = os.getenv("MAXIM_LOGGER_ID","")
    
    # # WhatsApp Business API settings
    # WHATSAPP_VERIFY_TOKEN: str = os.getenv("WHATSAPP_VERIFY_TOKEN", "")
    # WHATSAPP_ACCESS_TOKEN: str = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
    # WHATSAPP_PHONE_NUMBER_ID: str = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
    
    # Logging settings
    ENABLE_STRUCTURED_LOGGING: bool = os.getenv("ENABLE_STRUCTURED_LOGGING", "true").lower() == "true"

    class Config:
        case_sensitive = True


settings = Settings()

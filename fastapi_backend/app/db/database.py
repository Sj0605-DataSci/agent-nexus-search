from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from app.core.config import settings
from urllib.parse import quote_plus
import os

# Determine database URL - prioritize individual parameters over DATABASE_URL
if settings.USER and settings.PASSWORD and settings.HOST and settings.PORT and settings.DBNAME:
    # If all individual connection parameters are available, use them
    DATABASE_URL = f"postgresql+psycopg2://{settings.USER}:{quote_plus(settings.PASSWORD)}@{settings.HOST}:{settings.PORT}/{settings.DBNAME}?sslmode=require"
    print(f"Using database URL constructed from individual parameters: {DATABASE_URL}")
else:
    # Fall back to DATABASE_URL if individual parameters are not available
    DATABASE_URL = settings.DATABASE_URL
    print(f"Using database URL from environment: {DATABASE_URL}")
    
    # Ensure it uses the right driver
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)

# Create the SQLAlchemy engine
engine = create_engine(DATABASE_URL, poolclass=NullPool)
# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

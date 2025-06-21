from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from app.core.config import settings
from urllib.parse import quote_plus

# Determine database URL - prioritize individual parameters over DATABASE_URL
if settings.SUPABASE_USER and settings.SUPABASE_PASSWORD and settings.SUPABASE_HOST and settings.SUPABASE_PORT and settings.SUPABASE_DBNAME:
    # If all individual connection parameters are available, use them
    DATABASE_URL = f"postgresql+psycopg2://{settings.SUPABASE_USER}:{quote_plus(settings.SUPABASE_PASSWORD)}@{settings.SUPABASE_HOST}:{settings.SUPABASE_PORT}/{settings.SUPABASE_DBNAME}?sslmode=require"
    print(f"Using database URL constructed from individual parameters: {DATABASE_URL}")

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

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
# from sqlalchemy.pool import NullPool
from app.core.config import settings

# Fetch variables
USER = settings.USER
PASSWORD = settings.PASSWORD
HOST = settings.HOST
PORT = settings.PORT
DBNAME = settings.DBNAME

# Import urllib for URL encoding
from urllib.parse import quote_plus
from sqlalchemy.pool import NullPool

# Construct the SQLAlchemy connection string with URL-encoded password
DATABASE_URL = f"postgresql+psycopg2://{USER}:{quote_plus(PASSWORD)}@{HOST}:{PORT}/{DBNAME}?sslmode=require"

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

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import Config

database_url = Config.DATABASE_URL
if not database_url:
    raise ValueError("DATABASE_URL environment variable is not set!")

# Configure connection pool to handle connection issues
engine = create_engine(
    database_url,
    pool_pre_ping=True,  # Test connection before using it
    pool_recycle=3600,   # Recycle connections after 1 hour
    pool_size=5,         # Keep 5 connections in pool
    max_overflow=10      # Allow up to 10 overflow connections
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
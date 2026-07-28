"""
Database Session Generator for FastAPI Dependency Injection.
"""
from typing import Generator
from sqlalchemy.orm import Session
from database.config import SessionLocal

def get_db() -> Generator[Session, None, None]:
    """Yield a database session context per HTTP request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

"""
FastAPI application entry point.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from backend/.env file specifically
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

from api.routes import router
from database.config import init_db
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Initialize database schema
init_db()

app = FastAPI(
    title="AI Code Complexity Visualizer",
    description="Analyze code repositories for complexity, risk, and maintainability.",
    version="1.0.0",
)

# CORS – read allowed origins from env; default to Vite dev server.
# In production set: CORS_ORIGINS=https://yourdomain.com
_cors_env = os.environ.get("CORS_ORIGINS", "https://replexity.in,https://www.replexity.in")
CORS_ORIGINS = [origin.strip() for origin in _cors_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
async def root():
    return {
        "name": "AI Code Complexity Visualizer API",
        "version": "1.0.0",
        "docs": "/docs",
    }

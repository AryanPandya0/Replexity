"""
FastAPI application entry point.
"""
from backend.api.routes import router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="AI Code Complexity Visualizer",
    description="Analyze code repositories for complexity, risk, and maintainability.",
    version="1.0.0",
)

# CORS – allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

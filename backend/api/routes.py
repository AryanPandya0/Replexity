"""
API Routes Aggregator – includes split routers for analysis and export.
"""
from fastapi import APIRouter
from backend.api.analyze import router as analyze_router
from backend.api.export import router as export_router
from backend.api.ai import router as ai_router

router = APIRouter(prefix="/api")

# Include the split routers
router.include_router(analyze_router)
router.include_router(export_router)
router.include_router(ai_router)

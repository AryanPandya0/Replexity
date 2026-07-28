"""
API Routes Aggregator – includes split routers for analysis and export.
"""
from fastapi import APIRouter
from api.analyze import router as analyze_router
from api.export import router as export_router
from api.ai import router as ai_router
from api.events import router as events_router
from api.billing import router as billing_router

router = APIRouter(prefix="/api")

# Include the split routers
router.include_router(analyze_router)
router.include_router(export_router)
router.include_router(ai_router)
router.include_router(events_router)
router.include_router(billing_router)

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from backend.analysis_engine.ai_reviewer import generate_ai_review, generate_file_review, generate_pdf_review

router = APIRouter(tags=["ai"])

class ProjectReviewRequest(BaseModel):
    project_overview: dict
    top_issues: list

class FileReviewRequest(BaseModel):
    file_path: str
    file_metrics: dict
    code_content: Optional[str] = None

class PDFReviewRequest(BaseModel):
    project_overview: dict
    issues: list

@router.post("/ai/review/project")
async def review_project(req: ProjectReviewRequest):
    review = generate_ai_review(req.project_overview, req.top_issues)
    if not review:
        raise HTTPException(status_code=500, detail="Failed to generate AI review. Check API keys.")
    return {"review": review}

@router.post("/ai/review/file")
async def review_file(req: FileReviewRequest):
    review = generate_file_review(req.file_path, req.file_metrics, req.code_content or "")
    if not review:
        raise HTTPException(status_code=500, detail="Failed to generate AI file review. Check API keys.")
    return {"review": review}

@router.post("/ai/review/pdf")
async def review_pdf(req: PDFReviewRequest):
    review = generate_pdf_review(req.project_overview, req.issues)
    if not review:
        raise HTTPException(status_code=500, detail="Failed to generate AI PDF review. Check API keys.")
    return {"review": review}

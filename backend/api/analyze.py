import os
import tempfile
import traceback
from typing import List, Optional
from fastapi import APIRouter, File, HTTPException, UploadFile, BackgroundTasks, Depends
from backend.api.tasks import create_task, get_task, TaskStatus
from backend.api.pipeline import run_analysis_pipeline, get_cached_result
from backend.api.schemas import GitHubAnalysisRequest, LocalAnalysisRequest, AnalysisResult
from backend.analysis_engine.repo_manager import clone_github_repo, extract_zip, use_local_directory, cleanup
from backend.api.auth import get_current_user
from backend.database.models import User
from backend.database.persistence import save_analysis_to_db

from backend.api.queue import dispatch_github_analysis, dispatch_upload_analysis

router = APIRouter(tags=["analysis"])

@router.post("/analyze/github")
async def analyze_github(
    req: GitHubAnalysisRequest, 
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    task = create_task()
    task.status = TaskStatus.PROCESSING
    job = dispatch_github_analysis(task, req.url, req.branch, user_id=current_user.id)
    background_tasks.add_task(job)
    return {"task_id": task.task_id, "status": task.status}

@router.post("/analyze/upload")
async def analyze_upload(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Please upload a .zip file.")

    task = create_task()
    task.status = TaskStatus.PROCESSING

    # Save the uploaded file inline before responding to the user
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip", mode="wb")
    content = await file.read()
    tmp.write(content)
    tmp.close()

    job = dispatch_upload_analysis(task, tmp.name, user_id=current_user.id)
    background_tasks.add_task(job)
    return {"task_id": task.task_id, "status": task.status}

ALLOW_LOCAL_ANALYSIS = os.environ.get("ALLOW_LOCAL_ANALYSIS", "false").lower() in ("1", "true", "yes")
LOCAL_ANALYSIS_ALLOWED_ROOTS = [p.strip() for p in os.environ.get("LOCAL_ANALYSIS_ALLOWED_ROOTS", "").split(",") if p.strip()]
APP_ENV = os.environ.get("ENVIRONMENT", "development").lower()

@router.post("/analyze/local")
async def analyze_local(req: LocalAnalysisRequest, background_tasks: BackgroundTasks):
    if APP_ENV == "production" or not ALLOW_LOCAL_ANALYSIS:
        raise HTTPException(status_code=403, detail="Local filesystem analysis is disabled in production SaaS mode.")

    real_path = os.path.realpath(req.path)
    if LOCAL_ANALYSIS_ALLOWED_ROOTS:
        allowed = any(real_path.startswith(os.path.realpath(root)) for root in LOCAL_ANALYSIS_ALLOWED_ROOTS)
        if not allowed:
            raise HTTPException(status_code=403, detail="Requested path is outside allowed directories.")

    task = create_task()
    task.status = TaskStatus.PROCESSING

    def _background_job():
        try:
            print(f"Task {task.task_id}: Using local directory {req.path}...")
            analysis_id, repo_root, files = use_local_directory(req.path)
            if not files:
                raise Exception("No supported source files found.")
            
            print(f"Task {task.task_id}: Analyzing {len(files)} files...")
            res = run_analysis_pipeline(analysis_id, repo_root, files)
            task.result = res
            task.status = TaskStatus.COMPLETED
            print(f"Task {task.task_id}: Completed successfully.")
        except Exception as e:
            print(f"Task {task.task_id}: Failed: {e}")
            task.status = TaskStatus.FAILED
            task.error = str(e)

    background_tasks.add_task(_background_job)
    return {"task_id": task.task_id, "status": task.status}

@router.get("/status/{task_id}")
async def get_status(task_id: str):
    task = get_task(task_id)
    if task:
        return {"task_id": task.task_id, "status": task.status, "result": task.result, "error": task.error}
    
    cached_result = get_cached_result(task_id)
    if cached_result:
        return {"task_id": task_id, "status": TaskStatus.COMPLETED, "result": cached_result, "error": None}
    
    raise HTTPException(status_code=404, detail="Task not found.")

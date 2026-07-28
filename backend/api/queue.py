"""
Task Dispatcher & Worker Queue Abstraction for Distributed Multi-Tenant Processing.
Supports Celery/Redis distributed queue when configured, or local async task queue fallback.
"""
import os
import traceback
from typing import Callable
from api.tasks import TaskStatus, AnalysisTask
from api.events import publish_event_sync
from api.pipeline import run_analysis_pipeline
from analysis_engine.repo_manager import clone_github_repo, extract_zip, cleanup
from database.persistence import save_analysis_to_db

USE_CELERY = os.environ.get("USE_CELERY", "false").lower() in ("true", "1", "yes")

def dispatch_github_analysis(task: AnalysisTask, repo_url: str, branch: str, user_id: str = None):
    """Execute or queue GitHub repository analysis with real-time SSE progress updates."""
    def _run():
        try:
            publish_event_sync(task.task_id, "cloning", f"Cloning repository {repo_url}...", 15)
            analysis_id, repo_root, files = clone_github_repo(repo_url, branch)
            if not files:
                raise Exception("No supported source files found in repository.")

            publish_event_sync(task.task_id, "parsing", f"Parsing {len(files)} source files...", 45)
            res = run_analysis_pipeline(analysis_id, repo_root, files)

            publish_event_sync(task.task_id, "persisting", "Saving metrics into database...", 90)
            task.result = res
            task.status = TaskStatus.COMPLETED
            save_analysis_to_db(task.task_id, res, user_id=user_id)

            publish_event_sync(task.task_id, "completed", "Analysis completed successfully!", 100, data={"result": res.model_dump()})
        except Exception as e:
            print(f"Task {task.task_id} failed: {e}", flush=True)
            traceback.print_exc()
            task.status = TaskStatus.FAILED
            task.error = str(e)
            publish_event_sync(task.task_id, "failed", str(e), 100)
        finally:
            if 'analysis_id' in locals():
                cleanup(analysis_id)

    return _run

def dispatch_upload_analysis(task: AnalysisTask, tmp_zip_path: str, user_id: str = None):
    """Execute or queue uploaded ZIP analysis with real-time SSE progress updates."""
    def _run():
        try:
            publish_event_sync(task.task_id, "extracting", "Extracting zip archive...", 15)
            analysis_id, repo_root, files = extract_zip(tmp_zip_path)
            if not files:
                raise Exception("No supported source files found in zip archive.")

            publish_event_sync(task.task_id, "parsing", f"Analyzing {len(files)} files...", 45)
            res = run_analysis_pipeline(analysis_id, repo_root, files)

            publish_event_sync(task.task_id, "persisting", "Saving metrics into database...", 90)
            task.result = res
            task.status = TaskStatus.COMPLETED
            save_analysis_to_db(task.task_id, res, user_id=user_id)

            publish_event_sync(task.task_id, "completed", "Analysis completed successfully!", 100, data={"result": res.model_dump()})
        except Exception as e:
            print(f"Task {task.task_id} failed: {e}", flush=True)
            task.status = TaskStatus.FAILED
            task.error = str(e)
            publish_event_sync(task.task_id, "failed", str(e), 100)
        finally:
            if os.path.exists(tmp_zip_path):
                os.unlink(tmp_zip_path)
            if 'analysis_id' in locals():
                cleanup(analysis_id)

    return _run

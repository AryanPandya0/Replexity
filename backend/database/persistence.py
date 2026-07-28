"""
Database Persistence Helper for Analysis Results.
"""
from typing import Optional
from sqlalchemy.orm import Session
from database.config import SessionLocal
from database.models import AnalysisRun, FileMetric, Project
from api.schemas import AnalysisResult

def save_analysis_to_db(task_id: str, result: AnalysisResult, user_id: Optional[str] = None) -> Optional[str]:
    """Persist an AnalysisResult into the database tables."""
    db: Session = SessionLocal()
    try:
        overview = result.overview
        
        # Check or create project if repo url available
        project_id = None
        
        run = AnalysisRun(
            task_id=task_id,
            user_id=user_id,
            project_id=project_id,
            status="completed",
            health_score=overview.health_score if overview else None,
            total_files=overview.total_files if overview else 0,
            total_loc=overview.total_loc if overview else 0,
            avg_complexity=overview.avg_complexity if overview else 0.0,
            total_smells=len(result.code_smells) if result.code_smells else 0,
        )
        db.add(run)
        db.flush() # Populate run.id

        # Insert file metrics
        file_models = []
        for f in result.files:
            file_models.append(FileMetric(
                analysis_id=run.id,
                file_path=f.file_path,
                language=f.language,
                loc=f.loc,
                complexity=f.cyclomatic_complexity,
                cognitive_complexity=f.cognitive_complexity,
                nesting_depth=f.max_nesting_depth,
                maintainability_index=f.maintainability_index,
                risk_score=f.risk_score,
                risk_level=f.risk_level,
            ))
        db.bulk_save_objects(file_models)
        db.commit()
        return run.id
    except Exception as e:
        db.rollback()
        print(f"Warning: Failed to persist analysis to database: {e}", flush=True)
        return None
    finally:
        db.close()

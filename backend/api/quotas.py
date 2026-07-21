"""
Quota Enforcement & Subscription Tier Limit Manager.
"""
from datetime import datetime
from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session
from backend.database.session import get_db
from backend.database.models import User, AnalysisRun, UserPlan
from backend.api.auth import get_current_user

TIER_LIMITS = {
    UserPlan.FREE.value: {
        "monthly_analyses": 3,
        "max_loc": 25_000,
        "name": "Free Tier",
    },
    UserPlan.PRO.value: {
        "monthly_analyses": 100,
        "max_loc": 500_000,
        "name": "Pro Tier",
    },
    UserPlan.ENTERPRISE.value: {
        "monthly_analyses": 10_000,
        "max_loc": 10_000_000,
        "name": "Enterprise Tier",
    },
}

def get_user_monthly_usage(user_id: str, db: Session) -> int:
    """Calculate the number of analysis runs executed by the user in the current calendar month."""
    now = datetime.utcnow()
    first_of_month = datetime(now.year, now.month, 1)
    
    count = (
        db.query(AnalysisRun)
        .filter(
            AnalysisRun.user_id == user_id,
            AnalysisRun.created_at >= first_of_month,
            AnalysisRun.status == "completed",
        )
        .count()
    )
    return count

def check_user_quota(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency that verifies the user has not exceeded their monthly tier quota.
    Raises HTTP 402 Payment Required if quota is exhausted.
    """
    plan = current_user.plan_tier or UserPlan.FREE.value
    limits = TIER_LIMITS.get(plan, TIER_LIMITS[UserPlan.FREE.value])
    
    monthly_usage = get_user_monthly_usage(current_user.id, db)
    max_analyses = limits["monthly_analyses"]

    if monthly_usage >= max_analyses:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=(
                f"You have reached your monthly analysis limit ({monthly_usage}/{max_analyses}) "
                f"for the {limits['name']}. Please upgrade to Pro for higher limits."
            ),
        )
    
    return current_user

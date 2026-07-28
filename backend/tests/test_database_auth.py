"""
Unit & Integration tests for Database ORM and JWT Authentication Dependency.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database.config import Base
from database.models import User, Project, AnalysisRun, FileMetric, UserPlan
from database.persistence import save_analysis_to_db
from api.auth import create_access_token, decode_access_token
from api.schemas import AnalysisResult, ProjectOverview

TEST_SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture
def db_session():
    engine = create_engine(TEST_SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

def test_user_creation(db_session):
    user = User(email="test@replexity.ai", full_name="Test User", plan_tier=UserPlan.PRO.value)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    assert user.id is not None
    assert user.email == "test@replexity.ai"
    assert user.plan_tier == "pro"

def test_jwt_token_generation_and_decode():
    token = create_access_token(user_id="user_123", email="jwt@replexity.ai", plan_tier="pro")
    assert isinstance(token, str)

    payload = decode_access_token(token)
    assert payload["sub"] == "user_123"
    assert payload["email"] == "jwt@replexity.ai"
    assert payload["plan"] == "pro"

def test_persistence_helper(db_session, monkeypatch):
    monkeypatch.setattr("database.persistence.SessionLocal", lambda: db_session)

    res = AnalysisResult(
        analysis_id="test_run_1",
        project_name="test_project",
        overview=ProjectOverview(
            health_score=88.5,
            total_files=5,
            total_loc=1200,
            avg_complexity=3.2,
            total_code_smells=2,
            risk_distribution={"low": 4, "medium": 1, "high": 0, "critical": 0},
            language_breakdown={"python": 100.0}
        ),
        files=[],
        code_smells=[],
        refactor_suggestions=[],
    )

    run_id = save_analysis_to_db("task_12345", res)
    assert run_id is not None

    db_run = db_session.query(AnalysisRun).filter(AnalysisRun.task_id == "task_12345").first()
    assert db_run is not None
    assert db_run.health_score == 88.5
    assert db_run.total_files == 5

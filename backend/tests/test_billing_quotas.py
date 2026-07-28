"""
Unit & Integration tests for Billing endpoints and User Quotas.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import app
from database.config import Base
from database.models import User, AnalysisRun, UserPlan
from api.quotas import get_user_monthly_usage

TEST_SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

client = TestClient(app)

@pytest.fixture
def test_db():
    engine = create_engine(TEST_SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)

def test_monthly_usage_calculation(test_db):
    user = User(email="quota@replexity.ai", plan_tier=UserPlan.FREE.value)
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)

    assert get_user_monthly_usage(user.id, test_db) == 0

    run1 = AnalysisRun(task_id="run_1", user_id=user.id, status="completed")
    test_db.add(run1)
    test_db.commit()

    assert get_user_monthly_usage(user.id, test_db) == 1

def test_billing_usage_endpoint():
    response = client.get("/api/billing/usage")
    assert response.status_code in (200, 401)
    if response.status_code == 200:
        data = response.json()
        assert "plan_tier" in data
        assert "monthly_used" in data
        assert "monthly_limit" in data

def test_stripe_checkout_endpoint():
    response = client.post("/api/billing/checkout", json={"plan_tier": "pro"})
    assert response.status_code in (200, 401)
    if response.status_code == 200:
        data = response.json()
        assert "checkout_url" in data

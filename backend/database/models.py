"""
SQLAlchemy ORM Data Models for Replexity Multi-Tenant SaaS.
"""
from datetime import datetime
import uuid
from sqlalchemy import (
    Column, String, Integer, Float, DateTime, ForeignKey, Text, JSON, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from database.config import Base
import enum

class UserPlan(str, enum.Enum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    firebase_uid = Column(String(128), unique=True, index=True, nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    avatar_url = Column(Text, nullable=True)
    plan_tier = Column(String(50), default=UserPlan.FREE.value, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    analyses = relationship("AnalysisRun", back_populates="user", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    repo_url = Column(Text, nullable=False)
    default_branch = Column(String(100), default="main", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    owner = relationship("User", back_populates="projects")
    analyses = relationship("AnalysisRun", back_populates="project", cascade="all, delete-orphan")

class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(String(128), unique=True, index=True, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(String(50), default="pending", nullable=False)
    health_score = Column(Float, nullable=True)
    total_files = Column(Integer, default=0, nullable=False)
    total_loc = Column(Integer, default=0, nullable=False)
    avg_complexity = Column(Float, default=0.0, nullable=False)
    total_smells = Column(Integer, default=0, nullable=False)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="analyses")
    project = relationship("Project", back_populates="analyses")
    file_metrics = relationship("FileMetric", back_populates="analysis", cascade="all, delete-orphan")

class FileMetric(Base):
    __tablename__ = "file_metrics"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    analysis_id = Column(String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(Text, nullable=False)
    language = Column(String(50), nullable=False)
    loc = Column(Integer, default=0, nullable=False)
    complexity = Column(Float, default=1.0, nullable=False)
    cognitive_complexity = Column(Integer, default=0, nullable=False)
    nesting_depth = Column(Integer, default=0, nullable=False)
    maintainability_index = Column(Float, default=100.0, nullable=False)
    risk_score = Column(Float, default=0.0, nullable=False)
    risk_level = Column(String(20), default="low", nullable=False)

    analysis = relationship("AnalysisRun", back_populates="file_metrics")

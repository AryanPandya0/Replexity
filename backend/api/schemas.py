"""
API Pydantic schemas for request/response models.
"""
import re
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, field_validator  # type: ignore

# Regex: https://github.com/<owner>/<repo>[.git][/...]
# Also accepts gitlab.com.
_REPO_URL_RE = re.compile(
    r"^https://(github\.com|gitlab\.com)/[\w.\-]+/[\w.\-]+(\.git)?(/.*)?$"
)

# ── Request Models ──────────────────────────────────────────────

class GitHubAnalysisRequest(BaseModel):
    url: str = Field(..., description="GitHub/GitLab repository URL")
    branch: Optional[str] = Field("main", description="Branch to analyze")

    @field_validator("url")
    @classmethod
    def validate_repo_url(cls, v: str) -> str:
        v = v.strip().rstrip("/")
        if not _REPO_URL_RE.match(v):
            raise ValueError(
                "URL must be a valid GitHub or GitLab repository URL "
                "(e.g. https://github.com/owner/repo)"
            )
        return v


class LocalAnalysisRequest(BaseModel):
    path: str = Field(..., description="Absolute path to local project directory")


# ── Enums ───────────────────────────────────────────────────────

class ExportFormat(str, Enum):
    JSON = "json"
    CSV = "csv"
    PDF = "pdf"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ── Response Models ─────────────────────────────────────────────

class CodeSmellResult(BaseModel):
    file: str
    issue: str
    function: Optional[str] = None
    line: Optional[int] = None
    suggestion: str


class RefactorSuggestion(BaseModel):
    file: str
    function: Optional[str] = None
    issue: str
    suggestion: str
    priority: str = "medium"


class FunctionMetrics(BaseModel):
    name: str
    line_start: int
    line_end: Optional[int] = None
    loc: int
    complexity: int = 1
    nesting_depth: int = 0
    parameters: int = 0
    cognitive_complexity: int = 0
    halstead_volume: float = 0.0
    halstead_difficulty: float = 0.0
    halstead_effort: float = 0.0


class FileMetrics(BaseModel):
    file_path: str
    language: str
    loc: int = 0
    blank_lines: int = 0
    comment_lines: int = 0
    num_functions: int = 0
    num_classes: int = 0
    cyclomatic_complexity: float = 0.0
    max_nesting_depth: int = 0
    avg_function_length: float = 0.0
    max_function_length: int = 0
    num_imports: int = 0
    num_branches: int = 0
    num_loops: int = 0
    maintainability_index: float = 100.0
    risk_score: float = 0.0
    risk_level: str = "low"
    bug_risk_probability: float = 0.0
    cognitive_complexity: float = 0.0
    halstead_volume: float = 0.0
    halstead_difficulty: float = 0.0
    halstead_effort: float = 0.0
    coupling_afferent: int = 0
    coupling_efferent: int = 0
    instability: float = 0.0
    inheritance_depth: int = 0
    code_churn: int = 0
    code_content: Optional[str] = None
    functions: List[FunctionMetrics] = []
    code_smells: List[CodeSmellResult] = []
    refactor_suggestions: List[RefactorSuggestion] = []


class ProjectOverview(BaseModel):
    total_files: int = 0
    total_functions: int = 0
    total_classes: int = 0
    total_loc: int = 0
    avg_complexity: float = 0.0
    avg_maintainability: float = 100.0
    health_score: float = 100.0
    languages: Dict[str, int] = {}


class GraphNode(BaseModel):
    id: str
    label: str
    group: str = "file"
    risk_score: float = 0.0

class GraphEdge(BaseModel):
    source: str
    target: str

class DependencyGraph(BaseModel):
    nodes: List[GraphNode] = []
    links: List[GraphEdge] = []

class AnalysisResult(BaseModel):
    analysis_id: str
    project_name: str
    overview: ProjectOverview
    files: List[FileMetrics] = []
    code_smells: List[CodeSmellResult] = []
    refactor_suggestions: List[RefactorSuggestion] = []
    risk_distribution: Dict[str, int] = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    dead_functions: List[CodeSmellResult] = []
    dependency_graph: Optional[DependencyGraph] = None

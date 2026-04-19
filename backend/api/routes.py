"""
FastAPI API Routes – all endpoints for repository analysis and export.
"""
from typing import Dict, List, Set
import csv
import io
import os
import tempfile

from backend.analysis_engine.bug_predictor import predict_bug_risk  # type: ignore
from backend.analysis_engine.code_parser import parse_file  # type: ignore
from backend.analysis_engine.complexity_analyzer import analyze_complexity  # type: ignore
from backend.analysis_engine.health_score import calculate_health_score  # type: ignore
from backend.analysis_engine.refactor_engine import generate_suggestions  # type: ignore
from backend.analysis_engine.repo_manager import (  # type: ignore
    clone_github_repo,
    extract_zip,
    get_code_churn,
    use_local_directory,
)
from backend.analysis_engine.risk_model import calculate_risk_score  # type: ignore
from backend.analysis_engine.smell_detector import detect_smells  # type: ignore
from backend.analysis_engine.clone_detector import detect_clones  # type: ignore
from backend.analysis_engine.linter_service import run_all_linters  # type: ignore
from backend.api.schemas import (  # type: ignore
    AnalysisResult,
    CodeSmellResult,
    FileMetrics,
    FunctionMetrics,
    GitHubAnalysisRequest,
    LocalAnalysisRequest,
    ProjectOverview,
    RefactorSuggestion,
)
from collections import OrderedDict
from fastapi import APIRouter, File, HTTPException, UploadFile, BackgroundTasks  # type: ignore
from fastapi.responses import StreamingResponse  # type: ignore
import threading
import uuid
from enum import Enum
from typing import Optional

router = APIRouter(prefix="/api", tags=["analysis"])

class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class AnalysisTask:
    def __init__(self, task_id: str):
        self.task_id = task_id
        self.status = TaskStatus.PENDING
        self.result: Optional[AnalysisResult] = None
        self.error: Optional[str] = None

# In-memory task store
MAX_TASK_STORE_SIZE = 100
_task_store: OrderedDict[str, AnalysisTask] = OrderedDict()
_store_lock = threading.Lock()

def _create_task() -> AnalysisTask:
    with _store_lock:
        if len(_task_store) >= MAX_TASK_STORE_SIZE:
            _task_store.popitem(last=False)
        task_id = str(uuid.uuid4())
        task = AnalysisTask(task_id)
        _task_store[task_id] = task
    return task

# In-memory cache for analysis results (max 20)
MAX_CACHE_SIZE = 20
_analysis_cache: OrderedDict[str, AnalysisResult] = OrderedDict()
_cache_lock = threading.Lock()

def _cache_result(analysis_id: str, result: AnalysisResult):
    with _cache_lock:
        if len(_analysis_cache) >= MAX_CACHE_SIZE:
            _analysis_cache.popitem(last=False)  # Remove oldest
        _analysis_cache[analysis_id] = result


# ── Core Analysis Pipeline ──────────────────────────────────────

def _run_analysis(analysis_id: str, repo_root: str, source_files: List[str]) -> AnalysisResult:
    """Run the full analysis pipeline on a set of source files."""
    project_name = os.path.basename(repo_root.rstrip("/\\")) or "project"

    all_file_metrics: List[FileMetrics] = []
    all_smells: List[CodeSmellResult] = []
    all_suggestions: List[RefactorSuggestion] = []
    import_map: Dict[str, Set[str]] = {}
    risk_dist = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    total_functions = 0
    total_classes = 0
    total_loc = 0
    total_complexity = 0.0
    total_maintainability = 0.0
    languages: Dict[str, int] = {}

    # Execute external linters (Ruff, ESLint)
    print(f"Analysis Pipeline: Running external linters for {repo_root}...")
    external_smells = run_all_linters(repo_root)
    print(f"Analysis Pipeline: Found {len(external_smells)} external smells.")
    file_to_external_smells: Dict[str, List[CodeSmellResult]] = {}
    for sm in external_smells:
        file_to_external_smells.setdefault(sm.file, []).append(sm)

    for file_path in source_files:
        try:
            print(f"Analysis Pipeline: Processing {file_path}...")
            # 1. Parse the file
            parse_result = parse_file(file_path)

            # 2. Compute complexity
            complexity_metrics = analyze_complexity(file_path, parse_result)

            # 3. Calculate risk score
            risk_score, risk_level = calculate_risk_score(
                cyclomatic_complexity=complexity_metrics["cyclomatic_complexity"],
                loc=complexity_metrics["loc"],
                max_nesting_depth=complexity_metrics["max_nesting_depth"],
                avg_function_length=complexity_metrics["avg_function_length"],
                num_branches=complexity_metrics["num_branches"],
                num_functions=complexity_metrics["num_functions"],
            )

            # 4. Predict bug risk
            bug_risk = predict_bug_risk(
                cyclomatic_complexity=complexity_metrics["cyclomatic_complexity"],
                max_nesting_depth=complexity_metrics["max_nesting_depth"],
                avg_function_length=complexity_metrics["avg_function_length"],
                max_function_length=complexity_metrics["max_function_length"],
                num_branches=complexity_metrics["num_branches"],
                loc=complexity_metrics["loc"],
                num_functions=complexity_metrics["num_functions"],
                comment_lines=complexity_metrics["comment_lines"],
            )

            # 5. Detect code smells
            rel_path = os.path.relpath(file_path, repo_root)
            smells = detect_smells(rel_path, parse_result, complexity_metrics)
            smell_results = [
                CodeSmellResult(
                    file=s.file, issue=s.issue, function=s.function,
                    line=s.line, suggestion=s.suggestion,
                )
                for s in smells
            ]

            # 5b. Add external linter results
            if rel_path in file_to_external_smells:
                smell_results.extend(file_to_external_smells[rel_path])

            # 6. Generate refactoring suggestions
            suggestions = generate_suggestions(
                rel_path, complexity_metrics, risk_score, parse_result,
            )
            suggestion_results = [
                RefactorSuggestion(
                    file=s.file, function=s.function, issue=s.issue,
                    suggestion=s.suggestion, priority=s.priority,
                )
                for s in suggestions
            ]

            # 7. Build function metrics
            func_metrics = [
                FunctionMetrics(
                    name=f.name,
                    line_start=f.line_start,
                    line_end=f.line_end,
                    loc=f.loc,
                    complexity=f.complexity,
                    nesting_depth=f.nesting_depth,
                    parameters=f.parameters,
                    cognitive_complexity=f.cognitive_complexity,
                    halstead_volume=f.halstead_volume,
                    halstead_difficulty=f.halstead_difficulty,
                    halstead_effort=f.halstead_effort,
                )
                for f in parse_result.functions
            ]

            # 9. Get Code Churn
            churn = get_code_churn(repo_root, file_path)

            # 10. Read code content (limit to first 2MB)
            code_str: Optional[str] = None
            try:
                if os.path.getsize(file_path) < 2 * 1024 * 1024:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        code_str = f.read()
            except:
                pass

            # 11. Build file metrics (preliminary, without coupling)
            file_metric = FileMetrics(
                file_path=rel_path,
                language=parse_result.language,
                loc=complexity_metrics["loc"],
                blank_lines=complexity_metrics["blank_lines"],
                comment_lines=complexity_metrics["comment_lines"],
                num_functions=complexity_metrics["num_functions"],
                num_classes=complexity_metrics["num_classes"],
                cyclomatic_complexity=complexity_metrics["cyclomatic_complexity"],
                cognitive_complexity=complexity_metrics["cognitive_complexity"],
                halstead_volume=complexity_metrics["halstead_volume"],
                halstead_difficulty=complexity_metrics["halstead_difficulty"],
                halstead_effort=complexity_metrics["halstead_effort"],
                max_nesting_depth=complexity_metrics["max_nesting_depth"],
                inheritance_depth=complexity_metrics["inheritance_depth"],
                avg_function_length=complexity_metrics["avg_function_length"],
                max_function_length=complexity_metrics["max_function_length"],
                num_imports=complexity_metrics["num_imports"],
                num_branches=complexity_metrics["num_branches"],
                num_loops=complexity_metrics["num_loops"],
                maintainability_index=complexity_metrics["maintainability_index"],
                risk_score=risk_score,
                risk_level=risk_level,
                bug_risk_probability=bug_risk,
                code_churn=churn,
                code_content=code_str,
                functions=func_metrics,
                code_smells=smell_results,
                refactor_suggestions=suggestion_results,
            )
            
            import_map[rel_path] = parse_result.imports

            all_file_metrics.append(file_metric)
            all_smells.extend(smell_results)
            all_suggestions.extend(suggestion_results)
            risk_dist[risk_level] += 1

            # Accumulators
            total_functions += parse_result.num_functions
            total_classes += parse_result.num_classes
            total_loc += complexity_metrics["loc"]
            total_complexity += complexity_metrics["cyclomatic_complexity"]
            total_maintainability += complexity_metrics["maintainability_index"]

            lang = parse_result.language
            languages[lang] = languages.get(lang, 0) + 1

        except Exception as e:
            # Skip files that fail to parse
            print(f"Warning: Failed to analyze {file_path}: {e}")
            continue

    # 12. Detect duplicate code clones (cross-file)
    print(f"Analysis Pipeline: Running duplicate code detection...", flush=True)
    file_sources = {f.file_path: f.code_content for f in all_file_metrics if f.code_content}
    clone_pairs = detect_clones(file_sources, min_lines=6)
    print(f"Analysis Pipeline: Found {len(clone_pairs)} clone pairs.", flush=True)

    # Build a quick lookup: file_path -> FileMetrics
    _file_lookup: Dict[str, FileMetrics] = {f.file_path: f for f in all_file_metrics}

    for clone in clone_pairs:
        # Create smell for file_a
        smell_a = CodeSmellResult(
            file=clone.file_a,
            issue="Duplicate Code",
            function=None,
            line=clone.start_a,
            suggestion=(
                f"Lines {clone.start_a}-{clone.end_a} ({clone.num_lines} lines) are duplicated "
                f"in `{clone.file_b}` at lines {clone.start_b}-{clone.end_b}. "
                f"Extract the shared logic into a common utility function or module."
            ),
        )
        # Create smell for file_b
        smell_b = CodeSmellResult(
            file=clone.file_b,
            issue="Duplicate Code",
            function=None,
            line=clone.start_b,
            suggestion=(
                f"Lines {clone.start_b}-{clone.end_b} ({clone.num_lines} lines) are duplicated "
                f"in `{clone.file_a}` at lines {clone.start_a}-{clone.end_a}. "
                f"Extract the shared logic into a common utility function or module."
            ),
        )
        all_smells.append(smell_a)
        all_smells.append(smell_b)

        # Attach to per-file metrics
        if clone.file_a in _file_lookup:
            _file_lookup[clone.file_a].code_smells.append(smell_a)
        if clone.file_b in _file_lookup:
            _file_lookup[clone.file_b].code_smells.append(smell_b)

        # Generate refactoring suggestion for larger clones
        if clone.num_lines >= 10:
            sug = RefactorSuggestion(
                file=clone.file_a,
                function=None,
                issue="Duplicate code block",
                suggestion=(
                    f"{clone.num_lines} lines duplicated between `{clone.file_a}` "
                    f"(L{clone.start_a}-{clone.end_a}) and `{clone.file_b}` "
                    f"(L{clone.start_b}-{clone.end_b}). "
                    f"Create a shared helper and call it from both locations."
                ),
                priority="high" if clone.num_lines >= 20 else "medium",
            )
            all_suggestions.append(sug)
            if clone.file_a in _file_lookup:
                _file_lookup[clone.file_a].refactor_suggestions.append(sug)

    # Calculate Coupling (Ca, Ce, Instability) and build Dependency Graph
    from backend.api.schemas import DependencyGraph, GraphEdge, GraphNode  # type: ignore
    
    print(f"Analysis Pipeline: Calculating coupling for {len(all_file_metrics)} files...", flush=True)
    project_files = {f.file_path for f in all_file_metrics}
    links: List[GraphEdge] = []
    
    # Pre-map base names to paths for faster lookup
    base_to_path: Dict[str, str] = {}
    for pf in project_files:
        base = os.path.basename(pf).split('.')[0]
        base_to_path[base] = pf

    for f in all_file_metrics:
        imported_names = import_map.get(f.file_path, set())
        for imp in imported_names:
            target_path: Optional[str] = None
            if imp in project_files and imp != f.file_path:
                target_path = imp
            elif imp in base_to_path:
                potential_target = base_to_path[imp]
                if potential_target != f.file_path:
                    target_path = potential_target
            
            if target_path:
                f.coupling_efferent += 1
                links.append(GraphEdge(source=f.file_path, target=target_path))
                for target in all_file_metrics:
                    if target.file_path == target_path:
                        target.coupling_afferent += 1
                        break

    nodes = [
        GraphNode(
            id=f.file_path, 
            label=os.path.basename(f.file_path), 
            group=f.language,
            risk_score=f.risk_score
        )
        for f in all_file_metrics
    ]
    dep_graph = DependencyGraph(nodes=nodes, links=links)
    print(f"Analysis Pipeline: Coupling calculation and graph construction complete.", flush=True)
    
    for f in all_file_metrics:
        total_coupling = float(f.coupling_afferent + f.coupling_efferent)
        if total_coupling > 0:
            f.instability = float(f"{float(f.coupling_efferent) / total_coupling:.2f}")

    n_files = max(1, len(all_file_metrics))
    n_files_f = float(n_files)
    avg_complexity = float(f"{float(total_complexity) / n_files_f:.2f}")
    avg_maintainability = float(f"{float(total_maintainability) / n_files_f:.2f}")

    health = calculate_health_score(
        avg_complexity=avg_complexity,
        avg_maintainability=avg_maintainability,
        risk_distribution=risk_dist,
        total_smells=len(all_smells),
        total_files=len(all_file_metrics),
    )

    overview = ProjectOverview(
        total_files=len(all_file_metrics),
        total_functions=total_functions,
        total_classes=total_classes,
        total_loc=total_loc,
        avg_complexity=avg_complexity,
        avg_maintainability=avg_maintainability,
        health_score=health,
        languages=languages,
    )

    # Sort files by risk score descending
    all_file_metrics.sort(key=lambda f: f.risk_score, reverse=True)

    result = AnalysisResult(
        analysis_id=analysis_id,
        project_name=project_name,
        overview=overview,
        files=all_file_metrics,
        code_smells=all_smells,
        refactor_suggestions=all_suggestions,
        risk_distribution=risk_dist,
        dependency_graph=dep_graph,
    )

    _cache_result(analysis_id, result)
    return result


# ── Endpoints ───────────────────────────────────────────────────

@router.post("/analyze/github")
async def analyze_github(req: GitHubAnalysisRequest, background_tasks: BackgroundTasks):
    task = _create_task()
    with _store_lock:
        task.status = TaskStatus.PROCESSING
    
    def _background_job():
        from backend.analysis_engine.repo_manager import cleanup  # type: ignore
        try:
            print(f"Task {task.task_id}: Cloning repository {req.url}...", flush=True)
            analysis_id: str
            repo_root: str
            files: List[str]
            analysis_id, repo_root, files = clone_github_repo(req.url, req.branch)
            if not files:
                raise Exception("No supported source files found.")
            
            print(f"Task {task.task_id}: Analyzing {len(files)} files...", flush=True)
            res: AnalysisResult = _run_analysis(analysis_id, repo_root, files)
            with _store_lock:
                task.result = res
                task.status = TaskStatus.COMPLETED
            print(f"Task {task.task_id}: Completed successfully.", flush=True)
        except Exception as e:
            print(f"Task {task.task_id}: Failed: {e}", flush=True)
            import traceback
            traceback.print_exc()
            with _store_lock:
                task.status = TaskStatus.FAILED
                task.error = str(e)
        finally:
            if 'analysis_id' in locals():
                cleanup(analysis_id)

    background_tasks.add_task(_background_job)
    with _store_lock:
        return {"task_id": task.task_id, "status": task.status}


@router.post("/analyze/upload")
async def analyze_upload(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Please upload a .zip file.")

    task = _create_task()
    with _store_lock:
        task.status = TaskStatus.PROCESSING

    # Save the uploaded file inline before responding to the user
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip", mode="wb")
    content = await file.read()
    tmp.write(content)  # type: ignore
    tmp.close()

    def _background_job():
        from backend.analysis_engine.repo_manager import cleanup  # type: ignore
        try:
            print(f"Task {task.task_id}: Extracting zip file...")
            analysis_id: str
            repo_root: str
            files: List[str]
            analysis_id, repo_root, files = extract_zip(tmp.name)
            if not files:
                raise Exception("No supported source files found in archive.")
            
            print(f"Task {task.task_id}: Analyzing {len(files)} files...")
            res: AnalysisResult = _run_analysis(analysis_id, repo_root, files)
            with _store_lock:
                task.result = res
                task.status = TaskStatus.COMPLETED
            print(f"Task {task.task_id}: Completed successfully.")
        except Exception as e:
            print(f"Task {task.task_id}: Failed: {e}")
            with _store_lock:
                task.status = TaskStatus.FAILED
                task.error = str(e)
        finally:
            if os.path.exists(tmp.name):
                os.unlink(tmp.name)
            if 'analysis_id' in locals():
                cleanup(analysis_id)

    background_tasks.add_task(_background_job)
    with _store_lock:
        return {"task_id": task.task_id, "status": task.status}


# ── Local analysis security ─────────────────────────────────────
ALLOW_LOCAL_ANALYSIS = os.environ.get(
    "ALLOW_LOCAL_ANALYSIS", "false"
).lower() in ("1", "true", "yes")
LOCAL_ANALYSIS_ALLOWED_ROOTS = [
    p.strip()
    for p in os.environ.get("LOCAL_ANALYSIS_ALLOWED_ROOTS", "").split(",")
    if p.strip()
]


@router.post("/analyze/local")
async def analyze_local(req: LocalAnalysisRequest, background_tasks: BackgroundTasks):
    # Gate 1: feature flag
    if not ALLOW_LOCAL_ANALYSIS:
        raise HTTPException(
            status_code=403,
            detail="Local analysis is disabled. Set ALLOW_LOCAL_ANALYSIS=true to enable.",
        )

    # Gate 2: restrict to allowed directories (if configured)
    real_path = os.path.realpath(req.path)
    if LOCAL_ANALYSIS_ALLOWED_ROOTS:
        allowed = any(
            real_path.startswith(os.path.realpath(root))
            for root in LOCAL_ANALYSIS_ALLOWED_ROOTS
        )
        if not allowed:
            raise HTTPException(
                status_code=403,
                detail="Requested path is outside allowed directories.",
            )

    task = _create_task()
    with _store_lock:
        task.status = TaskStatus.PROCESSING

    def _background_job():
        try:
            print(f"Task {task.task_id}: Using local directory {req.path}...")
            analysis_id: str
            repo_root: str
            files: List[str]
            analysis_id, repo_root, files = use_local_directory(req.path)
            if not files:
                raise Exception("No supported source files found.")
            
            print(f"Task {task.task_id}: Analyzing {len(files)} files...")
            res: AnalysisResult = _run_analysis(analysis_id, repo_root, files)
            with _store_lock:
                task.result = res
                task.status = TaskStatus.COMPLETED
            print(f"Task {task.task_id}: Completed successfully.")
        except Exception as e:
            print(f"Task {task.task_id}: Failed: {e}")
            with _store_lock:
                task.status = TaskStatus.FAILED
                task.error = str(e)

    background_tasks.add_task(_background_job)
    with _store_lock:
        return {"task_id": task.task_id, "status": task.status}


@router.get("/status/{task_id}")
async def get_task_status(task_id: str):
    with _store_lock:
        task = _task_store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {
        "task_id": task.task_id,
        "status": task.status,
        "result": task.result,
        "error": task.error
    }


@router.get("/results/{analysis_id}", response_model=AnalysisResult)
async def get_results(analysis_id: str):
    """Retrieve cached analysis results."""
    with _cache_lock:
        if analysis_id not in _analysis_cache:
            raise HTTPException(status_code=404, detail="Analysis not found. Please run a new analysis.")
        return _analysis_cache[analysis_id]


@router.get("/results/{analysis_id}/file/{file_path:path}")
async def get_file_detail(analysis_id: str, file_path: str):
    """Retrieve detailed metrics for a specific file."""
    with _cache_lock:
        if analysis_id not in _analysis_cache:
            raise HTTPException(status_code=404, detail="Analysis not found.")
        result = _analysis_cache[analysis_id]
    for f in result.files:
        if f.file_path == file_path:
            return f
    raise HTTPException(status_code=404, detail=f"File not found: {file_path}")


# ── Export Endpoints ────────────────────────────────────────────

@router.get("/export/{analysis_id}/json")
async def export_json(analysis_id: str):
    """Export analysis results as JSON."""
    with _cache_lock:
        if analysis_id not in _analysis_cache:
            raise HTTPException(status_code=404, detail="Analysis not found.")
        result = _analysis_cache[analysis_id]
    content = result.model_dump_json(indent=2)
    return StreamingResponse(
        io.BytesIO(content.encode()),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=analysis_{analysis_id}.json"},
    )


@router.get("/export/{analysis_id}/csv")
async def export_csv(analysis_id: str):
    """Export file-level metrics as CSV."""
    with _cache_lock:
        if analysis_id not in _analysis_cache:
            raise HTTPException(status_code=404, detail="Analysis not found.")
        result = _analysis_cache[analysis_id]
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "File", "Language", "LOC", "Functions", "Classes",
        "Cyclomatic Complexity", "Cognitive Complexity", "Nesting Depth", 
        "Maintainability Index", "Halstead Volume", "Coupling (Ca)", "Coupling (Ce)",
        "Inheritance Depth", "Code Churn", "Risk Score", "Risk Level",
    ])
    for f in result.files:
        writer.writerow([
            f.file_path, f.language, f.loc, f.num_functions, f.num_classes,
            f.cyclomatic_complexity, f.cognitive_complexity, f.max_nesting_depth,
            f.maintainability_index, f.halstead_volume, f.coupling_afferent, f.coupling_efferent,
            f.inheritance_depth, f.code_churn, f.risk_score, f.risk_level,
        ])

    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=analysis_{analysis_id}.csv"},
    )


@router.get("/export/{analysis_id}/pdf")
async def export_pdf(analysis_id: str):
    """Export analysis results as PDF."""
    with _cache_lock:
        if analysis_id not in _analysis_cache:
            raise HTTPException(status_code=404, detail="Analysis not found.")
        result = _analysis_cache[analysis_id]

    from fpdf import FPDF  # type: ignore

    def _s(text: str) -> str:
        """Helper to ensure text is compatible with standard PDF fonts (Latin-1)."""
        if not text: return ""
        # Convert to latin-1, replacing unknown chars with '?'
        return text.encode("latin-1", errors="replace").decode("latin-1")

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _s(f"Code Analysis Report: {result.project_name}"), ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, _s(f"Analysis ID: {result.analysis_id}"), ln=True)
    pdf.ln(5)

    # Overview
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, _s("Project Overview"), ln=True)
    pdf.set_font("Helvetica", "", 10)
    o = result.overview
    pdf.cell(0, 6, _s(f"Total Files: {o.total_files} | Functions: {o.total_functions} | Classes: {o.total_classes}"), ln=True)
    pdf.cell(0, 6, _s(f"Total LOC: {o.total_loc} | Avg Complexity: {o.avg_complexity}"), ln=True)
    pdf.cell(0, 6, _s(f"Health Score: {o.health_score}/100 | Avg Maintainability: {o.avg_maintainability}"), ln=True)
    pdf.ln(3)

    # Risk Distribution
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, _s("Risk Distribution"), ln=True)
    pdf.set_font("Helvetica", "", 10)
    for level, count in result.risk_distribution.items():
        pdf.cell(0, 6, _s(f"  {level.capitalize()}: {count} files"), ln=True)
    pdf.ln(3)

    # Top risky files
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, _s("Top Risk Files"), ln=True)
    pdf.set_font("Helvetica", "", 8)
    for f in result.files[:25]:
        metrics_str = f"Risk: {f.risk_score} | CC: {f.cyclomatic_complexity} | Cog: {f.cognitive_complexity} | LOC: {f.loc} | Churn: {f.code_churn} | Ca/Ce: {f.coupling_afferent}/{f.coupling_efferent}"
        pdf.cell(0, 5, _s(f"  {f.file_path} - {metrics_str}"), ln=True)
    pdf.ln(3)

    # Code Smells
    if result.code_smells:
        pdf.set_font("Helvetica", "B", 13)
        pdf.cell(0, 8, _s("Code Smells"), ln=True)
        pdf.set_font("Helvetica", "", 9)
        for s in result.code_smells[:30]:
            func_str = f" in {s.function}()" if s.function else ""
            pdf.multi_cell(0, 5, _s(f"  [{s.issue}] {s.file}{func_str}: {s.suggestion}"))
        pdf.ln(3)

    pdf_bytes = pdf.output()
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=analysis_{analysis_id}.pdf"},
    )

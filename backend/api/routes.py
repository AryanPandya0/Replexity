"""
FastAPI API Routes – all endpoints for repository analysis and export.
"""
from typing import Dict, List, Set
import csv
import io
import os
import tempfile

from backend.analysis_engine.bug_predictor import predict_bug_risk
from backend.analysis_engine.code_parser import parse_file
from backend.analysis_engine.complexity_analyzer import analyze_complexity
from backend.analysis_engine.health_score import calculate_health_score
from backend.analysis_engine.refactor_engine import generate_suggestions
from backend.analysis_engine.repo_manager import (
    clone_github_repo,
    extract_zip,
    get_code_churn,
    use_local_directory,
)
from backend.analysis_engine.risk_model import calculate_risk_score
from backend.analysis_engine.smell_detector import detect_smells
from backend.api.schemas import (
    AnalysisResult,
    CodeSmellResult,
    FileMetrics,
    FunctionMetrics,
    GitHubAnalysisRequest,
    LocalAnalysisRequest,
    ProjectOverview,
    RefactorSuggestion,
)
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api", tags=["analysis"])

# In-memory cache for analysis results
_analysis_cache: Dict[str, AnalysisResult] = {}


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

    for file_path in source_files:
        try:
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

            # 10. Build file metrics (preliminary, without coupling)
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

    # Calculate Coupling (Ca, Ce, Instability)
    for f in all_file_metrics:
        # Efferent Coupling (Ce) - count how many other project files are imported
        imported_files = import_map.get(f.file_path, set())
        for other in all_file_metrics:
            if f.file_path == other.file_path: 
                continue
            # Check if other file's name or module name is in imports
            other_base = os.path.basename(other.file_path).split('.')[0]
            if other_base in imported_files or other.file_path in imported_files:
                f.coupling_efferent += 1
                other.coupling_afferent += 1
    
    for f in all_file_metrics:
        total_coupling = float(f.coupling_afferent + f.coupling_efferent)
        if total_coupling > 0:
            f.instability = round(float(f.coupling_efferent) / total_coupling, 2)

    n_files = max(1, len(all_file_metrics))
    n_files_f = float(n_files)
    avg_complexity = float(round(total_complexity / n_files_f, 2))
    avg_maintainability = float(round(total_maintainability / n_files_f, 2))

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
    )

    _analysis_cache[analysis_id] = result
    return result


# ── Endpoints ───────────────────────────────────────────────────

@router.post("/analyze/github", response_model=AnalysisResult)
async def analyze_github(req: GitHubAnalysisRequest):
    """Clone and analyze a GitHub repository."""
    try:
        analysis_id, repo_root, files = clone_github_repo(req.url, req.branch)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to clone repository: {e}")

    if not files:
        raise HTTPException(status_code=400, detail="No supported source files found.")

    return _run_analysis(analysis_id, repo_root, files)


@router.post("/analyze/upload", response_model=AnalysisResult)
async def analyze_upload(file: UploadFile = File(...)):
    """Upload a zip file and analyze it."""
    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Please upload a .zip file.")

    # Save the uploaded file
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip", mode="wb")
    try:
        content = await file.read()
        tmp.write(content)  # type: ignore
        tmp.close()
        analysis_id, repo_root, files = extract_zip(tmp.name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process zip file: {e}")
    finally:
        os.unlink(tmp.name)

    if not files:
        raise HTTPException(status_code=400, detail="No supported source files found in archive.")

    return _run_analysis(analysis_id, repo_root, files)


@router.post("/analyze/local", response_model=AnalysisResult)
async def analyze_local(req: LocalAnalysisRequest):
    """Analyze a local directory."""
    try:
        analysis_id, repo_root, files = use_local_directory(req.path)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not files:
        raise HTTPException(status_code=400, detail="No supported source files found.")

    return _run_analysis(analysis_id, repo_root, files)


@router.get("/results/{analysis_id}", response_model=AnalysisResult)
async def get_results(analysis_id: str):
    """Retrieve cached analysis results."""
    if analysis_id not in _analysis_cache:
        raise HTTPException(status_code=404, detail="Analysis not found. Please run a new analysis.")
    return _analysis_cache[analysis_id]


@router.get("/results/{analysis_id}/file/{file_path:path}")
async def get_file_detail(analysis_id: str, file_path: str):
    """Retrieve detailed metrics for a specific file."""
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
    if analysis_id not in _analysis_cache:
        raise HTTPException(status_code=404, detail="Analysis not found.")

    result = _analysis_cache[analysis_id]

    from fpdf import FPDF

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, f"Code Analysis Report: {result.project_name}", ln=True)
    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Analysis ID: {result.analysis_id}", ln=True)
    pdf.ln(5)

    # Overview
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, "Project Overview", ln=True)
    pdf.set_font("Helvetica", "", 10)
    o = result.overview
    pdf.cell(0, 6, f"Total Files: {o.total_files} | Functions: {o.total_functions} | Classes: {o.total_classes}", ln=True)
    pdf.cell(0, 6, f"Total LOC: {o.total_loc} | Avg Complexity: {o.avg_complexity}", ln=True)
    pdf.cell(0, 6, f"Health Score: {o.health_score}/100 | Avg Maintainability: {o.avg_maintainability}", ln=True)
    pdf.ln(3)

    # Risk Distribution
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, "Risk Distribution", ln=True)
    pdf.set_font("Helvetica", "", 10)
    for level, count in result.risk_distribution.items():
        pdf.cell(0, 6, f"  {level.capitalize()}: {count} files", ln=True)
    pdf.ln(3)

    # Top risky files
    pdf.set_font("Helvetica", "B", 13)
    pdf.cell(0, 8, "Top Risk Files", ln=True)
    pdf.set_font("Helvetica", "", 8)
    for f in result.files[:25]:
        metrics_str = f"Risk: {f.risk_score} | CC: {f.cyclomatic_complexity} | Cog: {f.cognitive_complexity} | LOC: {f.loc} | Churn: {f.code_churn} | Ca/Ce: {f.coupling_afferent}/{f.coupling_efferent}"
        pdf.cell(0, 5, f"  {f.file_path} - {metrics_str}", ln=True)
    pdf.ln(3)

    # Code Smells
    if result.code_smells:
        pdf.set_font("Helvetica", "B", 13)
        pdf.cell(0, 8, "Code Smells", ln=True)
        pdf.set_font("Helvetica", "", 9)
        for s in result.code_smells[:30]:
            func_str = f" in {s.function}()" if s.function else ""
            pdf.multi_cell(0, 5, f"  [{s.issue}] {s.file}{func_str}: {s.suggestion}")
        pdf.ln(3)

    pdf_bytes = pdf.output()
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=analysis_{analysis_id}.pdf"},
    )

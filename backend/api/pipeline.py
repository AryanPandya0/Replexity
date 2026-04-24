import os
import threading
from typing import Dict, List, Set, Tuple, Optional
from collections import OrderedDict
from backend.analysis_engine.bug_predictor import predict_bug_risk
from backend.analysis_engine.code_parser import parse_file
from backend.analysis_engine.complexity_analyzer import analyze_complexity
from backend.analysis_engine.health_score import calculate_health_score
from backend.analysis_engine.refactor_engine import generate_suggestions
from backend.analysis_engine.repo_manager import get_code_churn
from backend.analysis_engine.risk_model import calculate_risk_score
from backend.analysis_engine.smell_detector import detect_smells
from backend.analysis_engine.clone_detector import detect_clones
from backend.analysis_engine.linter_service import run_all_linters
from backend.api.schemas import (
    AnalysisResult,
    CodeSmellResult,
    FileMetrics,
    FunctionMetrics,
    ProjectOverview,
    RefactorSuggestion,
    DependencyGraph,
    GraphEdge,
    GraphNode,
)

# In-memory cache for analysis results (max 20)
MAX_CACHE_SIZE = 20
_analysis_cache: OrderedDict[str, AnalysisResult] = OrderedDict()
_cache_lock = threading.Lock()
CACHE_DIR = os.path.join(os.getcwd(), "cache")

def cache_result(analysis_id: str, result: AnalysisResult):
    with _cache_lock:
        if len(_analysis_cache) >= MAX_CACHE_SIZE:
            _analysis_cache.popitem(last=False)  # Remove oldest
        _analysis_cache[analysis_id] = result
    
    # Persistent cache (disk)
    try:
        os.makedirs(CACHE_DIR, exist_ok=True)
        file_path = os.path.join(CACHE_DIR, f"{analysis_id}.json")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(result.model_dump_json())
    except Exception as e:
        print(f"Warning: Failed to persist cache for {analysis_id}: {e}")

def get_cached_result(analysis_id: str) -> Optional[AnalysisResult]:
    """Get result from memory cache or disk."""
    # 1. Check memory
    with _cache_lock:
        if analysis_id in _analysis_cache:
            return _analysis_cache[analysis_id]
    
    # 2. Check disk
    file_path = os.path.join(CACHE_DIR, f"{analysis_id}.json")
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = f.read()
                result = AnalysisResult.model_validate_json(data)
                # Put back in memory cache
                with _cache_lock:
                    _analysis_cache[analysis_id] = result
                return result
        except Exception as e:
            print(f"Warning: Failed to load persistent cache for {analysis_id}: {e}")
            
    return None

def run_analysis_pipeline(analysis_id: str, repo_root: str, source_files: List[str]) -> AnalysisResult:
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
    
    # For Dead Code Detection
    defined_functions: List[Dict] = [] 
    all_usages: Set[str] = set()

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
            all_usages.update(parse_result.imports)
            all_usages.update(parse_result.calls)
            
            for f_info in parse_result.functions:
                if f_info.name != "anonymous":
                    defined_functions.append({
                        "name": f_info.name,
                        "file": rel_path,
                        "line": f_info.line_start
                    })

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

    # 13. Dead Code Detection
    print(f"Analysis Pipeline: Running dead code detection...", flush=True)
    dead_function_results: List[CodeSmellResult] = []
    
    # Heuristic: exclude common entry points and special methods
    EXCLUDE_NAMES = {"main", "handler", "setup", "teardown", "run", "start", "stop", "root"}
    
    for df in defined_functions:
        name = df["name"]
        # If not used and not a special name and not starting with __ (Python)
        if name not in all_usages and name not in EXCLUDE_NAMES and not name.startswith("__"):
            smell = CodeSmellResult(
                file=df["file"],
                issue="Dead Code",
                function=name,
                line=df["line"],
                suggestion=f"Function `{name}` is defined but never called or imported. Consider removing it to reduce technical debt."
            )
            dead_function_results.append(smell)
            all_smells.append(smell) # Also add to general smells
            
            # Attach to per-file metrics
            if df["file"] in _file_lookup:
                _file_lookup[df["file"]].code_smells.append(smell)

    result = AnalysisResult(
        analysis_id=analysis_id,
        project_name=project_name,
        overview=overview,
        files=all_file_metrics,
        code_smells=all_smells,
        refactor_suggestions=all_suggestions,
        risk_distribution=risk_dist,
        dead_functions=dead_function_results,
        dependency_graph=dep_graph,
    )

    cache_result(analysis_id, result)
    return result

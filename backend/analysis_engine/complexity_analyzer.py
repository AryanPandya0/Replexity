"""
Complexity Analyzer – computes cyclomatic complexity, maintainability index,
and other metrics using radon for Python and custom logic for JS/TS.
"""
import math
from backend.analysis_engine.code_parser import ParseResult


def _safe_maintainability_index(halstead_volume: float, cc: float, loc: int) -> float:
    """Compute Maintainability Index (0–100 scale). Higher is better."""
    if loc <= 0:
        return 100.0
    try:
        ln_vol = math.log(halstead_volume) if halstead_volume > 0 else 0
        ln_loc = math.log(loc) if loc > 0 else 0
        mi = max(0, (171 - 5.2 * ln_vol - 0.23 * cc - 16.2 * ln_loc) * 100 / 171)
        return round(min(100.0, mi), 2)
    except (ValueError, ZeroDivisionError):
        return 50.0


def compute_python_complexity(file_path: str, parse_result: ParseResult) -> dict:
    """Use radon to compute complexity for Python files."""
    try:
        from radon.complexity import cc_visit
        from radon.metrics import mi_visit, h_visit
        from radon.raw import analyze

        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            source = f.read()

        # Raw metrics
        raw = analyze(source)

        # Cyclomatic complexity per function/class
        cc_results = cc_visit(source)
        complexities = [block.complexity for block in cc_results]
        avg_cc = sum(complexities) / len(complexities) if complexities else 1.0

        # Maintainability Index
        mi = mi_visit(source, multi=True)

        return {
            "cyclomatic_complexity": round(avg_cc, 2),
            "maintainability_index": round(max(0, min(100, mi)), 2),
            "loc": raw.loc,
            "blank_lines": raw.blank,
            "comment_lines": raw.comments,
        }
    except Exception:
        # Fallback to parse-result based computation
        return _compute_generic_complexity(parse_result)


def _compute_generic_complexity(parse_result: ParseResult) -> dict:
    """Compute complexity metrics from parsed data (for JS/TS or Python fallback)."""
    if parse_result.functions:
        avg_cc = sum(f.complexity for f in parse_result.functions) / len(parse_result.functions)
    else:
        avg_cc = 1.0 + parse_result.num_branches * 0.5

    # Estimate maintainability index
    loc = max(1, parse_result.loc)
    halstead_vol = loc * math.log2(max(2, parse_result.num_functions + parse_result.num_imports + 2))
    mi = _safe_maintainability_index(halstead_vol, avg_cc, loc)

    return {
        "cyclomatic_complexity": round(avg_cc, 2),
        "maintainability_index": mi,
        "loc": parse_result.loc,
        "blank_lines": parse_result.blank_lines,
        "comment_lines": parse_result.comment_lines,
    }


def analyze_complexity(file_path: str, parse_result: ParseResult) -> dict:
    """Compute full complexity metrics for a file."""
    if parse_result.language == "python":
        metrics = compute_python_complexity(file_path, parse_result)
    else:
        metrics = _compute_generic_complexity(parse_result)

    # Add function-level stats
    if parse_result.functions:
        func_lengths = [f.loc for f in parse_result.functions]
        metrics["avg_function_length"] = round(sum(func_lengths) / len(func_lengths), 1)
        metrics["max_function_length"] = max(func_lengths)
    else:
        metrics["avg_function_length"] = 0.0
        metrics["max_function_length"] = 0

    metrics["num_functions"] = parse_result.num_functions
    metrics["num_classes"] = parse_result.num_classes
    metrics["max_nesting_depth"] = parse_result.max_nesting_depth
    metrics["num_imports"] = parse_result.num_imports
    metrics["num_branches"] = parse_result.num_branches
    metrics["num_loops"] = parse_result.num_loops

    return metrics

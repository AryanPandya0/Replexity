"""
Complexity Analyzer – computes cyclomatic complexity, maintainability index,
and other metrics using radon for Python and custom logic for JS/TS.
"""
import math
from typing import Dict, List, Tuple

from backend.analysis_engine.code_parser import ParseResult, FunctionInfo


def calculate_halstead_metrics(operators: List[str], operands: List[str]) -> Tuple[float, float, float]:
    """
    Calculate Halstead Metrics:
    n1 = distinct operators, n2 = distinct operands
    N1 = total operators, N2 = total operands
    Vocabulary n = n1 + n2
    Length N = N1 + N2
    Volume V = N * log2(n)
    Difficulty D = (n1 / 2) * (N2 / n2)
    Effort E = D * V
    """
    n1 = len(set(operators))
    n2 = len(set(operands))
    N1 = len(operators)
    N2 = len(operands)

    if n1 == 0 or n2 == 0:
        return 0.0, 0.0, 0.0

    vocabulary = n1 + n2
    length = N1 + N2
    
    volume = length * math.log2(vocabulary) if vocabulary > 0 else 0.0
    difficulty = (n1 / 2.0) * (N2 / float(n2))
    effort = difficulty * volume
    
    return volume, difficulty, effort


def _safe_maintainability_index(halstead_volume: float, cc: float, loc: int) -> float:
    """Compute Maintainability Index (0–100 scale). Higher is better."""
    if loc <= 0:
        return 100.0
    try:
        ln_vol = math.log(halstead_volume) if halstead_volume > 0 else 0
        ln_loc = math.log(loc) if loc > 0 else 0
        mi = max(0.0, float((171 - 5.2 * ln_vol - 0.23 * cc - 16.2 * ln_loc) * 100 / 171))
        return float(f"{min(100.0, float(mi)):.2f}")
    except (ValueError, ZeroDivisionError):
        return 50.0


def compute_python_complexity(file_path: str, parse_result: ParseResult) -> dict:
    """Use radon to compute complexity for Python files."""
    try:
        from radon.complexity import cc_visit
        from radon.metrics import mi_visit
        from radon.raw import analyze

        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            source = f.read()

        # Raw metrics
        raw = analyze(source)

        # Cyclomatic complexity per function/class
        cc_results = cc_visit(source)
        complexities = [block.complexity for block in cc_results]
        avg_cc = float(sum(complexities)) / len(complexities) if complexities else 1.0

        # Maintainability Index
        mi = mi_visit(source, multi=True)

        from radon.metrics import h_visit
        h_metrics = h_visit(source)
        
        cognitive_cc = sum(f.cognitive_complexity for f in parse_result.functions)

        return {
            "cyclomatic_complexity": float(f"{avg_cc:.2f}"),
            "maintainability_index": float(f"{max(0.0, min(100.0, float(mi))):.2f}"),
            "cognitive_complexity": float(cognitive_cc),
            "halstead_volume": h_metrics.total.volume,
            "halstead_difficulty": h_metrics.total.difficulty,
            "halstead_effort": h_metrics.total.effort,
            "loc": raw.loc,
            "blank_lines": raw.blank,
            "comment_lines": raw.comments,
        }
    except Exception:
        # Fallback to parse-result based computation
        return _compute_generic_complexity(parse_result)


def _compute_generic_complexity(parse_result: ParseResult) -> dict:
    """Compute complexity metrics from parsed data (for JS/TS or Python fallback)."""
    avg_cc = sum(f.complexity for f in parse_result.functions) / len(parse_result.functions) if parse_result.functions else 1.0
    cognitive_cc = sum(f.cognitive_complexity for f in parse_result.functions)
    
    # Halstead fallback
    all_operators = []
    all_operands = []
    for f in parse_result.functions:
        all_operators.extend(f.operators)
        all_operands.extend(f.operands)
    
    vol, diff, eff = calculate_halstead_metrics(all_operators, all_operands)

    # Estimate maintainability index
    loc = max(1, parse_result.loc)
    mi = _safe_maintainability_index(vol, float(avg_cc), loc)

    return {
        "cyclomatic_complexity": float(f"{avg_cc:.2f}"),
        "maintainability_index": mi,
        "cognitive_complexity": float(cognitive_cc),
        "halstead_volume": vol,
        "halstead_difficulty": diff,
        "halstead_effort": eff,
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
        metrics["avg_function_length"] = float(f"{sum(func_lengths) / len(func_lengths):.1f}")
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
    metrics["inheritance_depth"] = parse_result.inheritance_depth

    return metrics

from typing import Tuple

"""
Risk Model – AI scoring model that calculates a Risk Score (0-100) for each file.
Uses weighted formula combining multiple normalized metrics.
"""


def _normalize(value: float, low: float, high: float) -> float:
    """Normalize value to 0-100 range."""
    if high <= low:
        return 0.0
    return max(0.0, min(100.0, (value - low) / (high - low) * 100.0))


def _risk_level(score: float) -> str:
    if score < 25:
        return "low"
    elif score < 50:
        return "medium"
    elif score < 75:
        return "high"
    else:
        return "critical"


def calculate_risk_score(
    cyclomatic_complexity: float,
    loc: int,
    max_nesting_depth: int,
    avg_function_length: float,
    num_branches: int,
    num_functions: int = 1,
) -> Tuple[float, str]:
    """
    Calculate Risk Score (0-100) for a file.

    Risk Score =
      (0.35 × normalized complexity)
    + (0.20 × LOC score)
    + (0.20 × nesting depth score)
    + (0.15 × function length score)
    + (0.10 × branch density)

    Returns (risk_score, risk_level)
    """
    # Normalize each metric to 0-100
    complexity_score = _normalize(cyclomatic_complexity, 1, 30)
    loc_score = _normalize(loc, 0, 500)
    nesting_score = _normalize(max_nesting_depth, 0, 8)
    func_length_score = _normalize(avg_function_length, 0, 100)

    # Branch density = branches per function
    branch_density = num_branches / max(1, num_functions)
    branch_score = _normalize(branch_density, 0, 10)

    risk_score = (
        0.35 * complexity_score
        + 0.20 * loc_score
        + 0.20 * nesting_score
        + 0.15 * func_length_score
        + 0.10 * branch_score
    )

    risk_score = round(max(0.0, min(100.0, risk_score)), 2)
    return risk_score, _risk_level(risk_score)

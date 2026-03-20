from typing import Tuple

"""
Risk Model – AI scoring model that calculates a Risk Score (0-100) for each file.
Uses weighted formula combining multiple normalized metrics.
"""

RISK_WEIGHTS = {
    "complexity": 0.20,
    "cognitive": 0.20,
    "loc": 0.20,
    "nesting": 0.15,
    "function_length": 0.15,
    "branch_density": 0.10,
}


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
    cognitive_complexity: float = 0.0,
    num_functions: int = 1,
) -> Tuple[float, str]:
    """
    Calculate Risk Score (0-100) for a file.

    Risk Score =
      (0.20 × normalized complexity)
    + (0.20 × normalized cognitive complexity)
    + (0.20 × LOC score)
    + (0.15 × nesting depth score)
    + (0.15 × function length score)
    + (0.10 × branch density)

    Returns (risk_score, risk_level)
    """
    # Normalize each metric to 0-100
    complexity_score = _normalize(cyclomatic_complexity, 1, 30)
    cognitive_score = _normalize(cognitive_complexity, 0, 50)
    loc_score = _normalize(loc, 0, 500)
    nesting_score = _normalize(max_nesting_depth, 0, 8)
    func_length_score = _normalize(avg_function_length, 0, 100)

    # Branch density = branches per function
    branch_density = num_branches / max(1, num_functions)
    branch_score = _normalize(branch_density, 0, 10)

    risk_score = (
        RISK_WEIGHTS["complexity"] * complexity_score
        + RISK_WEIGHTS["cognitive"] * cognitive_score
        + RISK_WEIGHTS["loc"] * loc_score
        + RISK_WEIGHTS["nesting"] * nesting_score
        + RISK_WEIGHTS["function_length"] * func_length_score
        + RISK_WEIGHTS["branch_density"] * branch_score
    )

    risk_score = float(f"{max(0.0, min(100.0, risk_score)):.2f}")
    return risk_score, _risk_level(risk_score)

"""
Bug Predictor – rule-based heuristic system that predicts potential bug hotspots.
Outputs a Bug Risk Probability (%) based on multiple risk indicators.
"""


def predict_bug_risk(
    cyclomatic_complexity: float,
    max_nesting_depth: int,
    avg_function_length: float,
    max_function_length: int,
    num_branches: int,
    loc: int,
    num_functions: int,
    comment_lines: int,
) -> float:
    """
    Predict bug risk probability (0-100%) based on code characteristics.

    Patterns indicating bugs:
    - High cyclomatic complexity (>15)
    - Deeply nested conditions (>4)
    - Long functions (>50 lines)
    - Excessive branching (>20 branches)
    - Low comment ratio
    - High code density
    """
    risk = 0.0

    # High complexity → bug-prone
    if cyclomatic_complexity > 25:
        risk += 25
    elif cyclomatic_complexity > 15:
        risk += 18
    elif cyclomatic_complexity > 10:
        risk += 10
    elif cyclomatic_complexity > 5:
        risk += 5

    # Deep nesting → hard to follow
    if max_nesting_depth > 6:
        risk += 20
    elif max_nesting_depth > 4:
        risk += 12
    elif max_nesting_depth > 3:
        risk += 6

    # Long functions → harder to maintain
    if max_function_length > 100:
        risk += 18
    elif max_function_length > 50:
        risk += 10
    elif max_function_length > 30:
        risk += 5

    # Average function length
    if avg_function_length > 60:
        risk += 10
    elif avg_function_length > 30:
        risk += 5

    # Excessive branching
    branch_density = num_branches / max(1, num_functions)
    if branch_density > 8:
        risk += 12
    elif branch_density > 5:
        risk += 7
    elif branch_density > 3:
        risk += 3

    # Large file
    if loc > 500:
        risk += 8
    elif loc > 300:
        risk += 4

    # Low comment ratio → less documented
    if loc > 20:
        comment_ratio = comment_lines / max(1, loc)
        if comment_ratio < 0.02:
            risk += 7
        elif comment_ratio < 0.05:
            risk += 3

    return round(min(100.0, max(0.0, risk)), 1)

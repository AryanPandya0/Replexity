"""
Health Score Calculator – computes a global project Code Health Score (0-100).
"""


def calculate_health_score(
    avg_complexity: float,
    avg_maintainability: float,
    risk_distribution: dict[str, int],
    total_smells: int,
    total_files: int,
) -> float:
    """
    Calculate global Code Health Score (0-100).

    Based on:
    - Average complexity (lower is better)
    - Average maintainability index (higher is better)
    - Risk distribution (fewer high/critical is better)
    - Code smells per file (fewer is better)
    """
    if total_files == 0:
        return 100.0

    # Component 1: Complexity score (0-30 points)
    # CC <= 5 is excellent, CC >= 20 is terrible
    if avg_complexity <= 3:
        complexity_points = 30
    elif avg_complexity <= 5:
        complexity_points = 25
    elif avg_complexity <= 10:
        complexity_points = 20
    elif avg_complexity <= 15:
        complexity_points = 12
    elif avg_complexity <= 20:
        complexity_points = 5
    else:
        complexity_points = 0

    # Component 2: Maintainability (0-30 points)
    maintainability_points = min(30, avg_maintainability * 0.3)

    # Component 3: Risk distribution (0-25 points)
    total = max(1, sum(risk_distribution.values()))
    low_pct = risk_distribution.get("low", 0) / total
    medium_pct = risk_distribution.get("medium", 0) / total
    high_pct = risk_distribution.get("high", 0) / total
    critical_pct = risk_distribution.get("critical", 0) / total

    risk_points = 25 * (low_pct * 1.0 + medium_pct * 0.6 + high_pct * 0.2 + critical_pct * 0.0)

    # Component 4: Code smell density (0-15 points)
    smell_per_file = total_smells / max(1, total_files)
    if smell_per_file <= 0.5:
        smell_points = 15
    elif smell_per_file <= 1.0:
        smell_points = 12
    elif smell_per_file <= 2.0:
        smell_points = 8
    elif smell_per_file <= 3.0:
        smell_points = 4
    else:
        smell_points = 0

    health = complexity_points + maintainability_points + risk_points + smell_points
    return round(max(0.0, min(100.0, health)), 1)

"""
Refactoring Suggestion Engine – generates actionable refactoring suggestions
based on detected code smells, complexity metrics, and risk scores.
"""
from typing import List
from dataclasses import dataclass


@dataclass
class Suggestion:
    file: str
    function: str | None
    issue: str
    suggestion: str
    priority: str  # "low", "medium", "high", "critical"


def _priority_from_risk(risk_score: float) -> str:
    if risk_score >= 75:
        return "critical"
    elif risk_score >= 50:
        return "high"
    elif risk_score >= 25:
        return "medium"
    return "low"


def generate_suggestions(
    file_path: str,
    complexity_metrics: dict,
    risk_score: float,
    parse_result=None,
) -> List[Suggestion]:
    """Generate refactoring suggestions for a file."""
    suggestions: List[Suggestion] = []
    priority = _priority_from_risk(risk_score)

    loc = complexity_metrics.get("loc", 0)
    nesting = complexity_metrics.get("max_nesting_depth", 0)
    mi = complexity_metrics.get("maintainability_index", 100)

    # ── Split large functions ───────────────────────────────────
    if parse_result and parse_result.functions:
        for func in parse_result.functions:
            if func.loc > 50:
                suggestions.append(Suggestion(
                    file=file_path,
                    function=func.name,
                    issue="Long function",
                    suggestion=(
                        f"Split `{func.name}` ({func.loc} lines) into smaller functions. "
                        f"Identify logical blocks and extract them as separate, well-named helpers."
                    ),
                    priority=priority,
                ))

            if func.complexity > 10:
                suggestions.append(Suggestion(
                    file=file_path,
                    function=func.name,
                    issue="Complex function",
                    suggestion=(
                        f"Reduce complexity of `{func.name}` (CC={func.complexity}). "
                        f"Use early returns to eliminate nesting, extract conditional blocks, "
                        f"or apply the Strategy pattern for complex branching."
                    ),
                    priority=priority,
                ))

            if func.nesting_depth > 3:
                suggestions.append(Suggestion(
                    file=file_path,
                    function=func.name,
                    issue="Deeply nested logic",
                    suggestion=(
                        f"Reduce nesting in `{func.name}` (depth={func.nesting_depth}). "
                        f"Use guard clauses, invert conditions, or extract inner blocks into functions."
                    ),
                    priority=priority,
                ))

            if func.parameters > 4:
                suggestions.append(Suggestion(
                    file=file_path,
                    function=func.name,
                    issue="Too many parameters",
                    suggestion=(
                        f"Function `{func.name}` has {func.parameters} parameters. "
                        f"Group related parameters into a data class or configuration object."
                    ),
                    priority="medium",
                ))

    # ── File-level suggestions ──────────────────────────────────
    if loc > 400:
        suggestions.append(Suggestion(
            file=file_path,
            function=None,
            issue="Large file",
            suggestion=(
                f"File is {loc} lines. Modularize by extracting related functionality "
                f"into separate modules with clear interfaces."
            ),
            priority=priority,
        ))

    if mi < 40:
        suggestions.append(Suggestion(
            file=file_path,
            function=None,
            issue="Low maintainability",
            suggestion=(
                f"Maintainability Index is {mi:.0f}/100. Improve by adding documentation, "
                f"reducing complexity, shortening functions, and breaking up the file."
            ),
            priority="high",
        ))

    if nesting > 5 and not any(s.issue == "Deeply nested logic" for s in suggestions):
        suggestions.append(Suggestion(
            file=file_path,
            function=None,
            issue="File-level deep nesting",
            suggestion=(
                f"Max nesting depth is {nesting}. Flatten control flow using early returns, "
                f"guard clauses, and smaller helper functions."
            ),
            priority=priority,
        ))

    return suggestions

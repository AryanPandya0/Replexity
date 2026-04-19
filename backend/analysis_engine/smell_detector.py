"""
Code Smell Detector – detects common single-file code smells.
Smells: Long Method, Large Class, Deep Nesting, God Object, High Complexity, Long File.
Note: Duplicate code detection is handled by clone_detector.py.
"""
from typing import List
from dataclasses import dataclass

from backend.analysis_engine.code_parser import ParseResult


@dataclass
class SmellResult:
    file: str
    issue: str
    function: str | None
    line: int | None
    suggestion: str


# ── Thresholds ──────────────────────────────────────────────────

LONG_METHOD_LOC = 40
LARGE_CLASS_METHODS = 15
DEEP_NESTING_DEPTH = 4
GOD_OBJECT_LOC = 400
GOD_OBJECT_FUNCTIONS = 20
MANY_PARAMETERS = 5
LONG_FILE_LOC = 300


def detect_smells(file_path: str, parse_result: ParseResult, complexity_metrics: dict) -> List[SmellResult]:
    """Detect code smells in a parsed file."""
    smells: List[SmellResult] = []
    rel_path = file_path  # Will be made relative by the caller

    # ── Long Method ─────────────────────────────────────────────
    for func in parse_result.functions:
        if func.loc > LONG_METHOD_LOC:
            smells.append(SmellResult(
                file=rel_path,
                issue="Long Method",
                function=func.name,
                line=func.line_start,
                suggestion=f"Function `{func.name}` is {func.loc} lines long. "
                           f"Break it into smaller, focused functions (aim for <{LONG_METHOD_LOC} lines).",
            ))

    # ── Too Many Parameters ─────────────────────────────────────
    for func in parse_result.functions:
        if func.parameters > MANY_PARAMETERS:
            smells.append(SmellResult(
                file=rel_path,
                issue="Too Many Parameters",
                function=func.name,
                line=func.line_start,
                suggestion=f"Function `{func.name}` takes {func.parameters} parameters. "
                           f"Consider using a configuration object or data class instead.",
            ))

    # ── Deep Nesting ────────────────────────────────────────────
    for func in parse_result.functions:
        if func.nesting_depth > DEEP_NESTING_DEPTH:
            smells.append(SmellResult(
                file=rel_path,
                issue="Deep Nesting",
                function=func.name,
                line=func.line_start,
                suggestion=f"Function `{func.name}` has nesting depth {func.nesting_depth}. "
                           f"Use early returns, guard clauses, or extract nested logic into helper functions.",
            ))

    # ── God Object (file-level) ─────────────────────────────────
    loc = complexity_metrics.get("loc", parse_result.loc)
    num_funcs = parse_result.num_functions

    if loc > GOD_OBJECT_LOC and num_funcs > GOD_OBJECT_FUNCTIONS:
        smells.append(SmellResult(
            file=rel_path,
            issue="God Object",
            function=None,
            line=None,
            suggestion=f"File has {loc} LOC and {num_funcs} functions. "
                       f"Split into multiple modules with single responsibilities.",
        ))

    # ── Large Class ─────────────────────────────────────────────
    if parse_result.num_classes > 0 and num_funcs > LARGE_CLASS_METHODS:
        smells.append(SmellResult(
            file=rel_path,
            issue="Large Class",
            function=None,
            line=None,
            suggestion=f"File contains {parse_result.num_classes} class(es) with {num_funcs} methods. "
                       f"Consider extracting into smaller, focused classes.",
        ))

    # ── High Complexity Functions ───────────────────────────────
    for func in parse_result.functions:
        if func.complexity > 15:
            smells.append(SmellResult(
                file=rel_path,
                issue="High Complexity",
                function=func.name,
                line=func.line_start,
                suggestion=f"Function `{func.name}` has cyclomatic complexity {func.complexity}. "
                           f"Simplify conditional logic, use strategy pattern, or extract methods.",
            ))

    # ── Long File ───────────────────────────────────────────────
    if loc > LONG_FILE_LOC and not any(s.issue == "God Object" for s in smells):
        smells.append(SmellResult(
            file=rel_path,
            issue="Long File",
            function=None,
            line=None,
            suggestion=f"File is {loc} lines long. Consider splitting into smaller modules.",
        ))

    return smells

"""
Unit tests for the complexity analyzer logic.
"""
import pytest
from backend.analysis_engine.code_parser import ParseResult, FunctionInfo  # type: ignore
from backend.analysis_engine.complexity_analyzer import _safe_maintainability_index, calculate_halstead_metrics, _compute_generic_complexity  # type: ignore

def test_halstead_metrics_empty():
    vol, diff, eff = calculate_halstead_metrics([], [])
    assert vol == 0.0
    assert diff == 0.0
    assert eff == 0.0

def test_halstead_metrics_basic():
    # 2 distinct operators, 3 distinct operands
    # total ops: 3, total operands: 4
    opers = ["+", "-", "+"]
    ops = ["a", "b", "c", "b"]
    vol, diff, eff = calculate_halstead_metrics(opers, ops)
    # Vocab n = 2 + 3 = 5
    # Length N = 3 + 4 = 7
    # Vol = 7 * log2(5) ~= 16.25
    assert 16.0 < vol < 16.5
    # Diff = (2/2) * (4/3) = 1.333
    assert 1.3 < diff < 1.4
    # Eff = diff * vol
    assert 21.0 < eff < 22.0

def test_maintainability_index():
    # Zero LOC edge case
    assert _safe_maintainability_index(10.0, 5.0, 0) == 100.0

    # Normal values
    mi = _safe_maintainability_index(halstead_volume=100.0, cc=10.0, loc=50)
    assert 0 <= mi <= 100.0

def test_generic_complexity():
    # Mock parse result
    func1 = FunctionInfo(name="f1", complexity=5, cognitive_complexity=3, loc=10)
    func2 = FunctionInfo(name="f2", complexity=3, cognitive_complexity=2, loc=5)
    
    pr = ParseResult(
        file_path="mock.ts",
        language="typescript",
        loc=25,
        num_functions=2,
        max_nesting_depth=2,
        functions=[func1, func2]
    )

    result = _compute_generic_complexity(pr)
    
    assert result["cyclomatic_complexity"] == 4.0  # (5+3)/2
    assert result["cognitive_complexity"] == 5.0   # 3+2
    assert result["loc"] == 25

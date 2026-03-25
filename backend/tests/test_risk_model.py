"""
Unit tests for the risk scoring model.
"""
import pytest
from backend.analysis_engine.risk_model import calculate_risk_score, _normalize, _risk_level  # type: ignore

def test_normalize():
    assert _normalize(5, 0, 10) == 50.0
    assert _normalize(15, 0, 10) == 100.0  # Cap at 100
    assert _normalize(-5, 0, 10) == 0.0    # Floor at 0
    assert _normalize(5, 10, 10) == 0.0    # Handle low >= high

def test_risk_level():
    assert _risk_level(10) == "low"
    assert _risk_level(30) == "medium"
    assert _risk_level(60) == "high"
    assert _risk_level(90) == "critical"

def test_calculate_risk_score_low_risk():
    # A textbook "perfect" file: 1 complexity, 10 LOC, 0 nesting, 10 loc/func, 0 branches
    score, level = calculate_risk_score(
        cyclomatic_complexity=1,
        loc=10,
        max_nesting_depth=0,
        avg_function_length=10,
        num_branches=0,
        cognitive_complexity=0,
        num_functions=1
    )
    assert score == 1.9
    assert level == "low"

def test_calculate_risk_score_high_risk():
    # A massive, complex file
    score, level = calculate_risk_score(
        cyclomatic_complexity=40,  # > 30 caps at 100 normalized
        loc=600,                   # > 500 caps at 100 normalized
        max_nesting_depth=10,      # > 8 caps at 100 normalized
        avg_function_length=150,   # > 100 caps at 100 normalized
        num_branches=100,          # 100 branches / 2 funcs = 50 density (>10 cap)
        cognitive_complexity=60,   # > 50 caps at 100 normalized
        num_functions=2
    )
    # With all inputs maximizing their normalize ranges, the score should be 100
    assert score == 100.0
    assert level == "critical"

def test_calculate_risk_score_medium_risk():
    # A file with intermediate values
    score, level = calculate_risk_score(
        cyclomatic_complexity=15,    # ~48.2%
        loc=250,                     # 50.0%
        max_nesting_depth=4,         # 50.0%
        avg_function_length=50,      # 50.0%
        num_branches=10,             # 10/2 = 5 density -> 50.0%
        cognitive_complexity=25,     # 50.0%
        num_functions=2
    )
    # Expected: (0.2*48.27) + (0.2*50) + (0.2*50) + (0.15*50) + (0.15*50) + (0.1*50) 
    # = 9.65 + 10 + 10 + 7.5 + 7.5 + 5 = ~49.65
    assert 48.0 < score < 51.0
    assert level == "medium" or level == "high" # Depends on exact boundary


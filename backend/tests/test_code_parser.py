"""
Unit tests for the tree-sitter code parser.
"""
import pytest
import os
from backend.analysis_engine.code_parser import parse_file  # type: ignore

PYTHON_SAMPLE = """
import math
from typing import List

class Calculator:
    def evaluate(self, expr: str) -> int:
        # Evaluate things
        if not expr:
            return 0
        for char in expr:
            if char.isdigit():
                pass
        return 42

def global_fn():
    return True
"""

TYPESCRIPT_SAMPLE = """
import { useState } from 'react';

export class Manager extends BaseManager {
    compute(val: number): string {
        if (val > 10) {
            return "high";
        } else {
            return "low";
        }
    }
}

const arrowFunc = () => {
    while(true) {
        break;
    }
}
"""

def test_parse_python(tmp_path):
    py_file = tmp_path / "sample.py"
    py_file.write_text(PYTHON_SAMPLE, encoding="utf-8")

    result = parse_file(str(py_file))

    assert result.language == "python"
    assert result.num_classes == 1
    assert result.num_functions == 2  # evaluate, global_fn
    assert result.num_imports >= 2    # import nodes
    
    # Check imports extraction accuracy
    assert "math" in result.imports
    assert "typing" in result.imports

    # Check function details
    eval_func = next(f for f in result.functions if f.name == "evaluate")
    assert eval_func.branches == 2 # two 'if' statements
    assert eval_func.loops == 1    # the 'for'
    assert eval_func.parameters == 2 # self, expr

def test_parse_typescript(tmp_path):
    ts_file = tmp_path / "test.ts"
    ts_file.write_text(TYPESCRIPT_SAMPLE, encoding="utf-8")

    result = parse_file(str(ts_file))

    assert result.language == "typescript"
    assert result.num_classes == 1
    assert result.num_functions == 2     # compute, arrowFunc
    assert result.num_imports >= 1

    compute_func = next(f for f in result.functions if f.name == "compute")
    assert compute_func.branches == 1    # the 'if' 

def test_parse_unsupported(tmp_path):
    txt_file = tmp_path / "hello.txt"
    txt_file.write_text("hello", encoding="utf-8")

    with pytest.raises(ValueError, match="Unsupported file extension"):
        parse_file(str(txt_file))

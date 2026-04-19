"""
Tests for the clone_detector module.
"""
import pytest
from backend.analysis_engine.clone_detector import (
    ClonePair,
    _normalize_line,
    _normalize_source,
    detect_clones,
)


# ── Normalization Tests ─────────────────────────────────────────

class TestNormalizeLine:
    def test_identifiers_replaced(self):
        """Non-keyword identifiers should be replaced with $V."""
        result = _normalize_line("result = calculate(x, y)")
        assert "$V" in result
        # Keywords should be kept
        assert "=" in result

    def test_keywords_preserved(self):
        """Language keywords must NOT be replaced."""
        result = _normalize_line("if x > 0:")
        assert "if" in result

    def test_strings_replaced(self):
        """String literals should become $S."""
        result = _normalize_line('message = "hello world"')
        assert "$S" in result
        assert "hello" not in result

    def test_numbers_replaced(self):
        """Numeric literals should become $N."""
        result = _normalize_line("threshold = 42.5")
        assert "$N" in result
        assert "42" not in result

    def test_comments_stripped(self):
        """Single-line comments should be removed."""
        py_result = _normalize_line("x = 10  # initialize counter")
        assert "#" not in py_result
        assert "initialize" not in py_result

        js_result = _normalize_line("const x = 10; // initialize")
        assert "//" not in js_result

    def test_whitespace_collapsed(self):
        """Excess whitespace should be collapsed."""
        result = _normalize_line("  x   =    y  +   z  ")
        assert "  " not in result  # No double spaces


class TestNormalizeSource:
    def test_trivial_lines_skipped(self):
        """Brace-only, empty, and trivial lines should be skipped."""
        source = "{\n\n  }\n  x = 1\n"
        result = _normalize_source(source)
        # Only the meaningful line should remain
        assert len(result) == 1
        assert result[0][1] == 4  # original line number

    def test_line_numbers_preserved(self):
        """Returned tuples should map to original 1-indexed line numbers."""
        source = "a = 1\n\nb = 2\nc = 3"
        result = _normalize_source(source)
        line_nums = [r[1] for r in result]
        assert 1 in line_nums
        assert 3 in line_nums
        assert 4 in line_nums


# ── Clone Detection Tests ───────────────────────────────────────

class TestDetectClones:
    def test_exact_duplicate_across_files(self):
        """Identical code blocks in two files should be detected."""
        shared_block = "\n".join([
            "def process_data(items):",
            "    results = []",
            "    for item in items:",
            "        if item.is_valid():",
            "            value = item.compute()",
            "            results.append(value)",
            "        else:",
            "            results.append(None)",
            "    return results",
        ])

        file_a = f"import os\n\n{shared_block}\n\ndef other_func():\n    pass\n"
        file_b = f"import sys\n\n{shared_block}\n\ndef different():\n    return 42\n"

        clones = detect_clones({"a.py": file_a, "b.py": file_b}, min_lines=6)
        assert len(clones) >= 1

        clone = clones[0]
        assert clone.num_lines >= 6
        assert {clone.file_a, clone.file_b} == {"a.py", "b.py"}

    def test_renamed_variable_clones(self):
        """Clones with renamed variables (Type-2) should still be caught."""
        block_a = "\n".join([
            "def calculate_sum(numbers):",
            "    total = 0",
            "    for num in numbers:",
            "        if num > 0:",
            "            total = total + num",
            "            count = count + 1",
            "        else:",
            "            skipped = skipped + 1",
            "    return total",
        ])

        block_b = "\n".join([
            "def compute_total(values):",
            "    result = 0",
            "    for val in values:",
            "        if val > 0:",
            "            result = result + val",
            "            counter = counter + 1",
            "        else:",
            "            ignored = ignored + 1",
            "    return result",
        ])

        file_a = f"import math\n\n{block_a}\n"
        file_b = f"import os\n\n{block_b}\n"

        clones = detect_clones({"a.py": file_a, "b.py": file_b}, min_lines=6)
        assert len(clones) >= 1, "Type-2 (renamed) clones should be detected"

    def test_short_blocks_ignored(self):
        """Blocks shorter than min_lines should NOT be reported."""
        # Only 3 matching lines
        short_block = "x = 1\ny = 2\nz = 3"

        file_a = f"import os\n{short_block}\ndef foo():\n    pass\n"
        file_b = f"import sys\n{short_block}\ndef bar():\n    return 1\n"

        clones = detect_clones({"a.py": file_a, "b.py": file_b}, min_lines=6)
        assert len(clones) == 0, "Short blocks should be ignored"

    def test_no_false_positives_on_different_code(self):
        """Completely different files should produce no clones."""
        file_a = "\n".join([
            "def alpha():",
            "    x = compute_alpha()",
            "    if x > threshold:",
            "        return transform(x)",
            "    return default_value()",
            "",
            "class AlphaProcessor:",
            "    def run(self):",
            "        return self.alpha()",
        ])

        file_b = "\n".join([
            "async function fetchData(url) {",
            "  const response = await fetch(url);",
            "  const data = await response.json();",
            "  if (!data.success) {",
            "    throw new Error('Failed');",
            "  }",
            "  return data.items.map(i => i.value);",
            "}",
        ])

        clones = detect_clones({"a.py": file_a, "b.js": file_b}, min_lines=6)
        assert len(clones) == 0

    def test_intra_file_duplicates(self):
        """Duplicated blocks within the SAME file should be caught."""
        block = "\n".join([
            "    results = []",
            "    for item in items:",
            "        if item.check():",
            "            val = item.process()",
            "            results.append(val)",
            "        else:",
            "            results.append(None)",
            "    return results",
        ])

        source = f"def func_one(items):\n{block}\n\ndef func_two(items):\n{block}\n"

        clones = detect_clones({"module.py": source}, min_lines=6)
        assert len(clones) >= 1
        assert clones[0].file_a == clones[0].file_b == "module.py"

    def test_empty_input(self):
        """Empty input should return no clones."""
        assert detect_clones({}) == []
        assert detect_clones({"a.py": ""}) == []

    def test_clone_pair_fields(self):
        """ClonePair should have correct field values."""
        shared = "\n".join([
            "def handler(request):",
            "    data = request.get_json()",
            "    if not data:",
            "        return error_response()",
            "    result = process(data)",
            "    log_activity(result)",
            "    return success_response(result)",
        ])

        file_a = f"{shared}\n"
        file_b = f"# header\n\n{shared}\n"

        clones = detect_clones({"a.py": file_a, "b.py": file_b}, min_lines=6)
        assert len(clones) >= 1

        c = clones[0]
        assert isinstance(c, ClonePair)
        assert c.num_lines >= 6
        assert c.similarity == 1.0
        assert c.start_a >= 1
        assert c.start_b >= 1
        assert c.end_a >= c.start_a
        assert c.end_b >= c.start_b

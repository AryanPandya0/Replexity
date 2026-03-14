"""
Code Parser – AST-based parsing for Python, heuristic parsing for JS/TS.
Extracts functions, classes, nesting depth, branches, loops, imports.
"""
import ast
import re
import os
from dataclasses import dataclass, field


@dataclass
class FunctionInfo:
    name: str
    line_start: int
    line_end: int
    loc: int
    nesting_depth: int = 0
    parameters: int = 0
    complexity: int = 1
    branches: int = 0
    loops: int = 0


@dataclass
class ParseResult:
    file_path: str
    language: str
    loc: int = 0
    blank_lines: int = 0
    comment_lines: int = 0
    num_functions: int = 0
    num_classes: int = 0
    num_imports: int = 0
    num_branches: int = 0
    num_loops: int = 0
    max_nesting_depth: int = 0
    functions: list = field(default_factory=list)


# ── Python Parser ───────────────────────────────────────────────

class _PythonNestingVisitor(ast.NodeVisitor):
    """Walk the AST and compute max nesting depth + branch/loop counts."""

    def __init__(self):
        self.max_depth = 0
        self.branches = 0
        self.loops = 0

    def _visit_block(self, node, depth=0):
        for child in ast.iter_child_nodes(node):
            child_depth = depth
            if isinstance(child, (ast.If, ast.IfExp)):
                self.branches += 1
                child_depth = depth + 1
            elif isinstance(child, (ast.For, ast.While, ast.AsyncFor)):
                self.loops += 1
                child_depth = depth + 1
            elif isinstance(child, (ast.With, ast.AsyncWith, ast.Try)):
                child_depth = depth + 1
            self.max_depth = max(self.max_depth, child_depth)
            self._visit_block(child, child_depth)

    def visit(self, node):
        self._visit_block(node)


def _get_func_nesting(node: ast.AST) -> int:
    """Get max nesting depth inside a single function."""
    visitor = _PythonNestingVisitor()
    visitor.visit(node)
    return visitor.max_depth


def _count_func_complexity(node: ast.AST) -> tuple[int, int, int]:
    """Return (complexity, branches, loops) for a function node."""
    complexity = 1
    branches = 0
    loops = 0
    for child in ast.walk(node):
        if isinstance(child, (ast.If, ast.IfExp)):
            complexity += 1
            branches += 1
        elif isinstance(child, (ast.For, ast.While, ast.AsyncFor)):
            complexity += 1
            loops += 1
        elif isinstance(child, ast.ExceptHandler):
            complexity += 1
        elif isinstance(child, (ast.And, ast.Or)):
            complexity += 1
        elif isinstance(child, ast.Assert):
            complexity += 1
    return complexity, branches, loops


def parse_python(file_path: str) -> ParseResult:
    """Parse a Python file using the ast module."""
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        source = f.read()
    lines = source.splitlines()

    result = ParseResult(file_path=file_path, language="python")
    result.loc = sum(1 for l in lines if l.strip())
    result.blank_lines = sum(1 for l in lines if not l.strip())
    result.comment_lines = sum(1 for l in lines if l.strip().startswith("#"))

    try:
        tree = ast.parse(source, filename=file_path)
    except SyntaxError:
        return result

    # Count imports
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            result.num_imports += 1

    # Whole-file nesting / branches / loops
    visitor = _PythonNestingVisitor()
    visitor.visit(tree)
    result.max_nesting_depth = visitor.max_depth
    result.num_branches = visitor.branches
    result.num_loops = visitor.loops

    # Extract classes
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            result.num_classes += 1

    # Extract functions
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            end_line = getattr(node, "end_lineno", node.lineno + 1)
            func_loc = max(1, end_line - node.lineno + 1)
            complexity, branches, loops = _count_func_complexity(node)
            nesting = _get_func_nesting(node)
            fi = FunctionInfo(
                name=node.name,
                line_start=node.lineno,
                line_end=end_line,
                loc=func_loc,
                nesting_depth=nesting,
                parameters=len(node.args.args),
                complexity=complexity,
                branches=branches,
                loops=loops,
            )
            result.functions.append(fi)
            result.num_functions += 1

    return result


# ── JavaScript / TypeScript Parser ──────────────────────────────

_JS_FUNC_PATTERNS = [
    re.compile(r"(?:^|\s)function\s+(\w+)\s*\(([^)]*)\)", re.MULTILINE),
    re.compile(r"(?:^|\s)(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|(\w+))\s*=>", re.MULTILINE),
    re.compile(r"(?:^|\s)(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{", re.MULTILINE),
]
_JS_CLASS_PATTERN = re.compile(r"(?:^|\s)class\s+(\w+)", re.MULTILINE)
_JS_IMPORT_PATTERN = re.compile(r"(?:^|\s)(?:import\s|const\s+\w+\s*=\s*require)", re.MULTILINE)
_JS_BRANCH_KEYWORDS = re.compile(r"\b(if|else\s+if|switch|case|\?\s*.*:)\b")
_JS_LOOP_KEYWORDS = re.compile(r"\b(for|while|do)\b")


def _js_nesting_depth(source: str) -> int:
    """Estimate max nesting depth by tracking braces."""
    max_depth = 0
    depth = 0
    in_string = None
    prev_char = ""
    for ch in source:
        if in_string:
            if ch == in_string and prev_char != "\\":
                in_string = None
        else:
            if ch in ('"', "'", "`"):
                in_string = ch
            elif ch == "{":
                depth += 1
                max_depth = max(max_depth, depth)
            elif ch == "}":
                depth = max(0, depth - 1)
        prev_char = ch
    return max_depth


def _extract_js_functions(source: str, lines: list[str]) -> list[FunctionInfo]:
    """Extract function info from JS/TS source using regex."""
    functions: list[FunctionInfo] = []
    seen_names: set[str] = set()

    for pattern in _JS_FUNC_PATTERNS:
        for match in pattern.finditer(source):
            name = match.group(1)
            if name in seen_names or name in ("if", "for", "while", "switch", "class", "return", "else"):
                continue
            seen_names.add(name)

            start_pos = match.start()
            line_start = source[:start_pos].count("\n") + 1

            # Find the function body end by tracking braces
            brace_start = source.find("{", match.end())
            if brace_start == -1:
                # Arrow function without braces
                line_end = line_start + 1
            else:
                depth = 0
                pos = brace_start
                while pos < len(source):
                    if source[pos] == "{":
                        depth += 1
                    elif source[pos] == "}":
                        depth -= 1
                        if depth == 0:
                            break
                    pos += 1
                line_end = source[:pos + 1].count("\n") + 1

            func_loc = max(1, line_end - line_start + 1)
            func_source = "\n".join(lines[line_start - 1:line_end])
            branches = len(_JS_BRANCH_KEYWORDS.findall(func_source))
            loops = len(_JS_LOOP_KEYWORDS.findall(func_source))
            complexity = 1 + branches + loops
            nesting = _js_nesting_depth(func_source)

            # Count parameters
            params_match = re.search(r"\(([^)]*)\)", match.group(0))
            param_count = 0
            if params_match and params_match.group(1).strip():
                param_count = len([p for p in params_match.group(1).split(",") if p.strip()])

            functions.append(FunctionInfo(
                name=name,
                line_start=line_start,
                line_end=line_end,
                loc=func_loc,
                nesting_depth=max(0, nesting - 1),  # subtract function's own brace level
                parameters=param_count,
                complexity=complexity,
                branches=branches,
                loops=loops,
            ))

    return functions


def parse_javascript(file_path: str) -> ParseResult:
    """Parse a JavaScript or TypeScript file using regex/heuristic analysis."""
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        source = f.read()
    lines = source.splitlines()
    ext = os.path.splitext(file_path)[1].lower()
    lang = "typescript" if ext in (".ts", ".tsx") else "javascript"

    result = ParseResult(file_path=file_path, language=lang)
    result.loc = sum(1 for l in lines if l.strip())
    result.blank_lines = sum(1 for l in lines if not l.strip())
    result.comment_lines = sum(
        1 for l in lines if l.strip().startswith("//") or l.strip().startswith("/*") or l.strip().startswith("*")
    )
    result.num_imports = len(_JS_IMPORT_PATTERN.findall(source))
    result.num_classes = len(_JS_CLASS_PATTERN.findall(source))
    result.num_branches = len(_JS_BRANCH_KEYWORDS.findall(source))
    result.num_loops = len(_JS_LOOP_KEYWORDS.findall(source))
    result.max_nesting_depth = max(0, _js_nesting_depth(source) - 1)

    result.functions = _extract_js_functions(source, lines)
    result.num_functions = len(result.functions)

    return result


# ── Dispatcher ──────────────────────────────────────────────────

def parse_file(file_path: str) -> ParseResult:
    """Parse a source file based on its extension."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".py":
        return parse_python(file_path)
    elif ext in (".js", ".jsx", ".ts", ".tsx"):
        return parse_javascript(file_path)
    else:
        raise ValueError(f"Unsupported file extension: {ext}")

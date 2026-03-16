"""
Code Parser – AST-based parsing for Python, heuristic parsing for JS/TS.
Extracts functions, classes, nesting depth, branches, loops, imports.
"""
from typing import List, Set, Tuple

import ast
import os
import re
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
    cognitive_complexity: int = 0
    operators: List[str] = field(default_factory=list)
    operands: List[str] = field(default_factory=list)


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
    inheritance_depth: int = 0
    imports: Set[str] = field(default_factory=set)
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


class _PythonCognitiveVisitor(ast.NodeVisitor):
    """Computes Cognitive Complexity by weighting increments of control flow."""

    def __init__(self):
        self.complexity = 0
        self.nesting = 0

    def visit_Block(self, nodes):
        for node in nodes:
            self.visit(node)

    def visit_If(self, node):
        self.complexity += 1 + self.nesting
        self.nesting += 1
        self.visit(node.test)
        self.visit_Block(node.body)
        if node.orelse:
            # else if doesn't increment nesting further but else/elif does increment complexity
            if isinstance(node.orelse[0], ast.If):
                # elif: handled by the next visit_If
                self.nesting -= 1 # adjust to stay same level
                self.visit_Block(node.orelse)
                self.nesting += 1
            else:
                self.complexity += 1
                self.visit_Block(node.orelse)
        self.nesting -= 1

    def visit_For(self, node):
        self.complexity += 1 + self.nesting
        self.nesting += 1
        self.visit_Block(node.body)
        self.nesting -= 1

    def visit_While(self, node):
        self.complexity += 1 + self.nesting
        self.nesting += 1
        self.visit_Block(node.body)
        self.nesting -= 1

    def visit_ExceptHandler(self, node):
        self.complexity += 1 + self.nesting
        self.nesting += 1
        self.visit_Block(node.body)
        self.nesting -= 1

    def visit_BoolOp(self, node):
        # Sequences of boolean operators increment complexity
        self.complexity += len(node.values) - 1
        for value in node.values:
            self.visit(value)


def _get_halstead_data(node: ast.AST) -> Tuple[List[str], List[str]]:
    """Extract operators and operands for Halstead metrics."""
    operators = []
    operands = []
    for child in ast.walk(node):
        if isinstance(child, (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Mod, ast.Pow, ast.LShift, ast.RShift, ast.BitOr, ast.BitXor, ast.BitAnd, ast.FloorDiv)):
            operators.append(child.__class__.__name__)
        elif isinstance(child, (ast.And, ast.Or, ast.Not)):
            operators.append(child.__class__.__name__)
        elif isinstance(child, (ast.Eq, ast.NotEq, ast.Lt, ast.LtE, ast.Gt, ast.GtE, ast.Is, ast.IsNot, ast.In, ast.NotIn)):
            operators.append(child.__class__.__name__)
        elif isinstance(child, (ast.Name, ast.Attribute)):
            operands.append(getattr(child, "id", getattr(child, "attr", "")))
        elif isinstance(child, ast.Constant):
            operands.append(str(child.value))
    return operators, operands


def _get_func_nesting(node: ast.AST) -> int:
    """Get max nesting depth inside a single function."""
    visitor = _PythonNestingVisitor()
    visitor.visit(node)
    return visitor.max_depth


def _count_func_complexity(node: ast.AST) -> Tuple[int, int, int]:
    """Return (complexity, branches, loops) for a function node."""
    complexity: int = 1
    branches: int = 0
    loops: int = 0
    for child in ast.walk(node):
        if isinstance(child, (ast.If, ast.IfExp)):
            complexity = complexity + 1  # type: ignore
            branches = branches + 1  # type: ignore
        elif isinstance(child, (ast.For, ast.While, ast.AsyncFor)):
            complexity = complexity + 1  # type: ignore
            loops = loops + 1  # type: ignore
        elif isinstance(child, ast.ExceptHandler):
            complexity = complexity + 1  # type: ignore
        elif isinstance(child, (ast.And, ast.Or)):
            complexity = complexity + 1  # type: ignore
        elif isinstance(child, ast.Assert):
            complexity = complexity + 1  # type: ignore
    return complexity, branches, loops


def parse_python(file_path: str) -> ParseResult:
    """Parse a Python file using the ast module."""
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        source = f.read()
    lines = source.splitlines()

    result = ParseResult(file_path=file_path, language="python")
    result.loc = sum(1 for line in lines if line.strip())
    result.blank_lines = sum(1 for line in lines if not line.strip())
    result.comment_lines = sum(1 for line in lines if line.strip().startswith("#"))

    try:
        tree = ast.parse(source, filename=file_path)
    except SyntaxError:
        return result

    # 1. First pass: Build class map for local inheritance tracking
    class_parents = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            class_parents[node.name] = [
                base.id for base in node.bases if isinstance(base, ast.Name)
            ]

    def get_dit(cls_name, depth=1):
        """Recursive Depth of Inheritance Tree for local classes."""
        parents = class_parents.get(cls_name, [])
        if not parents:
            return depth
        max_p_depth = 0
        for p in parents:
            max_p_depth = max(max_p_depth, get_dit(p, depth + 1))
        return max_p_depth

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
            end_line = getattr(node, "end_lineno", node.lineno)
            func_loc = max(1, end_line - node.lineno + 1)
            complexity, branches, loops = _count_func_complexity(node)
            nesting = _get_func_nesting(node)
            
            cog_visitor = _PythonCognitiveVisitor()
            cog_visitor.visit(node)
            
            operators, operands = _get_halstead_data(node)
            
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
                cognitive_complexity=cog_visitor.complexity,
                operators=operators,
                operands=operands
            )
            result.functions.append(fi)
            result.num_functions += 1

    # Extract imports for coupling
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for name in node.names:
                result.imports.add(name.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                result.imports.add(str(node.module))

    # Inheritance Depth (max for this file)
    for cls_name in class_parents:
        result.inheritance_depth = max(result.inheritance_depth, get_dit(cls_name))

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


def _extract_js_functions(source: str, lines: List[str]) -> List[FunctionInfo]:
    """Extract function info from JS/TS source using regex."""
    functions: List[FunctionInfo] = []
    seen_names: Set[str] = set()

    for pattern in _JS_FUNC_PATTERNS:
        for match in pattern.finditer(source):
            name = match.group(1)
            if name in seen_names or name in ("if", "for", "while", "switch", "class", "return", "else"):
                continue
            seen_names.add(name)

            start_pos = match.start()
            line_start = source[:start_pos].count("\n") + 1  # type: ignore

            # Find the function body end by tracking braces
            brace_start = source.find("{", match.end())
            if brace_start == -1:
                # Arrow function without braces
                line_end = line_start + 1
            else:
                depth = 0
                pos = brace_start
                while pos < len(source):
                    if source[pos] == "{":  # type: ignore
                        depth += 1
                    elif source[pos] == "}":  # type: ignore
                        depth -= 1
                        if depth == 0:
                            break
                    pos += 1
                line_end = source[:pos + 1].count("\n") + 1  # type: ignore

            func_loc = max(1, line_end - line_start + 1)
            func_source = "\n".join(lines[line_start - 1:line_end])  # type: ignore
            branches = len(_JS_BRANCH_KEYWORDS.findall(func_source))
            loops = len(_JS_LOOP_KEYWORDS.findall(func_source))
            complexity = 1 + branches + loops
            nesting = _js_nesting_depth(func_source)
            
            # Heuristic Cogntive Complexity
            cog_complexity = branches + (loops * 2) + (nesting * 1.5)
            
            # Simple Halstead data extraction via regex
            operators = _JS_BRANCH_KEYWORDS.findall(func_source) + _JS_LOOP_KEYWORDS.findall(func_source)
            operands = re.findall(r"\w+", func_source)

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
                cognitive_complexity=int(cog_complexity),
                operators=operators,
                operands=operands
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
    result.loc = sum(1 for line in lines if line.strip())
    result.blank_lines = sum(1 for line in lines if not line.strip())
    
    # Accurate comment counting for JS/TS
    comment_count = 0
    in_block_comment = False
    for line in lines:
        stripped = line.strip()
        if not stripped: continue
        
        if in_block_comment:
            comment_count += 1
            if "*/" in stripped:
                in_block_comment = False
        else:
            if stripped.startswith("//"):
                comment_count += 1
            elif "/*" in stripped:
                comment_count += 1
                if "*/" not in stripped:
                    in_block_comment = True
    
    result.comment_lines = comment_count
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

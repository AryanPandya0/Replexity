"""
Code Parser – Tree-sitter powered parsing for Python, JavaScript, and TypeScript.
Extracts functions, classes, nesting depth, branches, loops, and imports with 
industrial-grade accuracy.
"""
import os
import math
from dataclasses import dataclass, field
from typing import Dict, List, Set, Tuple, Optional

from tree_sitter import Language, Parser, Node
import tree_sitter_language_pack as tslp

@dataclass
class FunctionInfo:
    name: str = "anonymous"
    line_start: int = 0
    line_end: int = 0
    loc: int = 0
    nesting_depth: int = 0
    parameters: int = 0
    complexity: int = 1
    branches: int = 0
    loops: int = 0
    cognitive_complexity: int = 0
    operators: List[str] = field(default_factory=list)
    operands: List[str] = field(default_factory=list)
    halstead_volume: float = 0.0
    halstead_difficulty: float = 0.0
    halstead_effort: float = 0.0

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
    functions: List[FunctionInfo] = field(default_factory=list)


def calculate_halstead_metrics(operators: List[str], operands: List[str]) -> Tuple[float, float, float]:
    """
    Calculate Halstead Metrics:
    n1 = distinct operators, n2 = distinct operands
    N1 = total operators, N2 = total operands
    Vocabulary n = n1 + n2
    Length N = N1 + N2
    Volume V = N * log2(n)
    Difficulty D = (n1 / 2) * (N2 / n2)
    Effort E = D * V
    """
    n1 = len(set(operators))
    n2 = len(set(operands))
    N1 = len(operators)
    N2 = len(operands)

    if n1 == 0 or n2 == 0:
        return 0.0, 0.0, 0.0

    vocabulary = n1 + n2
    length = N1 + N2
    
    volume = length * math.log2(vocabulary) if vocabulary > 0 else 0.0
    difficulty = (n1 / 2.0) * (N2 / float(n2))
    effort = difficulty * volume
    
    return volume, difficulty, effort

# ── Language Config ───────────────────────────────────────────

TS_LANGS = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "tsx"
}

# Node types considered a branching point
BRANCH_NODES = {
    "if_statement", "elif_clause", "case_clause", "conditional_expression", 
    "switch_case", "switch_default", "ternary_expression"
}

# Node types considered a loop
LOOP_NODES = {
    "for_statement", "while_statement", "do_statement", "for_in_statement"
}

# Node types that start a nesting level
NESTING_NODES = BRANCH_NODES | LOOP_NODES | {"try_statement", "with_statement", "catch_clause"}


class TreeAnalyzer:
    def __init__(self, language_name: str, source: bytes):
        self.language_name = language_name
        self.source = source
        self.lang = tslp.get_language(language_name)
        self.parser = Parser(self.lang)
        self.tree = self.parser.parse(source)

    def extract_metrics(self, file_path: str) -> ParseResult:
        lines = self.source.decode("utf-8", "ignore").splitlines()
        result = ParseResult(file_path=file_path, language=self.language_name)
        
        # 1. Basic line counts
        result.loc = sum(1 for line in lines if line.strip())
        result.blank_lines = sum(1 for line in lines if not line.strip())
        
        # 2. Walk the tree for high-level counts
        self._walk_root(self.tree.root_node, result)
        
        return result

    def _walk_root(self, node: Node, result: ParseResult, skip_children=False):
        """High-level pass to count classes, imports, and find functions."""
        should_skip_children = False
        
        # Class identification
        if node.type in ("class_definition", "class_declaration"):
            result.num_classes += 1
            # Simple local inheritance check
            for child in node.children:
                if child.type == "argument_list": # Python
                    result.inheritance_depth = max(result.inheritance_depth, 2)
                if child.type == "extends_clause": # JS/TS
                    result.inheritance_depth = max(result.inheritance_depth, 2)

        # Import identification
        elif "import" in node.type or node.type == "import_statement" or node.type == "import_from_statement":
            result.num_imports += 1
            # Extract import text (heuristic)
            text = node.text.decode("utf-8", "ignore")
            for word in text.replace("import", " ").replace("from", " ").split():
                if word and not word.startswith((".", "*", "(")):
                    result.imports.add(word.strip(",;"))

        # Function identification
        elif node.type in ("function_definition", "function_declaration", "method_definition", "arrow_function"):
            name_override = None
            # If arrow function assigned to variable, hunt for the name up-tree
            if node.type == "arrow_function":
                parent = node.parent
                if parent and parent.type == "variable_declarator":
                    for c in parent.children:
                        if c.type == "identifier":
                            name_override = c.text.decode("utf-8", "ignore")
                            break

            func_info = self._analyze_function(node, name_override)
            result.functions.append(func_info)
            result.num_functions += 1
            result.num_branches += func_info.branches
            result.num_loops += func_info.loops
            result.max_nesting_depth = max(result.max_nesting_depth, func_info.nesting_depth)
            
            # Skip children of functions to avoid double-counting in root but 
            # still visit them in _analyze_function's own walk
            should_skip_children = True

        # Comments
        elif node.type == "comment":
            result.comment_lines += (node.end_point[0] - node.start_point[0] + 1)

        if not should_skip_children:
            for child in node.children:
                self._walk_root(child, result)

    def _analyze_function(self, node: Node, name_override: Optional[str] = None) -> FunctionInfo:
        fi = FunctionInfo()
        if name_override:
            fi.name = name_override
        
        # 1. Basic properties
        fi.line_start = node.start_point[0] + 1
        fi.line_end = node.end_point[0] + 1
        fi.loc = fi.line_end - fi.line_start + 1
        
        # 2. Get name if not overridden
        if not name_override:
            for child in node.children:
                if child.type in ("identifier", "property_identifier"):
                    fi.name = child.text.decode("utf-8", "ignore")
                    break
        
        # 3. Parameters
        for child in node.children:
            if child.type in ("parameters", "formal_parameters"):
                # Count nodes inside parens that aren't tokens
                fi.parameters = sum(1 for p in child.children if p.type not in ("(", ")", ",", "{", "}", "[", "]"))
                break

        # 4. Detailed analysis via walk
        self._walk_function(node, fi, current_depth=0)
        
        # 5. Compute Halstead for the function
        fi.halstead_volume, fi.halstead_difficulty, fi.halstead_effort = calculate_halstead_metrics(fi.operators, fi.operands)
        
        return fi

    def _walk_function(self, node: Node, fi: FunctionInfo, current_depth: int):
        if node.type in BRANCH_NODES:
            fi.branches += 1
            fi.complexity += 1
            fi.cognitive_complexity += (1 + current_depth)
            next_depth = current_depth + 1
        elif node.type in LOOP_NODES:
            fi.loops += 1
            fi.complexity += 1
            fi.cognitive_complexity += (1 + current_depth)
            next_depth = current_depth + 1
        elif node.type in NESTING_NODES:
            next_depth = current_depth + 1
        else:
            next_depth = current_depth

        fi.nesting_depth = max(fi.nesting_depth, current_depth)
        
        # Halstead heuristic: count identifiers and operators
        if not node.children: # leaf node
            text = node.text.decode("utf-8", "ignore").strip()
            if text:
                if any(c in "+-*/%=<>!&|^" for c in text): # simple operator check
                    fi.operators.append(text)
                else:
                    fi.operands.append(text)

        for child in node.children:
            # Don't re-enter nested functions when calculating parent metrics
            if child.type not in ("function_definition", "function_declaration", "method_definition", "arrow_function") or child == node:
                self._walk_function(child, fi, next_depth)


def parse_file(file_path: str) -> ParseResult:
    ext = os.path.splitext(file_path)[1].lower()
    if ext not in TS_LANGS:
        raise ValueError(f"Unsupported file extension: {ext}")

    with open(file_path, "rb") as f:
        source = f.read()

    analyzer = TreeAnalyzer(TS_LANGS[ext], source)
    return analyzer.extract_metrics(file_path)

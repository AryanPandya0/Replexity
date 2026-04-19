"""
Clone Detector – token-based duplicate code detection across a project.

Uses normalized line fingerprinting with a sliding window to detect
copy-pasted code blocks (Type-1 and Type-2 clones) both within and
across files.

Type-1: Exact copies (modulo whitespace/comments)
Type-2: Renamed identifiers/literals (caught via normalization)
"""
import hashlib
import re
from dataclasses import dataclass
from typing import Dict, List, Tuple


@dataclass
class ClonePair:
    """A pair of duplicated code regions."""
    file_a: str
    file_b: str
    start_a: int       # 1-indexed line number
    end_a: int
    start_b: int
    end_b: int
    num_lines: int
    similarity: float  # 1.0 = exact normalized match


# ── Normalization ───────────────────────────────────────────────

# Patterns for identifier and literal replacement
_STRING_RE = re.compile(r"""(["'])(?:(?!\1).)*\1|`[^`]*`""")
_NUMBER_RE = re.compile(r"\b\d+(?:\.\d+)?\b")
_IDENTIFIER_RE = re.compile(r"\b[a-zA-Z_]\w*\b")

# Keywords that should NOT be replaced during normalization
_KEYWORDS = frozenset({
    # Python
    "False", "None", "True", "and", "as", "assert", "async", "await",
    "break", "class", "continue", "def", "del", "elif", "else", "except",
    "finally", "for", "from", "global", "if", "import", "in", "is",
    "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try",
    "while", "with", "yield",
    # JavaScript / TypeScript
    "abstract", "arguments", "boolean", "byte", "case", "catch", "char",
    "const", "debugger", "default", "delete", "do", "double", "enum",
    "export", "extends", "final", "float", "function", "goto",
    "implements", "instanceof", "int", "interface", "let", "long",
    "native", "new", "null", "package", "private", "protected", "public",
    "short", "static", "super", "switch", "synchronized", "this",
    "throw", "throws", "transient", "typeof", "undefined", "var",
    "void", "volatile",
    # Common type annotations
    "string", "number", "any", "object", "symbol", "never", "unknown",
    "type", "readonly",
    # Structural
    "self", "cls",
})

# Lines that are too trivial to be meaningful duplicates
_TRIVIAL_RE = re.compile(r"^\s*[\{\}\(\)\[\];,:#]*\s*$")


def _normalize_line(line: str) -> str:
    """
    Normalize a single source line for clone comparison.

    - Strip comments (single-line # and //)
    - Replace string literals with $S
    - Replace numeric literals with $N
    - Replace non-keyword identifiers with $V
    - Collapse whitespace
    """
    # Strip single-line comments (heuristic: # for Python, // for JS/TS)
    stripped = re.sub(r"#.*$", "", line)
    stripped = re.sub(r"//.*$", "", stripped)

    # Use non-alphanumeric sentinels that the identifier regex [a-zA-Z_]\w*
    # cannot match. Converted to final $S/$N/$V tokens after all regex passes.
    _SENT_STR = "\x01\x02\x01"
    _SENT_NUM = "\x01\x03\x01"
    _SENT_ID = "\x01\x04\x01"

    # Replace string literals
    stripped = _STRING_RE.sub(_SENT_STR, stripped)

    # Replace numbers
    stripped = _NUMBER_RE.sub(_SENT_NUM, stripped)

    # Replace identifiers (but keep keywords)
    def _replace_ident(m: re.Match) -> str:
        word = m.group(0)
        return word if word in _KEYWORDS else _SENT_ID

    stripped = _IDENTIFIER_RE.sub(_replace_ident, stripped)

    # Convert sentinels to final tokens
    stripped = stripped.replace(_SENT_STR, "$S")
    stripped = stripped.replace(_SENT_NUM, "$N")
    stripped = stripped.replace(_SENT_ID, "$V")

    # Collapse whitespace
    return " ".join(stripped.split())


def _normalize_source(source: str) -> List[Tuple[str, int]]:
    """
    Normalize all lines of a source file.

    Returns list of (normalized_line, original_1_indexed_line_number)
    for non-trivial, non-empty lines.
    """
    result: List[Tuple[str, int]] = []
    for i, raw_line in enumerate(source.splitlines(), start=1):
        if _TRIVIAL_RE.match(raw_line) or not raw_line.strip():
            continue
        norm = _normalize_line(raw_line)
        if norm and len(norm) > 3:  # Skip very short normalized forms
            result.append((norm, i))
    return result


# ── Fingerprinting ──────────────────────────────────────────────

def _hash_window(lines: List[str]) -> str:
    """Create a stable hash for a window of normalized lines."""
    content = "\n".join(lines)
    return hashlib.md5(content.encode("utf-8")).hexdigest()


def _compute_fingerprints(
    file_path: str,
    normalized: List[Tuple[str, int]],
    window: int,
) -> Dict[str, List[Tuple[str, int]]]:
    """
    Compute fingerprints for all sliding windows of `window` lines.

    Returns: {fingerprint_hash: [(file_path, original_start_line), ...]}
    """
    fingerprints: Dict[str, List[Tuple[str, int]]] = {}

    if len(normalized) < window:
        return fingerprints

    for i in range(len(normalized) - window + 1):
        window_lines = [nl[0] for nl in normalized[i:i + window]]
        start_line = normalized[i][1]
        fp = _hash_window(window_lines)
        fingerprints.setdefault(fp, []).append((file_path, start_line))

    return fingerprints


# ── Clone Detection ─────────────────────────────────────────────

def _merge_adjacent_pairs(
    raw_pairs: List[Tuple[str, int, str, int]],
    window: int,
) -> List[ClonePair]:
    """
    Merge overlapping/adjacent raw match pairs into contiguous ClonePair regions.

    raw_pairs: [(file_a, start_a, file_b, start_b), ...]
    """
    if not raw_pairs:
        return []

    # Group by (file_a, file_b) pair
    pair_groups: Dict[Tuple[str, str], List[Tuple[int, int]]] = {}
    for fa, sa, fb, sb in raw_pairs:
        key = (fa, fb) if fa <= fb else (fb, fa)
        if key not in pair_groups:
            pair_groups[key] = []
        if fa <= fb:
            pair_groups[key].append((sa, sb))
        else:
            pair_groups[key].append((sb, sa))

    clones: List[ClonePair] = []
    for (file_a, file_b), matches in pair_groups.items():
        # Sort by start_a, then start_b
        matches.sort()

        # Merge adjacent/overlapping matches
        merged: List[Tuple[int, int, int, int]] = []  # (start_a, end_a, start_b, end_b)
        for start_a, start_b in matches:
            end_a = start_a + window - 1
            end_b = start_b + window - 1

            if merged:
                prev_sa, prev_ea, prev_sb, prev_eb = merged[-1]
                # Check if this match extends the previous one
                if (start_a <= prev_ea + 1 and start_b <= prev_eb + 1
                        and (start_a - prev_sa) == (start_b - prev_sb)):
                    # Extend the region
                    merged[-1] = (prev_sa, max(prev_ea, end_a), prev_sb, max(prev_eb, end_b))
                    continue

            merged.append((start_a, end_a, start_b, end_b))

        for sa, ea, sb, eb in merged:
            num_lines = ea - sa + 1
            clones.append(ClonePair(
                file_a=file_a,
                file_b=file_b,
                start_a=sa,
                end_a=ea,
                start_b=sb,
                end_b=eb,
                num_lines=num_lines,
                similarity=1.0,
            ))

    return clones


def detect_clones(
    file_sources: Dict[str, str],
    min_lines: int = 6,
) -> List[ClonePair]:
    """
    Detect duplicate code clones across all provided source files.

    Args:
        file_sources: Mapping of {relative_file_path: source_code_string}.
        min_lines: Minimum number of contiguous matching lines to report
                   as a clone (sliding window size). Default = 6.

    Returns:
        List of ClonePair objects describing each detected duplicate region.
    """
    if min_lines < 3:
        min_lines = 3

    window = min_lines

    # 1. Normalize all files
    file_normalized: Dict[str, List[Tuple[str, int]]] = {}
    for path, source in file_sources.items():
        normalized = _normalize_source(source)
        if len(normalized) >= window:
            file_normalized[path] = normalized

    if not file_normalized:
        return []

    # 2. Build global fingerprint index
    global_fps: Dict[str, List[Tuple[str, int]]] = {}
    for path, normalized in file_normalized.items():
        fps = _compute_fingerprints(path, normalized, window)
        for fp_hash, locations in fps.items():
            global_fps.setdefault(fp_hash, []).extend(locations)

    # 3. Find matching pairs (fingerprints with 2+ distinct locations)
    raw_pairs: List[Tuple[str, int, str, int]] = []
    for fp_hash, locations in global_fps.items():
        if len(locations) < 2:
            continue

        # Generate unique pairs (avoid (A,A) self-matches at same position)
        for i in range(len(locations)):
            for j in range(i + 1, len(locations)):
                fa, la = locations[i]
                fb, lb = locations[j]
                # Skip exact same location
                if fa == fb and la == lb:
                    continue
                raw_pairs.append((fa, la, fb, lb))

    # 4. Merge adjacent matches into contiguous clone regions
    clones = _merge_adjacent_pairs(raw_pairs, window)

    # 5. Filter: only keep clones that are at least min_lines long
    clones = [c for c in clones if c.num_lines >= min_lines]

    # 6. Deduplicate: avoid reporting (A,B) and (B,A) for same region
    seen: set = set()
    unique_clones: List[ClonePair] = []
    for c in clones:
        key = (
            min(c.file_a, c.file_b),
            max(c.file_a, c.file_b),
            min(c.start_a, c.start_b) if c.file_a == c.file_b else c.start_a if c.file_a < c.file_b else c.start_b,
            max(c.start_a, c.start_b) if c.file_a == c.file_b else c.end_a if c.file_a < c.file_b else c.end_b,
        )
        if key not in seen:
            seen.add(key)
            unique_clones.append(c)

    # 7. Sort by clone size descending (most impactful first)
    unique_clones.sort(key=lambda c: c.num_lines, reverse=True)

    return unique_clones

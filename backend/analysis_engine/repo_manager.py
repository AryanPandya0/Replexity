"""
Repository Manager – handles cloning GitHub repos, extracting zip uploads,
and validating local directory paths. Filters for supported source files.
"""
import os
import shutil
import tempfile
import zipfile
import uuid
from pathlib import Path

SUPPORTED_EXTENSIONS = {".py", ".js", ".ts", ".jsx", ".tsx"}
IGNORE_DIRS = {
    "node_modules", ".git", "__pycache__", ".venv", "venv", "env",
    "dist", "build", ".next", ".nuxt", "coverage", ".tox",
    ".mypy_cache", ".pytest_cache", "egg-info",
}

WORK_DIR = Path(tempfile.gettempdir()) / "code_visualizer_repos"
WORK_DIR.mkdir(exist_ok=True)


def _generate_id() -> str:
    return uuid.uuid4().hex[:12]


def _collect_source_files(root: str) -> list[str]:
    """Walk *root* and return absolute paths to supported source files."""
    files: list[str] = []
    for dirpath, dirnames, filenames in os.walk(root):
        # Prune ignored directories in-place
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        for fname in filenames:
            ext = os.path.splitext(fname)[1].lower()
            if ext in SUPPORTED_EXTENSIONS:
                files.append(os.path.join(dirpath, fname))
    return files


# ── Public API ──────────────────────────────────────────────────

def clone_github_repo(url: str, branch: str = "main") -> tuple[str, str, list[str]]:
    """Clone a GitHub repo and return (analysis_id, repo_root, source_files)."""
    import git
    analysis_id = _generate_id()
    dest = str(WORK_DIR / analysis_id)
    try:
        git.Repo.clone_from(url, dest, branch=branch, depth=1)
    except Exception:
        # Fallback: try without branch specification
        git.Repo.clone_from(url, dest, depth=1)

    source_files = _collect_source_files(dest)
    return analysis_id, dest, source_files


def extract_zip(zip_path: str) -> tuple[str, str, list[str]]:
    """Extract a zip archive and return (analysis_id, root, source_files)."""
    analysis_id = _generate_id()
    dest = str(WORK_DIR / analysis_id)
    os.makedirs(dest, exist_ok=True)
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(dest)
    source_files = _collect_source_files(dest)
    return analysis_id, dest, source_files


def use_local_directory(path: str) -> tuple[str, str, list[str]]:
    """Validate a local directory and return (analysis_id, root, source_files)."""
    if not os.path.isdir(path):
        raise ValueError(f"Directory not found: {path}")
    analysis_id = _generate_id()
    source_files = _collect_source_files(path)
    return analysis_id, path, source_files


def cleanup(analysis_id: str) -> None:
    """Remove temp directory for an analysis run."""
    dest = WORK_DIR / analysis_id
    if dest.exists():
        shutil.rmtree(dest, ignore_errors=True)

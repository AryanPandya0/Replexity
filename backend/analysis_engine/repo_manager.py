"""
Repository Manager – handles cloning GitHub repos, extracting zip uploads,
and validating local directory paths. Filters for supported source files.
"""
from typing import List, Tuple
import os
import shutil
import tempfile
import uuid
import zipfile
from pathlib import Path
import git  # type: ignore

SUPPORTED_EXTENSIONS = {".py", ".js", ".ts", ".jsx", ".tsx"}
IGNORE_DIRS = {
    "node_modules", ".git", "__pycache__", ".venv", "venv", "env",
    "dist", "build", ".next", ".nuxt", "coverage", ".tox",
    ".mypy_cache", ".pytest_cache", "egg-info",
}

WORK_DIR = Path(tempfile.gettempdir()) / "code_visualizer_repos"
WORK_DIR.mkdir(exist_ok=True)

# ── Zip extraction safety limits ────────────────────────────────
MAX_UNCOMPRESSED_SIZE = 500 * 1024 * 1024   # 500 MB
MAX_ZIP_FILE_COUNT = 10_000


def _generate_id() -> str:
    return uuid.uuid4().hex[:12]


def _collect_source_files(root: str) -> List[str]:
    """Walk *root* and return absolute paths to supported source files."""
    files: List[str] = []
    for dirpath, dirnames, filenames in os.walk(root):
        # Prune ignored directories in-place
        valid_dirs = [d for d in dirnames if d not in IGNORE_DIRS]
        dirnames.clear()
        dirnames.extend(valid_dirs)
        for fname in filenames:
            ext = os.path.splitext(fname)[1].lower()
            if ext in SUPPORTED_EXTENSIONS:
                files.append(os.path.join(dirpath, fname))
    return files


# ── Public API ──────────────────────────────────────────────────

def clone_github_repo(url: str, branch: str = "main") -> Tuple[str, str, List[str]]:
    """Clone a GitHub repo and return (analysis_id, repo_root, source_files)."""
    analysis_id = _generate_id()
    dest = str(WORK_DIR / analysis_id)
    try:
        git.Repo.clone_from(url, dest, branch=branch, depth=1)
    except Exception:
        # Fallback: try without branch specification
        git.Repo.clone_from(url, dest, depth=1)

    source_files = _collect_source_files(dest)
    return analysis_id, dest, source_files


def extract_zip(zip_path: str) -> Tuple[str, str, List[str]]:
    """Extract a zip archive with safety guards and return (analysis_id, root, source_files)."""
    analysis_id = _generate_id()
    dest = str(WORK_DIR / analysis_id)
    os.makedirs(dest, exist_ok=True)

    with zipfile.ZipFile(zip_path, "r") as zf:
        entries = zf.infolist()

        # Guard 1: max file count
        if len(entries) > MAX_ZIP_FILE_COUNT:
            shutil.rmtree(dest, ignore_errors=True)
            raise ValueError(
                f"Zip contains {len(entries)} entries, "
                f"exceeding the limit of {MAX_ZIP_FILE_COUNT}."
            )

        # Guard 2: max uncompressed size
        total_size = sum(info.file_size for info in entries)
        if total_size > MAX_UNCOMPRESSED_SIZE:
            shutil.rmtree(dest, ignore_errors=True)
            raise ValueError(
                f"Zip uncompressed size ({total_size:,} bytes) exceeds "
                f"the limit of {MAX_UNCOMPRESSED_SIZE:,} bytes."
            )

        # Guard 3: path traversal (zip-slip)
        real_dest = os.path.realpath(dest)
        for info in entries:
            target = os.path.realpath(os.path.join(dest, info.filename))
            if not target.startswith(real_dest + os.sep) and target != real_dest:
                shutil.rmtree(dest, ignore_errors=True)
                raise ValueError(
                    f"Zip entry '{info.filename}' attempts path traversal."
                )

        zf.extractall(dest)

    source_files = _collect_source_files(dest)
    return analysis_id, dest, source_files


def use_local_directory(path: str) -> Tuple[str, str, List[str]]:
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


def get_code_churn(repo_path: str, file_path: str) -> int:
    """Return the number of commits a file has in the git history."""
    try:
        repo = git.Repo(repo_path, search_parent_directories=True)
        # Use relative path for git log
        rel_path = os.path.relpath(file_path, repo.working_dir)
        commits = list(repo.iter_commits(paths=rel_path))
        return len(commits)
    except Exception:
        return 0

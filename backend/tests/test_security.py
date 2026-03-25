"""
Security tests for input validation and access controls.
"""
import os
import shutil
import struct
import tempfile
import zipfile

import pytest
from pydantic import ValidationError


# ── 1. GitHub URL Validation ────────────────────────────────────

from backend.api.schemas import GitHubAnalysisRequest  # type: ignore


class TestGitHubURLValidation:
    """GitHubAnalysisRequest.url must be a valid GitHub/GitLab URL."""

    @pytest.mark.parametrize("url", [
        "https://github.com/owner/repo",
        "https://github.com/owner/repo.git",
        "https://github.com/owner/repo/tree/main",
        "https://gitlab.com/owner/repo",
        "https://gitlab.com/my-org/my.repo",
        "https://github.com/owner/repo-name",
    ])
    def test_valid_urls(self, url: str):
        req = GitHubAnalysisRequest(url=url)
        assert req.url  # should not raise

    @pytest.mark.parametrize("url", [
        "http://github.com/owner/repo",        # http not https
        "https://evil.com/owner/repo",          # wrong domain
        "file:///etc/passwd",                   # file protocol
        "not-a-url",                            # garbage
        "https://github.com/",                  # missing owner/repo
        "https://github.com/owner",             # missing repo
        "ftp://github.com/owner/repo",          # wrong scheme
        "",                                     # empty
    ])
    def test_invalid_urls(self, url: str):
        with pytest.raises(ValidationError):
            GitHubAnalysisRequest(url=url)

    def test_strips_whitespace_and_trailing_slash(self):
        req = GitHubAnalysisRequest(url="  https://github.com/owner/repo/  ")
        assert req.url == "https://github.com/owner/repo"


# ── 2. Zip Bomb Guards ─────────────────────────────────────────

from backend.analysis_engine.repo_manager import (  # type: ignore
    extract_zip,
    MAX_UNCOMPRESSED_SIZE,
    MAX_ZIP_FILE_COUNT,
    cleanup,
)


class TestZipBombGuards:
    """extract_zip must reject oversized, overcounted, and path-traversal zips."""

    def _make_zip(self, entries: dict[str, bytes], dest_path: str):
        """Helper: create a zip with name -> content mapping."""
        with zipfile.ZipFile(dest_path, "w") as zf:
            for name, content in entries.items():
                zf.writestr(name, content)

    def test_zip_exceeds_file_count(self, tmp_path):
        """Should raise ValueError when zip has too many entries."""
        zip_path = str(tmp_path / "many_files.zip")
        with zipfile.ZipFile(zip_path, "w") as zf:
            for i in range(MAX_ZIP_FILE_COUNT + 1):
                zf.writestr(f"file_{i}.txt", "x")
        with pytest.raises(ValueError, match="exceeding the limit"):
            extract_zip(zip_path)

    def test_zip_path_traversal(self, tmp_path):
        """Should raise ValueError for entries with '..' path components."""
        zip_path = str(tmp_path / "traversal.zip")
        with zipfile.ZipFile(zip_path, "w") as zf:
            zf.writestr("../../etc/passwd", "pwned")
        with pytest.raises(ValueError, match="path traversal"):
            extract_zip(zip_path)

    def test_normal_zip_extracts_ok(self, tmp_path):
        """A small, well-formed zip should extract without error."""
        zip_path = str(tmp_path / "good.zip")
        self._make_zip({"hello.py": b"print('hi')"}, zip_path)
        analysis_id, root, files = extract_zip(zip_path)
        assert os.path.isdir(root)
        assert analysis_id
        # Clean up
        cleanup(analysis_id)


# ── 3. Local Analysis Endpoint Guards ───────────────────────────

class TestLocalAnalysisEndpoint:
    """The /analyze/local endpoint must respect ALLOW_LOCAL_ANALYSIS."""

    @pytest.fixture
    def client(self, monkeypatch):
        """Create a test client with local analysis disabled (default)."""
        import backend.api.routes as routes_mod
        from backend.main import app  # type: ignore
        from fastapi.testclient import TestClient  # type: ignore

        # Directly patch the module-level variables
        monkeypatch.setattr(routes_mod, "ALLOW_LOCAL_ANALYSIS", False)
        monkeypatch.setattr(routes_mod, "LOCAL_ANALYSIS_ALLOWED_ROOTS", [])

        return TestClient(app)

    def test_local_analysis_disabled_by_default(self, client):
        """With no env var set, /analyze/local should return 403."""
        resp = client.post("/api/analyze/local", json={"path": "/tmp"})
        assert resp.status_code == 403

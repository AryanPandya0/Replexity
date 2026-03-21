"""
Linter Service – Orchestrates external linters (Ruff, ESLint) and merges their results.
"""
import json
import subprocess
from typing import List, Optional
import os

from backend.api.schemas import CodeSmellResult

def run_ruff(repo_root: str) -> List[CodeSmellResult]:
    """Run Ruff linter on Python files and return parsed results."""
    try:
        # Check if there are any Python files
        has_python = False
        for root, dirs, files in os.walk(repo_root):
            if any(f.endswith(".py") for f in files):
                has_python = True
                break
        
        if not has_python:
            print(f"Linter Progress: Skipping Ruff (no Python files found).")
            return []

        # Check if we are in a project with a .venv and use that ruff
        ruff_cmd = "ruff"
        potential_venv_ruff = os.path.join(os.getcwd(), ".venv", "Scripts", "ruff.exe")
        if os.path.exists(potential_venv_ruff):
            ruff_cmd = potential_venv_ruff
            
        cmd = [ruff_cmd, "check", "--format", "json", repo_root]
        print(f"Linter Progress: Running Ruff on {repo_root}...", flush=True)
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30, check=False)
        
        if not result.stdout:
            return []
            
        data = json.loads(result.stdout)
        smells = []
        for item in data:
            smells.append(CodeSmellResult(
                file=os.path.relpath(item["filename"], repo_root) if os.path.isabs(item["filename"]) else item["filename"],
                issue=f"Ruff: {item['code']}",
                function=None, # Ruff doesn't always provide function name in JSON
                line=item["location"]["row"],
                suggestion=item["message"]
            ))
        print(f"Linter Progress: Ruff found {len(smells)} results.", flush=True)
        return smells
    except subprocess.TimeoutExpired:
        print(f"Linter Warning: Ruff timed out after 30s for {repo_root}", flush=True)
        return []
    except Exception as e:
        print(f"Linter Warning: Ruff failed: {e}", flush=True)
        return []

def run_eslint(repo_root: str) -> List[CodeSmellResult]:
    """Run ESLint (via npx) on JS/TS files and return parsed results."""
    try:
        # Check if there are any JS/TS files to avoid npx overhead
        has_js_ts = False
        for root, dirs, files in os.walk(repo_root):
            if any(f.endswith((".js", ".ts", ".jsx", ".tsx")) for f in files):
                has_js_ts = True
                break
        
        if not has_js_ts:
            print(f"Linter Progress: Skipping ESLint (no JS/TS files found).")
            return []

        # Use --yes to avoid interactive prompts for package installs
        cmd = ["npx", "--yes", "eslint", "**/*.{js,ts,jsx,tsx}", "--format", "json"]
        # Note: this requires node/npm/npx in path
        print(f"Linter Progress: Running ESLint on {repo_root}...", flush=True)
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=repo_root, shell=True, timeout=60, check=False)
        
        if not result.stdout:
            return []
            
        data = json.loads(result.stdout)
        smells = []
        for file_entry in data:
            rel_file = os.path.relpath(file_entry["filePath"], repo_root)
            for msg in file_entry.get("messages", []):
                smells.append(CodeSmellResult(
                    file=rel_file,
                    issue=f"ESLint: {msg.get('ruleId', 'unknown')}",
                    function=None,
                    line=msg.get("line"),
                    suggestion=msg.get("message")
                ))
        print(f"Linter Progress: ESLint found {len(smells)} results.", flush=True)
        return smells
    except subprocess.TimeoutExpired:
        print(f"Linter Warning: ESLint timed out after 60s for {repo_root}", flush=True)
        return []
    except Exception as e:
        print(f"Linter Warning: ESLint failed: {e}", flush=True)
        return []

def run_all_linters(repo_root: str) -> List[CodeSmellResult]:
    """Execute all relevant linters for the repository."""
    results = []
    
    # Python
    results.extend(run_ruff(repo_root))
    
    # JS/TS
    results.extend(run_eslint(repo_root))
    
    return results

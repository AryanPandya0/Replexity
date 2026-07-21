"""
Linter Service – Orchestrates external linters (Ruff, ESLint) and merges their results.
"""
import json
import os
import shutil
import subprocess
from typing import List, Optional

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
            print("Linter Progress: Skipping Ruff (no Python files found).", flush=True)
            return []

        # Find ruff executable
        ruff_cmd = None
        potential_venv_ruff = os.path.join(os.getcwd(), ".venv", "Scripts", "ruff.exe")
        potential_venv_ruff_unix = os.path.join(os.getcwd(), ".venv", "bin", "ruff")
        
        if os.path.exists(potential_venv_ruff):
            ruff_cmd = potential_venv_ruff
        elif os.path.exists(potential_venv_ruff_unix):
            ruff_cmd = potential_venv_ruff_unix
        else:
            ruff_cmd = shutil.which("ruff")
            
        if not ruff_cmd:
            print("Linter Warning: Ruff executable not found in PATH or .venv. Skipping Ruff.", flush=True)
            return []

        cmd = [ruff_cmd, "check", "--format", "json", repo_root]
        print(f"Linter Progress: Running Ruff on {repo_root}...", flush=True)
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30, check=False)
        
        if not result.stdout or not result.stdout.strip():
            return []
            
        data = json.loads(result.stdout)
        smells = []
        for item in data:
            smells.append(CodeSmellResult(
                file=os.path.relpath(item["filename"], repo_root) if os.path.isabs(item["filename"]) else item["filename"],
                issue=f"Ruff: {item.get('code', 'smell')}",
                function=None,
                line=item.get("location", {}).get("row", 1),
                suggestion=item.get("message", "")
            ))
        print(f"Linter Progress: Ruff found {len(smells)} results.", flush=True)
        return smells
    except subprocess.TimeoutExpired:
        print(f"Linter Warning: Ruff timed out after 30s for {repo_root}", flush=True)
        return []
    except json.JSONDecodeError as e:
        print(f"Linter Warning: Ruff output could not be parsed as JSON: {e}", flush=True)
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
            print("Linter Progress: Skipping ESLint (no JS/TS files found).", flush=True)
            return []

        if not shutil.which("npx") and not shutil.which("npx.cmd"):
            print("Linter Warning: npx command not found in environment PATH. Skipping ESLint.", flush=True)
            return []

        # Use --yes to avoid interactive prompts for package installs
        cmd = ["npx", "--yes", "eslint", "**/*.{js,ts,jsx,tsx}", "--format", "json"]
        print(f"Linter Progress: Running ESLint on {repo_root}...", flush=True)
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=repo_root, shell=True, timeout=60, check=False)
        
        if not result.stdout or not result.stdout.strip():
            return []
            
        data = json.loads(result.stdout)
        smells = []
        for file_entry in data:
            rel_file = os.path.relpath(file_entry["filePath"], repo_root) if os.path.isabs(file_entry["filePath"]) else file_entry["filePath"]
            for msg in file_entry.get("messages", []):
                smells.append(CodeSmellResult(
                    file=rel_file,
                    issue=f"ESLint: {msg.get('ruleId', 'unknown')}",
                    function=None,
                    line=msg.get("line", 1),
                    suggestion=msg.get("message", "")
                ))
        print(f"Linter Progress: ESLint found {len(smells)} results.", flush=True)
        return smells
    except subprocess.TimeoutExpired:
        print(f"Linter Warning: ESLint timed out after 60s for {repo_root}", flush=True)
        return []
    except json.JSONDecodeError as e:
        print(f"Linter Warning: ESLint output could not be parsed as JSON: {e}", flush=True)
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


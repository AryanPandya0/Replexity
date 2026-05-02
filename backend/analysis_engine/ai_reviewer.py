import os
import random
import json
import urllib.request
import urllib.error
from openai import OpenAI
from typing import Optional

def _get_api_keys() -> Optional[list[str]]:
    keys_str = os.environ.get("OPENAI_API_KEYS", "")
    if not keys_str:
        return None
    keys = [k.strip() for k in keys_str.split(",") if k.strip()]
    if not keys:
        return None
    random.shuffle(keys)
    return keys

def _call_gemini(api_key: str, prompt: str, system_message: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    payload = {
        "systemInstruction": {"parts": [{"text": system_message}]},
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 8192}
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=45) as response:
        result = json.loads(response.read().decode("utf-8"))
        return result["candidates"][0]["content"]["parts"][0]["text"]

def _call_llm(prompt: str, system_message: str = "You are a pragmatic, expert code reviewer.") -> Optional[str]:
    keys = _get_api_keys()
    if not keys:
        return None
        
    for api_key in keys:
        try:
            print(f"Attempting AI review with API key ending in ...{api_key[-4:] if len(api_key)>4 else '?'}", flush=True)
            if api_key.startswith("AIzaSy"):
                return _call_gemini(api_key, prompt, system_message)
            else:
                client = OpenAI(api_key=api_key)
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=4000,
                    temperature=0.7,
                    timeout=45
                )
                return response.choices[0].message.content
        except Exception as e:
            print(f"AI API Error with key ending in ...{api_key[-4:] if len(api_key)>4 else '?'}: {e}", flush=True)
            continue
            
    return "AI Review could not be generated. All provided API keys failed or were rate-limited."

def generate_ai_review(project_overview: dict, top_issues: list) -> Optional[str]:
    prompt = """
    You are an expert Principal Software Engineer. I am providing you with the complexity and static analysis results of a codebase.
    
    Project Overview:
    {overview}
    
    Top Issues & Code Smells:
    {issues}
    
    Please provide a highly professional code review summary. Do NOT use markdown symbols like ** or ##.
    1. Write EXACTLY ONE paragraph (about 5-6 lines long) summarizing the overall health, structural integrity, and architectural state of the project.
    2. After the paragraph, provide a list of bullet points (using standard '-' bullets) containing ALL the specific review data, critical areas to improve, and actionable strategic advice.
    Make it thorough but easy to read. Do not output anything other than this exact structure.
    """.format(
        overview=json.dumps(project_overview, indent=2),
        issues=json.dumps(top_issues, indent=2)
    )
    return _call_llm(prompt)

def generate_file_review(file_path: str, file_metrics: dict, code_content: str) -> Optional[str]:
    code_snippet = code_content[:5000] if code_content else "Code not available."
    prompt = """
    You are an expert Principal Software Engineer. Please analyze the following file.
    
    File Path: {path}
    Metrics: {metrics}
    
    Code (truncated):
    ```
    {snippet}
    ```
    
    Provide an EXTREMELY detailed, long-form file-level code review in Markdown format. 
    1. Explain in multiple paragraphs exactly what the file does and its role in the system.
    2. Discuss its complexity, coupling, and risk level in great detail.
    3. Provide extensive, actionable solutions, code improvements, and refactoring advice in detailed bullet points. Include exact code snippets for how to fix the smells.
    Do not output anything other than the markdown review.
    """.format(
        path=file_path,
        metrics=json.dumps(file_metrics, indent=2),
        snippet=code_snippet
    )
    return _call_llm(prompt)

def generate_pdf_review(project_overview: dict, files: list) -> Optional[str]:
    prompt = """
    You are an expert Principal Software Engineer writing an EXHAUSTIVE Executive Summary and Code Solution Report for a PDF document.
    
    Overview: {overview}
    Files: {files_data}
    
    Write a massively detailed, highly professional report (Markdown) focusing on solutions, code architecture, and business impact. 
    1. Include extensive paragraphs explaining the current state of the architecture, discussing the long-term impact of the complexity scores.
    2. IMPORTANT: You MUST write a dedicated section for EVERY SINGLE FILE listed above. For each file, keep the description of the code smells SHORT and concise (do not write too much about the smells themselves). Instead, focus entirely on providing your exact AI-generated solution to fix the file.
    3. Conclude with a long-form strategy (minimum 5 paragraphs) for reducing technical debt.
    This is the main body of a premium PDF report. Make it extremely comprehensive (2000+ words overall), but keep the file-level code smells very brief. Do not output anything other than the markdown.
    """.format(
        overview=json.dumps(project_overview, indent=2),
        files_data=json.dumps(files, indent=2)
    )
    return _call_llm(prompt)

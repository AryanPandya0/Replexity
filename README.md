# Replexity — AI Code Complexity Visualizer

An AI-powered code analysis platform that examines **Python, JavaScript, and TypeScript** codebases for complexity, risk, code smells, and maintainability — with an interactive dashboard featuring charts, heatmaps, and detailed file-level views.

![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** and **npm**
- **Git** (for analyzing GitHub repos)

### 1. Clone the Repository

```bash
git clone https://github.com/AryanPandya0/Complexity-Visualizer.git
cd Complexity-Visualizer
```

### 2. Install Backend Dependencies

```bash
pip install -r backend/requirements.txt
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 4. Start the Backend (Terminal 1)

```bash
uvicorn backend.main:app --reload
```

The API will be available at `http://localhost:8000`. Interactive API docs at `http://localhost:8000/docs`.

### 5. Start the Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser. The Vite dev server proxies `/api` requests to the backend.

---

## 📊 Features

### Core Analysis

| Feature | Description |
|---|---|
| **Repository Input** | Analyze via GitHub URL, ZIP upload, or local directory path |
| **Tree-sitter Parsing** | Accurate, language-native AST parsing for Python, JS, and TS |
| **Cyclomatic Complexity** | Industry-standard complexity metrics via `radon` (Python) and Tree-sitter |
| **Cognitive Complexity** | Measures how *difficult* code is to understand (beyond cyclomatic counting) |
| **Halstead Metrics** | Volume, Difficulty, and Effort metrics for scientific code measurement |
| **Maintainability Index** | Composite score (0–100) combining LOC, complexity, and volume |

### Advanced Intelligence

| Feature | Description |
|---|---|
| **AI Risk Scoring** | Weighted multi-factor risk score (0–100) for every file |
| **Bug Prediction** | Mathematical probability model for hidden-bug hotspot detection |
| **Code Smell Detection** | Long Method, God Object, Deep Nesting, Too Many Parameters, and more |
| **External Linter Integration** | Ruff (Python) and ESLint (JS/TS) findings merged into results |
| **Coupling Analysis** | Afferent/Efferent coupling (Ca/Ce) and Instability per file |
| **Code Churn** | Git-based change frequency tracking to identify volatile files |
| **Refactor Suggestions** | Actionable, prioritized improvement recommendations |

### Visualization & Reporting

| Feature | Description |
|---|---|
| **Health Score** | Project-level code health (0–100) from weighted components |
| **Risk Heatmap** | Color-coded grid from green (safe) to red (critical) |
| **Interactive Dashboard** | Charts (bar, doughnut, line), stat cards, sortable file table |
| **File Detail View** | Per-file metrics, function table, smells, and refactoring suggestions |
| **Export Reports** | Download analysis as JSON, CSV, or PDF |

---

## 🏗️ Architecture

```
Complexity-Visualizer/
├── backend/
│   ├── main.py                          # FastAPI entry point
│   ├── requirements.txt
│   ├── api/
│   │   ├── routes.py                    # API endpoints + async task pipeline
│   │   └── schemas.py                   # Pydantic response models
│   └── analysis_engine/
│       ├── repo_manager.py              # Git clone, zip extract, local dir, code churn
│       ├── code_parser.py               # Tree-sitter AST parsing (Python, JS/TS)
│       ├── complexity_analyzer.py       # Cyclomatic, cognitive, Halstead, MI
│       ├── risk_model.py                # AI risk scoring (0–100)
│       ├── bug_predictor.py             # Bug hotspot probability model
│       ├── smell_detector.py            # Code smell detection engine
│       ├── linter_service.py            # External linter integration (Ruff, ESLint)
│       ├── refactor_engine.py           # Refactoring suggestion generator
│       └── health_score.py              # Project health score calculator
├── frontend/
│   ├── src/
│   │   ├── App.tsx                      # Root component with routing & navbar
│   │   ├── api.ts                       # API client (axios)
│   │   ├── types.ts                     # TypeScript interfaces
│   │   ├── index.css                    # Design system (dark theme)
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx          # Hero section + feature showcase
│   │   │   ├── AnalysisInputPage.tsx    # GitHub URL / ZIP upload / local path input
│   │   │   ├── DashboardPage.tsx        # Charts, heatmap, file ranking table
│   │   │   ├── FileDetailPage.tsx       # Per-file deep-dive view
│   │   │   └── ExportPage.tsx           # JSON / CSV / PDF export
│   │   └── components/
│   │       ├── FloatingElements.tsx     # 3D animated background elements
│   │       └── dashboard/
│   │           ├── StatCards.tsx         # Overview metric cards
│   │           ├── HealthCircle.tsx      # Animated health score ring
│   │           ├── RiskHeatmap.tsx       # Interactive risk grid
│   │           └── FileRankingTable.tsx  # Sortable file metrics table
│   └── ...
└── README.md
```

---

## 🔌 API Endpoints

### Analysis (Async)

Analysis requests return a `task_id` immediately. Poll the status endpoint until the task completes.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analyze/github` | Clone & analyze a GitHub repo |
| `POST` | `/api/analyze/upload` | Upload & analyze a ZIP file |
| `POST` | `/api/analyze/local` | Analyze a local directory |
| `GET` | `/api/status/{task_id}` | Poll task status (pending → processing → completed) |

### Results & Export

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/results/{id}` | Get cached analysis results |
| `GET` | `/api/results/{id}/file/{path}` | Get file-level detail |
| `GET` | `/api/export/{id}/json` | Export as JSON |
| `GET` | `/api/export/{id}/csv` | Export as CSV |
| `GET` | `/api/export/{id}/pdf` | Export as PDF |

---

## 📐 Risk Score Formula

```
Risk Score = 0.35 × normalized_complexity
           + 0.20 × LOC_score
           + 0.20 × nesting_depth_score
           + 0.15 × function_length_score
           + 0.10 × branch_density
```

Each metric is normalized to a 0–100 scale. The final score classifies files as:
- **Low** (0–24) · **Medium** (25–49) · **High** (50–74) · **Critical** (75–100)

---

## 🔬 Metrics Glossary

| Metric | What It Measures |
|---|---|
| **Cyclomatic Complexity** | Number of independent execution paths (if/for/while/case branches) |
| **Cognitive Complexity** | Human difficulty of understanding control flow (weighted nesting) |
| **Halstead Volume** | Program "size" based on operators and operands |
| **Halstead Difficulty** | How error-prone the code is to write |
| **Halstead Effort** | Estimated mental effort to develop or understand |
| **Maintainability Index** | Composite score: higher = easier to maintain |
| **Coupling (Ca)** | Afferent coupling — how many files depend on this file |
| **Coupling (Ce)** | Efferent coupling — how many files this file depends on |
| **Instability** | Ce / (Ca + Ce) — closer to 1.0 = more volatile |
| **Code Churn** | Git commit frequency — high churn may indicate instability |

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python, FastAPI, Tree-sitter, radon, GitPython, fpdf2 |
| **Frontend** | React 18, TypeScript, TailwindCSS v4, Chart.js, Lucide Icons |
| **Build** | Vite |
| **Linters** | Ruff (Python), ESLint (JS/TS) — integrated into analysis |

---

## 📝 License

MIT

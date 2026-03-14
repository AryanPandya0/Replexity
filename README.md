# AI Code Complexity Visualizer

An AI-powered code analysis platform that examines Python, JavaScript, and TypeScript codebases for complexity, risk, code smells, and maintainability — with an interactive dashboard featuring charts, heatmaps, and detailed file-level views.

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** and **npm**
- **Git** (for analyzing GitHub repos)

### 1. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 3. Start the Backend (Terminal 1)

```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

### 4. Start the Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser. The Vite dev server proxies `/api` requests to the backend.

---

## 📊 Features

| Feature | Description |
|---|---|
| **Repository Input** | Analyze via GitHub URL, ZIP upload, or local directory path |
| **Code Parsing** | Python AST + JS/TS heuristic parsing for functions, classes, nesting, branches |
| **Cyclomatic Complexity** | Industry-standard complexity metrics via `radon` (Python) and custom analysis |
| **AI Risk Scoring** | Weighted multi-factor risk score (0-100) for every file |
| **Bug Prediction** | Heuristic-based bug hotspot detection with probability scores |
| **Code Smell Detection** | Long Method, God Object, Deep Nesting, Large Class, High Complexity |
| **Refactor Suggestions** | Actionable, prioritized improvement recommendations |
| **Health Score** | Project-level code health (0-100) from 4 weighted components |
| **Risk Heatmap** | Color-coded grid visualization from green (safe) to red (critical) |
| **Interactive Dashboard** | Charts (bar, doughnut, line), stat cards, sortable file table |
| **File Detail View** | Per-file metrics, function table, smells, and refactoring suggestions |
| **Export Reports** | Download analysis as JSON, CSV, or PDF |

---

## 🏗️ Architecture

```
ai-code-visualizer/
├── backend/
│   ├── main.py                          # FastAPI entry point
│   ├── requirements.txt
│   ├── api/
│   │   ├── routes.py                    # API endpoints
│   │   └── schemas.py                   # Pydantic models
│   └── analysis_engine/
│       ├── repo_manager.py              # Git clone, zip extract, local dir
│       ├── code_parser.py               # AST parsing (Python, JS/TS)
│       ├── complexity_analyzer.py       # Cyclomatic complexity, MI
│       ├── risk_model.py                # AI risk scoring (0-100)
│       ├── bug_predictor.py             # Bug hotspot prediction
│       ├── smell_detector.py            # Code smell detection
│       ├── refactor_engine.py           # Refactoring suggestions
│       └── health_score.py              # Project health score
├── frontend/
│   ├── src/
│   │   ├── App.tsx                      # Root component with routing
│   │   ├── api.ts                       # API client (axios)
│   │   ├── types.ts                     # TypeScript interfaces
│   │   ├── index.css                    # Design system (dark theme)
│   │   └── pages/
│   │       ├── LandingPage.tsx          # Hero + features
│   │       ├── AnalysisInputPage.tsx    # GitHub / Upload / Local input
│   │       ├── DashboardPage.tsx        # Charts, heatmap, file table
│   │       ├── FileDetailPage.tsx       # Per-file detail view
│   │       └── ExportPage.tsx           # JSON / CSV / PDF export
│   └── ...
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analyze/github` | Clone & analyze a GitHub repo |
| `POST` | `/api/analyze/upload` | Upload & analyze a ZIP file |
| `POST` | `/api/analyze/local` | Analyze a local directory |
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

Each metric is normalized to a 0-100 scale. The final score classifies files as:
- **Low** (0-24) · **Medium** (25-49) · **High** (50-74) · **Critical** (75-100)

---

## 🛠️ Tech Stack

**Backend:** Python, FastAPI, radon, gitpython, fpdf2  
**Frontend:** React, TypeScript, TailwindCSS v4, Chart.js (via react-chartjs-2)  
**Build Tool:** Vite

---

## 📝 License

MIT

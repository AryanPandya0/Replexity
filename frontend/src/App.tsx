import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AnalysisInputPage from './pages/AnalysisInputPage';
import DashboardPage from './pages/DashboardPage';
import FileDetailPage from './pages/FileDetailPage';
import ExportPage from './pages/ExportPage';
import type { AnalysisResult } from './types';
import './index.css';

export default function App() {
  const [result, setResult] = useState<AnalysisResult | null>(null);

  return (
    <BrowserRouter>
      <div className="app-container">
        {/* ── Navbar ── */}
        <nav className="navbar">
          <NavLink to="/" className="navbar-brand">
            <div className="logo-icon">⚡</div>
            CodeViz
          </NavLink>
          <div className="navbar-links">
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Home
            </NavLink>
            <NavLink to="/analyze" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Analyze
            </NavLink>
            {result && (
              <>
                <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  Dashboard
                </NavLink>
                <NavLink to="/export" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  Export
                </NavLink>
              </>
            )}
          </div>
        </nav>

        {/* ── Routes ── */}
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/analyze" element={<AnalysisInputPage onResult={setResult} />} />
          <Route path="/dashboard" element={<DashboardPage result={result} />} />
          <Route path="/file/:filePath" element={<FileDetailPage result={result} />} />
          <Route path="/export" element={<ExportPage result={result} />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

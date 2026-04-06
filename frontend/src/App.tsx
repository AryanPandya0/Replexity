import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AnalysisInputPage from './pages/AnalysisInputPage';
import DashboardPage from './pages/DashboardPage';
import FileDetailPage from './pages/FileDetailPage';
import ExportPage from './pages/ExportPage';
import ComparisonPage from './pages/ComparisonPage';
import { Terminal, BarChart3, Download, Home, Zap } from 'lucide-react';
import type { AnalysisResult } from './types';
import './index.css';

function AppContent() {
  const [result, setResult] = useState<AnalysisResult | null>(() => {
    const saved = localStorage.getItem('replexity_last_result');
    return saved ? JSON.parse(saved) : null;
  });
  const navigate = useNavigate();

  const handleAnalysisComplete = (newResult: AnalysisResult) => {
    setResult(newResult);
    localStorage.setItem('replexity_last_result', JSON.stringify(newResult));
    navigate('/dashboard');
  };

  return (
    <div className="app-container">
      {/* ── Navbar ── */}
      <nav className="navbar">
        <NavLink to="/" className="navbar-brand">
          <Terminal size={24} className="text-[var(--accent)]" />
          <span className="tracking-tight">Replexity</span>
        </NavLink>
        <div className="navbar-links">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Home size={16} /> Home
          </NavLink>
          <NavLink to="/analyze" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Zap size={16} /> Analyze
          </NavLink>
          {result && (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <BarChart3 size={16} /> Dashboard
              </NavLink>
              <NavLink to="/export" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Download size={16} /> Export
              </NavLink>
            </>
          )}
        </div>
      </nav>

      {/* ── Routes ── */}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/analyze" element={<AnalysisInputPage onAnalysisComplete={handleAnalysisComplete} />} />
        <Route path="/dashboard" element={<DashboardPage result={result} />} />
        <Route path="/file/:filePath" element={<FileDetailPage result={result} />} />
        <Route path="/compare" element={<ComparisonPage result={result} />} />
        <Route path="/export" element={<ExportPage result={result} />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

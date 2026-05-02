import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AnalysisInputPage from './pages/AnalysisInputPage';
import DashboardPage from './pages/DashboardPage';
import FileDetailPage from './pages/FileDetailPage';
import ExportPage from './pages/ExportPage';
import ComparisonPage from './pages/ComparisonPage';
import AuthPage from './pages/AuthPage';
import GitHubReposPage from './pages/GitHubReposPage';
import { Terminal, Home, Zap, User as UserIcon, FolderGit2, LogOut } from 'lucide-react';
import type { AnalysisResult } from './types';
import './index.css';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppNavbar() {
  const { user, logout } = useAuth();
  return (
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
        {user && (
          <NavLink to="/repos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <FolderGit2 size={16} /> My Repos
          </NavLink>
        )}
      </div>
      <div className="navbar-links ml-auto">
        {!user ? (
          <NavLink to="/auth" className="nav-link !border border-[var(--border)] rounded-full px-4 hover:border-[var(--accent)]">
            <UserIcon size={16} /> Sign In
          </NavLink>
        ) : (
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--text-secondary)] hidden sm:inline-block">
              {user.displayName || user.email}
            </span>
            <button onClick={logout} className="nav-link text-red-400 hover:text-red-300" title="Sign Out">
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

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
      <AppNavbar />

      {/* ── Routes ── */}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/analyze" element={<AnalysisInputPage onAnalysisComplete={handleAnalysisComplete} />} />
        <Route path="/dashboard" element={<DashboardPage result={result} />} />
        <Route path="/file/*" element={<FileDetailPage result={result} />} />
        <Route path="/compare" element={<ComparisonPage result={result} />} />
        <Route path="/export" element={<ExportPage result={result} />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/repos" element={<GitHubReposPage onAnalysisComplete={handleAnalysisComplete} />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

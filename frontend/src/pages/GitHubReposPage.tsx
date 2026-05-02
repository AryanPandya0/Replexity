import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Github, FolderGit2, Star, GitFork, ExternalLink, Zap } from 'lucide-react';
import type { AnalysisResult } from '../types';
import { analyzeGitHub, checkAnalysisStatus } from '../api';
import { FloatingElementsLayer } from '../components/FloatingElements';
import { Animated } from '../components/Animated';

interface Repo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  updated_at: string;
}

const GitHubReposPage: React.FC<{ onAnalysisComplete: (result: AnalysisResult) => void }> = ({ onAnalysisComplete }) => {
  const { user, githubToken } = useAuth();
  const navigate = useNavigate();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzingRepo, setAnalyzingRepo] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!githubToken) {
      setLoading(false);
      return;
    }

    const fetchRepos = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50', {
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch repositories');
        }

        const data = await response.json();
        setRepos(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching repositories');
      } finally {
        setLoading(false);
      }
    };

    fetchRepos();
  }, [user, githubToken, navigate]);

  const handleAnalyze = async (repoUrl: string) => {
    try {
      setAnalyzingRepo(repoUrl);
      const { task_id } = await analyzeGitHub(repoUrl);
      
      const interval = setInterval(async () => {
        try {
          const res = await checkAnalysisStatus(task_id);
          if (res.status === 'completed' && res.result) {
            clearInterval(interval);
            setAnalyzingRepo(null);
            onAnalysisComplete(res.result);
          } else if (res.status === 'failed') {
            clearInterval(interval);
            setAnalyzingRepo(null);
            alert(res.error || 'The analysis engine encountered a fatal error.');
          }
        } catch (err) {
          clearInterval(interval);
          setAnalyzingRepo(null);
          alert('Lost connection to the analysis server.');
        }
      }, 2000);
      
    } catch (err: any) {
      setAnalyzingRepo(null);
      console.error(err);
      alert(err.response?.data?.detail || 'Failed to start analysis.');
    }
  };

  if (!user) return null;

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <FloatingElementsLayer variant="landing" />

      {/* ── Background Glows ── */}
      <div style={{
        position: 'fixed', top: '-10%', left: '-10%', width: '40%', height: '40%',
        background: 'radial-gradient(circle, rgba(210, 193, 182, 0.08) 0%, transparent 70%)',
        zIndex: 0, pointerEvents: 'none'
      }}></div>
      <div style={{
        position: 'fixed', bottom: '-10%', right: '-10%', width: '50%', height: '50%',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 70%)',
        zIndex: 0, pointerEvents: 'none'
      }}></div>

      <div className="page-content" style={{ position: 'relative', zIndex: 1 }}>
        <Animated className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 tracking-tight flex items-center gap-3">
              <Github className="text-[var(--accent)]" size={32} />
              My Repositories
            </h1>
            <p className="text-[var(--text-secondary)]">
              Select a repository to instantly analyze its complexity and health.
            </p>
          </div>
        </Animated>

        {!githubToken ? (
          <Animated delay={0.1}>
            <div className="card flex flex-col items-center justify-center p-10 text-center" style={{ backdropFilter: 'var(--glass-blur)', background: 'var(--glass-bg)' }}>
              <FolderGit2 size={48} className="mb-4 text-[var(--text-muted)] opacity-70" />
              <h2 className="text-xl font-bold mb-2">Not Connected to GitHub</h2>
              <p className="text-[var(--text-secondary)] mb-6 max-w-md">
                You signed in with Google. To view your private repositories, you need to sign in with GitHub.
              </p>
              <button 
                onClick={() => navigate('/auth')}
                className="btn btn-primary"
              >
                Connect GitHub Account
              </button>
            </div>
          </Animated>
        ) : loading ? (
          <Animated delay={0.1}>
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--bg-secondary)] border-t-[var(--accent)] mb-4 shadow-[0_0_15px_rgba(210,193,182,0.3)]"></div>
              <p className="text-[var(--text-secondary)] font-medium tracking-wide">Loading your repositories...</p>
            </div>
          </Animated>
        ) : error ? (
          <Animated delay={0.1}>
            <div className="card" style={{ borderColor: 'var(--danger)', backgroundColor: 'rgba(239, 68, 68, 0.1)', backdropFilter: 'var(--glass-blur)' }}>
              <p className="text-danger font-medium">Error: {error}</p>
            </div>
          </Animated>
        ) : repos.length === 0 ? (
          <Animated delay={0.1}>
            <div className="card flex flex-col items-center justify-center p-10 text-center" style={{ backdropFilter: 'var(--glass-blur)', background: 'var(--glass-bg)' }}>
              <FolderGit2 size={48} className="mb-4 text-[var(--text-muted)] opacity-70" />
              <h2 className="text-xl font-bold mb-2">No Repositories Found</h2>
              <p className="text-[var(--text-secondary)] max-w-md">
                We couldn't find any repositories connected to your GitHub account.
              </p>
            </div>
          </Animated>
        ) : (
          <Animated delay={0.1}>
            <div className="grid-auto-fill gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {repos.map((repo) => (
                <div key={repo.id} className="card flex flex-col h-full hover:border-[var(--accent)] transition-all" style={{ padding: '24px', backdropFilter: 'var(--glass-blur)', background: 'var(--glass-bg)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-lg truncate pr-4 text-[var(--text-primary)]" title={repo.full_name}>
                        {repo.name}
                      </h3>
                      <a href={repo.html_url} target="_blank" rel="noreferrer" className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors" title="View on GitHub">
                        <ExternalLink size={16} />
                      </a>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-4" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '40px' }}>
                      {repo.description || "No description provided."}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] font-mono mb-6">
                      {repo.language && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }}></span>
                          {repo.language}
                        </span>
                      )}
                      <span className="flex items-center gap-1"><Star size={14} /> {repo.stargazers_count}</span>
                      <span className="flex items-center gap-1"><GitFork size={14} /> {repo.forks_count}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAnalyze(repo.html_url)}
                    disabled={analyzingRepo === repo.html_url}
                    className="btn btn-secondary w-full"
                    style={{ fontSize: '0.9rem' }}
                  >
                    {analyzingRepo === repo.html_url ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Zap size={16} />
                        Analyze Repo
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </Animated>
        )}
      </div>
    </div>
  );
};

export default GitHubReposPage;

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeGitHub, analyzeUpload, analyzeLocal } from '../api';
import type { AnalysisResult } from '../types';

type Tab = 'github' | 'upload' | 'local';

interface Props {
  onResult: (result: AnalysisResult) => void;
}

export default function AnalysisInputPage({ onResult }: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('github');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // GitHub state
  const [githubUrl, setGithubUrl] = useState('');
  const [branch, setBranch] = useState('main');

  // Upload state
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');

  // Local state
  const [localPath, setLocalPath] = useState('');

  const handleAnalyze = async () => {
    setError('');
    setLoading(true);
    try {
      let result: AnalysisResult;
      switch (tab) {
        case 'github':
          if (!githubUrl.trim()) throw new Error('Please enter a GitHub URL');
          result = await analyzeGitHub(githubUrl.trim(), branch || 'main');
          break;
        case 'upload':
          if (!fileRef.current?.files?.[0]) throw new Error('Please select a zip file');
          result = await analyzeUpload(fileRef.current.files[0]);
          break;
        case 'local':
          if (!localPath.trim()) throw new Error('Please enter a directory path');
          result = await analyzeLocal(localPath.trim());
          break;
        default:
          throw new Error('Invalid tab');
      }
      onResult(result);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Analysis failed';
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="input-page">
      <h1 className="input-page-title">Analyze a Repository</h1>
      <p className="input-page-subtitle">
        Choose how you'd like to provide your codebase for analysis
      </p>

      <div className="input-tabs">
        <button className={`input-tab ${tab === 'github' ? 'active' : ''}`} onClick={() => setTab('github')}>
          🔗 GitHub URL
        </button>
        <button className={`input-tab ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>
          📦 Upload Zip
        </button>
        <button className={`input-tab ${tab === 'local' ? 'active' : ''}`} onClick={() => setTab('local')}>
          📁 Local Directory
        </button>
      </div>

      {error && <div className="error-message">⚠️ {error}</div>}

      {tab === 'github' && (
        <div className="input-panel">
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="input-group" style={{ marginBottom: '1rem' }}>
              <label className="input-label">Repository URL</label>
              <input
                className="input"
                type="url"
                placeholder="https://github.com/user/repo"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Branch (optional)</label>
              <input
                className="input"
                type="text"
                placeholder="main"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        </div>
      )}

      {tab === 'upload' && (
        <div className="input-panel">
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="input-group">
              <label className="input-label">ZIP Archive</label>
              <div className="input-row">
                <input
                  className="input"
                  type="text"
                  placeholder="No file selected"
                  value={fileName}
                  readOnly
                />
                <button
                  className="btn btn-secondary"
                  onClick={() => fileRef.current?.click()}
                  disabled={loading}
                >
                  Browse
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".zip"
                style={{ display: 'none' }}
                onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
              />
            </div>
          </div>
        </div>
      )}

      {tab === 'local' && (
        <div className="input-panel">
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="input-group">
              <label className="input-label">Directory Path</label>
              <input
                className="input"
                type="text"
                placeholder="C:\Projects\my-app or /home/user/project"
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
        </div>
      )}

      <button
        className="btn btn-primary btn-lg"
        style={{ width: '100%' }}
        onClick={handleAnalyze}
        disabled={loading}
      >
        {loading ? (
          <>
            <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></span>
            Analyzing... This may take a moment
          </>
        ) : (
          <>🔍 Analyze Repository</>
        )}
      </button>
    </div>
  );
}

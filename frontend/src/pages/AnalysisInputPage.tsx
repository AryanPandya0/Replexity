import React, { useState, useRef } from 'react';
import {
  Github,
  FileArchive,
  FolderOpen,
  Loader2,
  AlertCircle,
  GitBranch,
  GitCommit,
  Star,
  Upload,
  File as LucideFile,
  Package,
  FolderTree,
  HardDrive,
  Monitor,
} from 'lucide-react';
import { analyzeLocal, analyzeGitHub, analyzeUpload, checkAnalysisStatus } from '../api';
import type { AnalysisResult } from '../types';
import { Skeleton, CardSkeleton } from '../components/Skeleton';
import { PageTransition } from '../components/Animated';

interface Props {
  onAnalysisComplete: (result: AnalysisResult) => void;
}

type TabType = 'github' | 'zip' | 'local';

const TABS: { key: TabType; label: string; icon: React.ReactNode }[] = [
  { key: 'github', label: 'GitHub', icon: <Github size={16} /> },
  { key: 'zip', label: 'Zip Archive', icon: <FileArchive size={16} /> },
  { key: 'local', label: 'Local Path', icon: <FolderOpen size={16} /> },
];

const FLOATING_ELEMENTS: Record<TabType, { icon: React.ReactNode; label: string; left: string; top: string; rot: number; op: number }[]> = {
  github: [
    { icon: <GitBranch size={14} />, label: 'branch',   left: '3%',  top: '12%', rot: -10, op: 0.5 },
    { icon: <Star size={12} />,      label: 'starred',  left: '6%',  top: '35%', rot: 6,   op: 0.4 },
    { icon: <GitCommit size={14} />, label: 'commit',   left: '2%',  top: '58%', rot: -8,  op: 0.45 },
    { icon: <Github size={12} />,    label: 'clone',    left: '8%',  top: '78%', rot: 12,  op: 0.35 },
    { icon: <GitBranch size={10} />, label: 'pr',       left: '12%', top: '92%', rot: -5,  op: 0.3 },
    { icon: <Github size={16} />,    label: 'repo',     left: '88%', top: '10%', rot: 8,   op: 0.5 },
    { icon: <GitBranch size={12} />, label: 'merge',    left: '92%', top: '32%', rot: -14, op: 0.45 },
    { icon: <Star size={14} />,      label: 'fork',     left: '86%', top: '55%', rot: 5,   op: 0.4 },
    { icon: <GitCommit size={12} />, label: 'tag',      left: '90%', top: '75%', rot: -10, op: 0.35 },
    { icon: <Github size={10} />,    label: 'origin',   left: '85%', top: '90%', rot: 7,   op: 0.3 },
    { icon: <Star size={10} />,      label: 'star',     left: '20%', top: '18%', rot: 15,  op: 0.25 },
    { icon: <GitCommit size={10} />, label: 'sha',      left: '75%', top: '22%', rot: -8,  op: 0.25 },
  ],
  zip: [
    { icon: <Upload size={14} />,      label: 'upload',  left: '3%',  top: '12%', rot: -8,  op: 0.5 },
    { icon: <LucideFile size={12} />,   label: '.ts',     left: '7%',  top: '35%', rot: 10,  op: 0.4 },
    { icon: <Package size={14} />,      label: 'pkg',     left: '2%',  top: '58%', rot: -6,  op: 0.45 },
    { icon: <LucideFile size={12} />,   label: '.jsx',    left: '9%',  top: '78%', rot: 12,  op: 0.35 },
    { icon: <Upload size={10} />,       label: 'stream',  left: '12%', top: '92%', rot: -4,  op: 0.3 },
    { icon: <FileArchive size={16} />, label: 'archive', left: '88%', top: '10%', rot: 6,   op: 0.5 },
    { icon: <LucideFile size={12} />,   label: '.py',     left: '92%', top: '32%', rot: -12, op: 0.45 },
    { icon: <Package size={14} />,      label: 'bundle',  left: '86%', top: '55%', rot: 8,   op: 0.4 },
    { icon: <LucideFile size={12} />,   label: '.rs',     left: '90%', top: '75%', rot: -7,  op: 0.35 },
    { icon: <FileArchive size={10} />, label: 'tar.gz',  left: '85%', top: '90%', rot: 5,   op: 0.3 },
    { icon: <Package size={10} />,      label: 'npm',     left: '18%', top: '20%', rot: -12, op: 0.25 },
    { icon: <LucideFile size={10} />,   label: '.go',     left: '78%', top: '20%', rot: 9,   op: 0.25 },
  ],
  local: [
    { icon: <FolderTree size={14} />,  label: 'tree',     left: '3%',  top: '12%', rot: -6,  op: 0.5 },
    { icon: <HardDrive size={12} />,   label: 'disk',     left: '7%',  top: '35%', rot: 8,   op: 0.4 },
    { icon: <LucideFile size={14} />,   label: 'src',      left: '2%',  top: '58%', rot: -10, op: 0.45 },
    { icon: <FolderOpen size={12} />,  label: 'modules',  left: '9%',  top: '78%', rot: 6,   op: 0.35 },
    { icon: <HardDrive size={10} />,   label: 'ssd',      left: '12%', top: '92%', rot: -4,  op: 0.3 },
    { icon: <Monitor size={16} />,     label: 'local',    left: '88%', top: '10%', rot: 10,  op: 0.5 },
    { icon: <FolderOpen size={12} />,  label: 'dir',      left: '92%', top: '32%', rot: -8,  op: 0.45 },
    { icon: <FolderTree size={14} />,  label: 'node',     left: '86%', top: '55%', rot: 5,   op: 0.4 },
    { icon: <LucideFile size={12} />,   label: 'config',   left: '90%', top: '75%', rot: -12, op: 0.35 },
    { icon: <Monitor size={10} />,     label: 'dev',      left: '85%', top: '90%', rot: 7,   op: 0.3 },
    { icon: <FolderTree size={10} />,  label: 'root',     left: '20%', top: '16%', rot: 12,  op: 0.25 },
    { icon: <HardDrive size={10} />,   label: 'vol',      left: '76%', top: '22%', rot: -6,  op: 0.25 },
  ],
};

export default function AnalysisInputPage({ onAnalysisComplete }: Props) {
  const [tab, setTab] = useState<TabType>('github');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');

  const [repoUrl, setRepoUrl] = useState('');
  const [localPath, setLocalPath] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startPolling = (taskId: string) => {
    setLoading(true);
    setStatus('Analysis initiated...');
    const interval = setInterval(async () => {
      try {
        const res = await checkAnalysisStatus(taskId);
        if (res.status === 'completed' && res.result) {
          clearInterval(interval);
          onAnalysisComplete(res.result);
        } else if (res.status === 'failed') {
          clearInterval(interval);
          setError(res.error || 'The analysis engine encountered a fatal error.');
          setLoading(false);
          setStatus('');
        } else {
          setStatus(res.status === 'processing' ? 'Crunching code metrics...' : 'Queueing task...');
        }
      } catch {
        clearInterval(interval);
        setError('Lost connection to the analysis server.');
        setLoading(false);
        setStatus('');
      }
    }, 2000);
  };

  const handleGitHub = async () => {
    if (!repoUrl) return;
    setLoading(true); setError(null);
    try {
      const { task_id } = await analyzeGitHub(repoUrl);
      startPolling(task_id);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start GitHub analysis.');
      setLoading(false);
    }
  };

  const handleLocal = async () => {
    if (!localPath) return;
    setLoading(true); setError(null);
    try {
      const { task_id } = await analyzeLocal(localPath);
      startPolling(task_id);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid directory path or access denied.');
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setLoading(true); setError(null);
    try {
      const { task_id } = await analyzeUpload(file);
      startPolling(task_id);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload and analyze zip archive.');
      setLoading(false);
    }
  };



  return (
    <PageTransition>
      <div style={{ position: 'relative', minHeight: 'calc(100vh - 72px)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          {FLOATING_ELEMENTS[tab].map((el, i) => (
            <div
              key={`${tab}-${i}`}
              style={{
                position: 'absolute', left: el.left, top: el.top, transform: `rotate(${el.rot}deg)`,
                display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg-secondary)',
                border: '1px solid var(--border)', borderRadius: 10, padding: '7px 13px',
                boxShadow: '0 6px 20px rgba(0,0,0,0.2)', color: 'var(--accent)', fontSize: '0.6rem',
                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: el.op,
                transition: 'opacity 0.6s ease, transform 0.6s ease',
              }}
            >
              {el.icon}
              <span style={{ color: 'var(--text-muted)' }}>{el.label}</span>
            </div>
          ))}
        </div>

        <div className="analysis-container">
          <div style={{ width: '100%' }}>
            <div className="analysis-header">
              <h1 className="analysis-title">Code Intelligence</h1>
              <p className="analysis-description">Choose your ingestion method to begin the audit.</p>
            </div>

            <div className="tab-container">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  disabled={loading}
                  className={`tab-button ${tab === t.key ? 'active' : ''}`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            <div className="input-panel">
              {loading ? (
                <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)' }}>
                      {status}
                    </div>
                    <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="progress-bar" style={{ marginBottom: 24 }}>
                    <div className="progress-fill animate-progress-bar"></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 1.5fr', gap: 16 }}>
                    <CardSkeleton />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ background: 'var(--bg-secondary)', border: '2px solid var(--border)', borderRadius: 12, padding:16, flex:1 }}>
                        <Skeleton height={14} width="60%" />
                        <div style={{ height: 60, marginTop:10, display:'flex', alignItems:'flex-end', gap:4 }}>
                          <Skeleton width="15%" height="30%" />
                          <Skeleton width="15%" height="70%" />
                          <Skeleton width="15%" height="100%" />
                          <Skeleton width="15%" height="50%" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {tab === 'github' && (
                    <div>
                      <label className="input-label">Public Repository URL</label>
                      <input type="text" placeholder="https://github.com/facebook/react" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} disabled={loading} className="form-input" />
                      <button onClick={handleGitHub} disabled={loading || !repoUrl} className="submit-button">Connect & Analyze</button>
                    </div>
                  )}
                  {tab === 'zip' && (
                    <div>
                      <label className="input-label">Source Code Archive (.zip)</label>
                      <input type="file" ref={fileInputRef} onChange={handleUpload} hidden accept=".zip" />
                      <div onClick={() => !loading && fileInputRef.current?.click()} className={`file-picker ${fileName ? 'selected' : ''}`}>
                        <FileArchive size={16} style={{ opacity: 0.5 }} />
                        {fileName || 'Click to select a .zip archive...'}
                      </div>
                      <button onClick={() => fileInputRef.current?.click()} disabled={loading} className="submit-button">Upload & Analyze</button>
                    </div>
                  )}
                  {tab === 'local' && (
                    <div>
                      <label className="input-label">Absolute Filesystem Path</label>
                      <input type="text" placeholder="D:\Projects\my-app" value={localPath} onChange={(e) => setLocalPath(e.target.value)} disabled={loading} className="form-input" />
                      <button onClick={handleLocal} disabled={loading || !localPath} className="submit-button">Scan Directory</button>
                    </div>
                  )}
                </>
              )}
            </div>

            {error && (
              <div className="error-alert">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div className="error-text">{error}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

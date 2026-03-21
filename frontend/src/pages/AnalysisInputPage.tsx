import { useState, useRef } from 'react';
import { 
  Github, 
  FileArchive, 
  FolderPlus, 
  Loader2, 
  AlertCircle
} from 'lucide-react';
import { analyzeLocal, analyzeGitHub, analyzeUpload, checkAnalysisStatus } from '../api';
import type { AnalysisResult } from '../types';

interface Props {
  onAnalysisComplete: (result: AnalysisResult) => void;
}

type TabType = 'github' | 'zip' | 'local';

export default function AnalysisInputPage({ onAnalysisComplete }: Props) {
  const [tab, setTab] = useState<TabType>('github');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  
  // Inputs
  const [repoUrl, setRepoUrl] = useState('');
  const [localPath, setLocalPath] = useState('');
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
        } else {
          setStatus(res.status === 'processing' ? 'Crunching code metrics...' : 'Queueing task...');
        }
      } catch (err) {
        clearInterval(interval);
        setError('Lost connection to the analysis server.');
        setLoading(false);
      }
    }, 2000);
  };

  const handleGitHub = async () => {
    if (!repoUrl) return;
    setLoading(true);
    setError(null);
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
    setLoading(true);
    setError(null);
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
    setLoading(true);
    setError(null);
    try {
      const { task_id } = await analyzeUpload(file);
      startPolling(task_id);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload and analyze zip archive.');
      setLoading(false);
    }
  };

  return (
    <div className="page-content flex flex-col items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black mb-3 text-[var(--text-primary)]">Code Intelligence</h1>
          <p className="text-[var(--text-secondary)]">Choose your ingestion method to begin the visual audit.</p>
        </div>

        {/* ── Tabs ── */}
        <div className="flex bg-[var(--bg-secondary)] p-1 rounded-xl border-2 border-[var(--border)] mb-8">
          <button 
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${tab === 'github' ? 'bg-[var(--accent)] text-[var(--bg-primary)] shadow-lg' : 'text-[var(--text-muted)] hover:text-white'}`}
            onClick={() => setTab('github')}
            disabled={loading}
          >
            <Github size={18} /> GitHub
          </button>
          <button 
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${tab === 'zip' ? 'bg-[var(--accent)] text-[var(--bg-primary)] shadow-lg' : 'text-[var(--text-muted)] hover:text-white'}`}
            onClick={() => setTab('zip')}
            disabled={loading}
          >
            <FileArchive size={18} /> Zip
          </button>
          <button 
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${tab === 'local' ? 'bg-[var(--accent)] text-[var(--bg-primary)] shadow-lg' : 'text-[var(--text-muted)] hover:text-white'}`}
            onClick={() => setTab('local')}
            disabled={loading}
          >
            <FolderPlus size={18} /> Local
          </button>
        </div>

        {/* ── Input Panels ── */}
        <div className="card min-h-[220px] flex flex-col justify-center">
          {tab === 'github' && (
            <div className="animate-in fade-in duration-300">
              <div className="input-group">
                <label className="input-label">Public Repository URL</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="https://github.com/facebook/react"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  disabled={loading}
                />
              </div>
              <button 
                className="btn btn-primary w-full mt-2" 
                onClick={handleGitHub}
                disabled={loading || !repoUrl}
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Connect & Analyze'}
              </button>
            </div>
          )}

          {tab === 'zip' && (
            <div className="text-center animate-in fade-in duration-300">
              <div className="mb-6 p-8 border-2 border-dashed border-[var(--border)] rounded-xl bg-[var(--bg-primary)]">
                <FileArchive size={40} className="mx-auto mb-4 text-[var(--text-muted)]" />
                <p className="text-sm text-[var(--text-secondary)] mb-4">Upload a ZIP containing your source code</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleUpload} 
                  hidden 
                  accept=".zip"
                />
                <button 
                  className="btn btn-secondary" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  Choose Archive
                </button>
              </div>
            </div>
          )}

          {tab === 'local' && (
            <div className="animate-in fade-in duration-300">
              <div className="input-group">
                <label className="input-label">Absolute Filesystem Path</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="C:\Projects\Replexity"
                  value={localPath}
                  onChange={(e) => setLocalPath(e.target.value)}
                  disabled={loading}
                />
              </div>
              <button 
                className="btn btn-primary w-full mt-2" 
                onClick={handleLocal}
                disabled={loading || !localPath}
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Process Local Path'}
              </button>
            </div>
          )}
        </div>

        {/* ── Loading & Status ── */}
        {loading && (
          <div className="mt-8 flex flex-col items-center gap-4">
            <span className="text-[var(--accent)] font-bold text-sm uppercase tracking-widest">{status}</span>
            <div className="w-full h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden border-2 border-[var(--border)]">
              <div className="h-full bg-[var(--accent)] animate-progress-bar"></div>
            </div>
          </div>
        )}

        {/* ── Error Display ── */}
        {error && (
          <div className="mt-8 flex items-start gap-3 p-4 bg-red-500/10 border-2 border-red-500/20 rounded-xl text-red-400">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="text-sm font-bold">{error}</div>
          </div>
        )}
      </div>
    </div>
  );
}

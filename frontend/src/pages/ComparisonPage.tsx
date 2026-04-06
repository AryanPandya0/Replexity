import { useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ChevronLeft, ArrowLeftRight, Zap, Target, Bug, AlertTriangle, Braces } from 'lucide-react';
import type { AnalysisResult, FileMetrics } from '../types';
import { FloatingElementsLayer } from '../components/FloatingElements';
import { PageTransition } from '../components/Animated';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Props {
  result: AnalysisResult | null;
}

export default function ComparisonPage({ result }: Props) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const filePaths = useMemo(() => {
    return searchParams.getAll('files').map(f => decodeURIComponent(f));
  }, [searchParams]);

  const files = useMemo(() => {
    if (!result) return [];
    return filePaths.map(p => result.files.find(f => f.file_path === p)).filter(Boolean) as FileMetrics[];
  }, [result, filePaths]);

  if (!result || files.length < 2) {
    return (
      <div className="responsive-container empty-state">
        <ArrowLeftRight size={48} style={{ color: 'var(--accent)', margin: '0 auto 16px' }} />
        <h2 className="empty-title">Insufficient Comparison Data</h2>
        <p className="empty-description">Select at least two files from the dashboard to compare metrics side-by-side.</p>
        <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <PageTransition>
      <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: 60 }}>
        <FloatingElementsLayer variant="dashboard" />

        <div className="responsive-container" style={{ position: 'relative', zIndex: 1, paddingTop: 40 }}>
          {/* Header */}
          <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <button 
                onClick={() => navigate(-1)} 
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 16 }}
              >
                <ChevronLeft size={16} /> Back to Dashboard
              </button>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: 8 }}>Cross-Module Comparison</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Comparative analysis of structural complexity and risk profiles</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="risk-badge" style={{ background: 'rgba(210,193,182,0.05)', color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                {files.length} Modules Loaded
              </div>
            </div>
          </div>

          {/* ── Comparison Matrix ── */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${files.length}, 1fr)`, gap: 20, marginBottom: 40 }}>
            {files.map(file => (
              <div key={file.file_path} style={{ background: 'var(--bg-secondary)', border: '2px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.05em' }}>{file.language}</div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.file_path.split(/[/\\]/).pop()}
                  </h3>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.file_path}</div>
                </div>

                <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <MetricRow icon={<Zap size={14} />} label="Complexity" value={file.cyclomatic_complexity.toFixed(1)} />
                  <MetricRow icon={<Target size={14} />} label="Cognitive" value={file.cognitive_complexity.toFixed(1)} />
                  <MetricRow icon={<AlertTriangle size={14} />} label="Smells" value={file.code_smells.length} />
                  <MetricRow icon={<Bug size={14} />} label="Risk Score" value={Math.round(file.risk_score)} />
                  <MetricRow icon={<Braces size={14} />} label="LOC" value={file.loc} />
                </div>
              </div>
            ))}
          </div>

          {/* ── Side-by-Side Code Preview ── */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${files.length}, 1fr)`, gap: 20 }}>
            {files.map(file => (
              <div key={file.file_path} style={{ background: 'var(--bg-secondary)', border: '2px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(210,193,182,0.02)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>Source Preview</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent)' }}>{file.language}</span>
                </div>
                <div style={{ maxHeight: 500, overflowY: 'auto', fontSize: '0.75rem' }}>
                  <SyntaxHighlighter
                    language={file.language.toLowerCase()}
                    style={vscDarkPlus}
                    customStyle={{ margin: 0, padding: '20px', background: 'transparent' }}
                    showLineNumbers
                  >
                    {file.code_content || '// No source available for this module.'}
                  </SyntaxHighlighter>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

function MetricRow({ icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        {icon}
        <span>{label}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent)' }}>
        {value}
      </div>
    </div>
  );
}

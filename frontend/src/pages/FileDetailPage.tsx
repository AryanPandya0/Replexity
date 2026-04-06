import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Code2, Search, AlertTriangle, Bug } from 'lucide-react';
import type { AnalysisResult } from '../types';
import { FloatingElementsLayer } from '../components/FloatingElements';

interface Props {
  result: AnalysisResult | null;
}

export default function FileDetailPage({ result }: Props) {
  const { filePath } = useParams<{ filePath: string }>();
  const decodedPath = decodeURIComponent(filePath || '');

  if (!result) {
    return (
      <div className="responsive-container empty-state">
        <Search size={48} style={{ color: 'var(--accent)', margin: '0 auto 16px' }} />
        <h2 className="empty-title">No Analysis Data</h2>
        <p className="empty-description">Please run an analysis first.</p>
        <Link to="/analyze" className="btn btn-primary">Start Analysis</Link>
      </div>
    );
  }

  const file = result.files.find((f) => f.file_path === decodedPath);
  if (!file) {
    return (
      <div className="responsive-container empty-state">
        <AlertTriangle size={48} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
        <h2 className="empty-title">File Not Found</h2>
        <p className="empty-description">Could not find metrics for:</p>
        <code className="font-mono text-sm" style={{ color: 'var(--accent)' }}>{decodedPath}</code>
        <div style={{ marginTop: 24 }}>
          <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const riskLevel = getRiskLevel(file.risk_score);
  const riskColor = riskLevel === 'low' ? '#10b981' : riskLevel === 'medium' ? '#f59e0b' : riskLevel === 'high' ? '#f97316' : '#ef4444';

  const card: React.CSSProperties = {
    background: 'var(--bg-secondary)', border: '2px solid var(--border)',
    borderRadius: 12, padding: '20px 24px',
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <FloatingElementsLayer variant="filedetail" />
      <div className="responsive-container" style={{ position: 'relative', zIndex: 1, maxWidth: 1100, paddingTop: 32, paddingBottom: 32 }}>

      {/* ── Header ── */}
      <div className="file-header">
        <Link to="/dashboard" className="back-button">
          <ChevronRight size={18} />
        </Link>
        <div className="file-info">
          <div className="file-meta">
            <Code2 size={14} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{file.language} Module</span>
          </div>
          <h1 className="file-path">
            {file.file_path}
          </h1>
        </div>
        <span className="risk-badge" style={{ background: `${riskColor}18`, color: riskColor }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: riskColor }}></span>
          Score: {Math.round(file.risk_score)}
        </span>
      </div>

      {/* ── Primary Metrics (4-col) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
        <MetricCard label="Complexity Index" value={file.cyclomatic_complexity} color={file.cyclomatic_complexity > 15 ? '#ef4444' : '#D2C1B6'} />
        <MetricCard label="Cognitive Load" value={file.cognitive_complexity} color={file.cognitive_complexity > 20 ? '#f59e0b' : '#D2C1B6'} />
        <MetricCard label="Maintainability" value={`${file.maintainability_index}%`} color={file.maintainability_index >= 60 ? '#10b981' : '#f59e0b'} />
        <MetricCard label="Bug Risk" value={`${file.bug_risk_probability}%`} color={file.bug_risk_probability > 50 ? '#ef4444' : '#D2C1B6'} />
      </div>

      {/* ── Secondary Metrics (4-col small) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 32 }}>
        <SmallMetric label="Total LOC" value={file.loc} />
        <SmallMetric label="Code Churn" value={file.code_churn} />
        <SmallMetric label="Instability" value={file.instability.toFixed(2)} />
        <SmallMetric label="Coupling Ca/Ce" value={`${file.coupling_afferent} / ${file.coupling_efferent}`} />
      </div>

      {/* ── Functions Table ── */}
      {file.functions.length > 0 && (
        <div style={{ ...card, marginBottom: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '1rem', fontWeight: 800 }}>Functional Breakdown</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{file.functions.length} function definitions</div>
          </div>
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  {['Function', 'Lines', 'Complexity', 'Cognitive', 'Params'].map((h, i) => (
                    <th key={h} style={{
                      textAlign: i === 0 ? 'left' : 'center', padding: '10px 14px',
                      color: 'var(--text-muted)', fontSize: '0.6rem', fontWeight: 700,
                      textTransform: 'uppercase', borderBottom: '2px solid var(--border)', letterSpacing: '0.06em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {file.functions.map((fn, i) => (
                  <tr key={`${fn.name}-${i}`}>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Code2 size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{fn.name}()</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      L{fn.line_start}–{fn.line_end || '?'}
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: fn.complexity > 10 ? '#ef4444' : 'inherit', fontWeight: fn.complexity > 10 ? 700 : 400 }}>
                      {fn.complexity}
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: fn.cognitive_complexity > 15 ? '#ef4444' : 'inherit', fontWeight: fn.cognitive_complexity > 15 ? 700 : 400 }}>
                      {fn.cognitive_complexity}
                    </td>
                    <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                      {fn.parameters}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Code Smells & Refactoring (2-col) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>

        {/* Code Smells */}
        <div>
          <h2 className="text-sm font-black" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bug size={16} style={{ color: '#ef4444' }} /> Code Smells
          </h2>
          <div className="flex flex-col gap-1\.5">
            {file.code_smells.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>No smells detected.</div>}
            {file.code_smells.map((smell, i) => (
              <div key={i} className="smell-card">
                <div className="card-title">{smell.issue}</div>
                {smell.function && <div className="card-function">in {smell.function}()</div>}
                <div className="card-description">{smell.suggestion}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Refactoring */}
        <div>
          <h2 className="text-sm font-black" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Refactoring Suggestions
          </h2>
          <div className="flex flex-col gap-1\.5">
            {file.refactor_suggestions.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>No suggestions at this time.</div>}
            {file.refactor_suggestions.map((sug, i) => (
              <div key={i} className={`suggestion-card ${sug.priority === 'critical' ? 'critical' : ''}`}>
                <div className="flex justify-between items-center mb-1">
                  <div className="card-title">{sug.issue}</div>
                  <span className={`priority-badge ${sug.priority === 'critical' ? 'critical' : 'normal'}`}>{sug.priority}</span>
                </div>
                <div className="card-description">{sug.suggestion}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color }}>{value}</div>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric-small">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}

function getRiskLevel(score: number): string {
  if (score < 30) return 'low';
  if (score < 60) return 'medium';
  if (score < 85) return 'high';
  return 'critical';
}

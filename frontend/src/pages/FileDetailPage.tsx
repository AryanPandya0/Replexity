import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Code2, Search, AlertTriangle, Bug } from 'lucide-react';
import type { AnalysisResult } from '../types';

interface Props {
  result: AnalysisResult | null;
}

export default function FileDetailPage({ result }: Props) {
  const { filePath } = useParams<{ filePath: string }>();
  const decodedPath = decodeURIComponent(filePath || '');

  if (!result) {
    return (
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '120px 48px', textAlign: 'center' }}>
        <Search size={48} style={{ color: 'var(--accent)', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 8 }}>No Analysis Data</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Please run an analysis first.</p>
        <Link to="/analyze" style={{ display: 'inline-block', padding: '12px 32px', background: 'var(--accent)', color: 'var(--bg-primary)', borderRadius: 10, fontWeight: 800, textDecoration: 'none' }}>Start Analysis</Link>
      </div>
    );
  }

  const file = result.files.find((f) => f.file_path === decodedPath);
  if (!file) {
    return (
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '120px 48px', textAlign: 'center' }}>
        <AlertTriangle size={48} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 8 }}>File Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>Could not find metrics for:</p>
        <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent)' }}>{decodedPath}</code>
        <div style={{ marginTop: 24 }}>
          <Link to="/dashboard" style={{ display: 'inline-block', padding: '12px 32px', background: 'var(--accent)', color: 'var(--bg-primary)', borderRadius: 10, fontWeight: 800, textDecoration: 'none' }}>Back to Dashboard</Link>
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
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 48px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32, paddingBottom: 24, borderBottom: '2px solid var(--border)' }}>
        <Link to="/dashboard" style={{
          width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-secondary)', border: '2px solid var(--border)', borderRadius: 8,
          color: 'var(--text-secondary)', textDecoration: 'none',
        }}>
          <ChevronLeft size={18} />
        </Link>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Code2 size={14} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{file.language} Module</span>
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {file.file_path}
          </h1>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 700,
          textTransform: 'uppercase', background: `${riskColor}18`, color: riskColor,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: riskColor }}></span>
          Score: {Math.round(file.risk_score)}
        </span>
      </div>

      {/* ── Primary Metrics (4-col) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 14 }}>
        <MetricCard label="Complexity Index" value={file.cyclomatic_complexity} color={file.cyclomatic_complexity > 15 ? '#ef4444' : '#D2C1B6'} />
        <MetricCard label="Cognitive Load" value={file.cognitive_complexity} color={file.cognitive_complexity > 20 ? '#f59e0b' : '#D2C1B6'} />
        <MetricCard label="Maintainability" value={`${file.maintainability_index}%`} color={file.maintainability_index >= 60 ? '#10b981' : '#f59e0b'} />
        <MetricCard label="Bug Risk" value={`${file.bug_risk_probability}%`} color={file.bug_risk_probability > 50 ? '#ef4444' : '#D2C1B6'} />
      </div>

      {/* ── Secondary Metrics (4-col small) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
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
          <div style={{ overflowX: 'auto' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Code Smells */}
        <div>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bug size={16} style={{ color: '#ef4444' }} /> Code Smells
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {file.code_smells.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>No smells detected.</div>}
            {file.code_smells.map((smell, i) => (
              <div key={i} style={{
                padding: '14px 16px', background: 'var(--bg-secondary)',
                borderLeft: '3px solid #ef4444', border: '1px solid var(--border)',
                borderRadius: '0 8px 8px 0',
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: 4 }}>{smell.issue}</div>
                {smell.function && <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 6 }}>in {smell.function}()</div>}
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{smell.suggestion}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Refactoring */}
        <div>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            Refactoring Suggestions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {file.refactor_suggestions.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>No suggestions at this time.</div>}
            {file.refactor_suggestions.map((sug, i) => (
              <div key={i} style={{
                padding: '14px 16px', background: 'var(--bg-secondary)',
                borderLeft: `3px solid ${sug.priority === 'critical' ? '#ef4444' : 'var(--accent)'}`,
                border: '1px solid var(--border)', borderRadius: '0 8px 8px 0',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{sug.issue}</div>
                  <span style={{
                    fontSize: '0.5rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                    textTransform: 'uppercase',
                    background: sug.priority === 'critical' ? 'rgba(239,68,68,0.15)' : 'rgba(210,193,182,0.1)',
                    color: sug.priority === 'critical' ? '#ef4444' : 'var(--accent)',
                  }}>{sug.priority}</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{sug.suggestion}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)', border: '2px solid var(--border)',
      borderRadius: 12, padding: '18px 22px', transition: 'border-color 0.2s',
    }}>
      <div style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '12px 16px',
    }}>
      <div style={{ fontSize: '0.5rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '0.85rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{value}</div>
    </div>
  );
}

function getRiskLevel(score: number): string {
  if (score < 30) return 'low';
  if (score < 60) return 'medium';
  if (score < 85) return 'high';
  return 'critical';
}

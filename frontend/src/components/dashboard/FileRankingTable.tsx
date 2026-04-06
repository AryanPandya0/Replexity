import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { FileMetrics } from '../../types';

interface Props {
  files: FileMetrics[];
}

export function FileRankingTable({ files }: Props) {
  const sortedFiles = [...files].sort((a, b) => b.risk_score - a.risk_score).slice(0, 10);

  return (
    <div style={{
      background: 'var(--bg-secondary)', border: '2px solid var(--border)',
      borderRadius: 12, padding: 28,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 800 }}>File Integrity Ranking</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Top 10 critical modules</div>
        </div>
        <div style={{
          padding: '4px 12px', background: 'var(--bg-primary)', borderRadius: 20,
          fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)',
          textTransform: 'uppercase', border: '1px solid var(--border)',
        }}>Risk-Weighted</div>
      </div>

      <div className="table-responsive">
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr>
            {['File', 'Complexity', 'Integrity', 'Risk', ''].map((h, i) => (
              <th key={i} style={{
                textAlign: i === 0 ? 'left' : i === 4 ? 'right' : 'center',
                padding: '10px 16px', color: 'var(--text-muted)',
                fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                borderBottom: '2px solid var(--border)', letterSpacing: '0.06em',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedFiles.map((file) => (
            <tr key={file.file_path} style={{ transition: 'background 0.15s' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(210,193,182,0.02)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', maxWidth: 300 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 900, color: 'var(--accent)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.file_path.split(/[/\\]/).pop()}
                </div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', opacity: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.file_path}
                </div>
              </td>
              <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                {file.cyclomatic_complexity}
              </td>
              <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                {file.maintainability_index}%
              </td>
              <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700,
                  textTransform: 'uppercase',
                  background: getRiskBg(file.risk_score), color: getRiskColor(file.risk_score),
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: getRiskColor(file.risk_score) }}></span>
                  {Math.round(file.risk_score)}
                </span>
              </td>
              <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                <Link to={`/file/${encodeURIComponent(file.file_path)}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 28, height: 28, borderRadius: 6, color: 'var(--text-muted)',
                    transition: 'all 0.15s', textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = 'var(--bg-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <ChevronRight size={14} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function getRiskColor(score: number): string {
  if (score < 30) return '#10b981';
  if (score < 60) return '#f59e0b';
  if (score < 85) return '#f97316';
  return '#ef4444';
}

function getRiskBg(score: number): string {
  if (score < 30) return 'rgba(16,185,129,0.1)';
  if (score < 60) return 'rgba(245,158,11,0.1)';
  if (score < 85) return 'rgba(249,115,22,0.1)';
  return 'rgba(239,68,68,0.1)';
}

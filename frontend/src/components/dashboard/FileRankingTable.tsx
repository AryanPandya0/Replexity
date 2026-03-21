import { Link } from 'react-router-dom';
import { ChevronRight, FileCode } from 'lucide-react';
import type { FileMetrics } from '../../types';

interface Props {
  files: FileMetrics[];
}

export function FileRankingTable({ files }: Props) {
  // Sort by risk score descending
  const sortedFiles = [...files].sort((a, b) => b.risk_score - a.risk_score).slice(0, 10);

  return (
    <div className="chart-container overflow-hidden">
      <div className="chart-header flex items-center justify-between">
        <div>
          <div className="chart-title">
            <FileCode size={20} className="text-[var(--accent)]" />
            File Integrity Ranking
          </div>
          <div className="chart-subtitle">Top 10 critical modules requiring attention</div>
        </div>
        <div className="px-3 py-1 bg-[var(--bg-primary)] rounded-full text-[10px] font-bold text-[var(--text-muted)] uppercase border border-[var(--border)]">
          Risk-Weighted Sort
        </div>
      </div>
      
      <div className="mt-6 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>File Reference</th>
              <th className="text-center">Complexity</th>
              <th className="text-center">Integrity</th>
              <th className="text-center">Risk Score</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedFiles.map((file) => (
              <tr key={file.file_path}>
                <td className="max-w-[320px] py-4">
                  <div className="flex flex-col justify-center gap-1.5">
                    <div className="font-mono text-sm font-black text-[var(--accent)] tracking-tight truncate leading-tight">
                      {file.file_path.split(/[/\\]/).pop()}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate opacity-50 block leading-none">
                      {file.file_path}
                    </div>
                  </div>
                </td>
                <td className="text-center">
                  <div className="font-mono text-sm">{file.cyclomatic_complexity}</div>
                </td>
                <td className="text-center">
                  <div className="font-mono text-sm">{file.maintainability_index}%</div>
                </td>
                <td className="text-center">
                  <div className={`risk-badge ${getRiskLevel(file.risk_score)}`}>
                    <div className={`risk-dot ${getRiskLevel(file.risk_score)}`} />
                    {Math.round(file.risk_score)}
                  </div>
                </td>
                <td className="text-right">
                  <Link 
                    to={`/file/${encodeURIComponent(file.file_path)}`}
                    className="btn btn-ghost btn-sm p-2 hover:bg-[var(--accent)] hover:text-[var(--bg-primary)]"
                  >
                    <ChevronRight size={16} />
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

function getRiskLevel(score: number): string {
  if (score < 30) return 'low';
  if (score < 60) return 'medium';
  if (score < 85) return 'high';
  return 'critical';
}

import type { AnalysisResult } from '../../types';

interface Props {
  result: AnalysisResult;
}

export function StatCards({ result }: Props) {
  const { overview } = result;

  return (
    <div className="stats-grid">
      <div className="stat-card accent">
        <div className="stat-icon accent">📁</div>
        <div className="card-title">Files Analyzed</div>
        <div className="card-value">{overview.total_files}</div>
      </div>
      <div className="stat-card info">
        <div className="stat-icon info">⚡</div>
        <div className="card-title">Total Functions</div>
        <div className="card-value">{overview.total_functions}</div>
      </div>
      <div className="stat-card warning">
        <div className="stat-icon warning">📏</div>
        <div className="card-title">Total LOC</div>
        <div className="card-value">{overview.total_loc.toLocaleString()}</div>
      </div>
      <div className="stat-card success">
        <div className="stat-icon success">🧮</div>
        <div className="card-title">Avg Complexity</div>
        <div className="card-value">{overview.avg_complexity}</div>
      </div>
      <div className="stat-card danger">
        <div className="stat-icon danger">🛡️</div>
        <div className="card-title">Code Smells</div>
        <div className="card-value">{result.code_smells.length}</div>
      </div>
    </div>
  );
}

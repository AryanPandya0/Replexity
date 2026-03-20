import { useNavigate } from 'react-router-dom';
import type { AnalysisResult } from '../../types';

interface Props {
  files: AnalysisResult['files'];
}

export function FileRankingTable({ files }: Props) {
  const navigate = useNavigate();

  return (
    <div className="chart-container" style={{ marginBottom: '1.5rem' }}>
      <div className="chart-header">
        <div className="chart-title">📋 File Rankings</div>
        <div className="chart-subtitle">All analyzed files sorted by risk score</div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Language</th>
              <th>LOC</th>
              <th>Complexity</th>
              <th>Cognitive</th>
              <th>Nesting</th>
              <th>Churn</th>
              <th>Risk Score</th>
            </tr>
          </thead>
          <tbody>
            {files.map((f) => (
              <tr key={f.file_path} onClick={() => navigate(`/file/${encodeURIComponent(f.file_path)}`)}>
                <td><span className="file-name">{f.file_path}</span></td>
                <td style={{ textTransform: 'capitalize' }}>{f.language}</td>
                <td>{f.loc}</td>
                <td>{f.cyclomatic_complexity}</td>
                <td style={{ color: f.cognitive_complexity > 15 ? 'var(--danger)' : 'var(--text-primary)' }}>
                  {f.cognitive_complexity}
                </td>
                <td>{f.max_nesting_depth}</td>
                <td>{f.code_churn}</td>
                <td>
                  <span className={`risk-badge ${f.risk_level}`}>
                    <span className={`risk-dot ${f.risk_level}`}></span>
                    {f.risk_score}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

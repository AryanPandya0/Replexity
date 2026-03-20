import { useNavigate } from 'react-router-dom';
import type { AnalysisResult } from '../../types';

interface Props {
  files: AnalysisResult['files'];
}

export function RiskHeatmap({ files }: Props) {
  const navigate = useNavigate();
  const heatmapFiles = files.slice(0, 60);

  const getCellColor = (risk: number) => {
    if (risk >= 75) return 'rgba(239,68,68,0.85)';
    if (risk >= 50) return 'rgba(249,115,22,0.8)';
    if (risk >= 25) return 'rgba(245,158,11,0.75)';
    return 'rgba(16,185,129,0.7)';
  };

  return (
    <div className="chart-container" style={{ marginBottom: '1.5rem' }}>
      <div className="chart-header">
        <div className="chart-title">🔥 Risk Heatmap</div>
        <div className="chart-subtitle">Each cell represents a file — color indicates risk level</div>
      </div>
      <div className="heatmap-grid">
        {heatmapFiles.map((f) => {
          const parts = f.file_path.split(/[/\\]/);
          const shortName = parts[parts.length - 1];
          return (
            <div
              key={f.file_path}
              className="heatmap-cell"
              style={{ background: getCellColor(f.risk_score) }}
              onClick={() => navigate(`/file/${encodeURIComponent(f.file_path)}`)}
              title={`${f.file_path}\nRisk: ${f.risk_score}\nCC: ${f.cyclomatic_complexity}\nLOC: ${f.loc}`}
            >
              <span className="cell-score">{Math.round(f.risk_score)}</span>
              <span className="cell-name">{shortName}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '1rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(16,185,129,0.7)' }}></span> Low
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(245,158,11,0.75)' }}></span> Medium
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(249,115,22,0.8)' }}></span> High
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(239,68,68,0.85)' }}></span> Critical
        </span>
      </div>
    </div>
  );
}

import type { FileMetrics } from '../../types';

interface Props {
  files: FileMetrics[];
}

export function RiskHeatmap({ files }: Props) {
  const heatmapFiles = [...files].sort((a, b) => b.risk_score - a.risk_score).slice(0, 48);

  const getHeatColor = (score: number) => {
    if (score < 30) return '#10b981';
    if (score < 50) return '#34d399';
    if (score < 70) return '#f59e0b';
    if (score < 85) return '#f97316';
    return '#ef4444';
  };

  return (
    <div style={{
      background: 'var(--bg-secondary)', border: '2px solid var(--border)',
      borderRadius: 12, padding: 28, marginBottom: 24,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 800 }}>Structural Risk Heatmap</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Visualizing risk density across modules</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: '#10b981' }}></div>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Low</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: '#ef4444' }}></div>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Crit</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: 6 }}>
        {heatmapFiles.map((file, i) => (
          <div
            key={i}
            title={`${file.file_path.split(/[/\\]/).pop()} — Risk: ${Math.round(file.risk_score)}`}
            style={{
              aspectRatio: '1', borderRadius: 3, background: getHeatColor(file.risk_score),
              cursor: 'crosshair', transition: 'transform 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.2)'; e.currentTarget.style.zIndex = '10'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.zIndex = '0'; }}
          />
        ))}
      </div>
    </div>
  );
}

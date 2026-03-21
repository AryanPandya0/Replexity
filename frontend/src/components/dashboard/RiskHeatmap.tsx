import { Info } from 'lucide-react';
import type { FileMetrics } from '../../types';

interface Props {
  files: FileMetrics[];
}

export function RiskHeatmap({ files }: Props) {
  // Take top 40 files for better grid density
  const heatmapFiles = [...files].sort((a, b) => b.risk_score - a.risk_score).slice(0, 48);

  const getHeatColor = (score: number) => {
    if (score < 30) return 'bg-[#10b981]';
    if (score < 50) return 'bg-[#34d399]';
    if (score < 70) return 'bg-[#f59e0b]';
    if (score < 85) return 'bg-[#f97316]';
    return 'bg-[#ef4444]';
  };

  return (
    <div className="chart-container mb-8">
      <div className="chart-header flex items-center justify-between">
        <div>
          <div className="chart-title">Structural Risk Heatmap</div>
          <div className="chart-subtitle">Visualizing risk density across top modules</div>
        </div>
        <div className="flex gap-2">
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-[var(--text-muted)] uppercase">
                <div className="w-2 h-2 rounded-sm bg-[#10b981]"></div> Low
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-[var(--text-muted)] uppercase">
                <div className="w-2 h-2 rounded-sm bg-[#ef4444]"></div> Crit
            </div>
        </div>
      </div>
      
      <div className="mt-8 grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
        {heatmapFiles.map((file, i) => (
          <div 
            key={i}
            className={`aspect-square rounded-sm ${getHeatColor(file.risk_score)} hover:scale-110 hover:z-10 transition-all cursor-crosshair group relative`}
            title={file.file_path}
          >
            {/* Tooltip Simulation */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-[10px] hidden group-hover:block z-50 pointer-events-none shadow-xl">
                <div className="font-bold truncate mb-1">{file.file_path.split(/[/\\]/).pop()}</div>
                <div className="text-[var(--text-muted)]">Risk Score: {Math.round(file.risk_score)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg flex items-start gap-3">
        <Info size={16} className="text-[var(--accent)] shrink-0 mt-0.5" />
        <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed italic">
          High-intensity hotspots (red/orange) indicate modules where structural coupling and cyclomatic complexity intersect with high code churn. These are your primary candidates for architectural refactoring.
        </p>
      </div>
    </div>
  );
}

import { useParams, Link } from 'react-router-dom';
import { 
  ChevronLeft, 
  Activity, 
  Code2, 
  Layers, 
  Search,
  AlertTriangle,
  Info,
  Bug,
  Zap
} from 'lucide-react';
import type { AnalysisResult } from '../types';

interface Props {
  result: AnalysisResult | null;
}

export default function FileDetailPage({ result }: Props) {
  const { filePath } = useParams<{ filePath: string }>();
  const decodedPath = decodeURIComponent(filePath || '');

  if (!result) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon text-[var(--accent)]">
          <Search size={48} />
        </div>
        <h2 className="empty-state-title">No Analysis Data</h2>
        <p className="empty-state-desc">Please run an analysis first to view file details.</p>
        <Link to="/analyze" className="btn btn-primary">Start Analysis</Link>
      </div>
    );
  }

  const file = result.files.find((f) => f.file_path === decodedPath);

  if (!file) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon text-red-500">
          <AlertTriangle size={48} />
        </div>
        <h2 className="empty-state-title">File Not Found</h2>
        <p className="empty-state-desc">Could not find metrics for: <code className="font-mono">{decodedPath}</code></p>
        <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="page-content max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-6 mb-10 pb-8 border-b-2 border-[var(--border)]">
        <Link to="/dashboard" className="btn btn-secondary p-0 w-10 h-10 flex items-center justify-center">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2 text-xs text-[var(--accent)] font-bold uppercase tracking-widest mb-1">
            <Code2 size={14} /> {file.language} Module
          </div>
          <h1 className="text-2xl font-black font-mono truncate">
            {file.file_path}
          </h1>
        </div>
        <div className={`risk-badge large ${getRiskLevel(file.risk_score)}`}>
          <div className={`risk-dot ${getRiskLevel(file.risk_score)}`} />
          Score: {Math.round(file.risk_score)}
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Complexity Index" value={file.cyclomatic_complexity} icon={<Activity size={18} />} trend="High" />
        <MetricCard label="Cognitive Load" value={file.cognitive_complexity} icon={<Layers size={18} />} trend="Moderate" />
        <MetricCard label="Maintainability" value={`${file.maintainability_index}%`} icon={<Zap size={18} />} trend="Stable" />
        <MetricCard label="Bug Risk" value={`${file.bug_risk_probability}%`} icon={<Bug size={18} />} trend="High" />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <SmallMetric label="Total LOC" value={file.loc} />
        <SmallMetric label="Code Churn" value={file.code_churn} />
        <SmallMetric label="Instability" value={file.instability.toFixed(2)} />
        <SmallMetric label="Coupling (Ca/Ce)" value={`${file.coupling_afferent}/${file.coupling_efferent}`} />
      </div>

      {/* Functions Table */}
      {file.functions.length > 0 && (
        <div className="chart-container mb-12">
          <div className="chart-header">
            <div className="chart-title">⚡ Functional Breakdown</div>
            <div className="chart-subtitle">{file.functions.length} function definitions detected</div>
          </div>
          <div className="overflow-x-auto mt-4">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Method / Function</th>
                  <th className="text-center">Lines</th>
                  <th className="text-center">Complexity</th>
                  <th className="text-center">Cognitive</th>
                  <th className="text-center">Params</th>
                </tr>
              </thead>
              <tbody>
                {file.functions.map((fn, i) => (
                  <tr key={`${fn.name}-${i}`}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Code2 size={12} className="text-[var(--text-muted)]" />
                        <span className="font-mono text-sm">{fn.name}()</span>
                      </div>
                    </td>
                    <td className="text-center text-xs text-[var(--text-secondary)]">
                      L{fn.line_start} – L{fn.line_end || '?'}
                    </td>
                    <td className="text-center font-mono">
                      <span className={fn.complexity > 10 ? 'text-red-400 font-bold' : ''}>
                        {fn.complexity}
                      </span>
                    </td>
                    <td className="text-center font-mono">
                      <span className={fn.cognitive_complexity > 15 ? 'text-red-400 font-bold' : ''}>
                        {fn.cognitive_complexity}
                      </span>
                    </td>
                    <td className="text-center font-mono text-xs">{fn.parameters}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Smells & Suggestions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-black flex items-center gap-2 mb-4 uppercase tracking-wider">
            <AlertTriangle size={20} className="text-red-400" /> Code Smells
          </h2>
          <div className="space-y-3">
            {file.code_smells.map((smell, i) => (
              <div key={i} className="p-4 bg-[var(--bg-secondary)] border-l-4 border-l-red-500 border border-[var(--border)] rounded-r-lg">
                <div className="font-bold text-sm mb-1">{smell.issue}</div>
                {smell.function && <div className="text-[10px] font-mono text-[var(--accent)] mb-2 uppercase">in {smell.function}()</div>}
                <div className="text-xs text-[var(--text-secondary)] leading-relaxed">{smell.suggestion}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-black flex items-center gap-2 mb-4 uppercase tracking-wider">
            <Info size={20} className="text-[var(--accent)]" /> Refactoring
          </h2>
          <div className="space-y-3">
            {file.refactor_suggestions.map((sug, i) => (
              <div key={i} className={`p-4 bg-[var(--bg-secondary)] border-l-4 border border-[var(--border)] rounded-r-lg ${sug.priority === 'critical' ? 'border-l-red-500' : 'border-l-[var(--accent)]'}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="font-bold text-sm">{sug.issue}</div>
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${sug.priority === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-[var(--accent)]/20 text-[var(--accent)]'}`}>
                    {sug.priority}
                  </span>
                </div>
                <div className="text-xs text-[var(--text-secondary)] leading-relaxed">{sug.suggestion}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, trend }: any) {
  return (
    <div className="p-5 bg-[var(--bg-secondary)] border-2 border-[var(--border)] rounded-xl flex flex-col justify-between hover:border-[var(--accent)] transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{label}</div>
        <div className="text-[var(--accent)]">{icon}</div>
      </div>
      <div className="flex items-end justify-between gap-4">
        <div className="text-3xl font-black mr-2">{value}</div>
        <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border)] whitespace-nowrap mb-1">
          {trend}
        </div>
      </div>
    </div>
  );
}

function SmallMetric({ label, value }: any) {
  return (
    <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
      <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-tighter mb-0.5">{label}</div>
      <div className="text-sm font-bold font-mono">{value}</div>
    </div>
  );
}

function getRiskLevel(score: number): string {
  if (score < 30) return 'low';
  if (score < 60) return 'medium';
  if (score < 85) return 'high';
  return 'critical';
}

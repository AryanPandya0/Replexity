import { Link } from 'react-router-dom';
import { 
  FileJson, 
  FileSpreadsheet, 
  FileText, 
  Download, 
  ArrowLeft,
  ShieldCheck,
  Zap,
  Layers,
  Search
} from 'lucide-react';
import { getExportUrl } from '../api';
import type { AnalysisResult } from '../types';

interface Props {
  result: AnalysisResult | null;
}

export default function ExportPage({ result }: Props) {
  if (!result) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon text-[var(--accent)]"><Search size={48} /></div>
        <h2 className="empty-state-title">No Data to Export</h2>
        <p className="empty-state-desc">Run an analysis first to generate professional reports.</p>
        <Link to="/analyze" className="btn btn-primary">Start Analysis</Link>
      </div>
    );
  }

  return (
    <div className="page-content max-w-4xl mx-auto">
      <div className="mb-12">
        <Link to="/dashboard" className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--accent)] font-bold text-xs uppercase tracking-widest mb-4 transition-colors">
          <ArrowLeft size={14} /> Back to Insights
        </Link>
        <h1 className="text-4xl font-black mb-4">Export Analysis Report</h1>
        <p className="text-[var(--text-secondary)]">Download comprehensive architectural data in your preferred format.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <ExportCard 
          title="JSON Data" 
          desc="Complete raw metrics and dependency graph for programmatic use."
          icon={<FileJson size={32} />}
          format="json"
          analysisId={result.analysis_id}
        />
        <ExportCard 
          title="CSV Table" 
          desc="Flattened file metrics optimized for spreadsheet analysis."
          icon={<FileSpreadsheet size={32} />}
          format="csv"
          analysisId={result.analysis_id}
        />
        <ExportCard 
          title="PDF Report" 
          desc="Executive summary with high-level charts and hotspots."
          icon={<FileText size={32} />}
          format="pdf"
          analysisId={result.analysis_id}
          isPremium
        />
      </div>

      <div className="card border-4 border-[var(--border)] bg-[#1B3C53] p-10 flex flex-col md:flex-row items-center gap-10">
        <div className="flex-1 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--bg-secondary)] border-2 border-[var(--border)] rounded-full text-[var(--accent)] text-[10px] font-bold mb-4 uppercase tracking-widest">
            <ShieldCheck size={14} /> Integrity Verified
          </div>
          <h2 className="text-2xl font-black mb-4">Summary of Analysis</h2>
          <div className="space-y-4 opacity-80">
            <div className="flex items-center gap-3 text-sm">
              <Zap size={16} className="text-[var(--accent)]" /> 
              <span>Processed <strong className="mx-1">{result.files.length}</strong> source modules</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Layers size={16} className="text-[var(--accent)]" /> 
              <span>Identified <strong className="mx-1">{result.overview.languages ? Object.keys(result.overview.languages).length : 0}</strong> logic languages</span>
            </div>
          </div>
        </div>
        <div className="w-32 h-32 rounded-2xl bg-[var(--bg-secondary)] border-4 border-[var(--border)] flex flex-col items-center justify-center p-6">
          <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-3 text-center">Health Index</div>
          <div className="text-4xl font-black text-[var(--accent)] leading-none tracking-tighter">{result.overview.health_score}</div>
        </div>
      </div>
    </div>
  );
}

function ExportCard({ title, desc, icon, format, analysisId, isPremium }: any) {
  return (
    <div className="card group hover:border-[var(--accent)] transition-all cursor-pointer flex flex-col h-full bg-[#234C6A]">
      <div className="w-16 h-16 rounded-xl bg-[var(--bg-primary)] border-2 border-[var(--border)] mb-6 flex items-center justify-center text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-[var(--bg-primary)] transition-all">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-black">{title}</h3>
          {isPremium && <span className="text-[9px] bg-[var(--accent)]/20 text-[var(--accent)] px-1.5 py-0.5 rounded font-bold uppercase">Pro</span>}
        </div>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-8">{desc}</p>
      </div>
      <a 
        href={getExportUrl(analysisId, format)} 
        target="_blank" 
        rel="noopener noreferrer"
        className="btn btn-secondary w-full group-hover:bg-[var(--accent)] group-hover:text-[var(--bg-primary)] group-hover:border-[var(--accent)]"
      >
        <Download size={18} /> Download
      </a>
    </div>
  );
}

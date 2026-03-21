import { Activity, Shield, AlertTriangle, FileCode } from 'lucide-react';
import type { AnalysisResult } from '../../types';

interface Props {
  result: AnalysisResult;
}

export function StatCards({ result }: Props) {
  const { overview, files } = result;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card 
        label="Total Files" 
        value={files.length} 
        icon={<FileCode size={20} />} 
        color="#D2C1B6"
        trend="Active"
      />
      <Card 
        label="Avg. Maintenance" 
        value={`${overview.avg_maintainability}%`} 
        icon={<Shield size={20} />} 
        color="#10b981"
        trend="Stable"
      />
      <Card 
        label="Global Health" 
        value={overview.health_score} 
        icon={<Activity size={20} />} 
        color="#D2C1B6"
        trend="System"
      />
      <Card 
        label="Complexity Alerts" 
        value={files.filter(f => f.risk_score > 70).length} 
        icon={<AlertTriangle size={20} />} 
        color="#ef4444"
        trend="Urgent"
      />
    </div>
  );
}

function Card({ label, value, icon, color, trend }: any) {
  return (
    <div className="card flex flex-col justify-between hover:border-[var(--accent)] transition-all bg-[#234C6A]">
      <div className="flex items-center justify-between mb-6">
        <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{label}</div>
        <div style={{ color }}>{icon}</div>
      </div>
      <div className="flex items-end justify-between gap-4">
        <div className="text-3xl font-black font-mono mr-2">{value}</div>
        <div className="text-[9px] font-bold px-2 py-1 rounded bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border)] whitespace-nowrap mb-1">
          {trend}
        </div>
      </div>
    </div>
  );
}

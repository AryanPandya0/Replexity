import { Activity, Shield, AlertTriangle, FileCode } from 'lucide-react';
import type { AnalysisResult } from '../../types';

interface Props {
  result: AnalysisResult;
}

export function StatCards({ result }: Props) {
  const { overview, files } = result;
  const cards = [
    { label: 'Total Files', value: files.length, icon: <FileCode size={18} />, color: '#D2C1B6', trend: 'Active' },
    { label: 'Avg. Maintenance', value: `${overview.avg_maintainability}%`, icon: <Shield size={18} />, color: '#10b981', trend: 'Stable' },
    { label: 'Global Health', value: overview.health_score, icon: <Activity size={18} />, color: '#D2C1B6', trend: 'System' },
    { label: 'Complexity Alerts', value: files.filter(f => f.risk_score > 70).length, icon: <AlertTriangle size={18} />, color: '#ef4444', trend: 'Urgent' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
      {cards.map((c, i) => (
        <div key={i} style={{
          background: 'var(--bg-secondary)',
          border: '2px solid var(--border)',
          borderRadius: 12,
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 110,
          transition: 'border-color 0.2s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{c.label}</div>
            <div style={{ color: c.color }}>{c.icon}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{c.value}</div>
            <div style={{
              fontSize: '0.55rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6,
              background: 'var(--bg-primary)', color: 'var(--text-secondary)',
              border: '1px solid var(--border)', textTransform: 'uppercase',
            }}>{c.trend}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

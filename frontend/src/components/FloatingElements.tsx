import {
  Activity, BarChart3, ShieldCheck, Gauge, Flame,
  TrendingUp, Grid3X3, LineChart, PieChart, Cpu,
  Braces, Hash, Sigma, Target,
  Download, FileJson, FileSpreadsheet, FileText, Printer, ClipboardList, Archive,
} from 'lucide-react';

// Analytics/metrics-themed floating badges for Dashboard
const dashboardElements = [
  // Left edge
  { icon: <BarChart3 size={13} />, label: 'metrics',    left: '1%',  top: '8%',  rot: -8,  op: 0.4 },
  { icon: <ShieldCheck size={11} />, label: 'audit',    left: '3%',  top: '22%', rot: 6,   op: 0.3 },
  { icon: <Gauge size={12} />,    label: 'score',       left: '0.5%', top: '38%', rot: -10, op: 0.35 },
  { icon: <Flame size={11} />,    label: 'hotspot',     left: '4%',  top: '54%', rot: 8,   op: 0.25 },
  { icon: <TrendingUp size={10} />, label: 'trend',     left: '1.5%', top: '68%', rot: -5,  op: 0.3 },
  { icon: <Sigma size={10} />,    label: 'sum',          left: '3.5%', top: '82%', rot: 12,  op: 0.2 },
  // Right edge
  { icon: <PieChart size={13} />, label: 'risk',         left: '93%', top: '6%',  rot: 10,  op: 0.4 },
  { icon: <Cpu size={11} />,      label: 'parse',        left: '95%', top: '20%', rot: -12, op: 0.3 },
  { icon: <LineChart size={12} />, label: 'chart',       left: '91%', top: '36%', rot: 6,   op: 0.35 },
  { icon: <Grid3X3 size={11} />,  label: 'grid',         left: '94%', top: '52%', rot: -8,  op: 0.25 },
  { icon: <Activity size={10} />, label: 'pulse',        left: '92%', top: '66%', rot: 10,  op: 0.3 },
  { icon: <Target size={10} />,   label: 'target',       left: '95%', top: '80%', rot: -6,  op: 0.2 },
  // Scattered
  { icon: <Hash size={9} />,      label: 'loc',          left: '14%', top: '12%', rot: 14,  op: 0.18 },
  { icon: <Braces size={9} />,    label: 'fn',           left: '82%', top: '14%', rot: -10, op: 0.18 },
];

// Code-focused floating badges for File Detail page
const fileDetailElements = [
  // Left edge
  { icon: <Braces size={13} />,   label: 'function',    left: '1%',  top: '10%', rot: -6,  op: 0.4 },
  { icon: <Hash size={11} />,     label: 'params',      left: '3%',  top: '28%', rot: 8,   op: 0.3 },
  { icon: <Gauge size={12} />,    label: 'depth',       left: '1%',  top: '46%', rot: -10, op: 0.35 },
  { icon: <Flame size={11} />,    label: 'smell',       left: '4%',  top: '64%', rot: 6,   op: 0.25 },
  { icon: <Target size={10} />,   label: 'refactor',    left: '2%',  top: '82%', rot: -4,  op: 0.2 },
  // Right edge
  { icon: <Activity size={13} />, label: 'complexity',  left: '93%', top: '8%',  rot: 8,   op: 0.4 },
  { icon: <ShieldCheck size={11} />, label: 'maint',    left: '95%', top: '26%', rot: -12, op: 0.3 },
  { icon: <Sigma size={12} />,    label: 'halstead',    left: '91%', top: '44%', rot: 5,   op: 0.35 },
  { icon: <TrendingUp size={11} />, label: 'churn',     left: '94%', top: '62%', rot: -8,  op: 0.25 },
  { icon: <Cpu size={10} />,      label: 'coupling',    left: '92%', top: '80%', rot: 7,   op: 0.2 },
  // Scattered
  { icon: <LineChart size={9} />,  label: 'risk',       left: '16%', top: '15%', rot: 12,  op: 0.15 },
  { icon: <BarChart3 size={9} />,  label: 'cognitive',  left: '80%', top: '16%', rot: -8,  op: 0.15 },
];

// Export-themed floating badges
const exportElements = [
  // Left edge
  { icon: <Download size={13} />,        label: 'export',     left: '1%',  top: '10%', rot: -8,  op: 0.45 },
  { icon: <FileJson size={11} />,         label: 'json',       left: '4%',  top: '28%', rot: 6,   op: 0.35 },
  { icon: <FileSpreadsheet size={12} />,  label: 'csv',        left: '1%',  top: '46%', rot: -10, op: 0.4 },
  { icon: <Printer size={11} />,          label: 'print',      left: '3%',  top: '64%', rot: 8,   op: 0.25 },
  { icon: <Archive size={10} />,          label: 'archive',    left: '2%',  top: '82%', rot: -5,  op: 0.2 },
  // Right edge
  { icon: <FileText size={13} />,         label: 'report',     left: '93%', top: '8%',  rot: 10,  op: 0.45 },
  { icon: <ClipboardList size={11} />,    label: 'summary',    left: '95%', top: '26%', rot: -12, op: 0.35 },
  { icon: <ShieldCheck size={12} />,      label: 'verified',   left: '91%', top: '44%', rot: 5,   op: 0.4 },
  { icon: <BarChart3 size={11} />,        label: 'data',       left: '94%', top: '62%', rot: -8,  op: 0.25 },
  { icon: <Download size={10} />,         label: 'save',       left: '92%', top: '80%', rot: 7,   op: 0.2 },
  // Scattered
  { icon: <FileJson size={9} />,          label: 'api',        left: '18%', top: '15%', rot: 12,  op: 0.18 },
  { icon: <FileSpreadsheet size={9} />,   label: 'table',      left: '78%', top: '18%', rot: -8,  op: 0.18 },
];

interface FloatingBadge {
  icon: React.ReactNode;
  label: string;
  left: string;
  top: string;
  rot: number;
  op: number;
}

export function FloatingElementsLayer({ variant }: { variant: 'dashboard' | 'filedetail' | 'export' }) {
  const elements: FloatingBadge[] = variant === 'dashboard' ? dashboardElements : variant === 'export' ? exportElements : fileDetailElements;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 0,
      overflow: 'hidden',
    }}>
      {elements.map((el, i) => (
        <div
          key={`${variant}-${i}`}
          style={{
            position: 'absolute',
            left: el.left,
            top: el.top,
            transform: `rotate(${el.rot}deg)`,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 9,
            padding: '6px 11px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            color: 'var(--accent)',
            fontSize: '0.55rem',
            fontWeight: 700,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.08em',
            opacity: el.op,
          }}
        >
          {el.icon}
          <span style={{ color: 'var(--text-muted)' }}>{el.label}</span>
        </div>
      ))}
    </div>
  );
}

import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import type { AnalysisResult } from '../types';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Title, Tooltip, Legend, Filler
);

import { HealthCircle } from '../components/dashboard/HealthCircle';
import { StatCards } from '../components/dashboard/StatCards';
import { RiskHeatmap } from '../components/dashboard/RiskHeatmap';
import { FileRankingTable } from '../components/dashboard/FileRankingTable';
import { FloatingElementsLayer } from '../components/FloatingElements';

interface Props {
  result: AnalysisResult | null;
}

export default function DashboardPage({ result }: Props) {
  if (!result) {
    return (
      <div className="responsive-container" style={{ paddingTop: 120, paddingBottom: 120, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>📊</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 8 }}>No Analysis Data</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Run an analysis first to see your dashboard</p>
        <Link to="/analyze" style={{ display: 'inline-block', padding: '12px 32px', background: 'var(--accent)', color: 'var(--bg-primary)', borderRadius: 10, fontWeight: 800, textDecoration: 'none' }}>Start Analysis</Link>
      </div>
    );
  }

  const files = result.files || [];
  const overview = result.overview || { health_score: 0, languages: {}, avg_maintainability: 0 };
  const risk_distribution = result.risk_distribution || { low: 0, medium: 0, high: 0, critical: 0 };
  const topFiles = files.slice(0, 15);

  if (files.length === 0) {
    return (
      <div className="responsive-container" style={{ paddingTop: 120, paddingBottom: 120, textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 8 }}>No Files Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>The analysis completed but no source files were detected.</p>
        <Link to="/analyze" style={{ display: 'inline-block', padding: '12px 32px', background: 'var(--accent)', color: 'var(--bg-primary)', borderRadius: 10, fontWeight: 800, textDecoration: 'none' }}>Try Another Path</Link>
      </div>
    );
  }

  /* ── Chart Data ── */
  const complexityData = {
    labels: topFiles.map(f => f.file_path.split(/[/\\]/).pop()),
    datasets: [
      { label: 'Cyclomatic', data: topFiles.map(f => f.cyclomatic_complexity), backgroundColor: '#D2C1B6', borderRadius: 4, borderWidth: 0 },
      { label: 'Cognitive', data: topFiles.map(f => f.cognitive_complexity), backgroundColor: '#456882', borderRadius: 4, borderWidth: 0 },
    ],
  };

  const riskData = {
    labels: ['Low', 'Medium', 'High', 'Critical'],
    datasets: [{
      data: [risk_distribution.low || 0, risk_distribution.medium || 0, risk_distribution.high || 0, risk_distribution.critical || 0],
      backgroundColor: ['#10b981', '#f59e0b', '#f97316', '#ef4444'],
      borderColor: '#1B3C53', borderWidth: 4, hoverOffset: 8,
    }],
  };

  const couplingData = {
    labels: topFiles.map(f => f.file_path.split(/[/\\]/).pop()),
    datasets: [
      { label: 'Afferent (Ca)', data: topFiles.map(f => f.coupling_afferent), backgroundColor: '#456882', borderRadius: 4, borderWidth: 0 },
      { label: 'Efferent (Ce)', data: topFiles.map(f => f.coupling_efferent), backgroundColor: '#D2C1B6', borderRadius: 4, borderWidth: 0 },
    ],
  };

  const maintData = {
    labels: topFiles.map((_, i) => `F${i + 1}`),
    datasets: [
      { label: 'Maintainability', data: topFiles.map(f => f.maintainability_index), borderColor: '#D2C1B6', backgroundColor: 'rgba(210,193,182,0.05)', fill: true, tension: 0, pointRadius: 3, pointBackgroundColor: '#D2C1B6' },
      { label: 'Instability', data: topFiles.map(f => f.instability * 100), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.05)', fill: true, tension: 0, pointRadius: 3, pointBackgroundColor: '#f59e0b' },
    ],
  };

  const chartOpts: any = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#adc5d6', font: { family: "'Inter', sans-serif", size: 10, weight: 600 }, usePointStyle: true, padding: 16 } },
      tooltip: { backgroundColor: '#1B3C53', borderColor: '#456882', borderWidth: 2, titleColor: '#D2C1B6', bodyColor: '#adc5d6', padding: 10, cornerRadius: 8 },
    },
    scales: {
      x: { ticks: { color: '#749aba', font: { size: 9, family: "'JetBrains Mono', monospace" } }, grid: { color: 'rgba(69,104,130,0.12)' }, border: { display: false } },
      y: { ticks: { color: '#749aba', font: { size: 9, family: "'JetBrains Mono', monospace" } }, grid: { color: 'rgba(69,104,130,0.12)' }, border: { display: false } },
    },
  };

  const doughnutOpts: any = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { color: '#adc5d6', padding: 14, font: { family: "'JetBrains Mono', monospace", size: 9 }, usePointStyle: true } } },
    cutout: '68%',
  };

  const cBox: React.CSSProperties = {
    background: 'var(--bg-secondary)', border: '2px solid var(--border)',
    borderRadius: 12, padding: 24, position: 'relative',
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <FloatingElementsLayer variant="dashboard" />
      <div className="responsive-container" style={{ position: 'relative', zIndex: 1, paddingTop: 32, paddingBottom: 32 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.02em' }}>{result.project_name}</h1>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
            Ref: {result.analysis_id}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/export" style={{ padding: '8px 18px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '2px solid var(--border)', borderRadius: 8, fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none' }}>Export</Link>
          <Link to="/analyze" style={{ padding: '8px 18px', background: 'transparent', color: 'var(--text-secondary)', borderRadius: 8, fontWeight: 600, fontSize: '0.8rem', textDecoration: 'none' }}>New</Link>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <StatCards result={result} />

      {/* ── Row 1: Health + Languages | Risk Doughnut ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20, marginBottom: 20 }}>
        {/* Health + Languages */}
        <div style={{ ...cBox, display: 'flex', alignItems: 'center', gap: 40 }}>
          <HealthCircle score={overview.health_score} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Language Breakdown</div>
            {Object.entries(overview.languages).map(([lang, count]) => (
              <div key={lang} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(69,104,130,0.15)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{lang}</span>
                <span style={{ fontWeight: 800, fontSize: '0.75rem' }}>{count}</span>
              </div>
            ))}
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '2px solid var(--border)' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Avg Maintainability</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: overview.avg_maintainability >= 60 ? '#10b981' : '#f59e0b' }}>
                {overview.avg_maintainability}
              </div>
            </div>
          </div>
        </div>

        {/* Risk Doughnut */}
        <div style={cBox}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '1rem', fontWeight: 800 }}>Risk Distribution</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>File counts by severity</div>
          </div>
          <div style={{ height: 220 }}>
            <Doughnut data={riskData} options={doughnutOpts} />
          </div>
        </div>
      </div>

      {/* ── Row 2: Complexity + Coupling ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20, marginBottom: 20 }}>
        <div style={cBox}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '1rem', fontWeight: 800 }}>Complexity Profile</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Cyclomatic vs Cognitive</div>
          </div>
          <div style={{ height: 260 }}>
            <Bar data={complexityData} options={chartOpts} />
          </div>
        </div>
        <div style={cBox}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '1rem', fontWeight: 800 }}>Structural Coupling</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Inter-module dependencies</div>
          </div>
          <div style={{ height: 260 }}>
            <Bar data={couplingData} options={chartOpts} />
          </div>
        </div>
      </div>

      {/* ── Row 3: Maintenance Trends | Hotspots ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 20, marginBottom: 24 }}>
        <div style={cBox}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '1rem', fontWeight: 800 }}>Maintenance Trends</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Stability vs Maintainability</div>
          </div>
          <div style={{ height: 240 }}>
            <Line data={maintData} options={chartOpts} />
          </div>
        </div>
        <div style={cBox}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '1rem', fontWeight: 800 }}>Critical Hotspots</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <HotspotItem label="Most Complex Module" value={files[0]?.file_path || 'N/A'} color="#ef4444" />
            <HotspotItem label="Target for Refactoring" value={files.reduce((p, c) => (p.instability > c.instability ? p : c)).file_path} color="#f59e0b" />
            <HotspotItem label="Highest Bug Risk" value={files.reduce((p, c) => (p.bug_risk_probability > c.bug_risk_probability ? p : c)).file_path} color="#f97316" />
            <HotspotItem label="Deepest Nesting" value={files.reduce((p, c) => (p.max_nesting_depth > c.max_nesting_depth ? p : c)).file_path} color="#D2C1B6" />
          </div>
        </div>
      </div>

      {/* ── Risk Heatmap ── */}
      <RiskHeatmap files={files} />

      {/* ── File Ranking Table ── */}
      <FileRankingTable files={files} />
      </div>
    </div>
  );
}

function HotspotItem({ label, value, color }: { label: string; value: string; color: string }) {
  const fileName = value.split(/[/\\]/).pop() || value;
  return (
    <div style={{
      padding: '12px 16px', background: 'var(--bg-primary)',
      border: '1px solid var(--border)', borderLeft: `3px solid ${color}`,
      borderRadius: '0 8px 8px 0',
    }}>
      <div style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</div>
    </div>
  );
}

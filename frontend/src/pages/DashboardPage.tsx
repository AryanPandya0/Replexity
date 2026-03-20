import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import type { AnalysisResult } from '../types';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Title, Tooltip, Legend, Filler
);

interface Props {
  result: AnalysisResult | null;
}

import { HealthCircle } from '../components/dashboard/HealthCircle';
import { StatCards } from '../components/dashboard/StatCards';
import { RiskHeatmap } from '../components/dashboard/RiskHeatmap';
import { FileRankingTable } from '../components/dashboard/FileRankingTable';

export default function DashboardPage({ result }: Props) {
  if (!result) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <h2 className="empty-state-title">No Analysis Data</h2>
        <p className="empty-state-desc">Run an analysis first to see your dashboard</p>
        <Link to="/analyze" className="btn btn-primary">Start Analysis</Link>
      </div>
    );
  }

  const { overview, files, risk_distribution } = result;

  // Top 15 files for chart
  const topFiles = files.slice(0, 15);

  /* ── Complexity Bar Charts ────────────────────────────── */
  const complexityData = {
    labels: topFiles.map((f) => {
      const parts = f.file_path.split(/[/\\]/);
      return parts[parts.length - 1];
    }),
    datasets: [
      {
        label: 'Cyclomatic',
        data: topFiles.map((f) => f.cyclomatic_complexity),
        backgroundColor: 'rgba(99,102,241,0.7)',
        borderColor: '#6366f1',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Cognitive',
        data: topFiles.map((f) => f.cognitive_complexity),
        backgroundColor: 'rgba(236,72,153,0.7)',
        borderColor: '#ec4899',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  /* ── Risk Distribution Doughnut ────────────────────────── */
  const riskData = {
    labels: ['Low', 'Medium', 'High', 'Critical'],
    datasets: [
      {
        data: [
          risk_distribution.low || 0,
          risk_distribution.medium || 0,
          risk_distribution.high || 0,
          risk_distribution.critical || 0,
        ],
        backgroundColor: [
          'rgba(16,185,129,0.8)',
          'rgba(245,158,11,0.8)',
          'rgba(249,115,22,0.8)',
          'rgba(239,68,68,0.8)',
        ],
        borderColor: ['#10b981', '#f59e0b', '#f97316', '#ef4444'],
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };

  /* ── Coupling Bar Chart ─────────────────────────────── */
  const couplingData = {
    labels: topFiles.map((f) => {
      const parts = f.file_path.split(/[/\\]/);
      return parts[parts.length - 1];
    }),
    datasets: [
      {
        label: 'Afferent (Ca)',
        data: topFiles.map((f) => f.coupling_afferent),
        backgroundColor: 'rgba(16,185,129,0.7)',
        borderColor: '#10b981',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Efferent (Ce)',
        data: topFiles.map((f) => f.coupling_efferent),
        backgroundColor: 'rgba(249,115,22,0.7)',
        borderColor: '#f97316',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  /* ── Maintainability Line Chart ────────────────────────── */
  const maintData = {
    labels: topFiles.map((_, i) => `F${i + 1}`),
    datasets: [
      {
        label: 'Maintainability',
        data: topFiles.map((f) => f.maintainability_index),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
      },
      {
        label: 'Instability',
        data: topFiles.map((f) => f.instability * 100), // scale to 100 for visibility
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { family: 'Inter' } },
      },
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { size: 10 } },
        grid: { color: 'rgba(30,41,59,0.5)' },
      },
      y: {
        ticks: { color: '#64748b' },
        grid: { color: 'rgba(30,41,59,0.5)' },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#94a3b8', padding: 16, font: { family: 'Inter' } },
      },
    },
    cutout: '65%',
  };

  /* ── Dashboard Sub-Components ──────────────────────────── */

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold">{result.project_name}</h1>
          <p className="text-[#94a3b8] text-sm">
            Analysis ID: <code className="font-mono text-[var(--accent-hover)]">{result.analysis_id}</code>
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/export" className="btn btn-secondary btn-sm">📥 Export</Link>
          <Link to="/analyze" className="btn btn-ghost btn-sm">New Analysis</Link>
        </div>
      </div>

      {/* Stat Cards */}
      <StatCards result={result} />

      {/* Health Score + Risk Doughnut row */}
      <div className="charts-grid">
        <div className="chart-container flex items-center justify-around">
          <HealthCircle score={overview.health_score} />
          <div className="text-center">
            <div className="text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wide">Languages</div>
            {Object.entries(overview.languages).map(([lang, count]) => (
              <div key={lang} className="text-sm text-[var(--text-secondary)] mb-1">
                {lang}: <strong className="text-[var(--text-primary)]">{count}</strong> files
              </div>
            ))}
            <div className="mt-3 text-xs text-[var(--text-muted)] uppercase tracking-wide">
              Avg Maintainability
            </div>
            <div className={`text-2xl font-extrabold ${overview.avg_maintainability >= 60 ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
              {overview.avg_maintainability}
            </div>
          </div>
        </div>
        <div className="chart-container">
          <div className="chart-header">
            <div className="chart-title">Risk Distribution</div>
            <div className="chart-subtitle">Files by risk level</div>
          </div>
          <div className="h-[220px]">
            <Doughnut data={riskData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="charts-grid">
        <div className="chart-container">
          <div className="chart-header">
            <div className="chart-title">Complexity Analysis</div>
            <div className="chart-subtitle">Cyclomatic vs Cognitive Complexity</div>
          </div>
          <div className="h-[280px]">
            <Bar data={complexityData} options={chartOptions} />
          </div>
        </div>
        <div className="chart-container">
          <div className="chart-header">
            <div className="chart-title">Coupling Analysis</div>
            <div className="chart-subtitle">Incoming vs Outgoing dependencies</div>
          </div>
          <div className="h-[280px]">
            <Bar data={couplingData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Maintainability & Instability row */}
      <div className="charts-grid">
        <div className="chart-container">
          <div className="chart-header">
            <div className="chart-title">Maintainability & Instability</div>
            <div className="chart-subtitle">Stability trends across top files (Instability scaled x100)</div>
          </div>
          <div className="h-[250px]">
            <Line data={maintData} options={chartOptions} />
          </div>
        </div>
        <div className="chart-container">
           {/* Placeholder or small metrics */}
           <div className="chart-header">
            <div className="chart-title">Summary Insights</div>
          </div>
          <div className="p-4 text-[var(--text-secondary)]">
            <div className="mb-4">
              <span className="text-[var(--accent)] font-semibold">Most Complex:</span> {files.length > 0 ? files[0].file_path : 'N/A'}
            </div>
            <div className="mb-4">
              <span className="text-[var(--success)] font-semibold">Most Stable:</span> {files.length > 0 ? files.reduce((prev, curr) => (prev.instability < curr.instability ? prev : curr)).file_path : 'N/A'}
            </div>
            <div>
              <span className="text-[var(--danger)] font-semibold">Highest Churn:</span> {files.length > 0 ? files.reduce((prev, curr) => (prev.code_churn > curr.code_churn ? prev : curr)).file_path : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <RiskHeatmap files={files} />

      {/* File Ranking Table */}
      <FileRankingTable files={files} />
    </div>
  );
}

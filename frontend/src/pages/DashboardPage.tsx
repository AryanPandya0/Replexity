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

import { HealthCircle } from '../components/dashboard/HealthCircle';
import { StatCards } from '../components/dashboard/StatCards';
import { RiskHeatmap } from '../components/dashboard/RiskHeatmap';
import { FileRankingTable } from '../components/dashboard/FileRankingTable';

interface Props {
  result: AnalysisResult | null;
}

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

  const files = result.files || [];
  const overview = result.overview || { health_score: 0, languages: {}, avg_maintainability: 0 };
  const risk_distribution = result.risk_distribution || { low: 0, medium: 0, high: 0, critical: 0 };

  // Top 15 files for chart
  const topFiles = files.slice(0, 15);

  if (files.length === 0) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <div className="empty-state-icon">📂</div>
          <h2 className="empty-state-title">No Files Found</h2>
          <p className="empty-state-desc">The analysis completed but no source files were detected.</p>
          <Link to="/analyze" className="btn btn-primary">Try Another Path</Link>
        </div>
      </div>
    );
  }

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
        backgroundColor: '#D2C1B6',
        borderColor: '#D2C1B6',
        borderWidth: 0,
        borderRadius: 4,
      },
      {
        label: 'Cognitive',
        data: topFiles.map((f) => f.cognitive_complexity),
        backgroundColor: '#456882',
        borderColor: '#456882',
        borderWidth: 0,
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
        backgroundColor: ['#10b981', '#f59e0b', '#f97316', '#ef4444'],
        borderColor: '#1B3C53',
        borderWidth: 4,
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
        backgroundColor: '#456882',
        borderColor: '#456882',
        borderWidth: 0,
        borderRadius: 4,
      },
      {
        label: 'Efferent (Ce)',
        data: topFiles.map((f) => f.coupling_efferent),
        backgroundColor: '#D2C1B6',
        borderColor: '#D2C1B6',
        borderWidth: 0,
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
        borderColor: '#D2C1B6',
        backgroundColor: 'rgba(210, 193, 182, 0.05)',
        fill: true,
        tension: 0,
        pointRadius: 4,
        pointBackgroundColor: '#D2C1B6',
      },
      {
        label: 'Instability',
        data: topFiles.map((f) => f.instability * 100),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        fill: true,
        tension: 0,
        pointRadius: 4,
        pointBackgroundColor: '#f59e0b',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { 
          color: '#adc5d6', 
          font: { family: "'Inter', sans-serif", size: 11, weight: 600 },
          usePointStyle: true,
          padding: 20
        },
      },
      tooltip: {
        backgroundColor: '#1B3C53',
        borderColor: '#456882',
        borderWidth: 2,
        titleColor: '#D2C1B6',
        bodyColor: '#adc5d6',
        padding: 12,
        cornerRadius: 8,
      }
    },
    scales: {
      x: {
        ticks: { color: '#749aba', font: { size: 10, family: "'JetBrains Mono', monospace" } },
        grid: { color: 'rgba(69, 104, 130, 0.15)', drawTicks: false },
        border: { display: false }
      },
      y: {
        ticks: { color: '#749aba', font: { size: 10, family: "'JetBrains Mono', monospace" } },
        grid: { color: 'rgba(69, 104, 130, 0.15)', drawTicks: false },
        border: { display: false }
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { 
          color: '#7fa696', 
          padding: 16, 
          font: { family: "'JetBrains Mono', monospace", size: 10 },
          usePointStyle: true
        },
      },
    },
    cutout: '65%',
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">{result.project_name}</h1>
          <p className="text-[var(--text-secondary)] text-xs mt-1 font-mono uppercase tracking-wider">
            Analysis Reference: {result.analysis_id}
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/export" className="btn btn-secondary btn-sm">Download Report</Link>
          <Link to="/analyze" className="btn btn-ghost btn-sm">Start New</Link>
        </div>
      </div>

      <StatCards result={result} />

      <div className="charts-grid">
        <div className="chart-container flex items-center justify-around bg-[#0d1e1b] border-[#285A48]">
          <HealthCircle score={overview.health_score} />
          <div className="text-left border-l border-[#285A48] pl-8">
            <div className="text-[10px] text-[var(--text-muted)] mb-3 uppercase tracking-widest font-bold">Language Composition</div>
            {Object.entries(overview.languages).map(([lang, count]) => (
              <div key={lang} className="text-xs text-[var(--text-secondary)] mb-1.5 flex justify-between gap-4">
                <span className="font-mono">{lang}</span>
                <strong className="text-[var(--text-primary)]">{count} files</strong>
              </div>
            ))}
            <div className="mt-6 text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold mb-1">
              Maintainability
            </div>
            <div className={`text-3xl font-black ${overview.avg_maintainability >= 60 ? 'text-[#10b981]' : 'text-[#f59e0b]'}`}>
              {overview.avg_maintainability}
            </div>
          </div>
        </div>
        <div className="chart-container">
          <div className="chart-header">
            <div className="chart-title">Risk Distribution</div>
            <div className="chart-subtitle">File counts mapped to risk severity</div>
          </div>
          <div className="h-[240px]">
            <Doughnut data={riskData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <div className="chart-header">
            <div className="chart-title">Complexity Profile</div>
            <div className="chart-subtitle">Direct comparison of Cyclomatic vs Cognitive metrics</div>
          </div>
          <div className="h-[300px]">
            <Bar data={complexityData} options={chartOptions} />
          </div>
        </div>
        <div className="chart-container">
          <div className="chart-header">
            <div className="chart-title">Structural Coupling</div>
            <div className="chart-subtitle">Analyzing inter-module dependencies</div>
          </div>
          <div className="h-[300px]">
            <Bar data={couplingData} options={chartOptions} />
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <div className="chart-header">
            <div className="chart-title">Maintenance Trends</div>
            <div className="chart-subtitle">Stability vs Maintainability Index</div>
          </div>
          <div className="h-[280px]">
            <Line data={maintData} options={chartOptions} />
          </div>
        </div>
        <div className="chart-container">
          <div className="chart-header">
            <div className="chart-title">Critical Hotspots</div>
          </div>
          <div className="p-2 space-y-4">
            <div className="p-4 bg-[#0d1e1b] border border-[#285A48] rounded-lg">
              <div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Most Complex Module</div>
              <div className="font-mono text-sm truncate text-[#ef4444]">{files.length > 0 ? files[0].file_path : 'N/A'}</div>
            </div>
            <div className="p-4 bg-[#0d1e1b] border border-[#285A48] rounded-lg">
              <div className="text-[10px] text-[var(--text-muted)] uppercase mb-1">Target for Refactoring</div>
              <div className="font-mono text-sm truncate text-[#f59e0b]">
                {files.length > 0 ? files.reduce((prev, curr) => (prev.instability > curr.instability ? prev : curr)).file_path : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <RiskHeatmap files={files} />
      <FileRankingTable files={files} />
    </div>
  );
}

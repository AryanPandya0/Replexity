import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

function HealthCircle({ score }: { score: number }) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="health-circle-container">
      <div className="health-circle">
        <svg viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} className="track" />
          <circle
            cx="60" cy="60" r={radius}
            className="progress"
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="health-score-value" style={{ color }}>
          {Math.round(score)}
        </div>
      </div>
      <span className="health-score-label">Health Score</span>
    </div>
  );
}

export default function DashboardPage({ result }: Props) {
  const navigate = useNavigate();

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

  /* ── Heatmap ───────────────────────────────────────────── */
  const heatmapFiles = files.slice(0, 60);
  const getCellColor = (risk: number) => {
    if (risk >= 75) return 'rgba(239,68,68,0.85)';
    if (risk >= 50) return 'rgba(249,115,22,0.8)';
    if (risk >= 25) return 'rgba(245,158,11,0.75)';
    return 'rgba(16,185,129,0.7)';
  };

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{result.project_name}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Analysis ID: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-hover)' }}>{result.analysis_id}</code>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/export" className="btn btn-secondary btn-sm">📥 Export</Link>
          <Link to="/analyze" className="btn btn-ghost btn-sm">New Analysis</Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card accent">
          <div className="stat-icon accent">📁</div>
          <div className="card-title">Files Analyzed</div>
          <div className="card-value">{overview.total_files}</div>
        </div>
        <div className="stat-card info">
          <div className="stat-icon info">⚡</div>
          <div className="card-title">Total Functions</div>
          <div className="card-value">{overview.total_functions}</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon warning">📏</div>
          <div className="card-title">Total LOC</div>
          <div className="card-value">{overview.total_loc.toLocaleString()}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon success">🧮</div>
          <div className="card-title">Avg Complexity</div>
          <div className="card-value">{overview.avg_complexity}</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-icon danger">🛡️</div>
          <div className="card-title">Code Smells</div>
          <div className="card-value">{result.code_smells.length}</div>
        </div>
      </div>

      {/* Health Score + Risk Doughnut row */}
      <div className="charts-grid">
        <div className="chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
          <HealthCircle score={overview.health_score} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>LANGUAGES</div>
            {Object.entries(overview.languages).map(([lang, count]) => (
              <div key={lang} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                {lang}: <strong style={{ color: 'var(--text-primary)' }}>{count}</strong> files
              </div>
            ))}
            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              AVG MAINTAINABILITY
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: overview.avg_maintainability >= 60 ? 'var(--success)' : 'var(--warning)' }}>
              {overview.avg_maintainability}
            </div>
          </div>
        </div>
        <div className="chart-container">
          <div className="chart-header">
            <div className="chart-title">Risk Distribution</div>
            <div className="chart-subtitle">Files by risk level</div>
          </div>
          <div style={{ height: 220 }}>
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
          <div style={{ height: 280 }}>
            <Bar data={complexityData} options={chartOptions} />
          </div>
        </div>
        <div className="chart-container">
          <div className="chart-header">
            <div className="chart-title">Coupling Analysis</div>
            <div className="chart-subtitle">Incoming vs Outgoing dependencies</div>
          </div>
          <div style={{ height: 280 }}>
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
          <div style={{ height: 250 }}>
            <Line data={maintData} options={chartOptions} />
          </div>
        </div>
        <div className="chart-container">
           {/* Placeholder or small metrics */}
           <div className="chart-header">
            <div className="chart-title">Summary Insights</div>
          </div>
          <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
            <div style={{ marginBottom: '1rem' }}>
              <span style={{ color: 'var(--accent)' }}>Most Complex:</span> {files.length > 0 ? files[0].file_path : 'N/A'}
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <span style={{ color: 'var(--success)' }}>Most Stable:</span> {files.length > 0 ? files.reduce((prev, curr) => (prev.instability < curr.instability ? prev : curr)).file_path : 'N/A'}
            </div>
            <div>
              <span style={{ color: 'var(--danger)' }}>Highest Churn:</span> {files.length > 0 ? files.reduce((prev, curr) => (prev.code_churn > curr.code_churn ? prev : curr)).file_path : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="chart-container" style={{ marginBottom: '1.5rem' }}>
        <div className="chart-header">
          <div className="chart-title">🔥 Risk Heatmap</div>
          <div className="chart-subtitle">Each cell represents a file — color indicates risk level</div>
        </div>
        <div className="heatmap-grid">
          {heatmapFiles.map((f) => {
            const parts = f.file_path.split(/[/\\]/);
            const shortName = parts[parts.length - 1];
            return (
              <div
                key={f.file_path}
                className="heatmap-cell"
                style={{ background: getCellColor(f.risk_score) }}
                onClick={() => navigate(`/file/${encodeURIComponent(f.file_path)}`)}
                title={`${f.file_path}\nRisk: ${f.risk_score}\nCC: ${f.cyclomatic_complexity}\nLOC: ${f.loc}`}
              >
                <span className="cell-score">{Math.round(f.risk_score)}</span>
                <span className="cell-name">{shortName}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '1rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(16,185,129,0.7)' }}></span> Low
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(245,158,11,0.75)' }}></span> Medium
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(249,115,22,0.8)' }}></span> High
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(239,68,68,0.85)' }}></span> Critical
          </span>
        </div>
      </div>

      {/* File Ranking Table */}
      <div className="chart-container" style={{ marginBottom: '1.5rem' }}>
        <div className="chart-header">
          <div className="chart-title">📋 File Rankings</div>
          <div className="chart-subtitle">All analyzed files sorted by risk score</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Language</th>
                <th>LOC</th>
                <th>Complexity</th>
                <th>Cognitive</th>
                <th>Nesting</th>
                <th>Churn</th>
                <th>Risk Score</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.file_path} onClick={() => navigate(`/file/${encodeURIComponent(f.file_path)}`)}>
                  <td><span className="file-name">{f.file_path}</span></td>
                  <td style={{ textTransform: 'capitalize' }}>{f.language}</td>
                  <td>{f.loc}</td>
                  <td>{f.cyclomatic_complexity}</td>
                  <td style={{ color: f.cognitive_complexity > 15 ? 'var(--danger)' : 'var(--text-primary)' }}>
                    {f.cognitive_complexity}
                  </td>
                  <td>{f.max_nesting_depth}</td>
                  <td>{f.code_churn}</td>
                  <td>
                    <span className={`risk-badge ${f.risk_level}`}>
                      <span className={`risk-dot ${f.risk_level}`}></span>
                      {f.risk_score}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

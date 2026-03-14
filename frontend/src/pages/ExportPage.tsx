import React from 'react';
import { Link } from 'react-router-dom';
import { getExportUrl } from '../api';
import type { AnalysisResult } from '../types';

interface Props {
  result: AnalysisResult | null;
}

export default function ExportPage({ result }: Props) {
  if (!result) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📥</div>
        <h2 className="empty-state-title">No Data to Export</h2>
        <p className="empty-state-desc">Run an analysis first to export reports</p>
        <Link to="/analyze" className="btn btn-primary">Start Analysis</Link>
      </div>
    );
  }

  const formats = [
    {
      key: 'json' as const,
      icon: '📄',
      title: 'JSON',
      desc: 'Full structured data — ideal for programmatic use and integration with other tools.',
    },
    {
      key: 'csv' as const,
      icon: '📊',
      title: 'CSV',
      desc: 'Tabular file-level metrics — open in Excel, Google Sheets, or any spreadsheet app.',
    },
    {
      key: 'pdf' as const,
      icon: '📕',
      title: 'PDF',
      desc: 'Formatted report with overview, risk distribution, top files, and code smells.',
    },
  ];

  return (
    <div className="page-content" style={{ textAlign: 'center' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Export Report</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
        Project: <strong>{result.project_name}</strong>
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
        Analysis ID: {result.analysis_id} · {result.overview.total_files} files analyzed
      </p>

      <div className="export-options">
        {formats.map((fmt) => (
          <a
            key={fmt.key}
            href={getExportUrl(result.analysis_id, fmt.key)}
            download
            className="export-card"
            style={{ textDecoration: 'none' }}
          >
            <div className="export-icon">{fmt.icon}</div>
            <div className="export-format">{fmt.title}</div>
            <div className="export-desc">{fmt.desc}</div>
          </a>
        ))}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <Link to="/dashboard" className="btn btn-ghost">← Back to Dashboard</Link>
      </div>
    </div>
  );
}

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
  Search,
} from 'lucide-react';
import { getExportUrl } from '../api';
import type { AnalysisResult } from '../types';
import { FloatingElementsLayer } from '../components/FloatingElements';

interface Props {
  result: AnalysisResult | null;
}

export default function ExportPage({ result }: Props) {
  if (!result) {
    return (
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '120px 48px', textAlign: 'center' }}>
        <Search size={48} style={{ color: 'var(--accent)', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 8 }}>No Data to Export</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Run an analysis first to generate reports.</p>
        <Link to="/analyze" style={{ display: 'inline-block', padding: '12px 32px', background: 'var(--accent)', color: 'var(--bg-primary)', borderRadius: 10, fontWeight: 800, textDecoration: 'none' }}>Start Analysis</Link>
      </div>
    );
  }

  const exportCards = [
    {
      title: 'JSON Data',
      desc: 'Complete raw metrics and dependency graph for programmatic use.',
      icon: <FileJson size={28} />,
      format: 'json' as const,
      badge: 'RAW',
    },
    {
      title: 'CSV Table',
      desc: 'Flattened file metrics optimized for spreadsheet analysis.',
      icon: <FileSpreadsheet size={28} />,
      format: 'csv' as const,
      badge: 'TABLE',
    },
    {
      title: 'PDF Report',
      desc: 'Executive summary with charts, hotspots, and recommendations.',
      icon: <FileText size={28} />,
      format: 'pdf' as const,
      badge: 'PRO',
    },
  ];

  return (
    <div style={{ position: 'relative', minHeight: 'calc(100vh - 72px)' }}>
      <FloatingElementsLayer variant="export" />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 960, margin: '0 auto', padding: '48px 48px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 40 }}>
          <Link to="/dashboard" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            textDecoration: 'none', marginBottom: 16, transition: 'color 0.15s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <ArrowLeft size={14} /> Back to Insights
          </Link>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 8 }}>
            Export Report
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Download comprehensive architectural data in your preferred format.
          </p>
        </div>

        {/* ── 3-column Download Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 }}>
          {exportCards.map((card) => (
            <div key={card.format} style={{
              background: 'var(--bg-secondary)',
              border: '2px solid var(--border)',
              borderRadius: 14,
              padding: 28,
              display: 'flex',
              flexDirection: 'column',
              transition: 'border-color 0.2s, transform 0.2s',
              cursor: 'pointer',
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Icon */}
              <div style={{
                width: 56, height: 56, borderRadius: 12,
                background: 'var(--bg-primary)', border: '2px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)', marginBottom: 20,
                transition: 'all 0.2s',
              }}>
                {card.icon}
              </div>

              {/* Title + Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900 }}>{card.title}</h3>
                <span style={{
                  fontSize: '0.5rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                  background: 'rgba(210,193,182,0.1)', color: 'var(--accent)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>{card.badge}</span>
              </div>

              {/* Description */}
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24, flex: 1 }}>
                {card.desc}
              </p>

              {/* Download Button */}
              <a
                href={getExportUrl(result.analysis_id, card.format)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', padding: '12px 0',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  border: '2px solid var(--border)',
                  borderRadius: 10, fontWeight: 700, fontSize: '0.85rem',
                  textDecoration: 'none', transition: 'all 0.2s',
                  fontFamily: 'var(--font-sans)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent)';
                  e.currentTarget.style.color = 'var(--bg-primary)';
                  e.currentTarget.style.borderColor = 'var(--accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <Download size={16} /> Download
              </a>
            </div>
          ))}
        </div>

        {/* ── Summary Section ── */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '2px solid var(--border)',
          borderRadius: 14,
          padding: 36,
          display: 'flex',
          alignItems: 'center',
          gap: 40,
        }}>
          {/* Left: Text */}
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)',
              borderRadius: 20, color: 'var(--accent)', fontSize: '0.6rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16,
            }}>
              <ShieldCheck size={12} /> Integrity Verified
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: 20 }}>Analysis Summary</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <Zap size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span>Processed <strong style={{ color: 'var(--text-primary)', margin: '0 3px' }}>{result.files.length}</strong> source modules</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <Layers size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span>Identified <strong style={{ color: 'var(--text-primary)', margin: '0 3px' }}>{result.overview.languages ? Object.keys(result.overview.languages).length : 0}</strong> languages</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <ShieldCheck size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span>Avg. Maintainability: <strong style={{ color: 'var(--text-primary)', margin: '0 3px' }}>{result.overview.avg_maintainability}%</strong></span>
              </div>
            </div>
          </div>

          {/* Right: Health Score */}
          <div style={{
            width: 130, height: 130, borderRadius: 16,
            background: 'var(--bg-primary)', border: '3px solid var(--border)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <div style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Health</div>
            <div style={{
              fontSize: '2.5rem', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em',
              color: result.overview.health_score >= 80 ? '#10b981' : result.overview.health_score >= 60 ? '#f59e0b' : '#ef4444',
            }}>
              {result.overview.health_score}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

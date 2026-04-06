import { Link } from 'react-router-dom';
import { Zap, Layers, Search, ChevronRight, Code2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="responsive-container">

      {/* ── Hero Section (Split Layout) ── */}
      <section className="hero-section">
        {/* Left: Text */}
        <div className="hero-text">
          <h1 className="hero-title">
            Replexity.
          </h1>
          <p className="hero-description">
            Augmented code intelligence for modern architectures. Visualize
            structural complexity, identify technical debt, and audit coupling
            with precision parsing.
          </p>
          <Link
            to="/analyze"
            className="btn btn-primary"
            style={{ display: 'inline-flex' }}
          >
            Launch Analysis <ChevronRight size={18} />
          </Link>
        </div>

        {/* Right: 3D Terminal Visual */}
        <div className="hero-visual">
          {/* Glow behind */}
          <div className="glow-effect"></div>

          {/* Terminal Card */}
          <div className="terminal-card">
            {/* Title bar */}
            <div className="terminal-titlebar">
              <div className="terminal-dot terminal-dot-red"></div>
              <div className="terminal-dot terminal-dot-yellow"></div>
              <div className="terminal-dot terminal-dot-green"></div>
              <span style={{
                marginLeft: 16,
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
              }}>system_audit.sh</span>
            </div>

            {/* Terminal body */}
            <div className="terminal-body">
              <div className="flex gap-2">
                <span style={{ color: '#10b981', opacity: 0.5 }}>$</span>
                <span style={{ color: 'var(--accent)' }}>analyze --strict ./src/core</span>
              </div>
              <div className="flex gap-2" style={{ opacity: 0.45 }}>
                <span style={{ color: '#3b82f6' }}>[info]</span>
                <span>Ast-parsing 1,242 nodes...</span>
              </div>
              <div className="flex gap-2" style={{ opacity: 0.45 }}>
                <span style={{ color: '#3b82f6' }}>[info]</span>
                <span>Cross-referencing dependency graph (643 edges)...</span>
              </div>
              <div className="flex gap-2">
                <span style={{ color: '#f59e0b' }}>[hotspot]</span>
                <span style={{ color: '#fde68a' }}>High coupling in /api/v2/router.ts</span>
              </div>
              <div className="flex gap-2" style={{ marginTop: 8 }}>
                <span style={{ color: '#10b981' }}>[done]</span>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>SCORE: 88.4 / 100</span>
              </div>

              {/* Progress bar */}
              <div style={{ marginTop: 16 }} className="flex items-center gap-1\.5">
                <div className="progress-bar" style={{ flex: 1 }}>
                  <div className="progress-fill animate-progress-bar"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating badge */}
          <div className="floating-badge">
            <Code2 size={20} style={{ color: 'var(--accent)' }} />
            <div>
              <div className="badge-label">Cyclomatic Rank</div>
              <div className="badge-value">Excellent</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{
        paddingTop: 80,
        paddingBottom: 80,
        borderTop: '2px solid var(--border)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 48,
        }}>
          <FeatureCard
            icon={<Zap size={28} />}
            title="Real-time Parsing"
            desc="Augmented tree-sitter integration for instantaneous architectural feedback."
          />
          <FeatureCard
            icon={<Layers size={28} />}
            title="Dependency Graphs"
            desc="Visualize module isolation and structural coupling across microservices."
          />
          <FeatureCard
            icon={<Search size={28} />}
            title="Integrity Audit"
            desc="Pinpoint hidden technical debt and cross-module fragility in seconds."
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: any) {
  return (
    <div className="feature-card">
      <div className="feature-icon">
        {icon}
      </div>
      <div>
        <h3 className="feature-title">{title}</h3>
        <p className="feature-description">{desc}</p>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Zap, Layers, Search, ChevronRight, Code2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="responsive-container">

      {/* ── Hero Section (Split Layout) ── */}
      <section style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 64,
        paddingTop: 100,
        paddingBottom: 100,
        minHeight: 'calc(100vh - 72px)',
      }}
      className="hero-section"
      >
        {/* Left: Text */}
        <div style={{ flex: 1, maxWidth: 560 }}>
          <h1 style={{
            fontSize: '4.5rem',
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            marginBottom: 32,
            color: 'var(--accent)',
          }}>
            Replexity.
          </h1>
          <p style={{
            fontSize: '1.15rem',
            lineHeight: 1.7,
            color: 'var(--text-secondary)',
            marginBottom: 48,
            maxWidth: 480,
          }}>
            Augmented code intelligence for modern architectures. Visualize
            structural complexity, identify technical debt, and audit coupling
            with precision parsing.
          </p>
          <Link
            to="/analyze"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '14px 36px',
              background: 'var(--accent)',
              color: 'var(--bg-primary)',
              borderRadius: 10,
              fontWeight: 800,
              fontSize: '1rem',
              textDecoration: 'none',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 20px rgba(210,193,182,0.15)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(210,193,182,0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(210,193,182,0.15)';
            }}
          >
            Launch Analysis <ChevronRight size={18} />
          </Link>
        </div>

        {/* Right: 3D Terminal Visual */}
        <div style={{ flex: 1, position: 'relative', maxWidth: 520 }}>
          {/* Glow behind */}
          <div style={{
            position: 'absolute',
            inset: -20,
            background: 'radial-gradient(ellipse at center, rgba(210,193,182,0.08) 0%, transparent 70%)',
            borderRadius: 32,
            pointerEvents: 'none',
          }}></div>

          {/* Terminal Card */}
          <div
            className="terminal-3d"
            style={{
              position: 'relative',
              background: '#0a1a14',
              border: '2px solid var(--border)',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(210,193,182,0.05)',
              transform: 'perspective(1200px) rotateY(-8deg) rotateX(4deg)',
              transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'perspective(1200px) rotateY(0deg) rotateX(0deg) scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'perspective(1200px) rotateY(-8deg) rotateX(4deg)';
            }}
          >
            {/* Title bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderBottom: '1px solid var(--border)',
              background: 'rgba(35,76,106,0.4)',
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(239,68,68,0.4)' }}></div>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(245,158,11,0.4)' }}></div>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(16,185,129,0.4)' }}></div>
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
            <div style={{
              padding: '24px 28px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              lineHeight: 2,
            }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{ color: '#10b981', opacity: 0.5 }}>$</span>
                <span style={{ color: 'var(--accent)' }}>analyze --strict ./src/core</span>
              </div>
              <div style={{ display: 'flex', gap: 16, opacity: 0.45 }}>
                <span style={{ color: '#3b82f6' }}>[info]</span>
                <span>Ast-parsing 1,242 nodes...</span>
              </div>
              <div style={{ display: 'flex', gap: 16, opacity: 0.45 }}>
                <span style={{ color: '#3b82f6' }}>[info]</span>
                <span>Cross-referencing dependency graph (643 edges)...</span>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{ color: '#f59e0b' }}>[hotspot]</span>
                <span style={{ color: '#fde68a' }}>High coupling in /api/v2/router.ts</span>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <span style={{ color: '#10b981' }}>[done]</span>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>SCORE: 88.4 / 100</span>
              </div>

              {/* Progress bar */}
              <div style={{
                marginTop: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <div style={{
                  flex: 1,
                  height: 4,
                  background: 'var(--border)',
                  borderRadius: 4,
                  overflow: 'hidden',
                }}>
                  <div className="animate-progress-bar" style={{
                    height: '100%',
                    width: '100%',
                    background: 'var(--accent)',
                  }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating badge */}
          <div style={{
            position: 'absolute',
            bottom: -24,
            left: -16,
            background: 'var(--bg-secondary)',
            border: '2px solid var(--border)',
            borderLeft: '4px solid var(--accent)',
            borderRadius: 12,
            padding: '12px 20px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            transform: 'rotate(4deg)',
            transition: 'transform 0.4s ease',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'rotate(0deg) scale(1.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'rotate(4deg)'; }}
          >
            <Code2 size={20} style={{ color: 'var(--accent)' }} />
            <div>
              <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cyclomatic Rank</div>
              <div style={{ fontSize: '1rem', fontWeight: 900, lineHeight: 1.2, color: 'var(--text-primary)' }}>Excellent</div>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{
        width: 56,
        height: 56,
        background: 'var(--bg-secondary)',
        border: '2px solid var(--border)',
        borderRadius: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--accent)',
      }}>
        {icon}
      </div>
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: 10, color: 'var(--text-primary)' }}>{title}</h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.85rem', opacity: 0.8 }}>{desc}</p>
      </div>
    </div>
  );
}

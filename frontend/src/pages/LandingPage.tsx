import { Link } from 'react-router-dom';
import { Zap, ArrowRight, Github, Globe, Terminal, ShieldCheck } from 'lucide-react';
import { FloatingElementsLayer } from '../components/FloatingElements';
import { Animated } from '../components/Animated';

export default function LandingPage() {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <FloatingElementsLayer variant="landing" />

      {/* ── Background Glows ── */}
      <div style={{
        position: 'fixed', top: '-10%', left: '-10%', width: '40%', height: '40%',
        background: 'radial-gradient(circle, rgba(210, 193, 182, 0.08) 0%, transparent 70%)',
        zIndex: 0, pointerEvents: 'none'
      }}></div>
      <div style={{
        position: 'fixed', bottom: '-10%', right: '-10%', width: '50%', height: '50%',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 70%)',
        zIndex: 0, pointerEvents: 'none'
      }}></div>

      <div className="responsive-container" style={{ position: 'relative', zIndex: 1 }}>
        {/* ── Hero Section ── */}
        <section className="hero-section" style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', paddingTop: 40 }}>
          <Animated className="hero-text">

            <h1 className="hero-title">
              Replexity.
            </h1>
            <p className="hero-description">
              Augmented code intelligence for modern architectures. Visualize
              structural complexity, identify technical debt, and audit coupling
              with precision parsing.
            </p>

            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <Link to="/analyze" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1rem' }}>
                Start Analysis <ArrowRight size={20} />
              </Link>
              <a href="https://github.com/AryanPandya0/Replexity" target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '1rem 1.5rem' }}>
                <Github size={20} /> View on GitHub
              </a>
            </div>

            <div style={{ marginTop: 48, display: 'flex', gap: 40, opacity: 0.6 }}>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent)' }}>275</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Repos Analyzed</div>
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent)' }}>640ms</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg. Parse Time</div>
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--accent)' }}>99.9%</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Parsing Accuracy</div>
              </div>
            </div>
          </Animated>

          <Animated className="hero-visual" direction="left" delay={0.2}>
            <div className="terminal-card" style={{ boxShadow: '0 40px 100px rgba(0,0,0,0.6)' }}>
              <div className="terminal-titlebar">
                <div className="terminal-dot terminal-dot-red"></div>
                <div className="terminal-dot terminal-dot-yellow"></div>
                <div className="terminal-dot terminal-dot-green"></div>
                <div style={{ flex: 1, textAlign: 'center', marginLeft: -50 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    analyze_repo.sh
                  </span>
                </div>
              </div>
              <div className="terminal-body" style={{ fontSize: '0.75rem' }}>
                <div className="flex gap-2"><span style={{ color: '#10b981' }}>$</span> <span style={{ color: 'var(--accent)' }}>replexity analyze ./src</span></div>
                <div className="flex gap-2" style={{ opacity: 0.5 }}><span>[1/3] Indexing filesystem...</span></div>
                <div className="flex gap-2" style={{ opacity: 0.5 }}><span>[2/3] Constructing AST graph (842 nodes)...</span></div>
                <div className="flex gap-2"><span style={{ color: '#3b82f6' }}>[info]</span> <span>Detected React/TypeScript workspace</span></div>
                <div className="flex gap-2"><span style={{ color: '#f59e0b' }}>[warn]</span> <span style={{ color: '#fde68a' }}>Circular dependency: auth {'->'} user {'->'} auth</span></div>
                <div style={{ marginTop: 12, padding: '12px', background: 'rgba(210,193,182,0.05)', borderRadius: 8, border: '1px solid rgba(210,193,182,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.65rem' }}>COMPREHENSION SCORE</span>
                    <span style={{ fontWeight: 900, color: '#10b981' }}>94.2</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: '94.2%', background: '#10b981' }}></div></div>
                </div>
              </div>
            </div>

            <div className="floating-badge pulse-glow" style={{ bottom: -20, left: -20, background: 'var(--bg-secondary)', border: '1px solid var(--accent)', padding: '16px 20px' }}>
              <Zap size={24} style={{ color: 'var(--accent)' }} />
              <div>
                <div className="badge-label">Real-time Engine</div>
                <div className="badge-value" style={{ color: '#10b981' }}>Optimized</div>
              </div>
            </div>
          </Animated>
        </section>

        {/* ── Features Section ── */}
        <section style={{ padding: '120px 0', borderTop: '1px solid var(--border)' }}>
          <Animated style={{ textAlign: 'center', marginBottom: 80 }}>
            <h2 className="text-4xl mb-4">Master Your Codebase.</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto' }}>
              Advanced heuristics and architectural mapping tools designed for massive monorepos and complex microservice environments.
            </p>
          </Animated>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
            <Animated delay={0.1}>
              <FeatureCard
                icon={<Terminal size={32} />}
                title="Agnostic Parsing"
                desc="Support for TS, JS, Python, and Go with unified complexity metrics across your entire stack."
              />
            </Animated>
            <Animated delay={0.2}>
              <FeatureCard
                icon={<Globe size={32} />}
                title="Coupling Analysis"
                desc="Visualize hidden dependencies and structural fragility between distant modules and services."
              />
            </Animated>
            <Animated delay={0.3}>
              <FeatureCard
                icon={<ShieldCheck size={32} />}
                title="Risk Profiling"
                desc="Identify files most likely to contain bugs based on churn, complexity, and lint violations."
              />
            </Animated>
          </div>
        </section>

        {/* ── CTA Section ── */}
        <Animated direction="up" delay={0.1}>
          <section style={{
            padding: '100px 60px', background: 'linear-gradient(135deg, rgba(35, 76, 106, 0.4), rgba(40, 90, 72, 0.2))',
            borderRadius: 32, marginBottom: 120, textAlign: 'center', border: '1px solid var(--glass-border)',
            backdropFilter: 'var(--glass-blur)'
          }}>
            <h2 className="text-5xl mb-6">Ready to refactor?</h2>
            <p className="text-xl mb-10" style={{ color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto 40px' }}>
              Get a comprehensive audit of your repository in less than 30 seconds. No manual configuration required.
            </p>
            <Link to="/analyze" className="btn btn-primary" style={{ padding: '1.2rem 3rem', fontSize: '1.1rem', borderRadius: 100 }}>
              Get Started Now <ArrowRight size={22} />
            </Link>
          </section>
        </Animated>

        <footer style={{ paddingBottom: 60, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.5, fontSize: '0.8rem' }}>
          <div>© 2026 Replexity Labs. Alpha Build.</div>
          <div style={{ display: 'flex', gap: 24 }}>
            {/* <a href="#">Privacy</a>
            <a href="#">Security</a>
            <a href="#">Docs</a> */}
          </div>
        </footer>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: any) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <div>
        <h3 className="feature-title">{title}</h3>
        <p className="feature-description">{desc}</p>
      </div>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';

const features = [
  {
    icon: '📊',
    title: 'Cyclomatic Complexity',
    desc: 'Measure code complexity with industry-standard metrics including cyclomatic complexity, nesting depth, and function length analysis.',
  },
  {
    icon: '🎯',
    title: 'AI Risk Scoring',
    desc: 'Get intelligent risk scores (0-100) for every file using a weighted multi-factor model that predicts maintenance burden.',
  },
  {
    icon: '🐛',
    title: 'Bug Prediction',
    desc: 'Identify potential bug hotspots before they become problems using heuristic pattern matching on code characteristics.',
  },
  {
    icon: '👃',
    title: 'Code Smell Detection',
    desc: 'Automatically detect Long Methods, God Objects, Deep Nesting, and other anti-patterns with actionable fix suggestions.',
  },
  {
    icon: '🔥',
    title: 'Risk Heatmap',
    desc: 'Visualize your entire codebase risk with an interactive color-coded heatmap showing green (safe) to red (critical) zones.',
  },
  {
    icon: '📈',
    title: 'Export Reports',
    desc: 'Download detailed analysis reports in JSON, CSV, or PDF format to share with your team and track progress over time.',
  },
];

export default function LandingPage() {
  return (
    <div>
      <section className="landing-hero">
        <div className="hero-tag">✨ AI-Powered Code Intelligence</div>
        <h1 className="hero-title">
          Understand Your Code<br />Like Never Before
        </h1>
        <p className="hero-subtitle">
          Analyze any Python, JavaScript, or TypeScript codebase for complexity, 
          risk, code smells, and maintainability — visualized in a stunning interactive dashboard.
        </p>
        <div className="hero-actions">
          <Link to="/analyze" className="btn btn-primary btn-lg">
            🚀 Start Analysis
          </Link>
          <a href="#features" className="btn btn-secondary btn-lg">
            Learn More ↓
          </a>
        </div>
      </section>

      <section id="features" className="features-grid">
        {features.map((f) => (
          <div key={f.title} className="feature-card">
            <div className="feature-icon">{f.icon}</div>
            <h3 className="feature-title">{f.title}</h3>
            <p className="feature-desc">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import type { AnalysisResult } from '../types';

interface Props {
  result: AnalysisResult | null;
}

export default function FileDetailPage({ result }: Props) {
  const { filePath } = useParams<{ filePath: string }>();
  const decodedPath = decodeURIComponent(filePath || '');

  if (!result) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📄</div>
        <h2 className="empty-state-title">No Data</h2>
        <p className="empty-state-desc">Please run an analysis first</p>
        <Link to="/analyze" className="btn btn-primary">Start Analysis</Link>
      </div>
    );
  }

  const file = result.files.find((f) => f.file_path === decodedPath);

  if (!file) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">❌</div>
        <h2 className="empty-state-title">File Not Found</h2>
        <p className="empty-state-desc">Could not find metrics for: {decodedPath}</p>
        <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
      </div>
    );
  }

  const riskColor =
    file.risk_level === 'critical' ? 'var(--risk-critical)' :
    file.risk_level === 'high' ? 'var(--risk-high)' :
    file.risk_level === 'medium' ? 'var(--risk-medium)' :
    'var(--risk-low)';

  return (
    <div className="page-content">
      {/* Header */}
      <div className="detail-header">
        <Link to="/dashboard" className="detail-back">←</Link>
        <div>
          <div className="detail-file-name">{file.file_path}</div>
          <div className="detail-language">{file.language}</div>
        </div>
        <span className={`risk-badge ${file.risk_level}`} style={{ marginLeft: 'auto' }}>
          <span className={`risk-dot ${file.risk_level}`}></span>
          Risk: {file.risk_score}
        </span>
      </div>

      {/* Key Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-item">
          <div className="metric-label">Lines of Code</div>
          <div className="metric-value">{file.loc}</div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Cyclomatic Complexity</div>
          <div className="metric-value" style={{ color: file.cyclomatic_complexity > 10 ? 'var(--danger)' : 'var(--text-primary)' }}>
            {file.cyclomatic_complexity}
          </div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Cognitive Complexity</div>
          <div className="metric-value" style={{ color: file.cognitive_complexity > 15 ? 'var(--danger)' : 'var(--text-primary)' }}>
            {file.cognitive_complexity}
          </div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Maintainability Index</div>
          <div className="metric-value" style={{ color: file.maintainability_index >= 60 ? 'var(--success)' : 'var(--warning)' }}>
            {file.maintainability_index}
          </div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Bug Risk Probability</div>
          <div className="metric-value" style={{ color: riskColor }}>
            {file.bug_risk_probability}%
          </div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Code Churn (Commits)</div>
          <div className="metric-value">{file.code_churn}</div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Afferent Coupling (Ca)</div>
          <div className="metric-value">{file.coupling_afferent}</div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Efferent Coupling (Ce)</div>
          <div className="metric-value">{file.coupling_efferent}</div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Instability (I)</div>
          <div className="metric-value">{file.instability}</div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Inheritance Depth</div>
          <div className="metric-value">{file.inheritance_depth}</div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Halstead Volume</div>
          <div className="metric-value">{Math.round(file.halstead_volume)}</div>
        </div>
        <div className="metric-item">
          <div className="metric-label">Halstead Effort</div>
          <div className="metric-value">{Math.round(file.halstead_effort)}</div>
        </div>
      </div>

      {/* Functions Table */}
      {file.functions.length > 0 && (
        <div className="chart-container" style={{ marginBottom: '1.5rem' }}>
          <div className="chart-header">
            <div className="chart-title">⚡ Functions ({file.functions.length})</div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Lines</th>
                <th>LOC</th>
                <th>Cyclomatic</th>
                <th>Cognitive</th>
                <th>Params</th>
              </tr>
            </thead>
            <tbody>
              {file.functions.map((fn, i) => (
                <tr key={`${fn.name}-${i}`} style={{ cursor: 'default' }}>
                  <td><span className="file-name">{fn.name}()</span></td>
                  <td>{fn.line_start} – {fn.line_end || '?'}</td>
                  <td>{fn.loc}</td>
                  <td style={{ color: fn.complexity > 10 ? 'var(--danger)' : 'var(--text-primary)' }}>
                    {fn.complexity}
                  </td>
                  <td style={{ color: fn.cognitive_complexity > 15 ? 'var(--danger)' : 'var(--text-primary)' }}>
                    {fn.cognitive_complexity}
                  </td>
                  <td>{fn.parameters}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Code Smells */}
      {file.code_smells.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 className="section-title">👃 Code Smells ({file.code_smells.length})</h2>
          <div className="smell-list">
            {file.code_smells.map((smell, i) => (
              <div key={i} className="smell-item">
                <div className="smell-issue">⚠️ {smell.issue}</div>
                {smell.function && <div className="smell-function">in {smell.function}() {smell.line ? `at line ${smell.line}` : ''}</div>}
                <div className="smell-suggestion">{smell.suggestion}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refactor Suggestions */}
      {file.refactor_suggestions.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 className="section-title">🔧 Refactor Suggestions ({file.refactor_suggestions.length})</h2>
          <div className="suggestion-list">
            {file.refactor_suggestions.map((sug, i) => (
              <div key={i} className="suggestion-item">
                <div className="suggestion-issue">
                  <span className={`risk-badge ${sug.priority}`} style={{ marginRight: '0.5rem' }}>
                    {sug.priority}
                  </span>
                  {sug.issue}
                </div>
                {sug.function && <div className="suggestion-function">in {sug.function}()</div>}
                <div className="suggestion-text">{sug.suggestion}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

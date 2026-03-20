export function HealthCircle({ score }: { score: number }) {
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

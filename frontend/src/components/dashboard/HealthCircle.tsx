import { Activity } from 'lucide-react';

interface Props {
  score: number;
}

export function HealthCircle({ score }: Props) {
  // Score-based colors
  const getColor = (s: number) => {
    if (s >= 80) return '#10b981';
    if (s >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const color = getColor(score);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-[200px] h-[200px]">
      <svg className="w-full h-full transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          stroke="var(--border)"
          strokeWidth="12"
          fill="transparent"
          className="opacity-20"
        />
        {/* Progress Circle */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          stroke={color}
          strokeWidth="12"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 8px ${color}44)` }}
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <Activity size={24} className="mb-1 opacity-50" style={{ color }} />
        <span className="text-4xl font-black tracking-tighter" style={{ color }}>
          {Math.round(score)}
        </span>
        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Health Index</span>
      </div>
    </div>
  );
}

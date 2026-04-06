import { motion } from 'framer-motion';

interface Props {
  score: number;
}

export function HealthCircle({ score }: Props) {
  const getColor = (s: number) => {
    if (s >= 80) return '#10b981'; // Green (Stable)
    if (s >= 55) return '#f59e0b'; // Amber (Moderate)
    return '#ef4444'; // Red (High Risk)
  };

  const color = getColor(score);
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: 160, height: 160, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer Pulse Glow (Delayed) */}
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.1, 0.25, 0.1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          position: 'absolute', width: 140, height: 140, borderRadius: '50%',
          background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
        {/* Track Line */}
        <circle 
          cx="80" cy="80" r={radius} 
          stroke="rgba(210, 193, 182, 0.05)" 
          strokeWidth="8" fill="transparent" 
        />
        {/* Glowing Shadow Line (Deeper Glow) */}
        <motion.circle
          cx="80" cy="80" r={radius}
          stroke={color} strokeWidth="12" fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.8, ease: "easeOut" }}
          strokeLinecap="round"
          style={{ opacity: 0.1, filter: `blur(8px)` }}
        />
        {/* Main Progress Line */}
        <motion.circle
          cx="80" cy="80" r={radius}
          stroke={color} strokeWidth="8" fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.8, ease: "easeOut" }}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 10px ${color}66)` }}
        />
      </svg>
      
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 1 }}
          style={{ textAlign: 'center' }}
        >
          <span style={{ fontSize: '2.5rem', fontWeight: 900, color, letterSpacing: '-0.05em', lineHeight: 0.9 }}>{Math.round(score)}</span>
          <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 4 }}>Score</div>
        </motion.div>
      </div>
    </div>
  );
}

import { motion } from 'framer-motion';

interface Props {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  count?: number;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, className, count = 1 }: Props) {
  const elements = Array.from({ length: count });

  return (
    <>
      {elements.map((_, i) => (
        <motion.div
          key={i}
          className={`skeleton ${className || ''}`}
          initial={{ opacity: 0.3 }}
          animate={{ opacity: 0.6 }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
          style={{
            width,
            height,
            borderRadius,
            background: 'linear-gradient(90deg, rgba(210,193,182,0.05) 25%, rgba(210,193,182,0.1) 50%, rgba(210,193,182,0.05) 75%)',
            backgroundSize: '200% 100%',
            marginBottom: i === elements.length - 1 ? 0 : 8
          }}
        />
      ))}
    </>
  );
}

export function CardSkeleton() {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '2px solid var(--border)',
      borderRadius: 12,
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }}>
      <Skeleton width="40%" height={24} />
      <Skeleton width="100%" height={12} count={3} />
      <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
        <Skeleton width={80} height={32} borderRadius={16} />
        <Skeleton width={120} height={32} borderRadius={16} />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '2px solid var(--border)',
      borderRadius: 12,
      padding: 24,
      height: 300,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      gap: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: '100%', padding: '0 20px' }}>
        {[60, 80, 40, 100, 70, 90, 50].map((h, i) => (
          <Skeleton key={i} width="100%" height={`${h}%`} borderRadius="4px 4px 0 0" />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <Skeleton width={40} height={10} />
        <Skeleton width={40} height={10} />
        <Skeleton width={40} height={10} />
        <Skeleton width={40} height={10} />
      </div>
    </div>
  );
}

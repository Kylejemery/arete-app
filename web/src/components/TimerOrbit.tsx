interface TimerOrbitProps {
  elapsed: number;
  total: number;
  isRunning: boolean;
}

export default function TimerOrbit({ elapsed, total, isRunning }: TimerOrbitProps) {
  const r = 110;
  const circumference = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, elapsed / total) : 0;
  const offset = circumference * (1 - pct);
  const remaining = Math.max(0, total - elapsed);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  const dotAngle = (pct * 360 - 90) * (Math.PI / 180);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
      <svg width="280" height="280" viewBox="0 0 280 280">
        <defs>
          <filter id="orbit-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="orbit-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e3c77a" />
            <stop offset="1" stopColor="#8a6f27" />
          </linearGradient>
        </defs>

        {/* Outer decorative ring */}
        <circle cx="140" cy="140" r="130" fill="none" stroke="rgba(201,168,76,0.06)" strokeWidth="1" />

        {/* Track */}
        <circle cx="140" cy="140" r={r} fill="none" stroke="rgba(201,168,76,0.10)" strokeWidth="3" />

        {/* 60 tick marks */}
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = (i * 6 - 90) * (Math.PI / 180);
          const isMajor = i % 5 === 0;
          const inner = r + (isMajor ? 10 : 6);
          const outer = r + (isMajor ? 16 : 10);
          return (
            <line
              key={i}
              x1={140 + Math.cos(angle) * inner}
              y1={140 + Math.sin(angle) * inner}
              x2={140 + Math.cos(angle) * outer}
              y2={140 + Math.sin(angle) * outer}
              stroke="#c9a84c"
              strokeWidth={isMajor ? 1.5 : 0.8}
              opacity={isMajor ? 0.5 : 0.2}
            />
          );
        })}

        {/* Progress arc */}
        {elapsed > 0 && (
          <circle
            cx="140" cy="140" r={r}
            fill="none"
            stroke="url(#orbit-grad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 140 140)"
            filter="url(#orbit-glow)"
          />
        )}

        {/* Pulse dot at current position */}
        {elapsed > 0 && (
          <circle
            cx={140 + Math.cos(dotAngle) * r}
            cy={140 + Math.sin(dotAngle) * r}
            r="5"
            fill="#e3c77a"
            filter="url(#orbit-glow)"
            opacity={isRunning ? 1 : 0.6}
          />
        )}
      </svg>

      {/* Center display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          style={{
            fontFamily: 'var(--font-serif, Georgia, serif)',
            color: '#e3c77a',
            fontSize: 52,
            fontWeight: 500,
            lineHeight: 1,
          }}
        >
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        <div
          className="mt-2 text-[10px] tracking-[2px] uppercase"
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            color: isRunning ? '#c9a84c' : elapsed > 0 ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.35)',
          }}
        >
          {isRunning ? 'In Progress' : elapsed > 0 ? 'Paused' : 'Ready'}
        </div>
      </div>
    </div>
  );
}

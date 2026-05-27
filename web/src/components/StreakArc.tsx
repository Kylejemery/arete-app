interface StreakArcProps {
  day: number;
  total?: number;
  label?: string;
}

function toRoman(n: number): string {
  if (n <= 0) return '–';
  const map: [string, number][] = [
    ['M',1000],['CM',900],['D',500],['CD',400],['C',100],
    ['XC',90],['L',50],['XL',40],['X',10],['IX',9],['V',5],['IV',4],['I',1],
  ];
  let result = '';
  for (const [s, v] of map) while (n >= v) { result += s; n -= v; }
  return result;
}

export default function StreakArc({ day, total = 100, label = 'Stade' }: StreakArcProps) {
  const r = 38;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(1, day <= 0 ? 0 : day / total);
  const offset = circumference * (1 - pct);

  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <defs>
          <linearGradient id="streak-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e3c77a" />
            <stop offset="1" stopColor="#8a6f27" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx="48" cy="48" r={r}
          fill="none"
          stroke="rgba(201,168,76,0.12)"
          strokeWidth="2"
        />
        {/* Progress arc */}
        {day > 0 && (
          <circle
            cx="48" cy="48" r={r}
            fill="none"
            stroke="url(#streak-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 48 48)"
          />
        )}
        {/* Tick marks */}
        {Array.from({ length: 10 }).map((_, i) => {
          const angle = (i * 36 - 90) * (Math.PI / 180);
          return (
            <line
              key={i}
              x1={48 + Math.cos(angle) * 43}
              y1={48 + Math.sin(angle) * 43}
              x2={48 + Math.cos(angle) * 47}
              y2={48 + Math.sin(angle) * 47}
              stroke="#c9a84c"
              strokeWidth="0.6"
              opacity="0.4"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="text-[26px] font-medium leading-none tracking-tight"
          style={{
            fontFamily: 'var(--font-serif, Georgia, serif)',
            color: '#e3c77a',
          }}
        >
          {day <= 0 ? '–' : toRoman(day)}
        </div>
        <div
          className="text-[8.5px] tracking-[1.5px] uppercase mt-1"
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            color: 'rgba(201,168,76,0.85)',
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

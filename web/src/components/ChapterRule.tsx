interface ChapterRuleProps {
  label?: string;
  className?: string;
}

export default function ChapterRule({ label, className = '' }: ChapterRuleProps) {
  if (label) {
    return (
      <div className={`flex items-center gap-3 my-4 ${className}`}>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <span
          className="text-[10px] uppercase tracking-[0.2em]"
          style={{
            color: 'rgba(201,168,76,0.6)',
            fontFamily: 'var(--font-mono, monospace)',
          }}
        >
          {label}
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
      </div>
    );
  }

  return (
    <div
      className={`my-4 h-px ${className}`}
      style={{ background: 'rgba(255,255,255,0.08)' }}
    />
  );
}

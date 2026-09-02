'use client';

import Link from 'next/link';

/** A titled `#16213e`-family card, the web analogue of the mobile settings card. */
export function SettingsCard({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl p-5 ${className}`}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {title && (
        <h2
          className="text-[11px] tracking-[1.4px] uppercase mb-3"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
        >
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

const rowClass =
  'w-full flex items-center justify-between gap-4 text-left rounded-xl px-4 py-3 border transition-colors border-[rgba(255,255,255,0.08)] hover:border-[rgba(201,168,76,0.4)]';

const dangerRowClass =
  'w-full flex items-center justify-between gap-4 text-left rounded-xl px-4 py-3 border transition-colors border-[rgba(255,68,68,0.28)] hover:border-[rgba(255,68,68,0.6)]';

const rowStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  color: '#e6eef8',
};

/** A tappable row that navigates. */
export function SettingsLinkRow({
  href,
  label,
  detail,
}: {
  href: string;
  label: string;
  detail?: string;
}) {
  return (
    <Link href={href} className={rowClass} style={rowStyle}>
      <span className="text-[14px]">{label}</span>
      <span className="flex items-center gap-2">
        {detail && (
          <span
            className="text-[11px] tracking-[1px] uppercase"
            style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
          >
            {detail}
          </span>
        )}
        <span aria-hidden style={{ color: '#c9a84c' }}>
          →
        </span>
      </span>
    </Link>
  );
}

/** A tappable row that runs an action. */
export function SettingsButtonRow({
  label,
  onClick,
  disabled = false,
  tone = 'default',
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${tone === 'danger' ? dangerRowClass : rowClass} disabled:opacity-50`}
      style={{ ...rowStyle, color: tone === 'danger' ? '#ff4444' : '#e6eef8' }}
    >
      <span className="text-[14px]">{label}</span>
    </button>
  );
}

/** Track `#333` off / gold (or red, in the dev section) on, white thumb — as on mobile. */
export function ToggleSwitch({
  checked,
  onChange,
  label,
  danger = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
      style={{ background: checked ? (danger ? '#ef4444' : '#c9a84c') : danger ? '#2a3a5c' : '#333' }}
    >
      <span
        className="inline-block h-4 w-4 rounded-full transition-transform"
        style={{
          background: checked || !danger ? '#ffffff' : '#9aa0a6',
          transform: checked ? 'translateX(26px)' : 'translateX(4px)',
        }}
      />
    </button>
  );
}

/** Label + switch, with the explanatory hint underneath. */
export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  danger = false,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  danger?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-[14px]" style={{ color: '#e6eef8' }}>
          {label}
        </span>
        <ToggleSwitch checked={checked} onChange={onChange} label={label} danger={danger} />
      </div>
      {hint && (
        <p className="text-[12px] mt-1 leading-relaxed" style={{ color: '#9aa0a6' }}>
          {hint}
        </p>
      )}
    </div>
  );
}

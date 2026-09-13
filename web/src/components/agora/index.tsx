'use client';

// The Agora's components, ported from the design kit
// (.claude/skills/arete-design/components/agora). Academy idiom: navy,
// Playfair Display titles, 2px card radius, tracked gold kickers, no
// shadows, no avatars. Every value here traces to the kit's tokens.
import type { CSSProperties, ReactNode } from 'react';
import type { EssayStatus } from '@/lib/agora';

export const ag = {
  bg: '#0a1628',
  surface: '#0f1e38',
  card: '#111d30',
  border: '#1e3258',
  text: '#f5edd6',
  body: '#e8d9b0',
  muted: '#7a8fa6',
  faint: '#4a5a70',
  gold: '#c9a84c',
  gold13: 'rgba(201,168,76,0.13)',
  gold27: 'rgba(201,168,76,0.27)',
  gold53: 'rgba(201,168,76,0.53)',
  gold70: 'rgba(201,168,76,0.7)',
  quote: '#e8e0d0',
  serif: 'var(--font-serif-academy, "Playfair Display", Georgia, serif)',
  ui: 'var(--font-sans, Inter, system-ui, sans-serif)',
};

export function Kicker({ children, dim, style }: { children: ReactNode; dim?: boolean; style?: CSSProperties }) {
  return (
    <div style={{
      fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', fontWeight: 600,
      color: dim ? ag.gold53 : ag.gold70, fontFamily: ag.ui, ...style,
    }}>{children}</div>
  );
}

export function GoldRule({ width = 48, style }: { width?: number; style?: CSSProperties }) {
  return <div style={{ width, height: 1, background: ag.gold, margin: '18px 0 20px', ...style }} />;
}

export function AcademyButton({
  children, onClick, variant = 'solid', disabled, type = 'button', style,
}: {
  children: ReactNode; onClick?: () => void; variant?: 'solid' | 'outline'; disabled?: boolean;
  type?: 'button' | 'submit'; style?: CSSProperties;
}) {
  const solid = variant === 'solid';
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      padding: '12px 28px', fontSize: 12, fontWeight: 600, letterSpacing: '0.15em',
      textTransform: 'uppercase', fontFamily: ag.ui, borderRadius: 0, cursor: disabled ? 'default' : 'pointer',
      background: solid ? ag.gold : 'transparent', color: solid ? ag.bg : ag.gold,
      border: `1px solid ${ag.gold}`, opacity: disabled ? 0.5 : 1, ...style,
    }}>{children}</button>
  );
}

export function TextLink({ children, onClick, style }: { children: ReactNode; onClick?: () => void; style?: CSSProperties }) {
  return (
    <span onClick={onClick} style={{
      fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', color: ag.gold,
      cursor: 'pointer', fontFamily: ag.ui, ...style,
    }}>{children}</span>
  );
}

export function EssayIndexCard({
  kicker, title, author, meta, excerpt, tags = [], comments, onClick, style,
}: {
  kicker?: ReactNode; title: ReactNode; author: ReactNode; meta?: ReactNode; excerpt?: ReactNode;
  tags?: string[]; comments?: number; onClick?: () => void; style?: CSSProperties;
}) {
  return (
    <div onClick={onClick} style={{
      background: ag.card, border: `1px solid ${ag.border}`, borderRadius: 2, padding: 24,
      cursor: onClick ? 'pointer' : undefined, ...style,
    }}>
      {kicker && <Kicker style={{ marginBottom: 10 }}>{kicker}</Kicker>}
      <div style={{ fontFamily: ag.serif, fontSize: 22, color: ag.text, lineHeight: 1.25, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 12, color: ag.gold, letterSpacing: '0.3px', fontFamily: ag.ui }}>
        {author}{meta ? <span style={{ color: ag.muted }}> · {meta}</span> : null}
      </div>
      {excerpt && <div style={{ fontSize: 14, lineHeight: 1.6, color: ag.body, marginTop: 12, fontFamily: ag.ui }}>{excerpt}</div>}
      {(tags.length > 0 || comments !== undefined) && (
        <div style={{ display: 'flex', gap: 14, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          {tags.map(t => (
            <span key={t} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: ag.gold53, fontFamily: ag.ui }}>{t}</span>
          ))}
          {comments !== undefined && (
            <span style={{ marginLeft: 'auto', fontSize: 12, color: ag.muted, fontFamily: ag.ui }}>
              {comments === 1 ? '1 comment' : `${comments} comments`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function Comment({
  author, time, counselor, children, onRemove,
}: { author: ReactNode; time?: ReactNode; counselor?: boolean; children: ReactNode; onRemove?: () => void }) {
  return (
    <div style={{ paddingLeft: counselor ? 20 : 0, borderLeft: counselor ? `3px solid ${ag.gold}` : 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, gap: 12 }}>
        {counselor
          ? <Kicker style={{ letterSpacing: '0.8px', fontSize: 11 }}>{author}</Kicker>
          : <span style={{ fontSize: 13, fontWeight: 600, color: ag.gold, fontFamily: ag.ui }}>{author}</span>}
        <span style={{ fontSize: 11, color: ag.faint, fontFamily: ag.ui, whiteSpace: 'nowrap' }}>
          {time}
          {onRemove && <span onClick={onRemove} style={{ marginLeft: 12, cursor: 'pointer', color: ag.muted }}>Remove</span>}
        </span>
      </div>
      <div style={{
        fontSize: counselor ? 18 : 15, lineHeight: counselor ? 1.55 : 1.65,
        color: counselor ? ag.text : ag.body, fontStyle: counselor ? 'italic' : 'normal',
        fontFamily: counselor ? ag.serif : ag.ui, whiteSpace: 'pre-wrap',
      }}>{children}</div>
    </div>
  );
}

export const fieldStyle: CSSProperties = {
  width: '100%', background: ag.surface, border: `1px solid ${ag.border}`, borderRadius: 2,
  padding: '14px 16px', color: ag.text, fontFamily: ag.ui, fontSize: 15, outline: 'none',
  boxSizing: 'border-box',
};

export function CommentComposer({
  value, onChange, onSubmit, locked, onUnlock, busy, placeholder = 'Say the true thing plainly.',
}: {
  value: string; onChange: (v: string) => void; onSubmit: () => void; locked?: boolean;
  onUnlock?: () => void; busy?: boolean; placeholder?: string;
}) {
  if (locked) {
    return (
      <div onClick={onUnlock} style={{
        display: 'flex', gap: 12, alignItems: 'center', background: ag.card,
        border: `1px dashed ${ag.gold27}`, borderRadius: 2, padding: 16, cursor: 'pointer',
      }}>
        <span style={{ color: ag.gold, fontSize: 14 }}>🔒</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: ag.gold, fontFamily: ag.ui }}>Commenting is for subscribers</div>
          <div style={{ fontSize: 12, color: ag.muted, lineHeight: '17px', marginTop: 2, fontFamily: ag.ui }}>Reading the Agora is free. Writing in it is not.</div>
        </div>
        <span style={{ color: ag.muted }}>›</span>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} placeholder={placeholder}
        style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.6 }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <AcademyButton onClick={onSubmit} disabled={busy || !value.trim()}>{busy ? 'Posting' : 'Post'}</AcademyButton>
      </div>
    </div>
  );
}

const NOTICE_COPY: Record<EssayStatus, [string, string]> = {
  draft: ['Draft', 'Only you can see this. Nothing is sent until you submit it.'],
  in_review: ['In review', 'Submitted. An editor reads every essay before it appears in the Agora.'],
  published: ['Published', 'Live in the Agora. Comments are open to subscribers.'],
  returned: ['Returned', 'Sent back with notes. Edit and submit again whenever you are ready.'],
};

export function SubmissionNotice({ state, note, style }: { state: EssayStatus; note?: ReactNode; style?: CSSProperties }) {
  const [label, copy] = NOTICE_COPY[state];
  return (
    <div style={{
      background: ag.card, border: `1px solid ${state === 'published' ? ag.gold27 : ag.border}`,
      borderLeft: `3px solid ${ag.gold}`, borderRadius: 2, padding: 16, ...style,
    }}>
      <Kicker dim={state === 'draft'}>{label}</Kicker>
      <div style={{ fontSize: 14, lineHeight: '21px', color: ag.body, marginTop: 6, fontFamily: ag.ui, whiteSpace: 'pre-wrap' }}>{note || copy}</div>
    </div>
  );
}

export function TopicChip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <span onClick={onClick} style={{
      padding: '7px 14px', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
      border: `1px solid ${on ? ag.gold : ag.border}`, background: on ? ag.gold13 : 'transparent',
      color: on ? ag.gold : ag.muted, fontFamily: ag.ui, userSelect: 'none',
    }}>{label}</span>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 15, fontStyle: 'italic', color: ag.muted, fontFamily: ag.serif }}>{children}</div>;
}

export function PageTitle({ children }: { children: ReactNode }) {
  return (
    <h1 style={{ fontFamily: ag.serif, fontSize: 40, fontWeight: 400, color: ag.text, lineHeight: 1.15, margin: '10px 0 0' }}>
      {children}
    </h1>
  );
}

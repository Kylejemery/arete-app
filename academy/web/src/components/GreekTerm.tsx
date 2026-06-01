'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PHIL_701_LEXICON } from '@/data/lexicon';

interface GreekTermProps {
  entryId: string;
  displayText: string;
}

const DM_MONO = 'DM Mono, monospace';
const SERIF = "'Cormorant Garamond', Georgia, serif";
const PREVIEW_CHARS = 280;

export default function GreekTerm({ entryId, displayText }: GreekTermProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [triggerRect, setTriggerRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const entry = PHIL_701_LEXICON.find(e => e.id === entryId);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const t = setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', onDoc); };
  }, [open]);

  const handleToggle = () => {
    if (!open && triggerRef.current) {
      setTriggerRect(triggerRef.current.getBoundingClientRect());
      setExpanded(false);
    }
    setOpen(o => !o);
  };

  // Unknown id — still gold italic, no popover
  if (!entry) {
    return (
      <span style={{ color: '#C9A84C', fontStyle: 'italic' }}>{displayText}</span>
    );
  }

  const needsExpand = entry.stoicMeaning.length > PREVIEW_CHARS;

  // Compute fixed popover position from the trigger's viewport rect
  const popoverStyle: React.CSSProperties = (() => {
    if (!triggerRect) return { display: 'none' };
    const spaceBelow = triggerRect.bottom + 420 < window.innerHeight;
    const left = Math.min(triggerRect.left, window.innerWidth - 340);
    return {
      position: 'fixed' as const,
      zIndex: 50,
      width: 320,
      left: Math.max(8, left),
      ...(spaceBelow
        ? { top: triggerRect.bottom + 6 }
        : { bottom: window.innerHeight - triggerRect.top + 6 }),
    };
  })();

  const popover = (
    <div
      style={{
        ...popoverStyle,
        background: '#0A1628',
        border: '1px solid #C9A84C',
        borderRadius: 8,
        padding: '1rem 1.25rem',
        boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* 1. Greek script */}
      <div style={{ fontFamily: SERIF, fontSize: 24, color: '#C9A84C', marginBottom: 4, lineHeight: 1.2 }}>
        {entry.greek}
      </div>

      {/* 2. Transliteration · part of speech */}
      <div style={{ fontFamily: DM_MONO, fontSize: 12, color: '#6B7A99', marginBottom: 8 }}>
        {entry.transliteration}
        <span style={{ margin: '0 5px', color: '#3A4A66' }}>·</span>
        <span style={{ fontSize: 11 }}>{entry.partOfSpeech}</span>
      </div>

      {/* 3. Literal meaning */}
      <div style={{ fontSize: 13, fontStyle: 'italic', color: '#6B7A99', marginBottom: 10, lineHeight: 1.5 }}>
        {entry.literalMeaning}
      </div>

      {/* 4. Divider */}
      <div style={{ borderTop: '1px solid rgba(201,168,76,0.2)', margin: '0 0 10px' }} />

      {/* 5. Stoic meaning with read-more */}
      <div style={{ fontSize: 13, lineHeight: 1.7, color: '#C8D6E8', marginBottom: 10 }}>
        {needsExpand && !expanded
          ? entry.stoicMeaning.slice(0, PREVIEW_CHARS) + '…'
          : entry.stoicMeaning}
        {needsExpand && (
          <button
            onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
            style={{
              display: 'block', marginTop: 4,
              fontFamily: DM_MONO, fontSize: 11, color: '#C9A84C',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, letterSpacing: '0.05em',
            }}
          >
            {expanded ? 'Read less ▲' : 'Read more ▼'}
          </button>
        )}
      </div>

      {/* 6. Translation note */}
      <div style={{ marginBottom: entry.relatedTerms.length > 0 ? 10 : 0 }}>
        <div style={{
          fontFamily: DM_MONO, fontSize: 11, color: '#C9A84C',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4,
        }}>
          What English loses:
        </div>
        <div style={{ fontSize: 13, fontStyle: 'italic', color: '#6B7A99', lineHeight: 1.6 }}>
          {entry.translationNote}
        </div>
      </div>

      {/* 7. Related terms */}
      {entry.relatedTerms.length > 0 && (
        <div>
          <div style={{
            fontFamily: DM_MONO, fontSize: 11, color: '#6B7A99',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
          }}>
            Related:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {entry.relatedTerms.map(id => (
              <a
                key={id}
                href={`/dashboard/lexicon#${id}`}
                onClick={() => setOpen(false)}
                style={{
                  fontFamily: DM_MONO, fontSize: 11, color: '#C9A84C',
                  background: 'rgba(201,168,76,0.1)',
                  border: '1px solid rgba(201,168,76,0.3)',
                  borderRadius: 4, padding: '2px 7px',
                  textDecoration: 'none',
                }}
              >
                {id}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <span ref={triggerRef} style={{ display: 'inline', position: 'relative' }}>
      <span
        role="button"
        aria-expanded={open}
        aria-label={`${entry.transliteration} — Greek term`}
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggle(); } }}
        style={{
          borderBottom: '1px dotted #C9A84C',
          color: '#C9A84C',
          cursor: 'pointer',
          fontStyle: 'italic',
        }}
      >
        {displayText}
      </span>
      {open && triggerRect && typeof document !== 'undefined'
        && createPortal(popover, document.body)}
    </span>
  );
}

'use client';

// Reading view for course pages: a text size for the lesson column and a full
// page mode that hides the session list and the agent panel so the lesson
// fills the window. Both are per-reader conveniences kept in localStorage and
// shared by every course; Escape leaves full page.

import { useCallback, useEffect, useState } from 'react';

const KEY = 'academy-reading-view';
const SCALES = [1, 1.15, 1.3, 1.5, 1.75];

export interface ReadingView {
  fullPage: boolean;
  toggleFullPage: () => void;
  scaleIndex: number;
  setScaleIndex: (i: number) => void;
  // Applied to the lesson content wrapper. zoom scales every size inside it,
  // including the column's max width, so the line length stays the same.
  contentStyle: React.CSSProperties;
}

export function useReadingView(): ReadingView {
  const [fullPage, setFullPage] = useState(false);
  const [scaleIndex, setScaleIndexState] = useState(0);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (typeof saved.fullPage === 'boolean') setFullPage(saved.fullPage);
      if (typeof saved.scaleIndex === 'number') setScaleIndexState(Math.min(SCALES.length - 1, Math.max(0, saved.scaleIndex)));
    } catch {}
  }, []);

  const save = (next: { fullPage: boolean; scaleIndex: number }) => {
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  };

  const toggleFullPage = useCallback(() => {
    setFullPage(f => { save({ fullPage: !f, scaleIndex }); return !f; });
  }, [scaleIndex]);

  const setScaleIndex = useCallback((i: number) => {
    const clamped = Math.min(SCALES.length - 1, Math.max(0, i));
    setScaleIndexState(clamped);
    save({ fullPage, scaleIndex: clamped });
  }, [fullPage]);

  useEffect(() => {
    if (!fullPage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setFullPage(false); save({ fullPage: false, scaleIndex }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullPage, scaleIndex]);

  return { fullPage, toggleFullPage, scaleIndex, setScaleIndex, contentStyle: { zoom: SCALES[scaleIndex] } };
}

// The control bar: sits at the top of the lesson column and stays in view
// while the lesson scrolls.
export function ReadingControls({ view }: { view: ReadingView }) {
  const { fullPage, toggleFullPage, scaleIndex, setScaleIndex } = view;
  const btn = 'px-2 py-1 rounded border border-academy-border text-academy-muted hover:border-academy-gold hover:text-academy-text transition-colors disabled:opacity-40 disabled:hover:border-academy-border disabled:hover:text-academy-muted';
  return (
    <div className="sticky top-0 z-10 flex justify-end gap-1.5 px-4 py-2 bg-navy/90 backdrop-blur-sm text-xs">
      <button className={btn} onClick={() => setScaleIndex(scaleIndex - 1)} disabled={scaleIndex === 0} aria-label="Smaller text" title="Smaller text">A&minus;</button>
      <button className={btn} onClick={() => setScaleIndex(scaleIndex + 1)} disabled={scaleIndex === SCALES.length - 1} aria-label="Larger text" title="Larger text">A+</button>
      <button
        className={`${btn} ${fullPage ? 'border-academy-gold text-academy-gold' : ''}`}
        onClick={toggleFullPage}
        aria-pressed={fullPage}
        title={fullPage ? 'Exit full page (Esc)' : 'Full page: hide the session list and the agent panel'}
      >
        {fullPage ? '⤡ Exit full page' : '⤢ Full page'}
      </button>
    </div>
  );
}

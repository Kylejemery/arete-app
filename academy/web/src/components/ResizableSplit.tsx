'use client';

// A two-pane horizontal split with a divider the user drags to set the left
// pane's width. The width is remembered per storageKey, so the studio opens the
// way you left it. Double-click the divider to reset.
//
// Below the lg breakpoint the panes stack (no fixed width): a phone has no room
// to split. matchMedia is read after mount, so server and first client render
// agree (stacked) and there is no hydration mismatch.

import { useCallback, useEffect, useRef, useState } from 'react';

export function ResizableSplit({
  storageKey,
  initialLeft = 720,
  min = 360,
  asideMin = 300,
  aside,
  children,
}: {
  storageKey: string;
  initialLeft?: number;
  min?: number;
  asideMin?: number;
  aside: React.ReactNode;
  children: React.ReactNode;
}) {
  const [leftW, setLeftW] = useState(initialLeft);
  const leftRef = useRef(initialLeft);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [isWide, setIsWide] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsWide(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey);
      if (v) {
        const n = Number(v);
        if (!Number.isNaN(n)) {
          leftRef.current = n;
          setLeftW(n);
        }
      }
    } catch {}
  }, [storageKey]);

  const applyWidth = useCallback(
    (px: number) => {
      const c = containerRef.current;
      const hardMax = c ? Math.max(min, c.clientWidth - asideMin) : px;
      const w = Math.max(min, Math.min(hardMax, px));
      leftRef.current = w;
      setLeftW(w);
    },
    [min, asideMin]
  );

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const c = containerRef.current;
      if (!c) return;
      applyWidth(e.clientX - c.getBoundingClientRect().left);
    };
    const up = () => {
      setDragging(false);
      try {
        localStorage.setItem(storageKey, String(Math.round(leftRef.current)));
      } catch {}
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    const prevUS = document.body.style.userSelect;
    const prevCur = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.userSelect = prevUS;
      document.body.style.cursor = prevCur;
    };
  }, [dragging, applyWidth, storageKey]);

  const reset = () => {
    applyWidth(initialLeft);
    try {
      localStorage.setItem(storageKey, String(Math.round(leftRef.current)));
    } catch {}
  };

  // Stacked on small screens.
  if (!isWide) {
    return (
      <div className="space-y-6">
        <div className="min-w-0">{children}</div>
        <div className="min-w-0">{aside}</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex items-stretch">
      <div className="min-w-0" style={{ width: leftW, flex: '0 0 auto' }}>
        {children}
      </div>
      <div
        onPointerDown={e => {
          e.preventDefault();
          setDragging(true);
        }}
        onDoubleClick={reset}
        role="separator"
        aria-orientation="vertical"
        title="Drag to resize · double-click to reset"
        className="group flex-shrink-0 w-4 mx-1 cursor-col-resize flex items-center justify-center"
      >
        <div
          className={`w-0.5 h-full rounded transition-colors ${
            dragging ? 'bg-academy-gold' : 'bg-academy-border group-hover:bg-academy-gold/60'
          }`}
        />
      </div>
      <div className="min-w-0 flex-1">{aside}</div>
    </div>
  );
}

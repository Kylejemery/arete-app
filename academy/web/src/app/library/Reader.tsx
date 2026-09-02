'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type TouchEvent as ReactTouchEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { GOLD, IVORY, MONO, MUTED, SERIF, TEXT, foldText } from './theme';
import {
  ANCHOR_CHARS, HANDLE_RE, type LibComment, type Viewer,
  askCorpus, deleteComment, getViewer, loadComments, postComment, relativeTime, saveHandle, threadsFor,
} from './comments';

// ---------------------------------------------------------------------------
// The Reader: one open text in the Reading Room.
//   left   — the linked outline and search into the whole work
//   centre — the folio, in a scrolling column or a two-page book spread
//   right  — the corpus's "reads itself alongside", and the marginalia:
//            readers' notes on a paragraph, with replies.
// Every paragraph is addressable (?text=&page=&p=) so a note can be linked.
// ---------------------------------------------------------------------------

export type ReaderText = {
  author: string; work: string; title?: string; era: string; translator: string | null;
  sourceUrl: string | null; page: number; totalPages: number; totalPassages: number; body: string;
};
export type ReaderRelated = { id: string; author: string; work: string; title: string; reason: string };
export type ReaderTarget = { page: number; para?: number; comment?: string } | null;

type OutlineEntry = { level?: number; label: string; page: number; key?: string; marker?: string };
type SearchHit = { page: number; snippet: string; section: string | null };
type Jump = { page: number; para?: number; marker?: string; query?: string; snippet?: string; select?: boolean; comment?: string };
type View = 'scroll' | 'book';

const isHeading = (p: string) =>
  p.length <= 72 && (!/[a-z]/.test(p) || /^(Chapter|Book|Letter|Part|Section)\s+[IVXLCDM0-9]+\.?$/.test(p));

const VIEW_KEY = 'lib-reader-view';

// A drop cap opens a chapter: the first prose paragraph after a heading, or
// the very first paragraph of the work. Never a folio's first paragraph when
// it merely continues a sentence from the previous folio.
const dropCap = (paras: string[], i: number, page: number) => {
  const p = paras[i];
  if (!p || isHeading(p) || !/^[“"']?[A-Z]/.test(p)) return false;
  if (i === 0) return page === 0;
  return isHeading(paras[i - 1]);
};

export default function Reader(props: {
  active: { author: string; work: string; title: string };
  reader: ReaderText | null;
  readerLoading: boolean;
  related: ReaderRelated[];
  openWork: (a: string, w: string, t: string) => void;
  gotoPage: (n: number) => void;
  closeText: () => void;
  goSymposium: () => void;
  target: ReaderTarget;
  clearTarget: () => void;
}) {
  const { active, reader, readerLoading, related, openWork, gotoPage, closeText, goSymposium, target, clearTarget } = props;
  const title = reader?.title || active.title;
  const page = reader?.page ?? 0;

  const paras = useMemo(() => (reader ? reader.body.split(/\n\n+/).filter(Boolean) : []), [reader]);

  // ---- view ----
  const [view, setView] = useState<View>('scroll');
  useEffect(() => {
    try { const v = localStorage.getItem(VIEW_KEY); if (v === 'book' || v === 'scroll') setView(v); } catch { /* no storage */ }
  }, []);
  const chooseView = (v: View) => { setView(v); try { localStorage.setItem(VIEW_KEY, v); } catch { /* no storage */ } };

  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  // Book view pages sideways through the folio, two columns to a spread.
  const bookRef = useRef<HTMLDivElement | null>(null);
  const [spread, setSpread] = useState(0);
  const [spreadCount, setSpreadCount] = useState(1);
  const measureSpreads = useCallback(() => {
    const box = bookRef.current;
    if (!box) return;
    const cs = getComputedStyle(box);
    const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const gap = parseFloat(cs.columnGap) || 0;
    setSpreadCount(Math.max(1, Math.round((box.scrollWidth - pad + gap) / spreadStep(box))));
  }, []);
  useEffect(() => {
    measureSpreads();
    window.addEventListener('resize', measureSpreads);
    return () => window.removeEventListener('resize', measureSpreads);
  }, [measureSpreads, reader, view]);
  const showSpread = useCallback((n: number) => {
    const box = bookRef.current;
    if (!box) return;
    box.scrollLeft = n * spreadStep(box);
    setSpread(n);
  }, []);

  // ---- outline ----
  const [outline, setOutline] = useState<OutlineEntry[]>([]);
  const [outlineLoading, setOutlineLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setOutline([]); setOutlineLoading(true);
    fetch(`/api/library/outline?author=${encodeURIComponent(active.author)}&work=${encodeURIComponent(active.work)}`)
      .then(r => r.ok ? r.json() : { sections: [] })
      .then(d => { if (!cancelled) setOutline(d.sections || []); })
      .catch(() => { /* outline stays empty */ })
      .finally(() => { if (!cancelled) setOutlineLoading(false); });
    return () => { cancelled = true; };
  }, [active.author, active.work]);

  // ---- search into the whole work ----
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) { setHits(null); setSearching(false); return; }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(() => {
      fetch(`/api/library/search?q=${encodeURIComponent(q)}&author=${encodeURIComponent(active.author)}&work=${encodeURIComponent(active.work)}`)
        .then(r => r.ok ? r.json() : { results: [] })
        .then(d => { if (!cancelled) setHits(d.results || []); })
        .catch(() => { if (!cancelled) setHits([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, active.author, active.work]);

  // Matches on the open folio, for the "n on this folio" count and <mark>s.
  const foldedQuery = foldText(query.trim());
  const localMatches = useMemo(() => {
    if (foldedQuery.length < 2) return [] as number[];
    return paras.map((p, i) => (foldText(p).includes(foldedQuery) ? i : -1)).filter(i => i >= 0);
  }, [paras, foldedQuery]);

  // ---- jumping to a paragraph (after a page loads) ----
  const columnRef = useRef<HTMLDivElement | null>(null);
  const [flashPara, setFlashPara] = useState<number | null>(null);
  const [selectedPara, setSelectedPara] = useState<number | null>(null);
  const [pendingJump, setPendingJump] = useState<Jump | null>(null);
  // Words the reader has selected inside a paragraph, offered as a quote.
  const [selection, setSelection] = useState<{ para: number; text: string; x: number; y: number } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const turnTo = useCallback((n: number) => {
    setSelectedPara(null);
    setSelection(null);
    gotoPage(n);
  }, [gotoPage]);

  const scrollToPara = useCallback((i: number) => {
    // Instant, container-relative: scrollIntoView's smooth mode is unreliable
    // over long distances in some embedded browsers, and the book view's
    // columns need the inner text box scrolled, not the stage.
    const go = () => {
      const el = columnRef.current?.querySelector<HTMLElement>(`[data-para="${i}"]`);
      if (!el) return;
      let box: HTMLElement | null = el.parentElement;
      while (box && box !== columnRef.current && getComputedStyle(box).overflowY !== 'auto') box = box.parentElement;
      const scroller = box || columnRef.current;
      if (!scroller) return;
      if (scroller.classList.contains('lib-book-text')) {
        // the book pages sideways: land on the spread that holds the paragraph
        const step = spreadStep(scroller);
        const left = el.getBoundingClientRect().left - scroller.getBoundingClientRect().left + scroller.scrollLeft;
        scroller.scrollLeft = Math.floor(left / step) * step;
        setSpread(Math.floor(left / step));
        return;
      }
      const elTop = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      scroller.scrollTop = Math.max(0, elTop - scroller.clientHeight / 2 + el.offsetHeight / 2);
    };
    go();
    // fonts and images can still be settling on a fresh folio; land twice
    setTimeout(go, 350);
    setFlashPara(i);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashPara(null), 2400);
  }, []);

  // Find the paragraph a jump means, on the folio now open.
  const resolvePara = useCallback((j: Jump): number | null => {
    if (typeof j.para === 'number') return j.para < paras.length ? j.para : null;
    if (j.marker) {
      const m = foldText(j.marker).replace(/\.$/, '');
      const i = paras.findIndex(p => { const f = foldText(p).replace(/\.$/, ''); return f === m || f.startsWith(m + ' ') || f.startsWith(m + '.'); });
      if (i >= 0) return i;
    }
    if (j.query) {
      const q = foldText(j.query);
      const cands = paras.map((p, i) => (foldText(p).includes(q) ? i : -1)).filter(i => i >= 0);
      if (cands.length === 1 || !j.snippet) return cands[0] ?? null;
      // Several paragraphs carry the words; pick the one the snippet came from.
      const snip = foldText(j.snippet);
      const windows: string[] = [];
      for (let k = 0; k + 14 <= snip.length; k += 7) windows.push(snip.slice(k, k + 14));
      let best = cands[0], bestScore = -1;
      for (const i of cands) {
        const f = foldText(paras[i]);
        const score = windows.filter(w => f.includes(w)).length;
        if (score > bestScore) { best = i; bestScore = score; }
      }
      return best;
    }
    return null;
  }, [paras]);

  const jumpTo = useCallback((j: Jump) => {
    if (reader && !readerLoading && reader.page === j.page) {
      const i = resolvePara(j);
      if (i !== null) { scrollToPara(i); if (j.select) { setSelectedPara(i); setRightOpen(true); } }
      else if (j.page !== page) turnTo(j.page);
      return;
    }
    setPendingJump(j);
    turnTo(j.page);
  }, [reader, readerLoading, resolvePara, scrollToPara, turnTo, page]);

  useEffect(() => {
    if (!pendingJump || pendingJump.comment || !reader || readerLoading || reader.page !== pendingJump.page) return;
    const j = pendingJump;
    setPendingJump(null);
    const i = resolvePara(j);
    if (i !== null) {
      // let the new folio paint before scrolling
      requestAnimationFrame(() => {
        scrollToPara(i);
        if (j.select) { setSelectedPara(i); setRightOpen(true); }
      });
    }
  }, [pendingJump, reader, readerLoading, resolvePara, scrollToPara]);

  // A deep link (?page=&p= or &c=) arrives from the page shell as a target.
  useEffect(() => {
    if (!target) return;
    if (reader && !readerLoading) {
      if (typeof target.para === 'number') jumpTo({ page: target.page, para: target.para, select: true });
      else if (target.comment) setPendingJump({ page: target.page, comment: target.comment, select: true });
      clearTarget();
    }
  }, [target, reader, readerLoading, jumpTo, clearTarget]);

  // Turning a folio drops the selection; a jump that wants one re-selects
  // after the new folio loads. Opening another work resets too.
  useEffect(() => { setSelectedPara(null); setSelection(null); }, [active.author, active.work]);

  // Keep the address bar pointing at what is open, so the URL is a citation.
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('text', `${active.author}::${active.work}`);
    params.set('page', String(page));
    if (selectedPara !== null) params.set('p', String(selectedPara));
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [active.author, active.work, page, selectedPara]);

  const linkFor = useCallback((i: number | null) => {
    const params = new URLSearchParams();
    params.set('text', `${active.author}::${active.work}`);
    params.set('page', String(page));
    if (i !== null) params.set('p', String(i));
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }, [active.author, active.work, page]);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const say = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };
  const copyLink = async (i: number | null) => {
    try { await navigator.clipboard.writeText(linkFor(i)); say(i === null ? 'Link to this folio copied' : `Link to ¶ ${i + 1} copied`); }
    catch { say('Could not copy the link'); }
  };

  // ---- marginalia ----
  const [comments, setComments] = useState<LibComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [viewerChecked, setViewerChecked] = useState(false);
  useEffect(() => {
    let cancelled = false;
    getViewer().then(v => { if (!cancelled) { setViewer(v); setViewerChecked(true); } })
      .catch(() => { if (!cancelled) setViewerChecked(true); });
    return () => { cancelled = true; };
  }, []);

  const reloadComments = useCallback(async () => {
    setCommentsLoading(true);
    try { setComments(await loadComments(active.author, active.work, page)); }
    catch { /* notes stay as they were */ }
    finally { setCommentsLoading(false); }
  }, [active.author, active.work, page]);
  useEffect(() => { setComments([]); reloadComments(); }, [reloadComments]);

  // A note is seated on its paragraph index, verified against the opening
  // words it was written on; if the page was re-paragraphed, find those words.
  const seatedComments = useMemo(() => {
    if (!paras.length) return comments;
    const starts = paras.map(p => foldText(p.slice(0, ANCHOR_CHARS)));
    return comments.map(c => {
      const a = foldText(c.anchor_text || '');
      if (!a) return c;
      const here = starts[c.para_index];
      if (here && (here.startsWith(a.slice(0, 40)) || a.startsWith(here.slice(0, 40)))) return c;
      const moved = starts.findIndex(s => s.startsWith(a.slice(0, 40)));
      return moved >= 0 ? { ...c, para_index: moved } : c;
    });
  }, [comments, paras]);

  const countsByPara = useMemo(() => {
    const m = new Map<number, number>();
    for (const c of seatedComments) m.set(c.para_index, (m.get(c.para_index) || 0) + 1);
    return m;
  }, [seatedComments]);

  // A deep link to one note: seat it once the notes for its folio are here.
  useEffect(() => {
    if (!pendingJump?.comment || commentsLoading || !reader || readerLoading || reader.page !== pendingJump.page) return;
    const c = seatedComments.find(x => x.id === pendingJump.comment);
    setPendingJump(null);
    if (c) requestAnimationFrame(() => { scrollToPara(c.para_index); setSelectedPara(c.para_index); setRightOpen(true); });
  }, [pendingJump, commentsLoading, seatedComments, reader, readerLoading, scrollToPara]);

  // Selecting words inside a paragraph offers to note that passage.
  const [composerQuote, setComposerQuote] = useState<string | null>(null);
  const onTextMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) { setSelection(null); return; }
    const text = sel.toString().replace(/\s+/g, ' ').trim();
    if (text.length < 3) { setSelection(null); return; }
    const node = sel.anchorNode;
    const el = (node instanceof Element ? node : node?.parentElement)?.closest<HTMLElement>('[data-para]');
    if (!el) { setSelection(null); return; }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    setSelection({ para: Number(el.dataset.para), text: text.slice(0, 600), x: rect.left + rect.width / 2, y: rect.top });
  };
  useEffect(() => {
    const clear = () => setSelection(null);
    window.addEventListener('scroll', clear, true);
    return () => window.removeEventListener('scroll', clear, true);
  }, []);

  const openThread = (i: number, quote: string | null = null) => {
    setSelectedPara(i);
    setComposerQuote(quote);
    setRightOpen(true);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const prevDisabled = !reader || reader.page <= 0 || readerLoading;
  const nextDisabled = !reader || reader.page >= reader.totalPages - 1 || readerLoading;

  // In the book, the arrows move a spread at a time and turn the folio at
  // either edge; a fresh folio opens on its first spread.
  useEffect(() => { setSpread(0); if (bookRef.current) bookRef.current.scrollLeft = 0; }, [page, view, active.author, active.work]);
  const bookPrev = () => { if (spread > 0) showSpread(spread - 1); else if (!prevDisabled) turnTo(page - 1); };
  const bookNext = () => { if (spread < spreadCount - 1) showSpread(spread + 1); else if (!nextDisabled) turnTo(page + 1); };
  const bookPrevDisabled = spread <= 0 && prevDisabled;
  const bookNextDisabled = spread >= spreadCount - 1 && nextDisabled;

  // The wheel, a trackpad, or a swipe turns the page too: one spread per
  // gesture, with a short lock so a trackpad's stream of deltas is one turn.
  const wheelLock = useRef(0);
  const onBookWheel = (e: ReactWheelEvent) => {
    const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(d) < 8) return;
    const now = Date.now();
    if (now - wheelLock.current < 500) return;
    wheelLock.current = now;
    if (d > 0) bookNext(); else bookPrev();
  };
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onBookTouchStart = (e: ReactTouchEvent) => { const t = e.touches[0]; touchStart.current = { x: t.clientX, y: t.clientY }; };
  const onBookTouchEnd = (e: ReactTouchEvent) => {
    const s = touchStart.current; touchStart.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x, dy = t.clientY - s.y;
    const d = Math.abs(dx) >= Math.abs(dy) ? dx : dy;   // left or up → next
    if (Math.abs(d) < 40) return;
    if (d < 0) bookNext(); else bookPrev();
  };

  // Arrow keys turn pages when the reader is not typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); if (view === 'book') bookNext(); else if (!nextDisabled) turnTo(page + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); if (view === 'book') bookPrev(); else if (!prevDisabled) turnTo(page - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const currentOutlineIdx = useMemo(() => {
    // the last entry whose page is at or before this folio
    let idx = -1;
    outline.forEach((e, i) => { if (e.page <= page) idx = i; });
    return idx;
  }, [outline, page]);

  const outlineRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = outlineRef.current?.querySelector<HTMLElement>('.lib-outline-item.is-here');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [currentOutlineIdx, outlineLoading]);

  const isBook = view === 'book';

  return (
    <main className={`lib-reader ${isBook ? 'is-book' : ''}`} style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <style>{READER_CSS}</style>

      {/* toolbar */}
      <div className="lib-reader-bar">
        <button onClick={closeText} className="lib-back" style={{ cursor: 'pointer', fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: MUTED }}>← Shelves</button>
        <button className="lib-bar-btn lib-only-narrow" onClick={() => setLeftOpen(true)}>☰ Contents</button>
        <div className="lib-bar-title">
          <span style={{ fontFamily: SERIF, fontSize: 16, color: IVORY }}>{title}</span>
          <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: GOLD, marginLeft: 8 }}>{active.author}</span>
        </div>
        <div className="lib-bar-right">
          <div className="lib-view-toggle" role="group" aria-label="Reading view">
            <button className={view === 'scroll' ? 'is-on' : ''} onClick={() => chooseView('scroll')}>Scroll</button>
            <button className={view === 'book' ? 'is-on' : ''} onClick={() => chooseView('book')}>Book</button>
          </div>
          <button className="lib-bar-btn lib-only-narrow" onClick={() => setRightOpen(true)}>
            ✎ Notes{seatedComments.length ? ` · ${seatedComments.length}` : ''}
          </button>
        </div>
      </div>

      <div className="lib-reader-body">
        {(leftOpen || rightOpen) && <div className="lib-reader-scrim" onClick={() => { setLeftOpen(false); setRightOpen(false); }} />}

        {/* ---------------- left: outline + search ---------------- */}
        <aside className={`lib-reader-left ${leftOpen ? 'open' : ''}`}>
          <div className="lib-panel-head">
            <span>Contents</span>
            <button className="lib-x lib-only-narrow" onClick={() => setLeftOpen(false)} aria-label="Close contents">×</button>
          </div>
          <div style={{ padding: '0 14px 10px' }}>
            <div style={{ position: 'relative' }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') setQuery(''); if (e.key === 'Enter' && hits && hits[0]) jumpTo({ page: hits[0].page, query: query.trim(), snippet: hits[0].snippet }); }}
                placeholder="Search this text…"
                aria-label="Search this text"
                className="lib-search-input"
              />
              {query && <button onClick={() => setQuery('')} aria-label="Clear search" className="lib-search-clear">×</button>}
            </div>
            {query.trim().length >= 2 && (
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color: MUTED, marginTop: 6, textTransform: 'uppercase' }}>
                {localMatches.length > 0 ? `${localMatches.length} on this folio` : 'none on this folio'}
                {localMatches.length > 0 && (
                  <button className="lib-inline-link" onClick={() => scrollToPara(localMatches[0])}>· first ↓</button>
                )}
              </div>
            )}
          </div>

          <div className="lib-panel-scroll" ref={outlineRef}>
            {hits !== null && (
              <div className="lib-hits">
                <div className="lib-subhead">{searching ? 'Searching the whole text…' : hits.length ? `${hits.length}${hits.length >= 20 ? '+' : ''} passages` : 'No passages match'}</div>
                {hits.map((h, i) => (
                  <button key={i} className="lib-hit" onClick={() => { jumpTo({ page: h.page, query: query.trim(), snippet: h.snippet }); setLeftOpen(false); }}>
                    <div className="lib-hit-meta">Folio {h.page + 1}{h.section ? ` · ${h.section}` : ''}</div>
                    <div className="lib-hit-snip">…{highlightText(h.snippet, foldedQuery)}…</div>
                  </button>
                ))}
                <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, color: MUTED, padding: '8px 14px 12px' }}>
                  Click a passage to go to it; then mark the paragraph to leave a note.
                </div>
              </div>
            )}

            {hits === null && (
              <div className="lib-outline">
                {outlineLoading && <div className="lib-subhead">Reading the spine…</div>}
                {!outlineLoading && outline.length === 0 && (
                  <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: MUTED, padding: '4px 14px' }}>
                    This text carries no section markers. Move by folio below.
                  </div>
                )}
                {outline.map((e, i) => (
                  <button
                    key={e.key || i}
                    className={`lib-outline-item lvl${e.level || 1} ${i === currentOutlineIdx ? 'is-here' : ''} ${e.page === page ? 'on-page' : ''}`}
                    onClick={() => { jumpTo({ page: e.page, marker: e.marker }); setLeftOpen(false); }}
                    title={`Folio ${e.page + 1}`}
                  >
                    <span className="lib-outline-label">{e.label}</span>
                    <span className="lib-outline-page">{e.page + 1}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {reader && reader.totalPages > 1 && (
            <div className="lib-folio-nav">
              <button disabled={prevDisabled} onClick={() => turnTo(page - 1)}>←</button>
              <span>Folio {page + 1} of {reader.totalPages}</span>
              <button disabled={nextDisabled} onClick={() => turnTo(page + 1)}>→</button>
            </div>
          )}
        </aside>

        {/* ---------------- centre: the text ---------------- */}
        <div className="lib-reader-centre" ref={columnRef}>
          {!isBook && (
            <div className="lib-scroll-page">
              <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD, marginBottom: 12 }}>
                {reader?.era || active.author}
              </div>
              <h1 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 'clamp(30px,4vw,46px)', lineHeight: 1.04, color: IVORY, margin: '0 0 8px' }}>{title}</h1>
              <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, color: GOLD, marginBottom: 6 }}>{active.author}</div>
              {reader?.translator && <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, marginBottom: 8, letterSpacing: '0.06em' }}>trans. {reader.translator}</div>}
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color: MUTED, textTransform: 'uppercase', marginBottom: 26 }}>
                {reader && <span>Folio {page + 1} of {reader.totalPages}</span>}
                <button className="lib-inline-link" onClick={() => copyLink(null)}>copy link</button>
                {reader?.sourceUrl && <a href={reader.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: MUTED, textDecoration: 'underline' }}>source edition ↗</a>}
              </div>

              <div className="lib-text" onMouseUp={onTextMouseUp} style={{ borderTop: '1px solid rgba(201,168,76,0.2)', paddingTop: 30 }}>
                {readerLoading && <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, color: MUTED }}>Pulling the text from the shelf…</p>}
                {!readerLoading && reader && paras.map((p, i) => (
                  <Paragraph key={i} i={i} text={p} q={foldedQuery} count={countsByPara.get(i) || 0}
                    selected={selectedPara === i} flash={flashPara === i} onNote={() => openThread(i)} onLink={() => copyLink(i)} />
                ))}
                {!readerLoading && !reader && <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, color: MUTED }}>This text could not be opened just now.</p>}
              </div>

              {reader && reader.totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 34, paddingTop: 20, borderTop: '1px solid rgba(201,168,76,0.16)' }}>
                  <button disabled={prevDisabled} onClick={() => turnTo(page - 1)} className="lib-page-btn" style={pageBtn(prevDisabled)}>← Previous</button>
                  <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.12em', color: MUTED }}>Folio {page + 1} of {reader.totalPages}</span>
                  <button disabled={nextDisabled} onClick={() => turnTo(page + 1)} className="lib-page-btn" style={pageBtn(nextDisabled)}>Next →</button>
                </div>
              )}
            </div>
          )}

          {isBook && (
            <div className="lib-book-stage">
              <button className="lib-book-turn left" disabled={bookPrevDisabled} onClick={bookPrev} aria-label="Previous page">‹</button>
              <div className="lib-book">
                <div className="lib-book-head">
                  <span>{active.author}</span>
                  <span>{title}</span>
                </div>
                <div className="lib-book-text lib-text" ref={bookRef} onMouseUp={onTextMouseUp}
                  onWheel={onBookWheel} onTouchStart={onBookTouchStart} onTouchEnd={onBookTouchEnd}>
                  {readerLoading && <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 17 }}>Turning the page…</p>}
                  {!readerLoading && reader && paras.map((p, i) => (
                    <Paragraph key={i} i={i} text={p} q={foldedQuery} count={countsByPara.get(i) || 0} book drop={dropCap(paras, i, page)}
                      selected={selectedPara === i} flash={flashPara === i} onNote={() => openThread(i)} onLink={() => copyLink(i)} />
                  ))}
                  {!readerLoading && !reader && <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 17 }}>This text could not be opened just now.</p>}
                </div>
                <div className="lib-book-foot">
                  {reader?.translator ? <span>trans. {reader.translator}</span> : <span />}
                  <span>{reader ? `folio ${page + 1} of ${reader.totalPages}${spreadCount > 1 ? ` · page ${spread + 1} of ${spreadCount}` : ''} · scroll or swipe to turn` : ''}</span>
                  <span>{reader?.era || ''}</span>
                </div>
              </div>
              <button className="lib-book-turn right" disabled={bookNextDisabled} onClick={bookNext} aria-label="Next page">›</button>
            </div>
          )}
        </div>

        {/* ---------------- right: alongside + marginalia ---------------- */}
        <aside className={`lib-reader-right ${rightOpen ? 'open' : ''}`}>
          <div className="lib-panel-head">
            <span>{selectedPara !== null ? `Notes on ¶ ${selectedPara + 1}` : 'Marginalia'}</span>
            <span style={{ display: 'flex', gap: 6 }}>
              {selectedPara !== null && <button className="lib-x" onClick={() => { setSelectedPara(null); setComposerQuote(null); }} aria-label="Back to all notes" title="All notes on this folio">‹</button>}
              <button className="lib-x lib-only-narrow" onClick={() => setRightOpen(false)} aria-label="Close notes">×</button>
            </span>
          </div>

          <div className="lib-panel-scroll" style={{ padding: '0 16px 16px' }}>
            {selectedPara !== null ? (
              <ThreadPanel
                paraIndex={selectedPara}
                paraText={paras[selectedPara] || ''}
                quote={composerQuote}
                clearQuote={() => setComposerQuote(null)}
                comments={seatedComments}
                viewer={viewer}
                viewerChecked={viewerChecked}
                setViewer={setViewer}
                signInHref={typeof window === 'undefined' ? '/login' : `/login?redirectTo=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`}
                onPost={async (body, parentId) => {
                  if (!viewer?.handle) return;
                  await postComment({
                    author: active.author, work: active.work, page, paraIndex: selectedPara,
                    anchorText: (paras[selectedPara] || '').slice(0, ANCHOR_CHARS),
                    quote: parentId ? null : composerQuote, parentId,
                    userId: viewer.userId, handle: viewer.handle, body,
                  });
                  setComposerQuote(null);
                  await reloadComments();
                }}
                onDelete={async id => { await deleteComment(id); await reloadComments(); }}
                onAskCorpus={async () => {
                  const r = await askCorpus({
                    author: active.author, work: active.work, page, paraIndex: selectedPara,
                    anchorText: (paras[selectedPara] || '').slice(0, ANCHOR_CHARS),
                    passage: paras[selectedPara] || '', quote: composerQuote, parentId: null,
                  });
                  setComposerQuote(null);
                  await reloadComments();
                  if (r.existing) say('The corpus already wrote here');
                }}
                onCopyLink={() => copyLink(selectedPara)}
              />
            ) : (
              <>
                <div style={{ marginTop: 14 }}>
                  <div className="lib-subhead" style={{ padding: 0, marginBottom: 6 }}>On this folio</div>
                  {commentsLoading && seatedComments.length === 0 && <p className="lib-quiet">Looking for notes…</p>}
                  {!commentsLoading && seatedComments.length === 0 && (
                    <p className="lib-quiet">No one has written in the margin of this folio yet. Mark any paragraph, or select a passage that strikes you, and say why.</p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {seatedComments.filter(c => !c.parent_id).map(c => (
                      <button key={c.id} className="lib-note-card" onClick={() => { setSelectedPara(c.para_index); scrollToPara(c.para_index); }}>
                        <div className="lib-note-meta"><span>¶ {c.para_index + 1}</span><span>{c.handle} · {relativeTime(c.created_at)}</span></div>
                        {c.quote && <div className="lib-note-quote">“{c.quote.length > 120 ? c.quote.slice(0, 120) + '…' : c.quote}”</div>}
                        <div className="lib-note-body">{c.body.length > 160 ? c.body.slice(0, 160) + '…' : c.body}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 26, paddingTop: 18, borderTop: '1px solid rgba(201,168,76,0.16)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD, animation: 'lib-pulse-dot 3s ease-in-out infinite' }} />
                    <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD }}>Reads itself alongside</span>
                  </div>
                  <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: MUTED, margin: '0 0 14px', lineHeight: 1.4 }}>Because you opened this, the corpus surfaces these.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {related.length === 0 && <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: MUTED }}>Listening for echoes…</p>}
                    {related.map(r => (
                      <button key={r.id} onClick={() => openWork(r.author, r.work, r.title)} className="lib-related" style={{ textAlign: 'left', background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: 11, padding: '12px 14px', cursor: 'pointer' }}>
                        <div style={{ fontFamily: SERIF, fontSize: 16.5, color: IVORY, lineHeight: 1.15, marginBottom: 3 }}>{r.title}</div>
                        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13.5, color: GOLD }}>{r.author}</div>
                        <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.06em', color: MUTED, marginTop: 6 }}>{r.reason}</div>
                      </button>
                    ))}
                  </div>
                  <button onClick={goSymposium} className="lib-discuss" style={{ width: '100%', marginTop: 16, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 11, padding: 11, cursor: 'pointer', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD }}>Discuss this in the Symposium →</button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* selection popover */}
      {selection && (
        <div className="lib-sel-pop" style={{ left: selection.x, top: selection.y }}>
          <button onClick={() => openThread(selection.para, selection.text)}>✎ Note this passage</button>
        </div>
      )}

      {toast && <div className="lib-toast">{toast}</div>}
    </main>
  );
}

// One spread of the book is the text box's width plus the column gap, so
// the next spread's first column lands exactly at the left edge.
function spreadStep(box: HTMLElement): number {
  const cs = getComputedStyle(box);
  const gap = parseFloat(cs.columnGap) || 0;
  const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  // columns are laid across the content box; each spread is one content
  // width plus one gap, whatever the column count
  return Math.max(1, box.clientWidth - pad + gap);
}

function pageBtn(disabled: boolean): CSSProperties {
  return { cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.3 : 1, fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD, border: '1px solid rgba(201,168,76,0.3)', borderRadius: 10, padding: '9px 16px', background: 'rgba(201,168,76,0.06)' };
}

// Wrap each occurrence of the folded query in <mark>, matching on folded
// text so accents and case never hide a hit.
function highlightText(text: string, q: string): ReactNode {
  if (!q || q.length < 2) return text;
  const folded = foldText(text);
  if (folded.length !== text.length) return text; // folding changed lengths; skip marking
  const out: ReactNode[] = [];
  let at = 0, k = 0;
  for (;;) {
    const i = folded.indexOf(q, at);
    if (i < 0) break;
    if (i > at) out.push(text.slice(at, i));
    out.push(<mark key={k++}>{text.slice(i, i + q.length)}</mark>);
    at = i + q.length;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}

function Paragraph(props: {
  i: number; text: string; q: string; count: number; selected: boolean; flash: boolean; book?: boolean; drop?: boolean;
  onNote: () => void; onLink: () => void;
}) {
  const { i, text, q, count, selected, flash, book, drop, onNote, onLink } = props;
  const heading = isHeading(text);
  const cls = `lib-para ${selected ? 'is-selected' : ''} ${flash ? 'is-flash' : ''} ${heading ? 'is-heading' : ''} ${count ? 'has-notes' : ''} ${drop ? 'has-drop' : ''}`;
  if (heading) {
    return (
      <div className={cls} data-para={i}>
        <div className="lib-heading">{highlightText(text, q)}</div>
      </div>
    );
  }
  return (
    <div className={cls} data-para={i}>
      <span className="lib-para-gutter">
        <button className="lib-para-num" onClick={onLink} title="Copy a link to this paragraph">{i + 1}</button>
        <button className="lib-para-note" onClick={onNote} title={count ? `${count} note${count === 1 ? '' : 's'} · open` : 'Leave a note on this paragraph'}>
          {count ? `✎ ${count}` : '+'}
        </button>
      </span>
      <p className={book ? 'lib-book-p' : 'lib-scroll-p'}>{highlightText(text, q)}</p>
    </div>
  );
}

function ThreadPanel(props: {
  paraIndex: number; paraText: string; quote: string | null; clearQuote: () => void;
  comments: LibComment[]; viewer: Viewer | null; viewerChecked: boolean; setViewer: (v: Viewer) => void;
  signInHref: string;
  onPost: (body: string, parentId: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAskCorpus: () => Promise<void>;
  onCopyLink: () => void;
}) {
  const { paraIndex, paraText, quote, clearQuote, comments, viewer, viewerChecked, setViewer, signInHref, onPost, onDelete, onAskCorpus, onCopyLink } = props;
  const threads = useMemo(() => threadsFor(comments, paraIndex), [comments, paraIndex]);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [asking, setAsking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [handleDraft, setHandleDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => { setDraft(''); setReplyTo(null); setReplyDraft(''); setErr(null); setConfirmDelete(null); }, [paraIndex]);

  const ask = async () => {
    if (asking) return;
    setAsking(true); setErr(null);
    try { await onAskCorpus(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'The corpus is silent just now.'); }
    finally { setAsking(false); }
  };
  const canDelete = (c: LibComment) => !!viewer && (c.user_id === viewer.userId || (c.is_corpus && c.requested_by === viewer.userId));

  const submit = async (body: string, parentId: string | null) => {
    const b = body.trim();
    if (!b || posting) return;
    setPosting(true); setErr(null);
    try {
      await onPost(b, parentId);
      if (parentId) { setReplyDraft(''); setReplyTo(null); } else setDraft('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save your note.');
    } finally { setPosting(false); }
  };

  const chooseHandle = async () => {
    const h = handleDraft.trim();
    if (!viewer) return;
    if (!HANDLE_RE.test(h)) { setErr('A handle is 3–20 letters, numbers, or underscores.'); return; }
    setPosting(true); setErr(null);
    try { await saveHandle(viewer.userId, h); setViewer({ ...viewer, handle: h }); }
    catch { setErr('That handle could not be saved. It may already be taken.'); }
    finally { setPosting(false); }
  };

  const excerpt = paraText.length > 220 ? paraText.slice(0, 220).replace(/\s+\S*$/, '') + '…' : paraText;

  return (
    <div style={{ marginTop: 14 }}>
      <div className="lib-thread-passage">
        <div className="lib-note-meta"><span>The passage</span><button className="lib-inline-link" onClick={onCopyLink}>copy link</button></div>
        <div style={{ fontFamily: SERIF, fontSize: 15, lineHeight: 1.5, color: TEXT }}>{quote ? <>“{quote}”</> : excerpt}</div>
        {quote && <button className="lib-inline-link" style={{ marginTop: 6 }} onClick={clearQuote}>note the whole paragraph instead</button>}
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {viewer ? (
            <button className="lib-ask-corpus" disabled={asking} onClick={ask}>{asking ? '✶ The corpus is reading…' : '✶ Ask the corpus'}</button>
          ) : (
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED }}>✶ Sign in to ask the corpus</span>
          )}
          <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 12.5, color: MUTED }}>the whole tradition weighs in, citing its shelves</span>
        </div>
      </div>

      {threads.length === 0 && (
        <p className="lib-quiet" style={{ marginTop: 14 }}>No notes here yet. If this passage struck you, say why, for the next reader.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
        {threads.map(t => (
          <div key={t.root.id} className="lib-thread">
            <NoteRow c={t.root} mine={canDelete(t.root)}
              onDelete={() => setConfirmDelete(t.root.id)} onReply={() => { setReplyTo(t.root.id); setReplyDraft(''); }} />
            {t.replies.length > 0 && (
              <div className="lib-replies">
                {t.replies.map(r => (
                  <NoteRow key={r.id} c={r} reply mine={canDelete(r)}
                    onDelete={() => setConfirmDelete(r.id)} onReply={() => { setReplyTo(t.root.id); setReplyDraft(`@${r.handle} `); }} />
                ))}
              </div>
            )}
            {confirmDelete && (t.root.id === confirmDelete || t.replies.some(r => r.id === confirmDelete)) && (
              <div className="lib-confirm">
                <span>Remove this note{t.root.id === confirmDelete && t.replies.length ? ' and its replies' : ''}?</span>
                <button onClick={async () => { const id = confirmDelete; setConfirmDelete(null); await onDelete(id); }}>Remove</button>
                <button onClick={() => setConfirmDelete(null)}>Keep</button>
              </div>
            )}
            {replyTo === t.root.id && viewer?.handle && (
              <div className="lib-composer" style={{ marginTop: 8, marginLeft: 14 }}>
                <textarea value={replyDraft} onChange={e => setReplyDraft(e.target.value)} placeholder={`Reply to ${t.root.handle}…`} rows={3} autoFocus
                  onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit(replyDraft, t.root.id); }} />
                <div className="lib-composer-row">
                  <button className="lib-ghost" onClick={() => setReplyTo(null)}>Cancel</button>
                  <button className="lib-send" disabled={posting || !replyDraft.trim()} onClick={() => submit(replyDraft, t.root.id)}>{posting ? 'Saving…' : 'Reply'}</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* composer */}
      <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(201,168,76,0.16)' }}>
        {!viewerChecked && <p className="lib-quiet">…</p>}
        {viewerChecked && !viewer && (
          <p className="lib-quiet">
            <a href={signInHref} style={{ color: GOLD, textDecoration: 'underline' }}>Sign in</a> to write in the margin. Notes are public and carry your handle.
          </p>
        )}
        {viewer && !viewer.handle && (
          <div className="lib-composer">
            <p className="lib-quiet" style={{ marginBottom: 8 }}>Choose the handle other readers will see beside your notes.</p>
            <input value={handleDraft} onChange={e => setHandleDraft(e.target.value)} placeholder="your_handle" className="lib-search-input" maxLength={20}
              onKeyDown={e => { if (e.key === 'Enter') chooseHandle(); }} />
            <div className="lib-composer-row"><button className="lib-send" disabled={posting} onClick={chooseHandle}>Use this handle</button></div>
          </div>
        )}
        {viewer?.handle && (
          <div className="lib-composer">
            <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={4}
              placeholder={quote ? 'Why did this passage strike you?' : `A note on ¶ ${paraIndex + 1}. What does it say to you, and why does it matter?`}
              onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit(draft, null); }} />
            <div className="lib-composer-row">
              <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: '0.08em' }}>as {viewer.handle} · public</span>
              <button className="lib-send" disabled={posting || !draft.trim()} onClick={() => submit(draft, null)}>{posting ? 'Saving…' : 'Leave the note'}</button>
            </div>
          </div>
        )}
        {err && <p style={{ fontFamily: SERIF, fontSize: 13.5, color: '#e08a7a', margin: '8px 0 0' }}>{err}</p>}
      </div>
    </div>
  );
}

function NoteRow({ c, reply, mine, onDelete, onReply }: { c: LibComment; reply?: boolean; mine: boolean; onDelete: () => void; onReply: () => void }) {
  const corpus = !!c.is_corpus;
  return (
    <div className={`lib-note ${reply ? 'is-reply' : ''} ${corpus ? 'is-corpus' : ''}`}>
      <div className="lib-note-meta">
        <span style={{ color: corpus ? GOLD : mine ? GOLD : IVORY }}>{corpus ? '✶ The Corpus' : c.handle}</span>
        <span>{relativeTime(c.created_at)}</span>
      </div>
      {c.quote && !reply && <div className="lib-note-quote">“{c.quote}”</div>}
      <div className="lib-note-body" style={{ whiteSpace: 'pre-wrap' }}>{c.body}</div>
      {corpus && c.sources && c.sources.length > 0 && (
        <div className="lib-note-sources">
          drawing on {c.sources.map(s => `${s.author}, ${s.title}`).join(' · ')}
        </div>
      )}
      <div className="lib-note-actions">
        <button className="lib-inline-link" onClick={onReply}>reply</button>
        {mine && <button className="lib-inline-link" onClick={onDelete}>remove</button>}
      </div>
    </div>
  );
}

const READER_CSS = `
.lib-reader-bar { flex-shrink: 0; display: flex; align-items: center; gap: 14px; padding: 8px 18px; border-bottom: 1px solid rgba(201,168,76,0.14); background: rgba(8,13,28,0.5); min-height: 44px; }
.lib-bar-title { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lib-bar-right { display: flex; align-items: center; gap: 10px; }
.lib-bar-btn { cursor: pointer; font-family: ${MONO}; font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: ${GOLD}; border: 1px solid rgba(201,168,76,0.3); border-radius: 9px; padding: 6px 10px; background: rgba(201,168,76,0.06); white-space: nowrap; }
.lib-bar-btn:hover { background: rgba(201,168,76,0.14); }
.lib-view-toggle { display: inline-flex; border: 1px solid rgba(201,168,76,0.3); border-radius: 9px; overflow: hidden; }
.lib-view-toggle button { cursor: pointer; font-family: ${MONO}; font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: ${MUTED}; padding: 6px 12px; }
.lib-view-toggle button.is-on { color: #0a1020; background: ${GOLD}; }
.lib-only-narrow { display: none; }

.lib-reader-body { flex: 1; min-height: 0; display: grid; grid-template-columns: 264px minmax(0, 1fr) 312px; position: relative; }
.lib-reader-left, .lib-reader-right { display: flex; flex-direction: column; min-height: 0; background: linear-gradient(180deg, rgba(18,27,54,0.45), rgba(10,18,36,0.45)); }
.lib-reader-left { border-right: 1px solid rgba(201,168,76,0.14); }
.lib-reader-right { border-left: 1px solid rgba(201,168,76,0.14); }
.lib-panel-head { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 14px 16px 10px; font-family: ${MONO}; font-size: 9.5px; letter-spacing: 0.22em; text-transform: uppercase; color: ${GOLD}; }
.lib-panel-scroll { flex: 1; min-height: 0; overflow-y: auto; }
.lib-x { cursor: pointer; color: ${MUTED}; font-family: ${MONO}; font-size: 16px; line-height: 1; padding: 2px 6px; border-radius: 6px; }
.lib-x:hover { color: ${IVORY}; background: rgba(244,234,213,0.06); }
.lib-subhead { font-family: ${MONO}; font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: ${MUTED}; padding: 6px 14px; }
.lib-quiet { font-family: ${SERIF}; font-style: italic; font-size: 14.5px; line-height: 1.45; color: ${MUTED}; margin: 0; }
.lib-inline-link { cursor: pointer; font-family: ${MONO}; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: ${MUTED}; text-decoration: underline; text-underline-offset: 3px; padding: 0; margin-left: 6px; }
.lib-inline-link:hover { color: ${GOLD}; }

.lib-search-input { width: 100%; padding: 8px 30px 8px 12px; background: rgba(244,234,213,0.05); border: 1px solid rgba(201,168,76,0.3); border-radius: 8px; color: ${IVORY}; font-family: ${SERIF}; font-size: 15.5px; outline: none; }
.lib-search-input:focus { border-color: rgba(201,168,76,0.6); }
.lib-search-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); cursor: pointer; color: ${MUTED}; font-family: ${MONO}; font-size: 15px; padding: 4px; }
.lib-hit { display: block; width: 100%; text-align: left; cursor: pointer; padding: 9px 14px; border-top: 1px solid rgba(201,168,76,0.08); }
.lib-hit:hover { background: rgba(201,168,76,0.07); }
.lib-hit-meta { font-family: ${MONO}; font-size: 8.5px; letter-spacing: 0.14em; text-transform: uppercase; color: ${GOLD}; margin-bottom: 4px; }
.lib-hit-snip { font-family: ${SERIF}; font-size: 14px; line-height: 1.4; color: ${TEXT}; }
.lib-reader mark { background: rgba(201,168,76,0.28); color: inherit; border-radius: 2px; padding: 0 1px; }
.lib-reader .is-book mark, .lib-book mark { background: rgba(201,140,30,0.35); }

.lib-outline { padding: 4px 0 12px; }
.lib-outline-item { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; width: 100%; text-align: left; cursor: pointer; padding: 6px 14px; color: ${TEXT}; font-family: ${SERIF}; font-size: 15px; line-height: 1.3; border-left: 2px solid transparent; }
.lib-outline-item.lvl2 { padding-left: 26px; font-size: 13.5px; color: ${MUTED}; }
.lib-outline-item:hover { background: rgba(201,168,76,0.07); color: ${IVORY}; }
.lib-outline-item.on-page { color: ${IVORY}; }
.lib-outline-item.is-here { border-left-color: ${GOLD}; color: ${GOLD}; background: rgba(201,168,76,0.06); }
.lib-outline-label { flex: 1; min-width: 0; }
.lib-outline-page { flex-shrink: 0; font-family: ${MONO}; font-size: 8.5px; letter-spacing: 0.08em; color: ${MUTED}; }
.lib-folio-nav { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-top: 1px solid rgba(201,168,76,0.14); font-family: ${MONO}; font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: ${MUTED}; }
.lib-folio-nav button { cursor: pointer; color: ${GOLD}; font-size: 14px; padding: 2px 10px; border: 1px solid rgba(201,168,76,0.3); border-radius: 8px; }
.lib-folio-nav button:disabled { opacity: 0.3; cursor: default; }

.lib-reader-centre { min-width: 0; min-height: 0; overflow-y: auto; position: relative; }
.lib-scroll-page { max-width: 760px; margin: 0 auto; padding: 30px 56px 70px; }

/* paragraphs: gutter with number + note mark; hover reveals */
.lib-para { position: relative; margin: 0 0 20px; scroll-margin-top: 24px; border-radius: 6px; transition: background .5s; }
.lib-para.is-heading { margin: 34px 0 18px; }
.lib-para p { margin: 0; }
.lib-scroll-p { font-family: ${SERIF}; font-size: 20px; line-height: 1.72; color: ${TEXT}; opacity: 0.92; }
.lib-para:first-child .lib-scroll-p { color: ${IVORY}; opacity: 1; }
.lib-heading { font-family: ${MONO}; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: ${GOLD}; }
.lib-para-gutter { position: absolute; left: -52px; top: 4px; width: 44px; display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.lib-para-num { cursor: pointer; font-family: ${MONO}; font-size: 9px; letter-spacing: 0.06em; color: rgba(138,139,142,0.45); padding: 1px 4px; border-radius: 4px; }
.lib-para-num:hover { color: ${GOLD}; background: rgba(201,168,76,0.1); }
.lib-para-note { cursor: pointer; font-family: ${MONO}; font-size: 9.5px; letter-spacing: 0.04em; color: ${GOLD}; padding: 2px 6px; border-radius: 6px; border: 1px solid transparent; opacity: 0; transition: opacity .2s; white-space: nowrap; }
.lib-para:hover .lib-para-note, .lib-para.has-notes .lib-para-note, .lib-para.is-selected .lib-para-note { opacity: 1; }
.lib-para.has-notes .lib-para-note { border-color: rgba(201,168,76,0.35); background: rgba(201,168,76,0.08); }
.lib-para-note:hover { background: rgba(201,168,76,0.2) !important; }
.lib-para.is-selected { background: rgba(201,168,76,0.07); box-shadow: 0 0 0 10px rgba(201,168,76,0.07); }
@keyframes lib-para-flash { 0% { background: rgba(201,168,76,0.32); box-shadow: 0 0 0 12px rgba(201,168,76,0.32); } 100% { background: transparent; box-shadow: 0 0 0 12px transparent; } }
.lib-para.is-flash { animation: lib-para-flash 2.4s ease-out both; }

/* book view: a cream spread, two columns, running head and folio */
.lib-book-stage { height: 100%; display: grid; grid-template-columns: 44px minmax(0, 1fr) 44px; align-items: stretch; padding: 18px 10px; box-sizing: border-box; }
.lib-book-turn { cursor: pointer; font-family: ${SERIF}; font-size: 40px; color: ${GOLD}; opacity: 0.7; border-radius: 10px; }
.lib-book-turn:hover:not(:disabled) { opacity: 1; background: rgba(201,168,76,0.08); }
.lib-book-turn:disabled { opacity: 0.15; cursor: default; }
.lib-book { display: flex; flex-direction: column; min-height: 0; background: linear-gradient(90deg, #efe6d2 0%, #f6efe0 6%, #f8f2e5 50%, #f6efe0 94%, #efe6d2 100%); color: #2b2416; border-radius: 6px; box-shadow: 0 30px 80px rgba(0,0,0,0.55), inset 0 0 60px rgba(120,90,40,0.08); position: relative; }
.lib-book::before { content: ''; position: absolute; top: 0; bottom: 0; left: 50%; width: 2px; background: linear-gradient(90deg, rgba(80,60,20,0.0), rgba(80,60,20,0.22), rgba(80,60,20,0.0)); pointer-events: none; }
.lib-book-head, .lib-book-foot { flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; padding: 16px 48px 0; font-family: ${MONO}; font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(70,55,25,0.7); }
.lib-book-foot { padding: 0 48px 16px; }
.lib-book-text { flex: 1; min-height: 0; overflow: hidden; padding: 22px 48px 26px; column-count: 2; column-gap: 64px; column-fill: auto; }
.lib-book .lib-para { margin: 0 0 14px; }
.lib-book .lib-para.is-heading { margin: 20px 0 12px; break-after: avoid; }
.lib-book-p { font-family: ${SERIF}; font-size: 18px; line-height: 1.6; text-align: justify; hyphens: auto; color: #2b2416; }
.lib-book .lib-heading { color: #6b4e14; font-size: 10.5px; }
.lib-book .lib-para.has-drop .lib-book-p::first-letter { font-size: 3.1em; line-height: 0.8; float: left; padding: 6px 8px 0 0; color: #6b4e14; font-weight: 500; }
.lib-book .lib-para-gutter { position: static; display: inline-flex; flex-direction: row; align-items: baseline; gap: 4px; width: auto; float: left; margin: 0 6px 0 0; }
.lib-book .lib-para-num { color: rgba(70,55,25,0.45); }
.lib-book .lib-para-num:hover { color: #6b4e14; background: rgba(107,78,20,0.1); }
.lib-book .lib-para-note { color: #6b4e14; }
.lib-book .lib-para.has-notes .lib-para-note { border-color: rgba(107,78,20,0.35); background: rgba(107,78,20,0.08); }
.lib-book .lib-para.is-selected { background: rgba(201,140,30,0.16); box-shadow: 0 0 0 8px rgba(201,140,30,0.16); }
.lib-book .lib-para.is-flash { animation-name: lib-para-flash-book; }
@keyframes lib-para-flash-book { 0% { background: rgba(201,140,30,0.42); box-shadow: 0 0 0 10px rgba(201,140,30,0.42); } 100% { background: transparent; box-shadow: 0 0 0 10px transparent; } }

/* marginalia */
.lib-note-card { display: block; width: 100%; text-align: left; cursor: pointer; background: rgba(201,168,76,0.04); border: 1px solid rgba(201,168,76,0.16); border-radius: 10px; padding: 10px 12px; }
.lib-note-card:hover { border-color: rgba(201,168,76,0.5); background: rgba(201,168,76,0.08); }
.lib-note-meta { display: flex; justify-content: space-between; gap: 8px; font-family: ${MONO}; font-size: 8.5px; letter-spacing: 0.12em; text-transform: uppercase; color: ${MUTED}; margin-bottom: 5px; }
.lib-note-quote { font-family: ${SERIF}; font-style: italic; font-size: 14px; line-height: 1.4; color: ${GOLD}; margin-bottom: 5px; }
.lib-note-body { font-family: ${SERIF}; font-size: 15px; line-height: 1.5; color: ${TEXT}; }
.lib-thread-passage { background: rgba(244,234,213,0.04); border-left: 2px solid ${GOLD}; border-radius: 0 8px 8px 0; padding: 10px 12px; }
.lib-thread { border-top: 1px solid rgba(201,168,76,0.12); padding-top: 10px; }
.lib-note.is-reply { margin-left: 14px; padding-left: 10px; border-left: 1px solid rgba(201,168,76,0.2); margin-top: 8px; }
.lib-note.is-corpus { background: linear-gradient(180deg, rgba(201,168,76,0.09), rgba(201,168,76,0.03)); border: 1px solid rgba(201,168,76,0.28); border-radius: 10px; padding: 10px 12px; }
.lib-note.is-corpus .lib-note-body { color: ${IVORY}; }
.lib-note-sources { font-family: ${MONO}; font-size: 8.5px; letter-spacing: 0.08em; color: ${MUTED}; margin-top: 6px; line-height: 1.5; }
.lib-ask-corpus { cursor: pointer; font-family: ${MONO}; font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: ${GOLD}; border: 1px solid rgba(201,168,76,0.4); border-radius: 8px; padding: 6px 10px; background: rgba(201,168,76,0.08); }
.lib-ask-corpus:hover:not(:disabled) { background: rgba(201,168,76,0.18); }
.lib-ask-corpus:disabled { opacity: 0.6; cursor: default; }
.lib-note-actions { display: flex; gap: 4px; margin-top: 4px; }
.lib-note-actions .lib-inline-link { margin-left: 0; margin-right: 8px; }
.lib-replies { margin-top: 4px; }
.lib-confirm { display: flex; align-items: center; gap: 8px; margin: 8px 0 0 14px; font-family: ${SERIF}; font-size: 13.5px; color: ${MUTED}; }
.lib-confirm button { cursor: pointer; font-family: ${MONO}; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: ${GOLD}; border: 1px solid rgba(201,168,76,0.3); border-radius: 7px; padding: 3px 8px; }
.lib-composer textarea { width: 100%; box-sizing: border-box; resize: vertical; padding: 9px 11px; background: rgba(244,234,213,0.05); border: 1px solid rgba(201,168,76,0.3); border-radius: 8px; color: ${IVORY}; font-family: ${SERIF}; font-size: 15.5px; line-height: 1.45; outline: none; }
.lib-composer textarea:focus { border-color: rgba(201,168,76,0.6); }
.lib-composer-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 6px; }
.lib-send { cursor: pointer; font-family: ${MONO}; font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: #0a1020; background: ${GOLD}; border-radius: 8px; padding: 7px 12px; }
.lib-send:hover:not(:disabled) { background: #e3c77a; }
.lib-send:disabled { opacity: 0.4; cursor: default; }
.lib-ghost { cursor: pointer; font-family: ${MONO}; font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: ${MUTED}; padding: 7px 8px; }
.lib-ghost:hover { color: ${IVORY}; }

.lib-sel-pop { position: fixed; transform: translate(-50%, calc(-100% - 10px)); z-index: 60; }
.lib-sel-pop button { cursor: pointer; font-family: ${MONO}; font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: #0a1020; background: ${GOLD}; border-radius: 8px; padding: 7px 11px; box-shadow: 0 8px 26px rgba(0,0,0,0.5); white-space: nowrap; }
.lib-sel-pop button:hover { background: #e3c77a; }
.lib-toast { position: fixed; left: 50%; bottom: 26px; transform: translateX(-50%); z-index: 70; font-family: ${MONO}; font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: ${IVORY}; background: rgba(12,20,40,0.92); border: 1px solid rgba(201,168,76,0.4); border-radius: 9px; padding: 8px 14px; animation: lib-surface .3s ease both; }
.lib-reader-scrim { display: none; }

/* narrow: panels become drawers */
@media (max-width: 1100px) {
  .lib-only-narrow { display: inline-flex !important; }
  .lib-reader-body { grid-template-columns: minmax(0, 1fr); }
  .lib-reader-left, .lib-reader-right { position: fixed; top: 0; bottom: 0; z-index: 45; width: 86%; max-width: 340px; transition: transform .3s ease; box-shadow: 0 0 40px rgba(0,0,0,0.6); background: linear-gradient(180deg, #121b36, #0b1224); }
  .lib-reader-left { left: 0; transform: translateX(-100%); }
  .lib-reader-right { right: 0; transform: translateX(100%); }
  .lib-reader-left.open, .lib-reader-right.open { transform: translateX(0); }
  .lib-reader-scrim { display: block; position: fixed; inset: 0; z-index: 44; background: rgba(4,8,18,0.62); backdrop-filter: blur(2px); }
  .lib-scroll-page { padding: 24px 22px 60px 58px; }
  .lib-book-text { column-count: 1; padding: 18px 26px 22px; }
  .lib-book-head, .lib-book-foot { padding-left: 26px; padding-right: 26px; }
  .lib-book::before { display: none; }
  .lib-book-stage { grid-template-columns: 34px minmax(0, 1fr) 34px; padding: 10px 0; }
  .lib-book-turn { font-size: 32px; }
}
@media (max-width: 760px) {
  .lib-reader-bar { flex-wrap: wrap; gap: 8px; padding: 8px 12px; }
  .lib-bar-title { flex-basis: 100%; order: 3; }
  .lib-scroll-page { padding: 20px 16px 60px 50px; }
  .lib-para-gutter { left: -44px; width: 40px; }
  .lib-scroll-p { font-size: 18px; line-height: 1.65; }
  .lib-book-p { font-size: 16.5px; }
}
`;

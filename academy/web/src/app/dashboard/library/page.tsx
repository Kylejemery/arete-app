'use client';

import { useEffect, useMemo, useState } from 'react';
import Topbar from '@/components/navigation/Topbar';
import { LIBRARY_ITEMS, getLibraryForSession, type LibraryItem } from '@/data/library';

const DM_MONO = 'DM Mono, monospace';

const COURSE_TITLES: Record<string, string> = {
  'phil-701': 'PHIL 701 — The Art of Living — Foundations',
  'phil-702': 'PHIL 702 — Living the Practice — Marcus Aurelius',
  'phil-703': 'PHIL 703 — The School of Epictetus',
  'phil-704': 'PHIL 704 — The Examined Correspondence — Seneca',
  'phil-705': 'PHIL 705 — The Logic of Clear Seeing',
  'grek-101': 'GREK 101 — Ancient Greek for Philosophers',
  'latn-101': 'LATN 101 — Latin for Philosophers',
};

const COURSE_ORDER = ['phil-701', 'phil-702', 'phil-703', 'phil-704', 'phil-705', 'grek-101', 'latn-101'];

const DIFFICULTY_STYLE: Record<LibraryItem['difficulty'], string> = {
  introductory: 'border-green-500/50 text-green-300',
  intermediate: 'border-academy-gold/50 text-academy-gold',
  advanced: 'border-orange-500/50 text-orange-300',
};

type AccessFilter = 'all' | 'open' | 'library-incl';

function minSession(item: LibraryItem): number {
  return item.sessions.length === 0 ? -1 : Math.min(...item.sessions);
}

function ItemCard({ item }: { item: LibraryItem }) {
  const isOpen = item.accessType === 'open-access';
  return (
    <div className="bg-academy-card border border-academy-border rounded-xl p-5">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span
          className="text-[10px] uppercase tracking-widest border border-academy-gold/40 text-academy-gold rounded-full px-2 py-0.5 leading-none"
          style={{ fontFamily: DM_MONO }}
        >
          {item.type}
        </span>
        <span
          className={`text-[10px] uppercase tracking-widest border rounded-full px-2 py-0.5 leading-none ${
            isOpen ? 'border-green-500/50 text-green-300' : 'border-amber-500/50 text-amber-300'
          }`}
          style={{ fontFamily: DM_MONO }}
        >
          {isOpen ? 'Open Access' : 'Library Access'}
        </span>
        <span
          className={`text-[10px] uppercase tracking-widest border rounded-full px-2 py-0.5 leading-none ${DIFFICULTY_STYLE[item.difficulty]}`}
          style={{ fontFamily: DM_MONO }}
        >
          {item.difficulty}
        </span>
      </div>
      <p className="text-academy-muted text-xs mb-1">
        {item.author}{item.year > 0 ? `, ${item.year}` : ''}
      </p>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-serif text-academy-text text-lg leading-snug hover:text-academy-gold transition-colors"
      >
        {item.title}
      </a>
      <p className="text-academy-muted text-sm leading-relaxed mt-2">{item.description}</p>
      <p className="text-academy-muted text-xs mt-3" style={{ fontFamily: DM_MONO }}>
        {item.tags.join(' · ')}
      </p>
      {isOpen ? (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 bg-academy-gold text-navy font-semibold rounded-lg px-4 py-2 text-xs hover:opacity-90 transition-opacity"
        >
          Open {item.urlLabel} &rarr;
        </a>
      ) : (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 border border-amber-500/60 text-amber-300 font-semibold rounded-lg px-4 py-2 text-xs hover:bg-amber-500/10 transition-colors"
        >
          Find in Library &rarr;
        </a>
      )}
      {item.libraryNote && (
        <p className="text-academy-muted/70 text-[11px] leading-relaxed mt-3 italic">
          {item.libraryNote}
        </p>
      )}
    </div>
  );
}

export default function LibraryPage() {
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [accessFilter, setAccessFilter] = useState<AccessFilter>('all');
  const [ctx, setCtx] = useState<{ courseId: string; session: number } | null>(null);

  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const c = p.get('course');
      const s = p.get('session');
      if (c && s && !Number.isNaN(Number(s))) setCtx({ courseId: c, session: Number(s) });
    } catch {}
  }, []);

  const allTags = useMemo(
    () => Array.from(new Set(LIBRARY_ITEMS.flatMap(i => i.tags))).sort(),
    []
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return LIBRARY_ITEMS.filter(item => {
      if (selectedCourse !== 'all' && !item.courses.includes(selectedCourse)) return false;
      if (selectedTag && !item.tags.includes(selectedTag)) return false;
      if (accessFilter === 'open' && item.accessType !== 'open-access') return false;
      if (q) {
        const hay = `${item.title} ${item.author} ${item.description} ${item.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [selectedCourse, selectedTag, accessFilter, search]);

  const groups = useMemo(() => {
    const courseIds = selectedCourse === 'all' ? COURSE_ORDER : [selectedCourse];
    return courseIds
      .map(cid => ({
        courseId: cid,
        title: COURSE_TITLES[cid] ?? cid,
        items: filtered
          .filter(i => i.courses.includes(cid))
          .sort((a, b) => minSession(a) - minSession(b)),
      }))
      .filter(g => g.items.length > 0);
  }, [filtered, selectedCourse]);

  const sessionReadings = ctx ? getLibraryForSession(ctx.courseId, ctx.session) : [];
  const hasFilters = selectedCourse !== 'all' || search !== '' || selectedTag !== null || accessFilter !== 'all';

  return (
    <div>
      <Topbar
        title="Academy Library"
        subtitle="Curated scholarship and primary sources, by course and session"
      />

      {ctx && sessionReadings.length > 0 && (
        <div className="mb-6 border-l-4 border-academy-gold bg-academy-card border border-academy-border rounded-r-xl p-5">
          <p
            className="text-academy-gold text-xs uppercase tracking-widest mb-3"
            style={{ fontFamily: DM_MONO }}
          >
            Recommended for {COURSE_TITLES[ctx.courseId] ?? ctx.courseId} · Session {ctx.session}
          </p>
          <div className="space-y-3">
            {sessionReadings.map(i => <ItemCard key={i.id} item={i} />)}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_240px] gap-6">
        {/* LEFT: course filter */}
        <aside className="space-y-1">
          <p
            className="text-academy-muted text-[11px] uppercase tracking-widest mb-2"
            style={{ fontFamily: DM_MONO }}
          >
            Courses
          </p>
          {(['all', ...COURSE_ORDER]).map(cid => {
            const active = selectedCourse === cid;
            return (
              <button
                key={cid}
                onClick={() => setSelectedCourse(cid)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                  active
                    ? 'bg-academy-gold/10 text-academy-gold border border-academy-gold/20'
                    : 'text-academy-muted hover:text-academy-text hover:bg-navy/50 border border-transparent'
                }`}
              >
                {cid === 'all' ? 'All Courses' : (COURSE_TITLES[cid]?.split(' — ')[0] ?? cid)}
              </button>
            );
          })}
        </aside>

        {/* CENTER: items grouped by course */}
        <main className="space-y-8 min-w-0">
          {groups.length === 0 && (
            <p className="text-academy-muted text-sm italic py-12 text-center">
              No library items match the current filters.
            </p>
          )}
          {groups.map(g => (
            <section key={g.courseId}>
              <h2 className="font-serif text-xl text-academy-text mb-4">{g.title}</h2>
              <div className="space-y-4">
                {g.items.map(i => <ItemCard key={i.id} item={i} />)}
              </div>
            </section>
          ))}
        </main>

        {/* RIGHT: search, access filter, tag cloud */}
        <aside className="space-y-5">
          <div>
            <p
              className="text-academy-muted text-[11px] uppercase tracking-widest mb-2"
              style={{ fontFamily: DM_MONO }}
            >
              Search
            </p>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Title, author, tag..."
              className="w-full bg-navy border border-academy-border rounded-lg px-3 py-2 text-academy-text placeholder-academy-muted focus:outline-none focus:border-academy-gold transition-colors text-sm"
            />
          </div>

          <div>
            <p
              className="text-academy-muted text-[11px] uppercase tracking-widest mb-2"
              style={{ fontFamily: DM_MONO }}
            >
              Access
            </p>
            <div className="space-y-1">
              {([
                ['all', 'All'],
                ['open', 'Open Access Only'],
                ['library-incl', 'All including Library Access'],
              ] as [AccessFilter, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setAccessFilter(val)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all ${
                    accessFilter === val
                      ? 'bg-academy-gold/10 text-academy-gold border border-academy-gold/20'
                      : 'text-academy-muted hover:text-academy-text border border-transparent'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p
              className="text-academy-muted text-[11px] uppercase tracking-widest mb-2"
              style={{ fontFamily: DM_MONO }}
            >
              Tags
            </p>
            <div className="flex flex-wrap gap-1.5">
              {allTags.map(tag => {
                const active = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(active ? null : tag)}
                    className={`text-[11px] rounded-full px-2 py-0.5 border transition-colors ${
                      active
                        ? 'border-academy-gold text-academy-gold bg-academy-gold/10'
                        : 'border-academy-border text-academy-muted hover:text-academy-text'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {hasFilters && (
            <button
              onClick={() => { setSelectedCourse('all'); setSearch(''); setSelectedTag(null); setAccessFilter('all'); }}
              className="text-academy-muted text-xs underline hover:text-academy-text"
            >
              Clear filters
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}

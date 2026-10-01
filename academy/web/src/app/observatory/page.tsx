import type { Metadata } from 'next';
import Link from 'next/link';
import { GOLD, IVORY, MONO, MUTED, SERIF, TEXT } from '@/app/library/theme';
import {
  ACCENT, APP_URL, DISCLOSE, KINDS, SECTION, SITE_URL, TAG,
  commentsLabel, fmtDate, isKind, loadCommentCounts, loadJournal, pieceHref, voicesLine,
  type JournalEntry, type Kind,
} from '@/lib/observatory';

// The Observatory as a journal. The sky in the Library shows what the corpus
// is working through as a constellation; this page lays the same published
// pieces out as posts to read, newest first, one section per kind. Public and
// server-rendered, so every piece is a crawlable link.

export const revalidate = 300;

const TITLE = 'The Observatory';
const STANDFIRST =
  'The corpus at work. Tensions it holds open, questions it cannot yet answer, conclusions it assembles from far-apart voices, and its weekly answer to the world. Written by the corpus from what it holds, labelled for what it is, and free to read.';

export const metadata: Metadata = {
  title: `${TITLE} — The Library of Arete`,
  description: STANDFIRST,
  alternates: { canonical: `${SITE_URL}/observatory` },
  openGraph: { title: TITLE, description: STANDFIRST, url: `${SITE_URL}/observatory`, siteName: 'The Library of Arete', type: 'website' },
  twitter: { card: 'summary', title: TITLE, description: STANDFIRST },
};

const kicker = { fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.22em', textTransform: 'uppercase' as const };

function Meta({ e, comments }: { e: JournalEntry; comments: number }) {
  const parts = [`${e.minutes} min read`, voicesLine(e.authors)].filter(Boolean);
  return (
    <p className="obs-meta">
      {parts.join(' · ')}
      {comments > 0 && <span style={{ color: GOLD }}> · {commentsLabel(comments)}</span>}
    </p>
  );
}

function Kicker({ e }: { e: JournalEntry }) {
  const accent = ACCENT[e.kind];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, flexShrink: 0 }} />
      <span style={{ ...kicker, fontSize: 9, color: accent }}>{TAG[e.kind]}{e.starred ? ' · starred' : ''}</span>
      {e.publishedAt && <span style={{ ...kicker, fontSize: 9, letterSpacing: '0.12em', color: MUTED, marginLeft: 'auto' }}>{fmtDate(e.publishedAt)}</span>}
    </div>
  );
}

function Featured({ e, comments }: { e: JournalEntry; comments: number }) {
  return (
    <Link href={pieceHref(e)} className="obs-featured">
      <Kicker e={e} />
      <h2 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 'clamp(28px, 4.4vw, 40px)', lineHeight: 1.1, color: IVORY, margin: '0 0 14px' }}>{e.title}</h2>
      {e.dek && <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 19, lineHeight: 1.5, color: TEXT, margin: '0 0 14px' }}>{e.dek}</p>}
      <Meta e={e} comments={comments} />
      <span style={{ ...kicker, fontSize: 9.5, color: GOLD, display: 'inline-block', marginTop: 16 }}>Read the piece →</span>
    </Link>
  );
}

function Row({ e, comments }: { e: JournalEntry; comments: number }) {
  return (
    <Link href={pieceHref(e)} className="obs-row">
      <Kicker e={e} />
      <h3 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 25, lineHeight: 1.18, color: IVORY, margin: '0 0 8px' }}>{e.title}</h3>
      {e.dek && <p className="obs-dek">{e.dek}</p>}
      <Meta e={e} comments={comments} />
    </Link>
  );
}

// Posts per page. The featured piece sits above page one and is not counted.
const PAGE_SIZE = 24;

type SearchParams = { kind?: string; page?: string };

export default async function ObservatoryJournalPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { kind: kindParam, page: pageParam } = await searchParams;
  const section: Kind | null = isKind(kindParam) ? kindParam : null;
  const page = Math.max(1, Math.floor(Number(pageParam)) || 1);
  const [entries, counts] = await Promise.all([loadJournal(), loadCommentCounts()]);
  const count = (e: JournalEntry) => counts[`${e.kind}:${e.id}`] || 0;

  const perKind = Object.fromEntries(KINDS.map(k => [k, entries.filter(e => e.kind === k).length])) as Record<Kind, number>;
  const voices = new Set(entries.flatMap(e => e.authors)).size;
  const shown = section ? entries.filter(e => e.kind === section) : entries;
  const featured = section || page > 1 ? null : shown[0] || null;
  const rest = section ? shown : shown.slice(1);
  const pages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  const list = rest.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageHref = (n: number) => {
    const q = new URLSearchParams();
    if (section) q.set('kind', section);
    if (n > 1) q.set('page', String(n));
    const s = q.toString();
    return s ? `/observatory?${s}` : '/observatory';
  };
  const starred = entries.filter(e => e.starred).slice(0, 4);
  const discussed = [...entries].filter(e => count(e) > 0).sort((a, b) => count(b) - count(a)).slice(0, 4);

  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: '0 16px 96px' }}>
      <style>{CSS}</style>

      <nav style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 0', borderBottom: '1px solid rgba(201,168,76,0.14)' }}>
        <Link href="/library" style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: SERIF, fontSize: 18, letterSpacing: '0.3em', color: GOLD }}>ARETE</span>
          <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: MUTED }}>the Library</span>
        </Link>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 18 }}>
          <Link href="/library" className="obs-navlink">The sky</Link>
          <a href={APP_URL} className="obs-navlink">Get Arete</a>
        </span>
      </nav>

      <header style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto', padding: '56px 0 40px' }}>
        <p style={{ ...kicker, color: GOLD, margin: '0 0 14px' }}>The Observatory</p>
        <h1 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 'clamp(36px, 6vw, 56px)', lineHeight: 1.05, color: IVORY, margin: '0 0 18px' }}>
          What the corpus is working through
        </h1>
        <p style={{ fontFamily: SERIF, fontSize: 19, lineHeight: 1.55, color: TEXT, margin: '0 0 18px' }}>{STANDFIRST}</p>
        <p style={{ ...kicker, fontSize: 9, letterSpacing: '0.16em', color: MUTED, margin: '0 0 26px' }}>
          {entries.length} pieces · {voices} voices · new each week
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {featured && <Link href={pieceHref(featured)} className="obs-btn obs-btn-gold">Read the latest</Link>}
          <Link href="/library" className="obs-btn">Explore the sky</Link>
        </div>
      </header>

      <div style={{ height: 1, width: 64, background: GOLD, opacity: 0.5, margin: '0 auto 40px' }} />

      {featured && <Featured e={featured} comments={count(featured)} />}

      <div className="obs-tabs" role="navigation" aria-label="Sections">
        <Link href="/observatory" className={`obs-tab${!section ? ' is-on' : ''}`}>All <span>{entries.length}</span></Link>
        {KINDS.filter(k => perKind[k] > 0).map(k => (
          <Link key={k} href={`/observatory?kind=${k}`} className={`obs-tab${section === k ? ' is-on' : ''}`}>
            <i style={{ background: ACCENT[k] }} />{SECTION[k]} <span>{perKind[k]}</span>
          </Link>
        ))}
      </div>

      <div className="obs-grid">
        <section>
          {section && (
            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15.5, lineHeight: 1.55, color: MUTED, margin: '4px 0 18px' }}>{DISCLOSE[section]}</p>
          )}
          {list.length === 0 && (
            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: MUTED, textAlign: 'center', padding: '48px 0' }}>
              Nothing published here yet. The corpus is still at work.
            </p>
          )}
          {list.map(e => <Row key={`${e.kind}:${e.id}`} e={e} comments={count(e)} />)}
          {pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '26px 0 0' }}>
              {page > 1 ? <Link href={pageHref(page - 1)} className="obs-btn">← Newer</Link> : <span />}
              <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.12em', color: MUTED }}>Page {page} of {pages}</span>
              {page < pages ? <Link href={pageHref(page + 1)} className="obs-btn">Older →</Link> : <span />}
            </div>
          )}
        </section>

        <aside className="obs-rail">
          {discussed.length > 0 && (
            <div className="obs-rail-block">
              <p style={{ ...kicker, fontSize: 9, color: GOLD, margin: '0 0 12px' }}>Most discussed</p>
              {discussed.map(e => (
                <Link key={`d${e.kind}${e.id}`} href={`${pieceHref(e)}#comments`} className="obs-rail-link">
                  {e.title}<span>{commentsLabel(count(e))}</span>
                </Link>
              ))}
            </div>
          )}
          {starred.length > 0 && (
            <div className="obs-rail-block">
              <p style={{ ...kicker, fontSize: 9, color: GOLD, margin: '0 0 12px' }}>Starred</p>
              {starred.map(e => (
                <Link key={`s${e.kind}${e.id}`} href={pieceHref(e)} className="obs-rail-link">
                  {e.title}<span>{TAG[e.kind]}</span>
                </Link>
              ))}
            </div>
          )}
          <div className="obs-rail-block">
            <p style={{ ...kicker, fontSize: 9, color: GOLD, margin: '0 0 12px' }}>How to read it</p>
            <p style={{ fontFamily: SERIF, fontSize: 14.5, lineHeight: 1.55, color: MUTED, margin: 0 }}>
              Nothing here is a source text. Every piece is the corpus thinking with what it holds, and each one says what kind of thinking it is. Sign in to answer it.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

const CSS = `
.obs-navlink { font-family: ${MONO}; font-size: 9.5px; letter-spacing: 0.16em; text-transform: uppercase; color: ${MUTED}; text-decoration: none; }
.obs-navlink:hover { color: ${GOLD}; }
.obs-btn { font-family: ${MONO}; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; text-decoration: none; color: ${GOLD}; border: 1px solid rgba(201,168,76,0.45); border-radius: 10px; padding: 12px 18px; transition: background 150ms ease-out; }
.obs-btn:hover { background: rgba(201,168,76,0.12); }
.obs-btn-gold { color: #0a1020; background: ${GOLD}; border-color: ${GOLD}; }
.obs-btn-gold:hover { background: #e3c77a; }
.obs-featured { display: block; text-decoration: none; max-width: 760px; margin: 0 auto 48px; padding: 30px 32px; border: 1px solid rgba(201,168,76,0.27); border-radius: 14px; background: #111d30; transition: border-color 150ms ease-out; }
.obs-featured:hover { border-color: rgba(201,168,76,0.53); }
.obs-tabs { display: flex; gap: 6px; flex-wrap: wrap; border-bottom: 1px solid rgba(201,168,76,0.14); padding-bottom: 12px; margin-bottom: 8px; }
.obs-tab { display: inline-flex; align-items: center; gap: 7px; font-family: ${MONO}; font-size: 9.5px; letter-spacing: 0.14em; text-transform: uppercase; color: ${MUTED}; text-decoration: none; padding: 7px 12px; border: 1px solid transparent; border-radius: 999px; }
.obs-tab i { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
.obs-tab span { color: #555; }
.obs-tab:hover { color: ${GOLD}; }
.obs-tab.is-on { color: ${GOLD}; border-color: rgba(201,168,76,0.53); }
.obs-grid { display: grid; grid-template-columns: minmax(0, 1fr) 280px; gap: 56px; align-items: start; }
.obs-row { display: block; text-decoration: none; padding: 26px 0; border-bottom: 1px solid rgba(201,168,76,0.12); }
.obs-row:hover h3 { color: #e3c77a !important; }
.obs-dek { font-family: ${SERIF}; font-size: 17px; line-height: 1.5; color: ${TEXT}; margin: 0 0 10px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.obs-meta { font-family: ${MONO}; font-size: 9.5px; letter-spacing: 0.08em; color: ${MUTED}; margin: 0; }
.obs-rail { position: sticky; top: 24px; padding-top: 22px; }
.obs-rail-block { padding: 0 0 22px; margin-bottom: 22px; border-bottom: 1px solid rgba(201,168,76,0.12); }
.obs-rail-block:last-child { border-bottom: none; }
.obs-rail-link { display: block; text-decoration: none; font-family: ${SERIF}; font-size: 16px; line-height: 1.3; color: ${IVORY}; margin-bottom: 14px; }
.obs-rail-link:hover { color: #e3c77a; }
.obs-rail-link span { display: block; font-family: ${MONO}; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: ${MUTED}; margin-top: 4px; }
@media (max-width: 860px) {
  .obs-grid { grid-template-columns: minmax(0, 1fr); gap: 8px; }
  .obs-rail { position: static; border-top: 1px solid rgba(201,168,76,0.14); }
  .obs-featured { padding: 22px 20px; }
}
`;

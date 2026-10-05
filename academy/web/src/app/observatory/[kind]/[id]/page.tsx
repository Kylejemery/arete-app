import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Fragment, type ReactNode } from 'react';
import { GOLD, IVORY, MONO, MUTED, SERIF, TEXT } from '@/app/library/theme';
import {
  ACCENT, APP_URL, DISCLOSE, SITE_URL, TAG,
  commentsLabel, fmtDate, loadCommentCounts, loadJournal, loadPiece, pieceHref, voicesLine,
  type Kind, type Piece,
} from '@/lib/observatory';
import Comments from '../../Comments';
import ShareLink from '../../ShareLink';

// A single Observatory piece, laid out to be read: the journal's article
// page. Server-rendered so the title and opening line become the link
// preview, and public: the same approval flags that gate the feeds gate this
// (the backend returns 404 for anything not approved and visible). Reader
// comments sit under the piece, then more from the journal.

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}
function list(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function headline(kind: Kind, p: Piece): string {
  switch (kind) {
    case 'inquiry': return str(p.question);
    // The signal is a two-sentence news summary: the first sentence heads the
    // piece and the whole of it opens the body.
    case 'world': return truncate(firstSentence(str(p.dominantSignal)), 160);
    case 'dream': return str(p.title) || 'A thought from the corpus';
    default: return str(p.title);
  }
}

function firstSentence(s: string): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.split(/(?<=[.!?])\s+/)[0] || t;
}

function opening(kind: Kind, p: Piece): string {
  switch (kind) {
    case 'tension': return str(p.firstSentence) || str(p.statement);
    case 'inquiry': return str(p.pursuit) || str(p.origin);
    case 'dream': return str(p.content);
    case 'convergence': return str(p.conclusion);
    case 'world': return str(p.response) || str(p.tension);
    case 'essay': return str(p.opening);
  }
}

function truncate(s: string, n = 200): string {
  const t = s.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1').replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
}

// The agents write plain paragraphs with light Markdown emphasis. Render the
// paragraphs and the emphasis; nothing else is interpreted.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i} style={{ fontWeight: 600, color: IVORY }}>{part.slice(2, -2)}</strong>;
    if (/^\*[^*\n]+\*$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function Prose({ text, quiet }: { text: string; quiet?: boolean }) {
  const paras = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  return (
    <>
      {paras.map((p, i) => (
        <p key={i} className={quiet ? 'obp-quiet' : 'obp-body'}>
          {p.split('\n').map((line, j) => <Fragment key={j}>{j > 0 && <br />}{inline(line)}</Fragment>)}
        </p>
      ))}
    </>
  );
}

// A Stoic Life essay is Markdown committed to the corpus: section headings,
// paragraphs, and bulleted practices. Render those three and the emphasis;
// nothing else is interpreted.
const LIST_ITEM = /^\s*[-*]\s+/;

function EssayBody({ markdown }: { markdown: string }) {
  // Bulleted practices are often separated by blank lines; consecutive list
  // blocks are one list.
  type Block = { kind: 'h2' | 'h3' | 'p'; text: string } | { kind: 'ul'; items: string[] };
  const blocks: Block[] = [];
  for (const raw of markdown.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)) {
    const h = raw.match(/^(#{2,3})\s+(.+)$/);
    if (h && !raw.includes('\n')) { blocks.push({ kind: h[1] === '##' ? 'h2' : 'h3', text: h[2] }); continue; }
    const lines = raw.split('\n');
    if (lines.every(l => LIST_ITEM.test(l))) {
      const items = lines.map(l => l.replace(LIST_ITEM, ''));
      const last = blocks[blocks.length - 1];
      if (last && last.kind === 'ul') last.items.push(...items);
      else blocks.push({ kind: 'ul', items });
      continue;
    }
    blocks.push({ kind: 'p', text: raw.replace(/\n/g, ' ') });
  }
  return (
    <>
      {blocks.map((b, i) => {
        if (b.kind === 'ul') return <ul key={i} className="obp-list">{b.items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ul>;
        if (b.kind === 'h2') return <h2 key={i} className="obp-essay-h2">{b.text}</h2>;
        if (b.kind === 'h3') return <h3 key={i} className="obp-essay-h3">{b.text}</h3>;
        return <p key={i} className="obp-body">{inline(b.text)}</p>;
      })}
    </>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <h2 className="obp-h2">{label}</h2>
      {children}
    </>
  );
}

type Params = { kind: string; id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { kind, id } = await params;
  const piece = await loadPiece(kind, id);
  if (!piece) return { title: 'The Observatory — Arete' };
  const k = kind as Kind;
  const title = `${headline(k, piece)} — The Observatory`;
  const description = truncate(opening(k, piece) || DISCLOSE[k]);
  const url = `${SITE_URL}/observatory/${kind}/${id}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'The Library of Arete', type: 'article' },
    twitter: { card: 'summary', title, description },
  };
}

const kicker = { fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.22em', textTransform: 'uppercase' as const };

export default async function ObservatoryPiecePage({ params }: { params: Promise<Params> }) {
  const { kind, id } = await params;
  const [piece, journal, counts] = await Promise.all([loadPiece(kind, id), loadJournal(), loadCommentCounts()]);
  if (!piece) notFound();
  const k = kind as Kind;
  const accent = ACCENT[k];
  const authors = list(k === 'dream' ? piece.seedAuthors : piece.authors);
  const title = headline(k, piece);
  const entry = journal.find(e => e.kind === k && e.id === id);
  const comments = counts[`${k}:${id}`] || 0;
  const url = `${SITE_URL}/observatory/${kind}/${id}`;

  // More to read: the same kind first, then the newest of the rest.
  const others = journal.filter(e => !(e.kind === k && e.id === id));
  const more = [...others.filter(e => e.kind === k).slice(0, 2), ...others.filter(e => e.kind !== k)].slice(0, 3);

  const byline = [
    'The Arete corpus',
    entry?.publishedAt ? fmtDate(entry.publishedAt) : '',
    entry ? `${entry.minutes} min read` : '',
  ].filter(Boolean).join(' · ');

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px 96px' }}>
      <style>{CSS}</style>

      <nav style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 0', marginBottom: 40, borderBottom: '1px solid rgba(201,168,76,0.14)' }}>
        <Link href="/observatory" className="obp-navlink" style={{ color: GOLD }}>← The Observatory</Link>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 18 }}>
          <Link href="/library" className="obp-navlink">The sky</Link>
          <a href={APP_URL} className="obp-navlink">Get Arete</a>
        </span>
      </nav>

      <article>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />
          <Link href={`/observatory?kind=${k}`} style={{ ...kicker, fontSize: 9, color: accent, textDecoration: 'none' }}>
            {TAG[k]}{piece.starred === true ? ' · starred' : ''}
          </Link>
        </div>

        <h1 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 'clamp(32px, 5.4vw, 46px)', lineHeight: 1.1, color: IVORY, margin: '0 0 18px' }}>
          {title}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '14px 0', borderTop: '1px solid rgba(201,168,76,0.14)', borderBottom: '1px solid rgba(201,168,76,0.14)', marginBottom: 28 }}>
          <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.1em', color: MUTED }}>{byline}</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            <a href="#comments" style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED, textDecoration: 'none' }}>
              {comments > 0 ? commentsLabel(comments) : 'Comment'}
            </a>
            <ShareLink url={url} title={title} />
          </span>
        </div>

        <p className="obp-disclose">{DISCLOSE[k]}</p>

        {k === 'tension' && (
          <>
            {str(piece.statement) && <Prose text={str(piece.statement)} />}
            {Array.isArray(piece.positions) && piece.positions.length > 0 && (
              <Section label="The positions">
                {(piece.positions as { author?: string | null; work?: string | null; summary?: string | null }[]).map((pos, i) => (
                  <div key={i} style={{ borderLeft: `3px solid ${accent}88`, padding: '2px 0 2px 18px', margin: '0 0 20px' }}>
                    <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: IVORY, margin: '0 0 6px' }}>
                      {pos.author || 'A position'}{pos.work ? <span style={{ color: MUTED }}> · {pos.work}</span> : null}
                    </p>
                    {pos.summary && <Prose text={pos.summary} quiet />}
                  </div>
                ))}
              </Section>
            )}
            {str(piece.livedStakes) && <Section label="What is at stake in a life"><Prose text={str(piece.livedStakes)} /></Section>}
            {str(piece.resolutionNote) && <Section label="On resolution"><Prose text={str(piece.resolutionNote)} quiet /></Section>}
          </>
        )}

        {k === 'inquiry' && (
          <>
            {str(piece.pursuit) && <Prose text={str(piece.pursuit)} />}
            {str(piece.whereCorpusRunsOut) && <Section label="Where the corpus runs out"><Prose text={str(piece.whereCorpusRunsOut)} /></Section>}
            {str(piece.origin) && <Section label="Where the question came from"><Prose text={str(piece.origin)} quiet /></Section>}
            {typeof piece.confidence === 'string' && piece.confidence && (
              <p className="obp-note">Confidence: {piece.confidence}{typeof piece.authorCount === 'number' && piece.authorCount > 0 ? ` · pursued across ${piece.authorCount} authors` : ''}</p>
            )}
          </>
        )}

        {k === 'dream' && (
          <>
            <Prose text={str(piece.content)} />
            {str(piece.seedSummary) && <Section label="Seeded by"><Prose text={str(piece.seedSummary)} quiet /></Section>}
          </>
        )}

        {k === 'convergence' && (
          <>
            <Prose text={str(piece.conclusion)} />
            {str(piece.pursuit) && <Section label="How the corpus got there"><Prose text={str(piece.pursuit)} /></Section>}
            {str(piece.breakpoint) && <Section label="Where it would break"><Prose text={str(piece.breakpoint)} /></Section>}
            {list(piece.traditions).length > 0 && <p className="obp-note">Traditions: {list(piece.traditions).join(' · ')}</p>}
          </>
        )}

        {k === 'world' && (
          <>
            {str(piece.dominantSignal) && (
              <div style={{ border: '1px solid rgba(201,168,76,0.2)', borderRadius: 12, padding: '14px 18px', margin: '0 0 28px' }}>
                <p className="obp-h2" style={{ margin: '0 0 8px' }}>What happened</p>
                <p className="obp-quiet" style={{ margin: 0 }}>{str(piece.dominantSignal)}</p>
              </div>
            )}
            {str(piece.response) && <Prose text={str(piece.response)} />}
            {str(piece.tension) && <Section label="Where the world and the corpus pull apart"><Prose text={str(piece.tension)} /></Section>}
            {Array.isArray(piece.signals) && piece.signals.length > 0 && (
              <Section label="Also weighed this week">
                <p className="obp-quiet">{(piece.signals as { signal: string }[]).map(s => s.signal).join(' · ')}</p>
              </Section>
            )}
          </>
        )}

        {k === 'essay' && (
          <>
            <EssayBody markdown={str(piece.body)} />
            {str(piece.reviewBy) && (
              <p className="obp-note">The interpretive sections are due to be checked again by {fmtDate(str(piece.reviewBy))}.</p>
            )}
          </>
        )}

        {authors.length > 0 && (
          <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', color: MUTED, margin: '34px 0 0' }}>
            Voices: {authors.join(' · ')}
          </p>
        )}
      </article>

      <Comments kind={k} id={id} />

      {more.length > 0 && (
        <section style={{ marginTop: 64 }}>
          <div style={{ height: 1, background: 'rgba(201,168,76,0.18)', marginBottom: 26 }} />
          <p style={{ ...kicker, color: GOLD, margin: '0 0 8px' }}>More from the Observatory</p>
          {more.map(e => (
            <Link key={`${e.kind}:${e.id}`} href={pieceHref(e)} className="obp-more">
              <span style={{ ...kicker, fontSize: 9, color: ACCENT[e.kind] }}>{TAG[e.kind]}</span>
              <span className="obp-more-title">{e.title}</span>
              <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.08em', color: MUTED }}>
                {[`${e.minutes} min read`, voicesLine(e.authors)].filter(Boolean).join(' · ')}
              </span>
            </Link>
          ))}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 26 }}>
            <Link href="/observatory" className="obp-btn obp-btn-gold">Every piece</Link>
            <Link href="/library" className="obp-btn">Explore the sky</Link>
            <a href={APP_URL} className="obp-btn">Get Arete</a>
          </div>
        </section>
      )}
    </main>
  );
}

const CSS = `
.obp-navlink { font-family: ${MONO}; font-size: 9.5px; letter-spacing: 0.16em; text-transform: uppercase; color: ${MUTED}; text-decoration: none; }
.obp-navlink:hover { color: ${GOLD}; }
.obp-disclose { font-family: ${SERIF}; font-style: italic; font-size: 15px; line-height: 1.55; color: ${MUTED}; margin: 0 0 30px; padding: 12px 16px; border-left: 3px solid rgba(201,168,76,0.4); background: rgba(201,168,76,0.05); }
.obp-body { font-family: ${SERIF}; font-size: 20px; line-height: 1.7; color: #ece4cf; margin: 0 0 22px; overflow-wrap: break-word; }
.obp-quiet { font-family: ${SERIF}; font-size: 18px; line-height: 1.65; color: ${TEXT}; margin: 0 0 16px; opacity: 0.9; }
.obp-h2 { font-family: ${MONO}; font-weight: 400; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: ${GOLD}; margin: 38px 0 14px; }
.obp-essay-h2 { font-family: ${SERIF}; font-weight: 500; font-size: 27px; line-height: 1.2; color: ${IVORY}; margin: 42px 0 14px; }
.obp-essay-h3 { font-family: ${SERIF}; font-weight: 500; font-size: 22px; line-height: 1.25; color: ${IVORY}; margin: 30px 0 10px; }
.obp-list { margin: 0 0 22px; padding-left: 22px; list-style: disc outside; }
.obp-list li { font-family: ${SERIF}; font-size: 19px; line-height: 1.65; color: #ece4cf; margin: 0 0 12px; }
.obp-list li::marker { color: ${GOLD}; }
.obp-note { font-family: ${MONO}; font-size: 10px; letter-spacing: 0.06em; color: ${MUTED}; margin: 20px 0 0; }
.obp-more { display: flex; flex-direction: column; gap: 6px; text-decoration: none; padding: 18px 0; border-bottom: 1px solid rgba(201,168,76,0.12); }
.obp-more-title { font-family: ${SERIF}; font-size: 22px; line-height: 1.2; color: ${IVORY}; }
.obp-more:hover .obp-more-title { color: #e3c77a; }
.obp-btn { font-family: ${MONO}; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; text-decoration: none; color: ${GOLD}; border: 1px solid rgba(201,168,76,0.45); border-radius: 10px; padding: 11px 16px; }
.obp-btn:hover { background: rgba(201,168,76,0.12); }
.obp-btn-gold { color: #0a1020; background: ${GOLD}; border-color: ${GOLD}; }
.obp-btn-gold:hover { background: #e3c77a; }
`;

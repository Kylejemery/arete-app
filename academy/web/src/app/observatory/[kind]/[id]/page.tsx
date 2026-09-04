import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GOLD, IVORY, MONO, MUTED, SERIF } from '@/app/library/theme';

// A single Observatory piece at its own URL, for sharing. Server-rendered so
// the title and opening line become the link preview, and public — the same
// approval flags that gate the feeds gate this (the backend returns 404 for
// anything not approved and visible). The page shows this one piece in full
// and points onward; the Observatory itself is free to explore.

const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://arete-app-production.up.railway.app';

const SITE_URL = 'https://academy.pursuearete.com';
const APP_URL = 'https://app.pursuearete.com';

type Kind = 'tension' | 'inquiry' | 'dream' | 'convergence' | 'world';
const KINDS: Kind[] = ['tension', 'inquiry', 'dream', 'convergence', 'world'];

const ACCENT: Record<Kind, string> = {
  tension: '#d97a6a',
  inquiry: GOLD,
  dream: '#9a7ad9',
  convergence: '#6ad9a3',
  world: '#d99a6a',
};
const TAG: Record<Kind, string> = {
  tension: 'Open tension',
  inquiry: 'Open inquiry',
  dream: 'The corpus imagines',
  convergence: 'The corpus concludes',
  world: 'The corpus is responding to',
};
const DISCLOSE: Record<Kind, string> = {
  tension: 'A contradiction the corpus holds open — two thinkers who cannot both be right, read together and left unreconciled. The corpus does not resolve genuine tensions; it shows you where the fault line runs.',
  inquiry: 'A question the corpus cannot yet answer, and its own attempt at one. The pursuit is conjecture from the corpus, labelled as such — never a source text.',
  dream: 'A thought from the corpus, not a passage in it: conjecture seeded by the tradition and written in the corpus’s own voice. Never the words of any historical thinker.',
  convergence: 'A conclusion the corpus assembled from far-apart passages — stated in none of them, entailed by several. The corpus discloses what it concluded and how far apart its sources stand.',
  world: 'The corpus reading the week’s world through the tradition it holds — an answer to what is happening now, grounded in what was written then.',
};

type Piece = Record<string, unknown> & { id: string };

async function loadPiece(kind: string, id: string): Promise<Piece | null> {
  if (!KINDS.includes(kind as Kind)) return null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  try {
    const res = await fetch(`${BACKEND_URL}/api/observatory/piece/${kind}/${id}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.piece ?? null;
  } catch {
    return null;
  }
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}
function list(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function headline(kind: Kind, p: Piece): string {
  switch (kind) {
    case 'inquiry': return str(p.question);
    case 'world': return str(p.dominantSignal);
    case 'dream': return str(p.title) || 'A thought from the corpus';
    default: return str(p.title);
  }
}

function opening(kind: Kind, p: Piece): string {
  switch (kind) {
    case 'tension': return str(p.firstSentence) || str(p.statement);
    case 'inquiry': return str(p.pursuit) || str(p.origin);
    case 'dream': return str(p.content);
    case 'convergence': return str(p.conclusion);
    case 'world': return str(p.response) || str(p.tension);
  }
}

function truncate(s: string, n = 200): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
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

const label = { fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: GOLD, margin: '18px 0 6px' };
const body = { fontFamily: SERIF, fontSize: 18, lineHeight: 1.6, color: IVORY, margin: 0, whiteSpace: 'pre-wrap' as const };
const quiet = { fontFamily: SERIF, fontSize: 15, lineHeight: 1.55, color: MUTED, margin: 0, whiteSpace: 'pre-wrap' as const };

export default async function ObservatoryPiecePage({ params }: { params: Promise<Params> }) {
  const { kind, id } = await params;
  const piece = await loadPiece(kind, id);
  if (!piece) notFound();
  const k = kind as Kind;
  const accent = ACCENT[k];
  const authors = list(k === 'dream' ? piece.seedAuthors : piece.authors);

  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '48px 22px 80px' }}>
      <p style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: MUTED, margin: '0 0 28px' }}>
        <Link href="/library" style={{ color: GOLD, textDecoration: 'none' }}>The Library of Arete</Link>
        <span style={{ margin: '0 8px' }}>·</span>The Observatory
      </p>

      <article style={{ border: `1px solid ${accent}55`, borderRadius: 16, padding: '28px 30px', background: 'linear-gradient(170deg,rgba(18,27,54,0.98),rgba(10,16,34,0.98))', boxShadow: '0 18px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, boxShadow: `0 0 8px 1px ${accent}` }} />
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: accent }}>{TAG[k]}</span>
          {typeof piece.week === 'string' && piece.week && (
            <span style={{ fontFamily: MONO, fontSize: 9, color: MUTED, marginLeft: 'auto' }}>{piece.week}</span>
          )}
        </div>

        <h1 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 30, lineHeight: 1.12, color: IVORY, margin: '0 0 14px' }}>
          {headline(k, piece)}
        </h1>

        <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, lineHeight: 1.5, color: MUTED, margin: '0 0 18px', border: '1px solid rgba(201,168,76,0.16)', borderRadius: 8, padding: '9px 11px' }}>
          {DISCLOSE[k]}
        </p>

        {k === 'tension' && (
          <>
            {str(piece.statement) && <p style={body}>{str(piece.statement)}</p>}
            {Array.isArray(piece.positions) && piece.positions.length > 0 && (
              <>
                <p style={label}>The positions</p>
                {(piece.positions as { author?: string | null; work?: string | null; summary?: string | null }[]).map((pos, i) => (
                  <div key={i} style={{ borderLeft: `2px solid ${accent}66`, padding: '4px 0 4px 14px', margin: '0 0 12px' }}>
                    <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', color: IVORY, margin: '0 0 4px' }}>
                      {pos.author || 'A position'}{pos.work ? <span style={{ color: MUTED }}> · {pos.work}</span> : null}
                    </p>
                    {pos.summary && <p style={quiet}>{pos.summary}</p>}
                  </div>
                ))}
              </>
            )}
            {str(piece.livedStakes) && (<><p style={label}>What is at stake in a life</p><p style={quiet}>{str(piece.livedStakes)}</p></>)}
            {str(piece.resolutionNote) && (<><p style={label}>On resolution</p><p style={quiet}>{str(piece.resolutionNote)}</p></>)}
          </>
        )}

        {k === 'inquiry' && (
          <>
            {str(piece.origin) && (<><p style={label}>Where the question came from</p><p style={quiet}>{str(piece.origin)}</p></>)}
            {str(piece.pursuit) && (<><p style={label}>The pursuit</p><p style={body}>{str(piece.pursuit)}</p></>)}
            {str(piece.whereCorpusRunsOut) && (<><p style={label}>Where the corpus runs out</p><p style={quiet}>{str(piece.whereCorpusRunsOut)}</p></>)}
            {typeof piece.confidence === 'string' && piece.confidence && (
              <p style={{ ...quiet, marginTop: 14, fontSize: 12.5 }}>Confidence: {piece.confidence}{typeof piece.authorCount === 'number' && piece.authorCount > 0 ? ` · pursued across ${piece.authorCount} authors` : ''}</p>
            )}
          </>
        )}

        {k === 'dream' && (
          <>
            <p style={body}>{str(piece.content)}</p>
            {str(piece.seedSummary) && (<><p style={label}>Seeded by</p><p style={quiet}>{str(piece.seedSummary)}</p></>)}
          </>
        )}

        {k === 'convergence' && (
          <>
            <p style={body}>{str(piece.conclusion)}</p>
            {str(piece.pursuit) && (<><p style={label}>How the corpus got there</p><p style={quiet}>{str(piece.pursuit)}</p></>)}
            {str(piece.breakpoint) && (<><p style={label}>Where it would break</p><p style={quiet}>{str(piece.breakpoint)}</p></>)}
            {list(piece.traditions).length > 0 && (
              <p style={{ ...quiet, marginTop: 14, fontSize: 12.5 }}>Traditions: {list(piece.traditions).join(' · ')}</p>
            )}
          </>
        )}

        {k === 'world' && (
          <>
            {str(piece.response) && <p style={body}>{str(piece.response)}</p>}
            {str(piece.tension) && (<><p style={label}>Where the world and the corpus pull apart</p><p style={quiet}>{str(piece.tension)}</p></>)}
            {Array.isArray(piece.signals) && piece.signals.length > 0 && (
              <>
                <p style={label}>Also weighed this week</p>
                <p style={quiet}>{(piece.signals as { signal: string }[]).map(s => s.signal).join(' · ')}</p>
              </>
            )}
          </>
        )}

        {authors.length > 0 && (
          <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', color: MUTED, margin: '22px 0 0' }}>
            Voices: {authors.join(' · ')}
          </p>
        )}
      </article>

      <section style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <Link
          href="/library"
          style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#0a1020', background: GOLD, borderRadius: 10, padding: '11px 16px', textDecoration: 'none' }}
        >
          Explore the Observatory →
        </Link>
        <a
          href={APP_URL}
          style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: GOLD, border: '1px solid rgba(201,168,76,0.4)', borderRadius: 10, padding: '11px 16px', textDecoration: 'none' }}
        >
          Get Arete
        </a>
        <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13.5, color: MUTED, margin: 0, flexBasis: '100%' }}>
          The Observatory is where the corpus works through what it holds — free to read, updated as the corpus grows.
        </p>
      </section>
    </main>
  );
}

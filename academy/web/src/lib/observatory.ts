import { createClient } from '@supabase/supabase-js';
import { GOLD } from '@/app/library/theme';

// The Observatory's published pieces, shared by the journal (/observatory)
// and the piece pages (/observatory/<kind>/<id>). Server-side only: both
// fetch from the Railway backend, which applies the approval and visibility
// rules (server/lib/observatory-journal.js), and read comment counts with
// the public anon key (observatory_comments is public to read).

export const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://arete-app-production.up.railway.app';

export const SITE_URL = 'https://academy.pursuearete.com';
export const APP_URL = 'https://app.pursuearete.com';

export type Kind = 'tension' | 'inquiry' | 'dream' | 'convergence' | 'world';
export const KINDS: Kind[] = ['convergence', 'tension', 'inquiry', 'dream', 'world'];

export function isKind(v: unknown): v is Kind {
  return typeof v === 'string' && (KINDS as string[]).includes(v);
}

// The kind colours match the sky's sidebar dots. They mark kind only.
export const ACCENT: Record<Kind, string> = {
  tension: '#d97a6a',
  inquiry: GOLD,
  dream: '#9a7ad9',
  convergence: '#6ad9a3',
  world: '#d99a6a',
};

// The kicker above a piece's title.
export const TAG: Record<Kind, string> = {
  tension: 'Open tension',
  inquiry: 'Open inquiry',
  dream: 'The corpus imagines',
  convergence: 'The corpus concludes',
  world: 'The corpus is responding to',
};

// The journal's section names, as in the sky's filter.
export const SECTION: Record<Kind, string> = {
  convergence: 'Concludes',
  tension: 'Tensions',
  inquiry: 'Inquiries',
  dream: 'Imagines',
  world: 'World',
};

// What each kind is, said plainly beside every piece. Load-bearing: none of
// these are source texts, and the reader is always told so.
export const DISCLOSE: Record<Kind, string> = {
  tension: 'A contradiction the corpus holds open: two thinkers who cannot both be right, read together and left unreconciled. The corpus does not resolve genuine tensions; it shows you where the fault line runs.',
  inquiry: 'A question the corpus cannot yet answer, and its own attempt at one. The pursuit is conjecture from the corpus, labelled as such, never a source text.',
  dream: 'A thought from the corpus, not a passage in it: conjecture seeded by the tradition and written in the corpus’s own voice. Never the words of any historical thinker.',
  convergence: 'A conclusion the corpus assembled from far-apart passages, stated in none of them, entailed by several. The corpus discloses what it concluded and how far apart its sources stand.',
  world: 'The corpus reading the week’s world through a Stoic lens: what Seneca, Epictetus, Marcus Aurelius and Musonius Rufus say to what is happening now, grounded in what they wrote then.',
};

export type JournalEntry = {
  kind: Kind;
  id: string;
  title: string;
  dek: string;
  authors: string[];
  minutes: number;
  publishedAt: string | null;
  starred: boolean;
};

export type Piece = Record<string, unknown> & { id: string };

export async function loadJournal(): Promise<JournalEntry[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/observatory/journal`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.entries) ? data.entries.filter((e: JournalEntry) => isKind(e?.kind)) : [];
  } catch {
    return [];
  }
}

export async function loadPiece(kind: string, id: string): Promise<Piece | null> {
  if (!isKind(kind)) return null;
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

// Live comment counts keyed `${kind}:${id}`. Empty on any failure: a missing
// count is never worth breaking the page for.
export async function loadCommentCounts(): Promise<Record<string, number>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return {};
  try {
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await sb.rpc('observatory_comment_counts');
    if (error || !Array.isArray(data)) return {};
    const out: Record<string, number> = {};
    for (const r of data as { piece_kind: string; piece_id: string; comments: number }[]) {
      out[`${r.piece_kind}:${r.piece_id}`] = Number(r.comments) || 0;
    }
    return out;
  } catch {
    return {};
  }
}

export function pieceHref(e: { kind: Kind; id: string }): string {
  return `/observatory/${e.kind}/${e.id}`;
}

export function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function voicesLine(authors: string[], max = 3): string {
  if (!authors.length) return '';
  const shown = authors.slice(0, max).join(' · ');
  return authors.length > max ? `${shown} · +${authors.length - max}` : shown;
}

export function commentsLabel(n: number): string {
  return n === 1 ? '1 comment' : `${n} comments`;
}

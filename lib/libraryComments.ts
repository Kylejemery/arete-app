// Marginalia in the Reading Room: reader notes on a paragraph of a primary
// text, with replies, plus notes the corpus writes when asked. Mirrors the
// academy web reader (academy/web/src/app/library/comments.ts): same table,
// same anchoring (text, folio, paragraph index, opening words).
import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '../services/claudeService';

export type LibComment = {
  id: string;
  text_author: string;
  text_work: string;
  page: number;
  para_index: number;
  anchor_text: string;
  quote: string | null;
  parent_id: string | null;
  user_id: string | null;
  handle: string;
  body: string;
  created_at: string;
  is_corpus: boolean;
  requested_by: string | null;
  sources: { author: string; work: string; title: string }[] | null;
};

export type Viewer = { userId: string; handle: string | null };
export type Thread = { root: LibComment; replies: LibComment[] };

export const HANDLE_RE = /^[a-z0-9_]{3,20}$/i;
export const ANCHOR_CHARS = 120;

export async function loadComments(author: string, work: string, page: number): Promise<LibComment[]> {
  const { data, error } = await supabase
    .from('library_comments')
    .select('*')
    .eq('text_author', author)
    .eq('text_work', work)
    .eq('page', page)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as LibComment[];
}

export async function postComment(input: {
  author: string; work: string; page: number; paraIndex: number; anchorText: string;
  quote: string | null; parentId: string | null; userId: string; handle: string; body: string;
}): Promise<LibComment> {
  const { data, error } = await supabase
    .from('library_comments')
    .insert({
      text_author: input.author,
      text_work: input.work,
      page: input.page,
      para_index: input.paraIndex,
      anchor_text: input.anchorText.slice(0, ANCHOR_CHARS),
      quote: input.quote,
      parent_id: input.parentId,
      user_id: input.userId,
      handle: input.handle,
      body: input.body,
    })
    .select()
    .single();
  if (error) throw error;
  return data as LibComment;
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from('library_comments').delete().eq('id', id);
  if (error) throw error;
}

export async function getViewer(): Promise<Viewer | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('handle')
    .eq('id', session.user.id)
    .maybeSingle();
  return { userId: session.user.id, handle: profile?.handle || null };
}

export async function saveHandle(userId: string, handle: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ handle }).eq('id', userId);
  if (error) throw error;
}

// Ask the corpus to weigh in on a paragraph. The backend grounds the note in
// the shelves and stores it as a corpus note everyone sees. A 403 with
// error 'pro_required' means the Library's conversing features are gated.
export class CorpusGateError extends Error {
  constructor(message: string) { super(message); this.name = 'CorpusGateError'; }
}
export async function askCorpus(input: {
  author: string; work: string; page: number; paraIndex: number; anchorText: string;
  passage: string; quote: string | null; parentId: string | null;
}): Promise<{ comment: LibComment; existing?: boolean; remaining?: number }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sign in to ask the corpus.');
  const res = await fetch(`${API_BASE_URL}/api/library/annotate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 403 && (data?.error === 'premium_required' || data?.error === 'pro_required')) throw new CorpusGateError(data.message || 'Asking the corpus to write in the margin is an Arete Premium feature.');
  if (!res.ok) throw new Error(data?.message || data?.error || 'The corpus is silent just now.');
  return data;
}

// Group a page's notes into threads for one paragraph: roots in order, each
// with its replies in order (replies to replies flatten under the root).
export function threadsFor(comments: LibComment[], paraIndex: number): Thread[] {
  const byId = new Map(comments.map(c => [c.id, c]));
  const rootOf = (c: LibComment): LibComment => {
    let cur = c;
    for (let hops = 0; cur.parent_id && hops < 20; hops++) {
      const p = byId.get(cur.parent_id);
      if (!p) break;
      cur = p;
    }
    return cur;
  };
  const threads = new Map<string, Thread>();
  for (const c of comments) {
    if (!c.parent_id && c.para_index === paraIndex) threads.set(c.id, { root: c, replies: [] });
  }
  for (const c of comments) {
    if (!c.parent_id) continue;
    const t = threads.get(rootOf(c).id);
    if (t) t.replies.push(c);
  }
  return [...threads.values()];
}

export function relativeTime(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Lowercase and strip accents so a query typed plainly still matches.
export const foldText = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

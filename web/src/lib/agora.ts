// The Agora: essays by the editor and by readers, open to argument.
// Direct supabase-js access; every rule (who may submit, who may publish,
// whose name goes on a row) is enforced by RLS and triggers in
// supabase/migrations/20260913000000_agora.sql. This module only shapes
// the calls. Mirrored in the mobile app at lib/agora.ts.
import { supabase } from './supabase';

export type EssayStatus = 'draft' | 'in_review' | 'published' | 'returned';

export interface AgoraEssay {
  id: string;
  author_id: string;
  author_name: string;
  title: string;
  body: string;
  excerpt: string | null;
  tags: string[];
  status: EssayStatus;
  editor_note: string | null;
  is_editorial: boolean;
  counselor_name: string | null;
  counselor_answer: string | null;
  counselor_slug: string | null;
  counselor_sources: AgoraSource[] | null;
  counselor_model: string | null;
  counselor_answered_at: string | null;
  comment_count: number;
  submitted_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgoraSource {
  author: string;
  work: string;
  title: string;
}

export interface AgoraComment {
  id: string;
  essay_id: string;
  user_id: string;
  author_name: string;
  body: string;
  is_counselor: boolean;
  created_at: string;
}

export interface AgoraViewer {
  userId: string;
  /** May submit essays and comment. */
  canWrite: boolean;
  /** Reads the queue, publishes, returns. */
  isEditor: boolean;
}

export const AGORA_TOPICS = ['Habit', 'Time', 'Anger', 'Family', 'Reading', 'Work', 'Death', 'Delay'];

const ESSAY_LIST_COLUMNS =
  'id, author_id, author_name, title, excerpt, tags, status, is_editorial, counselor_name, comment_count, submitted_at, published_at, created_at, updated_at';

export type AgoraEssaySummary = Omit<AgoraEssay, 'body' | 'editor_note' | 'counselor_answer' | 'counselor_sources' | 'counselor_model' | 'counselor_answered_at'>;

export function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export function readingMinutes(text: string): number {
  return Math.max(1, Math.round(wordCount(text) / 220));
}

export function shortDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function relativeTime(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return shortDate(iso);
}

/** Split an essay body into paragraphs on blank lines. */
export function paragraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);
}

export async function getAgoraViewer(): Promise<AgoraViewer | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: canWrite }, { data: isEditor }] = await Promise.all([
    supabase.rpc('agora_can_write'),
    supabase.rpc('agora_is_editor'),
  ]);
  return { userId: user.id, canWrite: canWrite === true, isEditor: isEditor === true };
}

export async function listPublishedEssays(topic?: string | null): Promise<AgoraEssaySummary[]> {
  let q = supabase
    .from('agora_essays')
    .select(ESSAY_LIST_COLUMNS)
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  if (topic) q = q.contains('tags', [topic]);
  const { data, error } = await q;
  if (error) { console.error('listPublishedEssays error:', error); return []; }
  return (data ?? []) as AgoraEssaySummary[];
}

/** The signed-in reader's own essays in every state, newest first. */
export async function listMyEssays(): Promise<AgoraEssaySummary[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('agora_essays')
    .select(ESSAY_LIST_COLUMNS)
    .eq('author_id', user.id)
    .order('updated_at', { ascending: false });
  if (error) { console.error('listMyEssays error:', error); return []; }
  return (data ?? []) as AgoraEssaySummary[];
}

/** Editor only: everything waiting to be read, oldest submission first. */
export async function listReviewQueue(): Promise<AgoraEssay[]> {
  const { data, error } = await supabase
    .from('agora_essays')
    .select('*')
    .eq('status', 'in_review')
    .order('submitted_at', { ascending: true });
  if (error) { console.error('listReviewQueue error:', error); return []; }
  return (data ?? []) as AgoraEssay[];
}

export async function getEssay(id: string): Promise<AgoraEssay | null> {
  const { data, error } = await supabase.from('agora_essays').select('*').eq('id', id).maybeSingle();
  if (error) { console.error('getEssay error:', error); return null; }
  return (data as AgoraEssay | null) ?? null;
}

export interface EssayDraftInput {
  title: string;
  body: string;
  tags: string[];
}

/** Create or update an essay in the given state. Throws on a refused write. */
export async function saveEssay(
  input: EssayDraftInput,
  status: 'draft' | 'in_review',
  id?: string | null,
): Promise<AgoraEssay> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in to write for the Agora.');
  const row = { title: input.title.trim(), body: input.body.trim(), tags: input.tags, status };
  const q = id
    ? supabase.from('agora_essays').update(row).eq('id', id).select().single()
    : supabase.from('agora_essays').insert({ ...row, author_id: user.id, author_name: '' }).select().single();
  const { data, error } = await q;
  if (error) throw new Error(friendlyError(error.message));
  return data as AgoraEssay;
}

/** Editor only: write an essay straight into the Agora under any name. */
export async function publishEditorial(
  input: EssayDraftInput & { authorName?: string; isEditorial?: boolean },
  id?: string | null,
): Promise<AgoraEssay> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in to write for the Agora.');
  const row = {
    title: input.title.trim(),
    body: input.body.trim(),
    tags: input.tags,
    status: 'published' as const,
    is_editorial: input.isEditorial ?? true,
    author_name: input.authorName?.trim() || '',
  };
  const q = id
    ? supabase.from('agora_essays').update(row).eq('id', id).select().single()
    : supabase.from('agora_essays').insert({ ...row, author_id: user.id }).select().single();
  const { data, error } = await q;
  if (error) throw new Error(friendlyError(error.message));
  return data as AgoraEssay;
}

export async function deleteEssay(id: string): Promise<void> {
  const { error } = await supabase.from('agora_essays').delete().eq('id', id);
  if (error) throw new Error(friendlyError(error.message));
}

/** Editor only. */
export async function publishEssay(id: string, opts?: { isEditorial?: boolean }): Promise<void> {
  const patch: Record<string, unknown> = { status: 'published' };
  if (opts?.isEditorial !== undefined) patch.is_editorial = opts.isEditorial;
  const { error } = await supabase.from('agora_essays').update(patch).eq('id', id);
  if (error) throw new Error(friendlyError(error.message));
}

/** Editor only. */
export async function returnEssay(id: string, note: string): Promise<void> {
  const { error } = await supabase
    .from('agora_essays')
    .update({ status: 'returned', editor_note: note.trim() || null })
    .eq('id', id);
  if (error) throw new Error(friendlyError(error.message));
}

/** Editor only: take a published essay down to draft. */
export async function unpublishEssay(id: string): Promise<void> {
  const { error } = await supabase.from('agora_essays').update({ status: 'draft' }).eq('id', id);
  if (error) throw new Error(friendlyError(error.message));
}

export async function listComments(essayId: string): Promise<AgoraComment[]> {
  const { data, error } = await supabase
    .from('agora_comments')
    .select('id, essay_id, user_id, author_name, body, is_counselor, created_at')
    .eq('essay_id', essayId)
    .order('created_at', { ascending: true });
  if (error) { console.error('listComments error:', error); return []; }
  return (data ?? []) as AgoraComment[];
}

export async function postComment(essayId: string, body: string): Promise<AgoraComment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in to comment.');
  const { data, error } = await supabase
    .from('agora_comments')
    .insert({ essay_id: essayId, user_id: user.id, author_name: '', body: body.trim() })
    .select('id, essay_id, user_id, author_name, body, is_counselor, created_at')
    .single();
  if (error) throw new Error(friendlyError(error.message));
  return data as AgoraComment;
}

/** Editor only: post a comment as a counselor's answer. */
export async function postCounselorComment(essayId: string, counselorName: string, body: string): Promise<AgoraComment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in to comment.');
  const { data, error } = await supabase
    .from('agora_comments')
    .insert({ essay_id: essayId, user_id: user.id, author_name: counselorName.trim(), body: body.trim(), is_counselor: true })
    .select('id, essay_id, user_id, author_name, body, is_counselor, created_at')
    .single();
  if (error) throw new Error(friendlyError(error.message));
  return data as AgoraComment;
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from('agora_comments').delete().eq('id', id);
  if (error) throw new Error(friendlyError(error.message));
}

// ---------------------------------------------------------------------------
// Counselor answers: the pipeline lives on the Railway server
// (server/routes/agora.js). The editor invites a counselor; the server
// screens the essay, grounds the answer in the corpus, writes it in the
// counselor's voice and stores it on the essay.
// ---------------------------------------------------------------------------

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export interface AnswerCounselor {
  slug: string;
  name: string;
  category: string;
  description: string | null;
  /** The corpus holds this counselor's own texts; the answer is grounded in them. */
  grounded: boolean;
}

/** Thrown when the safety gate declines an essay. The editor may override. */
export class GateDeclinedError extends Error {
  reason: string;
  constructor(reason: string) {
    super(`The safety gate declined this essay: ${reason}`);
    this.name = 'GateDeclinedError';
    this.reason = reason;
  }
}

async function apiHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sign in first.');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` };
}

export async function listAnswerCounselors(): Promise<AnswerCounselor[]> {
  const res = await fetch(`${API_BASE_URL}/api/agora/counselors`, { headers: await apiHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Could not load the roster.');
  return (data?.counselors ?? []) as AnswerCounselor[];
}

/** Editor only: ask the server to have a counselor answer the essay. */
export async function inviteCounselor(
  essayId: string,
  counselorSlug: string,
  opts: { force?: boolean; override?: boolean } = {},
): Promise<AgoraEssay> {
  const res = await fetch(`${API_BASE_URL}/api/agora/essays/${essayId}/answer`, {
    method: 'POST',
    headers: await apiHeaders(),
    body: JSON.stringify({ counselor: counselorSlug, force: opts.force === true, override: opts.override === true }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 422 && data?.error === 'declined') throw new GateDeclinedError(String(data.reason || 'no reason given'));
  if (!res.ok) throw new Error(data?.message || 'The counselor could not be reached.');
  return data.essay as AgoraEssay;
}

/** Editor only: take the counselor's answer off the essay. */
export async function removeCounselorAnswer(essayId: string): Promise<AgoraEssay> {
  const res = await fetch(`${API_BASE_URL}/api/agora/essays/${essayId}/answer`, {
    method: 'DELETE',
    headers: await apiHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Could not remove the answer.');
  return data.essay as AgoraEssay;
}

function friendlyError(message: string): string {
  if (/row-level security/i.test(message)) return 'The Agora would not take that. Subscribers submit and comment; the editor publishes.';
  if (/char_length\(title\)/.test(message)) return 'A title runs from one to two hundred characters.';
  if (/char_length\(body\)/.test(message)) return 'An essay runs from one to sixty thousand characters.';
  if (/agora_comments_body_check/.test(message)) return 'A comment runs from one to four thousand characters.';
  return message;
}

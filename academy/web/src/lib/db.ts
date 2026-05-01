import { supabase } from './supabase';
import type { Enrollment, SeminarSession, SeminarMessage, Paper, AgentId } from '@/types';

async function getUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------
// ENROLLMENTS
// ----------------------------------------------------------------

export async function getEnrollment(): Promise<Enrollment | null> {
  const userId = await getUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from('academy_enrollments')
    .select('*')
    .eq('user_id', userId)
    .eq('program_id', 'stoicism-phd')
    .maybeSingle();
  if (error) { console.error('getEnrollment error:', error); return null; }
  return data as Enrollment | null;
}

export async function upsertEnrollment(updates: Partial<Omit<Enrollment, 'id' | 'user_id' | 'enrolled_at'>>): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const { error } = await supabase
    .from('academy_enrollments')
    .upsert(
      { ...updates, user_id: userId, program_id: 'stoicism-phd' },
      { onConflict: 'user_id,program_id' }
    );
  if (error) console.error('upsertEnrollment error:', error);
}

// ----------------------------------------------------------------
// SEMINAR SESSIONS
// ----------------------------------------------------------------

export async function getOrCreateSession(courseId: string, agentId: AgentId): Promise<SeminarSession | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase
    .from('academy_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('agent_id', agentId)
    .gte('created_at', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing as SeminarSession;

  const { data, error } = await supabase
    .from('academy_sessions')
    .insert({ user_id: userId, course_id: courseId, agent_id: agentId, messages: [] })
    .select()
    .single();
  if (error) { console.error('getOrCreateSession error:', error); return null; }
  return data as SeminarSession;
}

export async function appendSeminarMessage(sessionId: string, message: SeminarMessage): Promise<void> {
  const { data: session, error: fetchErr } = await supabase
    .from('academy_sessions')
    .select('messages')
    .eq('id', sessionId)
    .single();
  if (fetchErr || !session) return;

  const updated = [...(session.messages as SeminarMessage[]), message];
  const { error } = await supabase
    .from('academy_sessions')
    .update({ messages: updated, updated_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (error) console.error('appendSeminarMessage error:', error);
}

export async function getRecentSessions(limit = 5): Promise<SeminarSession[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from('academy_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('getRecentSessions error:', error); return []; }
  return (data ?? []) as SeminarSession[];
}

// ----------------------------------------------------------------
// PAPERS
// ----------------------------------------------------------------

export async function getPapers(): Promise<Paper[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from('academy_papers')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) { console.error('getPapers error:', error); return []; }
  return (data ?? []) as Paper[];
}

export async function getPaper(id: string): Promise<Paper | null> {
  const { data, error } = await supabase
    .from('academy_papers')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Paper;
}

export async function upsertPaper(paper: Partial<Paper> & { course_id: string }): Promise<Paper | null> {
  const userId = await getUserId();
  if (!userId) return null;
  const payload = { ...paper, user_id: userId, updated_at: new Date().toISOString() };
  const { data, error } = paper.id
    ? await supabase.from('academy_papers').update(payload).eq('id', paper.id).select().single()
    : await supabase.from('academy_papers').insert(payload).select().single();
  if (error) { console.error('upsertPaper error:', error); return null; }
  return data as Paper;
}

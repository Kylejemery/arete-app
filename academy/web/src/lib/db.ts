import { supabase } from './supabase';
import type { Enrollment, SeminarSession, SeminarMessage, Paper, AgentId, DailyCheckin, RoutineTemplate, Task } from '@/types';

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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

// ----------------------------------------------------------------
// CHECK-INS
// ----------------------------------------------------------------

export async function getTodayCheckin(): Promise<DailyCheckin | null> {
  const userId = await getUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .eq('user_id', userId)
    .eq('check_in_date', localToday())
    .single();
  if (error && error.code !== 'PGRST116') {
    console.error('getTodayCheckin error:', error);
    return null;
  }
  return (data as DailyCheckin) ?? null;
}

export async function upsertTodayCheckin(
  data: Partial<Omit<DailyCheckin, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const { error } = await supabase
    .from('check_ins')
    .upsert(
      { ...data, user_id: userId, check_in_date: localToday(), updated_at: new Date().toISOString() },
      { onConflict: 'user_id,check_in_date' }
    );
  if (error) console.error('upsertTodayCheckin error:', error);
}

// ----------------------------------------------------------------
// ROUTINE TEMPLATES
// ----------------------------------------------------------------

export async function getRoutineTemplates(type: 'morning' | 'evening'): Promise<RoutineTemplate[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from('routine_templates')
    .select('*')
    .eq('user_id', userId)
    .eq('type', type)
    .order('sort_order', { ascending: true });
  if (error) { console.error('getRoutineTemplates error:', error); return []; }
  return (data as RoutineTemplate[]) ?? [];
}

// Re-export Task so callers can import from '@/lib/db' if needed
export type { Task };

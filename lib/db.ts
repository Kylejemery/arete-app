import { supabase } from './supabase'
import { getDevPremiumOverride } from './devMode'
import type {
  UserSettings,
  DailyCheckin,
  JournalEntry,
  ThreadMessage,
  ReadingData,
  Counselor,
  Goal,
} from './types'

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

async function getUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ----------------------------------------------------------------
// USER SETTINGS
// ----------------------------------------------------------------

export async function getUserSettings(): Promise<UserSettings | null> {
  const userId = await getUserId()
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (error && error.code !== 'PGRST116') {
      console.error('getUserSettings error:', error)
      return null
    }
    return data ?? null
  } catch (e) {
    console.error('getUserSettings exception:', e)
    return null
  }
}

export async function upsertUserSettings(data: Partial<Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  try {
    const { error } = await supabase
      .from('user_settings')
      .upsert(
        { ...data, user_id: userId, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    if (error) console.error('upsertUserSettings error:', error)
  } catch (e) {
    console.error('upsertUserSettings exception:', e)
  }
}

// ----------------------------------------------------------------
// DAILY CHECKINS
// ----------------------------------------------------------------

export async function incrementStreak(): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  try {
    // Already counted today — bail out to avoid double-incrementing
    const todayRow = await getTodayCheckin()
    if ((todayRow?.streak ?? 0) > 0) return

    // Look at yesterday's row to carry the streak forward
    const d = new Date()
    d.setDate(d.getDate() - 1)
    const yDate = d.toISOString().split('T')[0]

    const { data: yRow } = await supabase
      .from('check_ins')
      .select('streak, morning_done, evening_done')
      .eq('user_id', userId)
      .eq('check_in_date', yDate)
      .maybeSingle()

    // Carry forward only if yesterday had at least one routine completed
    const yesterdayCompleted = yRow?.morning_done || yRow?.evening_done
    const newStreak = (yesterdayCompleted ? (yRow?.streak ?? 0) : 0) + 1
    await upsertTodayCheckin({ streak: newStreak })
  } catch (e) {
    console.error('incrementStreak error:', e)
  }
}

export async function getTodayCheckin(): Promise<DailyCheckin | null> {
  const userId = await getUserId()
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', userId)
      .eq('check_in_date', today())
      .single()
    if (error && error.code !== 'PGRST116') {
      console.error('getTodayCheckin error:', error)
      return null
    }
    return data ?? null
  } catch (e) {
    console.error('getTodayCheckin exception:', e)
    return null
  }
}

export async function upsertTodayCheckin(data: Partial<Omit<DailyCheckin, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  try {
    const { error } = await supabase
      .from('check_ins')
      .upsert(
        { ...data, user_id: userId, check_in_date: today(), updated_at: new Date().toISOString() },
        { onConflict: 'user_id,check_in_date' }
      )
    if (error) console.error('upsertTodayCheckin error:', error)
  } catch (e) {
    console.error('upsertTodayCheckin exception:', e)
  }
}

// ----------------------------------------------------------------
// JOURNAL ENTRIES
// ----------------------------------------------------------------

export async function getJournalEntries(): Promise<JournalEntry[]> {
  const userId = await getUserId()
  if (!userId) return []
  try {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('getJournalEntries error:', error)
      return []
    }
    return data ?? []
  } catch (e) {
    console.error('getJournalEntries exception:', e)
    return []
  }
}

export async function createJournalEntry(entry: Omit<JournalEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<JournalEntry | null> {
  const userId = await getUserId()
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('journal_entries')
      .insert({ ...entry, user_id: userId })
      .select()
      .single()
    if (error) {
      console.error('createJournalEntry error:', error)
      return null
    }
    return data
  } catch (e) {
    console.error('createJournalEntry exception:', e)
    return null
  }
}

export async function updateJournalEntry(id: string, data: Partial<Omit<JournalEntry, 'id' | 'user_id' | 'created_at'>>): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  try {
    const { error } = await supabase
      .from('journal_entries')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
    if (error) console.error('updateJournalEntry error:', error)
  } catch (e) {
    console.error('updateJournalEntry exception:', e)
  }
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  try {
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) console.error('deleteJournalEntry error:', error)
  } catch (e) {
    console.error('deleteJournalEntry exception:', e)
  }
}

// ----------------------------------------------------------------
// BELIEFS
// ----------------------------------------------------------------

export async function saveBelief(belief: {
  raw_input: string;
  dialogue_history: any[];
  encoded_belief: string;
  has_virtue_concern: boolean;
  virtue_concern?: string;
}) {
  const userId = await getUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from('beliefs')
    .insert({ ...belief, user_id: userId })
    .select()
    .single();
  if (error) console.error('saveBelief error:', error);
  return data;
}

export async function getBeliefs() {
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from('beliefs')
    .select('*')
    .eq('user_id', userId)
    .order('encoded_at', { ascending: false });
  if (error) console.error('getBeliefs error:', error);
  return data ?? [];
}

// ----------------------------------------------------------------
// CABINET CONVERSATIONS
// ----------------------------------------------------------------

export async function saveCabinetConversation(messages: any[]) {
  const userId = await getUserId();
  if (!userId) return null;

  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase
    .from('cabinet_conversations')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', today)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('cabinet_conversations')
      .update({ messages, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) console.error('saveCabinetConversation error:', error);
    return data;
  } else {
    const { data, error } = await supabase
      .from('cabinet_conversations')
      .insert({ user_id: userId, messages })
      .select()
      .single();
    if (error) console.error('saveCabinetConversation error:', error);
    return data;
  }
}

export async function getCabinetConversation() {
  const userId = await getUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from('cabinet_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) console.error('getCabinetConversation error:', error);
  return data;
}

// ----------------------------------------------------------------
// CABINET THREADS
// ----------------------------------------------------------------

export async function getCounselorConversation(counselorId: string) {
  const userId = await getUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from('cabinet_conversations')
    .select('*')
    .eq('user_id', userId)
    .contains('counselor_slugs', [counselorId])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) console.error('getCounselorConversation error:', error);
  return data;
}

export async function saveCounselorConversation(counselorId: string, messages: any[]) {
  const userId = await getUserId();
  if (!userId) return null;

  const { data: existing } = await supabase
    .from('cabinet_conversations')
    .select('id')
    .eq('user_id', userId)
    .contains('counselor_slugs', [counselorId])
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('cabinet_conversations')
      .update({ messages, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) console.error('saveCounselorConversation error:', error);
    return data;
  } else {
    const { data, error } = await supabase
      .from('cabinet_conversations')
      .insert({ user_id: userId, counselor_slugs: [counselorId], messages })
      .select()
      .single();
    if (error) console.error('saveCounselorConversation error:', error);
    return data;
  }
}

export async function getThread(threadId: string): Promise<ThreadMessage[]> {
  if (threadId === 'cabinet') {
    const data = await getCabinetConversation();
    return (data?.messages ?? []) as ThreadMessage[];
  }
  const data = await getCounselorConversation(threadId);
  return (data?.messages ?? []) as ThreadMessage[];
}

export async function upsertThread(threadId: string, messages: ThreadMessage[]): Promise<void> {
  if (threadId === 'cabinet') {
    await saveCabinetConversation(messages);
    return;
  }
  await saveCounselorConversation(threadId, messages);
}

// ----------------------------------------------------------------
// READING DATA
// ----------------------------------------------------------------

export async function getReadingData(): Promise<ReadingData | null> {
  const userId = await getUserId()
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('reading_data')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (error && error.code !== 'PGRST116') {
      console.error('getReadingData error:', error)
      return null
    }
    return data ?? null
  } catch (e) {
    console.error('getReadingData exception:', e)
    return null
  }
}

export async function upsertReadingData(data: Partial<Omit<ReadingData, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  try {
    const { error } = await supabase
      .from('reading_data')
      .upsert(
        { ...data, user_id: userId, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    if (error) console.error('upsertReadingData error:', error)
  } catch (e) {
    console.error('upsertReadingData exception:', e)
  }
}

// ----------------------------------------------------------------
// CALENDAR DATA (not stored in Supabase — stub)
// ----------------------------------------------------------------

export async function getCalendarData(): Promise<Record<string, { morning: boolean; evening: boolean }>> {
  console.warn('getCalendarData: calendar_data table does not exist in Supabase')
  return {}
}

export async function upsertCalendarData(_data: Record<string, { morning: boolean; evening: boolean }>): Promise<void> {
  // no-op: calendar_data table does not exist in Supabase
}

// ----------------------------------------------------------------
// COUNSELORS
// ----------------------------------------------------------------

export const FUTURE_SELF_SLUG = 'futureSelf'
const DEFAULT_CABINET_SLUGS = ['marcus-aurelius', 'epictetus', 'david-goggins', 'theodore-roosevelt']

export async function getCounselors(): Promise<Counselor[]> {
  const { data, error } = await supabase
    .from('counselors')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) {
    console.error('getCounselors error:', error)
    return []
  }
  return (data ?? []) as Counselor[]
}

export async function getCounselorsByCategory(category: string): Promise<Counselor[]> {
  const { data, error } = await supabase
    .from('counselors')
    .select('*')
    .eq('category', category)
    .order('sort_order', { ascending: true })
  if (error) {
    console.error('getCounselorsByCategory error:', error)
    return []
  }
  return (data ?? []) as Counselor[]
}

export async function getCounselorsBySlugs(slugs: string[]): Promise<Counselor[]> {
  if (slugs.length === 0) return []
  const { data, error } = await supabase
    .from('counselors')
    .select('*')
    .in('slug', slugs)
  if (error) {
    console.error('getCounselorsBySlugs error:', error)
    return []
  }
  return (data ?? []) as Counselor[]
}

export async function getUserCabinet(): Promise<Counselor[]> {
  const settings = await getUserSettings()
  const members: string[] = settings?.cabinet_members ?? DEFAULT_CABINET_SLUGS
  const counselorSlugs = members.filter(m => m !== FUTURE_SELF_SLUG)
  return getCounselorsBySlugs(counselorSlugs)
}

export async function saveCabinetSelection(slugs: string[]): Promise<void> {
  const members = [...slugs.filter(s => s !== FUTURE_SELF_SLUG), FUTURE_SELF_SLUG]
  await upsertUserSettings({ cabinet_members: members })
}

export async function getKnowThyselfProfile(): Promise<Record<string, string | null>> {
  const settings = await getUserSettings();
  if (!settings) return {};
  return {
    user_name: settings.user_name ?? null,
    kt_background: settings.kt_background ?? null,
    kt_identity: settings.kt_identity ?? null,
    kt_goals: settings.kt_goals ?? null,
    kt_strengths: settings.kt_strengths ?? null,
    kt_weaknesses: settings.kt_weaknesses ?? null,
    kt_patterns: settings.kt_patterns ?? null,
    kt_major_events: settings.kt_major_events ?? null,
    future_self_description: settings.future_self_description ?? null,
    future_self_years: settings.future_self_years ? String(settings.future_self_years) : null,
  };
}

export async function getRandomCabinetQuote(
  cabinetSlugs: string[]
): Promise<{ quote: string; counselor: string } | null> {
  if (cabinetSlugs.length === 0) return null
  const { data, error } = await supabase
    .from('counselors')
    .select('name, quotes')
    .in('slug', cabinetSlugs)
  if (error) throw error

  const allQuotes = (data ?? []).flatMap(c =>
    (c.quotes as string[]).map(q => ({ quote: q, counselor: c.name }))
  )
  if (allQuotes.length === 0) return null
  return allQuotes[Math.floor(Math.random() * allQuotes.length)]
}

export async function getDefaultCabinet(): Promise<Counselor[]> {
  const { data, error } = await supabase
    .from('counselors')
    .select('*')
    .eq('is_default', true)
    .order('sort_order', { ascending: true })
  if (error) {
    console.error('getDefaultCabinet error:', error)
    return []
  }
  return (data ?? []) as Counselor[]
}

// ----------------------------------------------------------------
// PREMIUM STATUS
// ----------------------------------------------------------------

export async function getIsPremium(): Promise<boolean> {
  // Dev mode override
  const devOverride = getDevPremiumOverride();
  if (devOverride !== null) return devOverride;

  const userId = await getUserId();
  if (!userId) return false;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', userId)
      .single();
    if (error) return false;
    return data?.is_premium ?? false;
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------
// GOALS
// ----------------------------------------------------------------

export async function getGoals(userId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function upsertGoal(goal: Partial<Goal> & { user_id: string }): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .upsert(goal)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function completeGoal(goalId: string): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq('id', goalId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteGoal(goalId: string): Promise<void> {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', goalId)
  if (error) throw error
}

// ----------------------------------------------------------------
// ROUTINE TEMPLATES
// ----------------------------------------------------------------

export type RoutineTemplate = {
  id: string
  user_id: string
  type: 'morning' | 'evening'
  title: string
  emoji: string | null
  sort_order: number
  created_at: string
}

export async function getRoutineTemplates(type: 'morning' | 'evening'): Promise<RoutineTemplate[]> {
  const userId = await getUserId()
  if (!userId) return []
  try {
    const { data, error } = await supabase
      .from('routine_templates')
      .select('*')
      .eq('user_id', userId)
      .eq('type', type)
      .order('sort_order', { ascending: true })
    if (error) {
      console.error('getRoutineTemplates error:', error)
      return []
    }
    return data ?? []
  } catch (e) {
    console.error('getRoutineTemplates exception:', e)
    return []
  }
}

export async function addRoutineTemplate(
  type: 'morning' | 'evening',
  title: string,
  emoji?: string,
  sortOrder?: number
): Promise<RoutineTemplate | null> {
  const userId = await getUserId()
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('routine_templates')
      .insert({ user_id: userId, type, title, emoji: emoji ?? null, sort_order: sortOrder ?? 0 })
      .select()
      .single()
    if (error) {
      console.error('addRoutineTemplate error:', error)
      return null
    }
    return data
  } catch (e) {
    console.error('addRoutineTemplate exception:', e)
    return null
  }
}

export async function deleteRoutineTemplate(id: string): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  try {
    const { error } = await supabase
      .from('routine_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) console.error('deleteRoutineTemplate error:', error)
  } catch (e) {
    console.error('deleteRoutineTemplate exception:', e)
  }
}

// ----------------------------------------------------------------
// CONVERSATION MEMORY
// ----------------------------------------------------------------

export async function getConversationMemory(counselorSlug: string): Promise<string | null> {
  const userId = await getUserId();
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('conversation_memory')
      .select('summary')
      .eq('user_id', userId)
      .eq('counselor_slug', counselorSlug)
      .maybeSingle();
    if (error) {
      console.error('getConversationMemory error:', error);
      return null;
    }
    return data?.summary ?? null;
  } catch (e) {
    console.error('getConversationMemory exception:', e);
    return null;
  }
}

export async function saveConversationMemory(counselorSlug: string, summary: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  try {
    const { error } = await supabase
      .from('conversation_memory')
      .upsert(
        { user_id: userId, counselor_slug: counselorSlug, summary, last_updated: new Date().toISOString() },
        { onConflict: 'user_id,counselor_slug' }
      );
    if (error) console.error('saveConversationMemory error:', error);
  } catch (e) {
    console.error('saveConversationMemory exception:', e);
  }
}

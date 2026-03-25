import { supabase } from './supabase'
import { getDevPremiumOverride } from './devMode'
import type {
  UserSettings,
  DailyCheckin,
  JournalEntry,
  ThreadMessage,
  ReadingData,
  Counselor,
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
  return new Date().toISOString().split('T')[0]
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

export async function getThread(threadId: string): Promise<ThreadMessage[]> {
  if (threadId === 'cabinet') {
    const data = await getCabinetConversation();
    return (data?.messages ?? []) as ThreadMessage[];
  }
  return []
}

export async function upsertThread(threadId: string, messages: ThreadMessage[]): Promise<void> {
  if (threadId === 'cabinet') {
    await saveCabinetConversation(messages);
    return;
  }
  // no-op: other threads are stored locally, not in Supabase
}

// ----------------------------------------------------------------
// READING DATA (not stored in Supabase — stub)
// ----------------------------------------------------------------

export async function getReadingData(): Promise<ReadingData | null> {
  console.warn('getReadingData: reading_data table does not exist in Supabase')
  return null
}

export async function upsertReadingData(_data: Partial<Omit<ReadingData, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<void> {
  // no-op: reading_data table does not exist in Supabase
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

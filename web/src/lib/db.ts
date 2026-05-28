import { supabase } from './supabase'
import { getDevPremiumOverride } from './devMode'
import type {
  UserSettings,
  JournalEntry,
  ThreadMessage,
  ReadingData,
  Counselor,
  CabinetConversation,
  ConversationMessage,
  Belief,
  Goal,
  Scroll,
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

// Returns YYYY-MM-DD in the user's LOCAL timezone (not UTC).
// Using toISOString() was wrong: at 10 pm US Eastern, UTC is already
// the next calendar day, so tasks got written to tomorrow's row and
// would still appear "done" the following morning.
function localDateStr(d: Date = new Date()): string {
  const year  = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day   = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function today(): string {
  return localDateStr()
}

function yesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return localDateStr(d)
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
// CHECK-INS (check_ins table)
// ----------------------------------------------------------------

export async function getTodayCheckin(): Promise<Record<string, unknown> | null> {
  const userId = await getUserId()
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', userId)
      .eq('check_in_date', today())
      .maybeSingle()
    if (error) {
      console.error('getTodayCheckin error:', error)
      return null
    }
    return data ?? null
  } catch (e) {
    console.error('getTodayCheckin exception:', e)
    return null
  }
}

export async function upsertTodayCheckin(data: Record<string, unknown>): Promise<void> {
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

export async function getDailyQuestionCache(): Promise<{ counselorSlug: string; response: string } | null> {
  const userId = await getUserId()
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('check_ins')
      .select('daily_question_counselor, daily_question_response')
      .eq('user_id', userId)
      .eq('check_in_date', today())
      .maybeSingle()
    if (error) {
      console.error('getDailyQuestionCache error:', error)
      return null
    }
    if (data?.daily_question_counselor && data?.daily_question_response) {
      return { counselorSlug: data.daily_question_counselor as string, response: data.daily_question_response as string }
    }
    return null
  } catch (e) {
    console.error('getDailyQuestionCache exception:', e)
    return null
  }
}

/** @deprecated Use getTodayCheckin + checkin.morning_done / checkin.evening_done */
export async function hasCheckInToday(type: 'morning' | 'evening'): Promise<boolean> {
  const checkin = await getTodayCheckin()
  if (!checkin) return false
  return type === 'morning'
    ? Boolean(checkin.morning_done)
    : Boolean(checkin.evening_done)
}

/** @deprecated Use getTodayCheckin directly */
export async function getLatestCheckIn(type: 'morning' | 'evening'): Promise<{ cabinet_response: string; user_input: string; check_in_date: string } | null> {
  const checkin = await getTodayCheckin()
  if (!checkin) return null
  const done = type === 'morning' ? checkin.morning_done : checkin.evening_done
  if (!done) return null
  const cabinet_response = (type === 'morning'
    ? checkin.cabinet_morning_response
    : checkin.cabinet_evening_response) as string | null
  if (!cabinet_response) return null
  return { cabinet_response, user_input: '', check_in_date: checkin.check_in_date as string }
}

export async function createCheckIn(type: 'morning' | 'evening', _userInput: string, cabinetResponse: string): Promise<void> {
  if (type === 'morning') {
    await upsertTodayCheckin({ cabinet_morning_response: cabinetResponse, morning_done: true })
  } else {
    await upsertTodayCheckin({ cabinet_evening_response: cabinetResponse, evening_done: true })
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
  dialogue_history: { role: 'user' | 'cabinet'; content: string; timestamp: number }[];
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

export async function getLegacyBeliefs() {
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

export async function saveCabinetConversation(messages: ThreadMessage[]) {
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
      .maybeSingle()
    if (error) {
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
// CALENDAR DATA
// ----------------------------------------------------------------

export async function getCalendarData(): Promise<Record<string, { morning: boolean; evening: boolean }>> {
  const userId = await getUserId()
  if (!userId) return {}
  try {
    const { data, error } = await supabase
      .from('calendar_data')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) {
      console.error('getCalendarData error:', error)
      return {}
    }
    return (data?.data as Record<string, { morning: boolean; evening: boolean }>) ?? {}
  } catch (e) {
    console.error('getCalendarData exception:', e)
    return {}
  }
}

export async function upsertCalendarData(calendarData: Record<string, { morning: boolean; evening: boolean }>): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  try {
    const { error } = await supabase
      .from('calendar_data')
      .upsert(
        { data: calendarData, user_id: userId, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    if (error) console.error('upsertCalendarData error:', error)
  } catch (e) {
    console.error('upsertCalendarData exception:', e)
  }
}

// ----------------------------------------------------------------
// COUNSELORS
// ----------------------------------------------------------------

const FUTURE_SELF_SLUG = 'futureSelf';

// Default cabinet slugs — matches is_default=true counselors in the DB
const DEFAULT_CABINET_SLUGS = ['marcus-aurelius', 'epictetus', 'david-goggins', 'theodore-roosevelt'];

// Fetch all counselors from the database
export async function getCounselors(): Promise<Counselor[]> {
  const { data, error } = await supabase
    .from('counselors')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('getCounselors error:', error);
    return [];
  }
  return (data ?? []) as Counselor[];
}

// Fetch counselors by category
export async function getCounselorsByCategory(category: string): Promise<Counselor[]> {
  const { data, error } = await supabase
    .from('counselors')
    .select('*')
    .eq('category', category)
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('getCounselorsByCategory error:', error);
    return [];
  }
  return (data ?? []) as Counselor[];
}

// Fetch counselors by an array of slugs (the user's current cabinet)
export async function getCounselorsBySlugs(slugs: string[]): Promise<Counselor[]> {
  if (slugs.length === 0) return [];
  const { data, error } = await supabase
    .from('counselors')
    .select('*')
    .in('slug', slugs);
  if (error) {
    console.error('getCounselorsBySlugs error:', error);
    return [];
  }
  return (data ?? []) as Counselor[];
}

// Fetch the user's current cabinet as full Counselor objects
// (Reads from user_settings.cabinet_members, filters out 'futureSelf' which is handled separately)
export async function getUserCabinet(): Promise<Counselor[]> {
  const settings = await getUserSettings();
  const members: string[] = settings?.cabinet_members ?? DEFAULT_CABINET_SLUGS;
  const counselorSlugs = members.filter(m => m !== FUTURE_SELF_SLUG);
  return getCounselorsBySlugs(counselorSlugs);
}

// Save the user's cabinet selection (writes slugs back to cabinet_members)
// futureSelf is always appended automatically
export async function saveCabinetSelection(slugs: string[]): Promise<void> {
  const members = [...slugs.filter(s => s !== FUTURE_SELF_SLUG), FUTURE_SELF_SLUG];
  await upsertUserSettings({ cabinet_members: members });
}

// Fetch the default cabinet (is_default = true counselors)
export async function getDefaultCabinet(): Promise<Counselor[]> {
  const { data, error } = await supabase
    .from('counselors')
    .select('*')
    .eq('is_default', true)
    .order('sort_order', { ascending: true });
  if (error) {
    console.error('getDefaultCabinet error:', error);
    return [];
  }
  return (data ?? []) as Counselor[];
}

// Check if current user is premium.
// Unlocked when:  tier === 'premium' | tier === 'scholar' | is_premium === true
// Locked when:    tier === 'free' AND is_premium === false (or both absent)
export async function getIsPremium(): Promise<boolean> {
  // Dev mode override
  const devOverride = getDevPremiumOverride();
  if (devOverride !== null) return devOverride;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase
    .from('profiles')
    .select('is_premium, tier')
    .eq('id', user.id)
    .single();
  if (error) return false;
  const tier: string = data?.tier ?? 'free';
  const isPrem: boolean = data?.is_premium ?? false;
  return isPrem || tier === 'premium' || tier === 'scholar';
}

// ----------------------------------------------------------------
// CABINET CONVERSATIONS (new structured API)
// ----------------------------------------------------------------

export async function getConversations(userId: string): Promise<CabinetConversation[]> {
  const { data, error } = await supabase
    .from('cabinet_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getConversations error:', error);
    return [];
  }
  return (data ?? []) as CabinetConversation[];
}

export async function getConversation(id: string): Promise<CabinetConversation | null> {
  const { data, error } = await supabase
    .from('cabinet_conversations')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    console.error('getConversation error:', error);
    return null;
  }
  return data as CabinetConversation;
}

export async function createConversation(counselorSlugs: string[]): Promise<CabinetConversation> {
  const userId = await getUserId();
  if (!userId) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('cabinet_conversations')
    .insert({ user_id: userId, counselor_slugs: counselorSlugs, messages: [] })
    .select()
    .single();
  if (error) throw error;
  return data as CabinetConversation;
}

export async function appendMessage(conversationId: string, message: ConversationMessage): Promise<void> {
  // Fetch current messages, append, update
  const conversation = await getConversation(conversationId);
  if (!conversation) throw new Error('Conversation not found');
  const updatedMessages = [...conversation.messages, message];
  const { error } = await supabase
    .from('cabinet_conversations')
    .update({ messages: updatedMessages, updated_at: new Date().toISOString() })
    .eq('id', conversationId);
  if (error) throw error;
}

// ----------------------------------------------------------------
// BELIEFS
// ----------------------------------------------------------------

export async function getBeliefs(userId: string): Promise<Belief[]> {
  const { data, error } = await supabase
    .from('beliefs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getBeliefs error:', error);
    return [];
  }
  return (data ?? []) as Belief[];
}

export async function createBelief(content: string, category: string): Promise<Belief> {
  const userId = await getUserId();
  if (!userId) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('beliefs')
    .insert({ user_id: userId, content, category, encoded: false })
    .select()
    .single();
  if (error) throw error;
  return data as Belief;
}

export async function updateBelief(id: string, updates: Partial<Belief>): Promise<Belief> {
  const { data, error } = await supabase
    .from('beliefs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Belief;
}

export async function deleteBelief(id: string): Promise<void> {
  const { error } = await supabase
    .from('beliefs')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function encodeBelief(id: string): Promise<Belief> {
  return updateBelief(id, { encoded: true });
}

// ----------------------------------------------------------------
// PROFILE STREAK
// ----------------------------------------------------------------

export async function getProfileStreak(): Promise<number> {
  const userId = await getUserId()
  if (!userId) return 0
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('streak')
      .eq('id', userId)
      .single()
    if (error) return 0
    return data?.streak ?? 0
  } catch {
    return 0
  }
}

/** Fetch the check-in row for yesterday (local date). */
export async function getYesterdayCheckin(): Promise<Record<string, unknown> | null> {
  const userId = await getUserId()
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', userId)
      .eq('check_in_date', yesterday())
      .maybeSingle()
    if (error) {
      console.error('getYesterdayCheckin error:', error)
      return null
    }
    return data ?? null
  } catch (e) {
    console.error('getYesterdayCheckin exception:', e)
    return null
  }
}

/**
 * Atomically increment profiles.streak by 1 for today, guarded by
 * streak_last_incremented_date so multiple devices on the same calendar
 * day only increment once.
 *
 * Strategy:
 *   1. Read current streak + last incremented date.
 *   2. If already today → skip, return current value.
 *   3. UPDATE with a WHERE guard (date IS NULL OR date < today).
 *      Postgres evaluates this atomically: the second device to race
 *      will see date = today and update 0 rows.
 *   4. If 0 rows updated → another device won; re-fetch and return.
 */
export async function incrementProfileStreak(): Promise<number> {
  const userId = await getUserId()
  if (!userId) return 0
  try {
    const todayStr = localDateStr()

    // Step 1 — read current values
    const { data: cur, error: readErr } = await supabase
      .from('profiles')
      .select('streak, streak_last_incremented_date')
      .eq('id', userId)
      .single()
    if (readErr || !cur) return 0

    // Step 2 — already incremented today on another device
    if (cur.streak_last_incremented_date === todayStr) {
      return cur.streak ?? 0
    }

    const newStreak = (cur.streak ?? 0) + 1

    // Step 3 — atomic update guarded by date
    const { data: updated, error: writeErr } = await supabase
      .from('profiles')
      .update({ streak: newStreak, streak_last_incremented_date: todayStr })
      .eq('id', userId)
      .or(`streak_last_incremented_date.is.null,streak_last_incremented_date.lt.${todayStr}`)
      .select('streak')

    if (writeErr) {
      console.error('incrementProfileStreak write error:', writeErr)
      return cur.streak ?? 0
    }

    // Step 4 — we won the race
    if (updated && updated.length > 0) {
      return (updated[0] as { streak: number }).streak ?? newStreak
    }

    // Another device already incremented — re-fetch the true current value
    const { data: refetched } = await supabase
      .from('profiles')
      .select('streak')
      .eq('id', userId)
      .single()
    return refetched?.streak ?? newStreak
  } catch (e) {
    console.error('incrementProfileStreak exception:', e)
    return 0
  }
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
    if (error) { console.error('getRoutineTemplates error:', error); return [] }
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
    if (error) { console.error('addRoutineTemplate error:', error); return null }
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
// GOALS
// ----------------------------------------------------------------

export async function getGoals(userId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) { console.error('getGoals error:', error); return [] }
  return data ?? []
}

export async function upsertGoal(goal: Partial<Goal> & { user_id: string }): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .upsert(goal)
    .select()
    .single()
  if (error) throw error
  return data as Goal
}

export async function completeGoal(goalId: string): Promise<void> {
  const { error } = await supabase
    .from('goals')
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq('id', goalId)
  if (error) throw error
}

export async function deleteGoal(goalId: string): Promise<void> {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', goalId)
  if (error) throw error
}

// ----------------------------------------------------------------
// SCROLLS
// ----------------------------------------------------------------

export async function getScrolls(userId: string): Promise<Scroll[]> {
  const { data, error } = await supabase
    .from('scrolls')
    .select('*, scroll_reads (read_count, last_read_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) { console.error('getScrolls error:', error); return [] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    ...row,
    read_count: row.scroll_reads?.[0]?.read_count ?? 0,
    last_read_at: row.scroll_reads?.[0]?.last_read_at ?? null,
    scroll_reads: undefined,
  }))
}

// ----------------------------------------------------------------
// ONBOARDING / KNOW THYSELF
// ----------------------------------------------------------------

/** Returns true if the user has completed the Future Self onboarding. */
export async function getKnowThyselfComplete(): Promise<boolean> {
  const userId = await getUserId()
  if (!userId) return false
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('know_thyself_complete')
      .eq('id', userId)
      .single()
    if (error) return false
    return data?.know_thyself_complete ?? false
  } catch {
    return false
  }
}

export interface OnboardingProfile {
  identity?: string
  goals?: string
  obstacle?: string
  virtues?: string
  challenge_style?: string
  work_meaning?: string
  future_vision?: string
  future_years?: number
}

/**
 * Saves extracted onboarding profile fields to user_settings and marks
 * know_thyself_complete = true on profiles.
 */
export async function saveOnboardingProfile(profile: OnboardingProfile): Promise<void> {
  const userId = await getUserId()
  if (!userId) return

  // Map extract_profile fields → existing user_settings columns
  const settingsUpdate: Record<string, unknown> = {}
  if (profile.identity)       settingsUpdate.kt_identity = profile.identity
  if (profile.goals)          settingsUpdate.kt_goals = profile.goals
  if (profile.obstacle)       settingsUpdate.kt_weaknesses = profile.obstacle
  if (profile.virtues)        settingsUpdate.kt_strengths = profile.virtues
  if (profile.challenge_style) settingsUpdate.feedback_preference = profile.challenge_style
  if (profile.work_meaning)   settingsUpdate.kt_background = profile.work_meaning
  if (profile.future_vision)  settingsUpdate.future_self_description = profile.future_vision
  if (profile.future_years)   settingsUpdate.future_self_years = profile.future_years

  // Write to user_settings
  try {
    const { error } = await supabase
      .from('user_settings')
      .upsert(
        { ...settingsUpdate, user_id: userId, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    if (error) console.error('saveOnboardingProfile user_settings error:', error)
  } catch (e) {
    console.error('saveOnboardingProfile user_settings exception:', e)
  }

  // Mark complete on profiles
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ know_thyself_complete: true, updated_at: new Date().toISOString() })
      .eq('id', userId)
    if (error) console.error('saveOnboardingProfile profiles error:', error)
  } catch (e) {
    console.error('saveOnboardingProfile profiles exception:', e)
  }
}

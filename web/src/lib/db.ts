import { supabase } from './supabase'
import { getDevPremiumOverride } from './devMode'
import { getUserScrolls } from './scrolls'
import type {
  UserSettings,
  DailyCheckin,
  JournalEntry,
  ThreadMessage,
  ReadingData,
  Counselor,
  Goal,
  Scroll,
  SubscriptionTier,
  LongitudinalPortrait,
  WeeklyReview,
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

export async function getTodayCheckin(): Promise<DailyCheckin | null> {
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
    return (data as DailyCheckin | null) ?? null
  } catch (e) {
    console.error('getTodayCheckin exception:', e)
    return null
  }
}

export async function upsertTodayCheckin(
  data: Partial<Omit<DailyCheckin, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<void> {
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

/** Warms today's counselor question so the Cabinet can serve it instantly. */
export async function saveDailyQuestionCache(counselorSlug: string, response: string): Promise<void> {
  await upsertTodayCheckin({
    daily_question_counselor: counselorSlug,
    daily_question_response: response,
  })
}

/** Check-in rows between two LOCAL YYYY-MM-DD dates, inclusive, ascending. */
export async function getCheckinsRange(startISO: string, endISO: string): Promise<DailyCheckin[]> {
  const userId = await getUserId()
  if (!userId) return []
  try {
    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', userId)
      .gte('check_in_date', startISO)
      .lte('check_in_date', endISO)
      .order('check_in_date', { ascending: true })
    if (error) {
      console.error('getCheckinsRange error:', error)
      return []
    }
    return (data ?? []) as DailyCheckin[]
  } catch (e) {
    console.error('getCheckinsRange exception:', e)
    return []
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
  const cabinet_response = type === 'morning'
    ? checkin.cabinet_morning_response
    : checkin.cabinet_evening_response
  if (!cabinet_response) return null
  return { cabinet_response, user_input: '', check_in_date: checkin.check_in_date }
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

  // Local date, not UTC: at 10pm US Eastern toISOString() is already tomorrow,
  // which produced a second "today" row every late evening. And the group
  // thread is the row with counselor_slugs IS NULL — without that filter a
  // per-counselor row can be returned as "the cabinet".
  const { data: existing } = await supabase
    .from('cabinet_conversations')
    .select('id')
    .eq('user_id', userId)
    .is('counselor_slugs', null)
    .gte('created_at', today())
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
    .is('counselor_slugs', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) console.error('getCabinetConversation error:', error);
  return data;
}

// ----------------------------------------------------------------
// PER-COUNSELOR CONVERSATIONS (1:1 threads)
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

export async function saveCounselorConversation(counselorId: string, messages: ThreadMessage[]) {
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
  }

  const { data, error } = await supabase
    .from('cabinet_conversations')
    .insert({ user_id: userId, counselor_slugs: [counselorId], messages })
    .select()
    .single();
  if (error) console.error('saveCounselorConversation error:', error);
  return data;
}

// The conversation row id doubles as the shared-session id when inviting a
// partner (same contract as the mobile app).
export async function getOrCreateCabinetConversationId(): Promise<string | null> {
  const existing = await getCabinetConversation();
  if (existing?.id) return existing.id as string;
  const created = await saveCabinetConversation([]);
  return (created?.id as string) ?? null;
}

// ----------------------------------------------------------------
// CABINET THREADS
// ----------------------------------------------------------------

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

export const FUTURE_SELF_SLUG = 'futureSelf';

// The cabinet a new account starts with, and the fallback for a free-tier
// user whose saved cabinet contains nothing they are entitled to. These are
// the short slugs the `counselors` table is actually seeded with.
export const STARTER_CABINET_SLUGS = ['marcus', 'roosevelt'] as const;
export const DEFAULT_CABINET_SLUGS: string[] = ['marcus', 'roosevelt'];

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
  const [settings, tier] = await Promise.all([getUserSettings(), getSubscriptionTier()]);
  const members: string[] = settings?.cabinet_members ?? DEFAULT_CABINET_SLUGS;
  let counselorSlugs = members.filter(m => m !== FUTURE_SELF_SLUG);
  if (tier === 'free') {
    counselorSlugs = counselorSlugs.filter(s => (FREE_COUNSELOR_SLUGS as readonly string[]).includes(s));
    if (counselorSlugs.length === 0) counselorSlugs = [...DEFAULT_CABINET_SLUGS];
  }
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

// ----------------------------------------------------------------
// SUBSCRIPTION TIER
// ----------------------------------------------------------------

// Must stay a superset of STARTER/DEFAULT_CABINET_SLUGS (the free-tier
// fallback). 3 counselors, matching the paywall table — epictetus moved
// behind the paywall 2026-08-28; Marcus carries the free Stoic voice.
export const FREE_COUNSELOR_SLUGS = ['marcus', 'goggins', 'roosevelt'] as const;

export const MESSAGE_LIMITS: Record<SubscriptionTier, number | null> = {
  free: 10,
  premium: 50,
  pro: null,
};

export const MAX_TOKENS_BY_TIER: Record<SubscriptionTier, number> = {
  free: 400,
  premium: 600,
  pro: 1000,
};

/**
 * Collapse a raw profiles.tier value into the canonical vocabulary.
 * 'arete' and 'scholar' are legacy spellings of premium that still exist in
 * older rows; anything unrecognized is treated as free so an unknown value
 * can never accidentally unlock a paid tier.
 */
export function normalizeTier(raw: unknown, isPremium?: boolean | null): SubscriptionTier {
  const value = typeof raw === 'string' ? raw.toLowerCase() : '';
  if (value === 'pro') return 'pro';
  if (value === 'premium' || value === 'arete' || value === 'scholar') return 'premium';
  // is_premium is the second half of the same OR logic — a row flagged
  // premium without a tier still unlocks.
  return isPremium ? 'premium' : 'free';
}

export async function getSubscriptionTier(): Promise<SubscriptionTier> {
  // Dev mode override: simulating free tier must also collapse the tier,
  // not just the boolean, or the two disagree.
  const devOverride = getDevPremiumOverride();
  if (devOverride === false) return 'free';

  const userId = await getUserId();
  if (!userId) return 'free';
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('tier, is_premium')
      .eq('id', userId)
      .single();
    if (error) return 'free';
    return normalizeTier(data?.tier, data?.is_premium);
  } catch {
    return 'free';
  }
}

/** True for every paid tier. Never write entitlement from the client. */
export async function getIsPremium(): Promise<boolean> {
  // Dev mode override
  const devOverride = getDevPremiumOverride();
  if (devOverride !== null) return devOverride;
  return (await getSubscriptionTier()) !== 'free';
}

export interface MessageLimitStatus {
  allowed: boolean;
  tier: SubscriptionTier;
  used: number;
  limit: number | null;
}

/**
 * Client-side daily quota accounting against profiles.daily_message_count,
 * keyed on the LOCAL date. The server enforces its own atomic counter
 * (try_increment_message_count, UTC) — this one exists so the UI can show a
 * limit before the round trip and so a blocked send costs nothing.
 */
export async function checkAndIncrementMessageCount(): Promise<MessageLimitStatus> {
  const userId = await getUserId();
  if (!userId) return { allowed: false, tier: 'free', used: 0, limit: 10 };

  const { data, error } = await supabase
    .from('profiles')
    .select('tier, is_premium, daily_message_count, message_count_date')
    .eq('id', userId)
    .single();

  if (error || !data) return { allowed: false, tier: 'free', used: 0, limit: 10 };

  const tier = normalizeTier(data.tier, data.is_premium);
  const limit = MESSAGE_LIMITS[tier];

  // Pro tier: unlimited — no counting needed
  if (limit === null) return { allowed: true, tier, used: 0, limit: null };

  const todayStr = today();
  const isToday = data.message_count_date === todayStr;
  const currentCount = isToday ? (data.daily_message_count ?? 0) : 0;

  if (currentCount >= limit) return { allowed: false, tier, used: currentCount, limit };

  const newCount = currentCount + 1;
  await supabase
    .from('profiles')
    .update({ daily_message_count: newCount, message_count_date: todayStr })
    .eq('id', userId);

  return { allowed: true, tier, used: newCount, limit };
}

// ----------------------------------------------------------------
// PROFILE STREAK
// ----------------------------------------------------------------

/** Add n days to a YYYY-MM-DD string, returning YYYY-MM-DD (local). */
function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return localDateStr(dt)
}

/**
 * The "Days of Discipline" streak breaks only after TWO consecutive
 * fully-missed days — days on which neither the morning nor the evening
 * routine was completed (a missing check-in row counts as fully missed).
 * A single off-day is forgiven, and any day with partial engagement
 * (e.g. morning only) keeps the chain alive.
 *
 * Examines every completed calendar day strictly after `lastDate` and
 * strictly before today; today is in progress and never counts against you.
 *
 * Keep in sync with the mobile twin in lib/db.ts.
 */
async function streakBrokenSince(userId: string, lastDate: string): Promise<boolean> {
  const todayStr = today()
  let cursor = addDays(lastDate, 1)
  if (cursor >= todayStr) return false // no fully-elapsed days in between

  const { data: rows } = await supabase
    .from('check_ins')
    .select('check_in_date, morning_done, evening_done')
    .eq('user_id', userId)
    .gt('check_in_date', lastDate)
    .lt('check_in_date', todayStr)

  const engaged = new Set<string>()
  for (const r of rows ?? []) {
    if (r.morning_done || r.evening_done) engaged.add(r.check_in_date as string)
  }

  let consecutiveMissed = 0
  while (cursor < todayStr) {
    if (engaged.has(cursor)) {
      consecutiveMissed = 0
    } else {
      consecutiveMissed += 1
      if (consecutiveMissed >= 2) return true
    }
    cursor = addDays(cursor, 1)
  }
  return false
}

/**
 * Called on page load. The streak resets to 0 only after two consecutive
 * fully-missed days (see streakBrokenSince) — a single off-day is forgiven.
 * Display/reset only: this never increments.
 */
export async function checkAndResetStreakIfMissed(): Promise<number> {
  const userId = await getUserId()
  if (!userId) return 0
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('streak, streak_last_incremented_date')
      .eq('id', userId)
      .single()
    if (error || !data) return 0

    const streak = data.streak ?? 0
    const lastDate: string | null = data.streak_last_incremented_date

    // Nothing to lose, or the streak was never started
    if (streak === 0 || !lastDate) return streak

    // Completed yesterday or today — definitely safe, skip the lookup
    if (lastDate >= yesterday()) return streak

    // Otherwise only break the streak on two consecutive fully-missed days
    if (await streakBrokenSince(userId, lastDate)) {
      await supabase
        .from('profiles')
        .update({ streak: 0 })
        .eq('id', userId)
      return 0
    }

    return streak
  } catch {
    return 0
  }
}

/**
 * Award today's streak day once BOTH routines are complete. Mirrors the
 * mobile app (lib/db.ts) so both platforms agree on what earns a day:
 * the increment happens at completion time, never on page load.
 */
export async function incrementStreak(): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  try {
    const todayCheckin = await getTodayCheckin()

    // Both routines must be complete
    if (!todayCheckin?.morning_done || !todayCheckin?.evening_done) return

    const todayStr = today()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('streak, streak_last_incremented_date')
      .eq('id', userId)
      .single()
    if (error) return

    // Already incremented today — bail out
    if (profile?.streak_last_incremented_date === todayStr) return

    // Streak continues as long as it wasn't broken (two consecutive
    // fully-missed days) since the last completed day; a single off-day is
    // forgiven. Otherwise it restarts at 1.
    const lastDate: string | null = profile?.streak_last_incremented_date ?? null
    const streakContinues = !!lastDate && !(await streakBrokenSince(userId, lastDate))
    const newStreak = streakContinues ? (profile.streak ?? 0) + 1 : 1

    // WHERE guard keeps two devices racing on the same day to one increment
    await supabase
      .from('profiles')
      .update({ streak: newStreak, streak_last_incremented_date: todayStr })
      .eq('id', userId)
      .or(`streak_last_incremented_date.is.null,streak_last_incremented_date.lt.${todayStr}`)
  } catch (e) {
    console.error('incrementStreak error:', e)
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

/** @deprecated Alias kept for the existing /scrolls page — use getUserScrolls from lib/scrolls. */
export async function getScrolls(userId: string): Promise<Scroll[]> {
  return getUserScrolls(userId)
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


// ----------------------------------------------------------------
// PROFILE STREAK (read)
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

// ----------------------------------------------------------------
// KNOW THYSELF PROFILE (feeds the server's [KNOW THYSELF] block)
// ----------------------------------------------------------------

export async function getKnowThyselfProfile(): Promise<Record<string, string | null>> {
  const settings = await getUserSettings()
  if (!settings) return {}
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
  }
}

/** A random quote drawn from the counselors actually in the user's cabinet. */
export async function getRandomCabinetQuote(
  cabinetSlugs: string[]
): Promise<{ quote: string; counselor: string } | null> {
  if (cabinetSlugs.length === 0) return null
  const { data, error } = await supabase
    .from('counselors')
    .select('name, quotes')
    .in('slug', cabinetSlugs)
  if (error) {
    console.error('getRandomCabinetQuote error:', error)
    return null
  }

  const allQuotes = (data ?? []).flatMap((c) =>
    ((c.quotes as string[]) ?? []).map((q) => ({ quote: q, counselor: c.name as string }))
  )
  if (allQuotes.length === 0) return null
  return allQuotes[Math.floor(Math.random() * allQuotes.length)]
}

// ----------------------------------------------------------------
// CONVERSATION MEMORY
// ----------------------------------------------------------------

export async function getConversationMemory(counselorSlug: string): Promise<string | null> {
  const userId = await getUserId()
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('conversation_memory')
      .select('summary')
      .eq('user_id', userId)
      .eq('counselor_slug', counselorSlug)
      .maybeSingle()
    if (error) {
      console.error('getConversationMemory error:', error)
      return null
    }
    return data?.summary ?? null
  } catch (e) {
    console.error('getConversationMemory exception:', e)
    return null
  }
}

export async function saveConversationMemory(counselorSlug: string, summary: string): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  try {
    const { error } = await supabase
      .from('conversation_memory')
      .upsert(
        { user_id: userId, counselor_slug: counselorSlug, summary, last_updated: new Date().toISOString() },
        { onConflict: 'user_id,counselor_slug' }
      )
    if (error) console.error('saveConversationMemory error:', error)
  } catch (e) {
    console.error('saveConversationMemory exception:', e)
  }
}

// ----------------------------------------------------------------
// LONGITUDINAL PORTRAIT
// ----------------------------------------------------------------

// The user's living philosophical portrait, or null if the weekly agent hasn't
// built one yet (it skips users below min_weeks_required, currently 4 weeks of
// journal analysis). Callers must treat null as "not enough history yet", not
// as an error. Read-only: RLS grants SELECT on own row and nothing more.
export async function getLongitudinalPortrait(): Promise<LongitudinalPortrait | null> {
  const userId = await getUserId()
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('user_longitudinal_models')
      .select(
        'persistent_themes, emerging_themes, fading_themes, growth_edges, ' +
        'counselor_affinity, preferred_entry_types, ' +
        'dominant_philosophical_orientation, emotional_tone_baseline, self_disclosure_depth, ' +
        'philosophical_portrait, portrait_updated_at, delta_summary, ' +
        'weeks_analyzed, first_analyzed_at, last_analyzed_at'
      )
      .eq('user_id', userId)
      .maybeSingle()
    if (error) {
      console.error('getLongitudinalPortrait error:', error)
      return null
    }
    return (data as unknown as LongitudinalPortrait) ?? null
  } catch (e) {
    console.error('getLongitudinalPortrait exception:', e)
    return null
  }
}

// Prior portrait states, newest first — the arc of how the portrait itself
// changed. Empty until the agent has overwritten at least once.
export async function getPortraitHistory(): Promise<
  { snapshot_date: string; delta_summary: string | null; model_snapshot: LongitudinalPortrait }[]
> {
  const userId = await getUserId()
  if (!userId) return []
  try {
    const { data, error } = await supabase
      .from('longitudinal_model_history')
      .select('snapshot_date, delta_summary, model_snapshot')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
    if (error) {
      console.error('getPortraitHistory error:', error)
      return []
    }
    return (data ?? []) as unknown as {
      snapshot_date: string
      delta_summary: string | null
      model_snapshot: LongitudinalPortrait
    }[]
  } catch (e) {
    console.error('getPortraitHistory exception:', e)
    return []
  }
}

// ----------------------------------------------------------------
// WEEKLY REVIEWS
// ----------------------------------------------------------------

/** The user's stored Weekly Reviews, newest first (max 12). */
export async function getWeeklyReviews(): Promise<WeeklyReview[]> {
  const userId = await getUserId()
  if (!userId) return []
  try {
    const { data, error } = await supabase
      .from('weekly_reviews')
      .select('id, week_start, week_end, generated_review, created_at')
      .eq('user_id', userId)
      .order('week_start', { ascending: false })
      .limit(12)
    if (error) {
      console.error('getWeeklyReviews error:', error)
      return []
    }
    return (data ?? []) as WeeklyReview[]
  } catch (e) {
    console.error('getWeeklyReviews exception:', e)
    return []
  }
}

export async function saveWeeklyReview(review: {
  week_start: string
  week_end: string
  generated_review: string
}): Promise<WeeklyReview | null> {
  const userId = await getUserId()
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('weekly_reviews')
      .insert({ ...review, user_id: userId })
      .select('id, week_start, week_end, generated_review, created_at')
      .single()
    if (error) {
      console.error('saveWeeklyReview error:', error)
      return null
    }
    return data as WeeklyReview
  } catch (e) {
    console.error('saveWeeklyReview exception:', e)
    return null
  }
}

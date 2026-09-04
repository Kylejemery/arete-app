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
  SubscriptionTier,
  LongitudinalPortrait,
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

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Add n days to a local YYYY-MM-DD string and return a YYYY-MM-DD string.
function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
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
 */
async function streakBrokenSince(userId: string, lastDate: string): Promise<boolean> {
  const todayStr = today();
  let cursor = addDays(lastDate, 1);
  if (cursor >= todayStr) return false; // no fully-elapsed days in between

  const { data: rows } = await supabase
    .from('check_ins')
    .select('check_in_date, morning_done, evening_done')
    .eq('user_id', userId)
    .gt('check_in_date', lastDate)
    .lt('check_in_date', todayStr);

  const engaged = new Set<string>();
  for (const r of rows ?? []) {
    if (r.morning_done || r.evening_done) engaged.add(r.check_in_date as string);
  }

  let consecutiveMissed = 0;
  while (cursor < todayStr) {
    if (engaged.has(cursor)) {
      consecutiveMissed = 0;
    } else {
      consecutiveMissed += 1;
      if (consecutiveMissed >= 2) return true;
    }
    cursor = addDays(cursor, 1);
  }
  return false;
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

/**
 * Called on app load. The streak resets to 0 only after two consecutive
 * fully-missed days (see streakBrokenSince) — a single off-day is forgiven.
 * Does NOT touch morning_done / evening_done on check_ins.
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

    await supabase
      .from('profiles')
      .update({ streak: newStreak, streak_last_incremented_date: todayStr })
      .eq('id', userId)
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
// DAILY QUESTION CACHE
// ----------------------------------------------------------------

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
      return { counselorSlug: data.daily_question_counselor, response: data.daily_question_response }
    }
    return null
  } catch (e) {
    console.error('getDailyQuestionCache exception:', e)
    return null
  }
}

export async function saveDailyQuestionCache(counselorSlug: string, response: string): Promise<void> {
  await upsertTodayCheckin({
    daily_question_counselor: counselorSlug,
    daily_question_response: response,
  })
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

  // One solo Cabinet row per user, updated in place, found the same way
  // getCabinetConversation reads it. This used to look for a row created
  // today and insert otherwise, so each day opened a fresh row carrying a
  // copy of the whole history, and the row id (which session_participants
  // references as the shared-session id) moved out from under any invite.
  const { data: existing, error: lookupError } = await supabase
    .from('cabinet_conversations')
    .select('id')
    .eq('user_id', userId)
    .is('counselor_slugs', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  // A lookup that failed is not a missing row: inserting here would fork
  // the thread.
  if (lookupError) {
    console.error('saveCabinetConversation lookup error:', lookupError);
    throw new Error(`saveCabinetConversation: ${lookupError.message}`);
  }

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
  // A failed fetch throws rather than looking like an empty thread: every
  // load-then-save path would otherwise overwrite the history with one line.
  if (error) {
    console.error('getCabinetConversation error:', error);
    throw new Error(`getCabinetConversation: ${error.message}`);
  }
  return data;
}

/**
 * Returns the current user's group-cabinet conversation row id, creating an
 * empty row if none exists yet. Used as the shared-session id when inviting a
 * partner (session_participants.session_id references cabinet_conversations.id).
 */
export async function getOrCreateCabinetConversationId(): Promise<string | null> {
  const existing = await getCabinetConversation();
  if (existing?.id) return existing.id as string;
  const created = await saveCabinetConversation([]);
  return (created?.id as string) ?? null;
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
  if (error) {
    console.error('getCounselorConversation error:', error);
    throw new Error(`getCounselorConversation: ${error.message}`);
  }
  return data;
}

export async function saveCounselorConversation(counselorId: string, messages: any[]) {
  const userId = await getUserId();
  if (!userId) return null;

  const { data: existing, error: lookupError } = await supabase
    .from('cabinet_conversations')
    .select('id')
    .eq('user_id', userId)
    .contains('counselor_slugs', [counselorId])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lookupError) {
    console.error('saveCounselorConversation lookup error:', lookupError);
    throw new Error(`saveCounselorConversation: ${lookupError.message}`);
  }

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
export const STARTER_CABINET_SLUGS = ['marcus', 'roosevelt'] as const
const DEFAULT_CABINET_SLUGS = ['marcus', 'roosevelt']

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
  const [settings, tier] = await Promise.all([getUserSettings(), getSubscriptionTier()])
  const members: string[] = settings?.cabinet_members ?? DEFAULT_CABINET_SLUGS
  let counselorSlugs = members.filter(m => m !== FUTURE_SELF_SLUG)
  if (tier === 'free') {
    counselorSlugs = counselorSlugs.filter(s => (FREE_COUNSELOR_SLUGS as readonly string[]).includes(s))
    if (counselorSlugs.length === 0) counselorSlugs = [...DEFAULT_CABINET_SLUGS]
  }
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

// Shape returned by the /api/onboard-web extract_profile tool. Mirrors the
// web client's OnboardingProfile (web/src/lib/db.ts) — one agent, two clients.
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
 * know_thyself_complete = true on profiles. Field → column mapping is
 * identical to the web client's saveOnboardingProfile.
 */
export async function saveOnboardingProfile(profile: OnboardingProfile): Promise<void> {
  const settingsUpdate: Partial<Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>> = {}
  if (profile.identity) settingsUpdate.kt_identity = profile.identity
  if (profile.goals) settingsUpdate.kt_goals = profile.goals
  if (profile.obstacle) settingsUpdate.kt_weaknesses = profile.obstacle
  if (profile.virtues) settingsUpdate.kt_strengths = profile.virtues
  if (profile.challenge_style) settingsUpdate.feedback_preference = profile.challenge_style
  if (profile.work_meaning) settingsUpdate.kt_background = profile.work_meaning
  if (profile.future_vision) settingsUpdate.future_self_description = profile.future_vision
  if (profile.future_years) settingsUpdate.future_self_years = profile.future_years

  await upsertUserSettings(settingsUpdate)

  const userId = await getUserId()
  if (!userId) return
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
// SUBSCRIPTION TIER
// ----------------------------------------------------------------

// Must stay a superset of STARTER/DEFAULT_CABINET_SLUGS (the free-tier
// fallback). 3 counselors, matching the paywall table and TIER_LIMITS.free —
// epictetus moved behind the paywall 2026-08-28; Marcus carries the free
// Stoic voice.
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
  // is_premium is the second half of the same OR logic web's getIsPremium()
  // uses — a row flagged premium without a tier still unlocks.
  return isPremium ? 'premium' : 'free';
}

export async function getSubscriptionTier(): Promise<SubscriptionTier> {
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

export interface MessageLimitStatus {
  allowed: boolean;
  tier: SubscriptionTier;
  used: number;
  limit: number | null;
}

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
  if (limit === null) {
    return { allowed: true, tier, used: 0, limit: null };
  }

  const todayStr = today();
  const isToday = data.message_count_date === todayStr;
  const currentCount = isToday ? (data.daily_message_count ?? 0) : 0;

  if (currentCount >= limit) {
    return { allowed: false, tier, used: currentCount, limit };
  }

  const newCount = currentCount + 1;
  await supabase
    .from('profiles')
    .update({ daily_message_count: newCount, message_count_date: todayStr })
    .eq('id', userId);

  return { allowed: true, tier, used: newCount, limit };
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
      .select('tier, is_premium')
      .eq('id', userId)
      .single();
    if (error) return false;
    // Same OR logic as web's getIsPremium() — reading is_premium alone
    // missed rows carrying a paid tier without the flag set.
    return normalizeTier(data?.tier, data?.is_premium) !== 'free';
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

// ----------------------------------------------------------------
// Longitudinal portrait
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
// changed. Empty until the agent has overwritten at least once (it snapshots
// the old row before each weekly rebuild).
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
    return (data as any) ?? []
  } catch (e) {
    console.error('getPortraitHistory exception:', e)
    return []
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

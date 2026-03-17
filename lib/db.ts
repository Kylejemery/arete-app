import { supabase } from './supabase'
import type {
  UserSettings,
  DailyCheckin,
  JournalEntry,
  ThreadMessage,
  ReadingData,
  CalendarDay,
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
      .from('daily_checkins')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today())
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
      .from('daily_checkins')
      .upsert(
        { ...data, user_id: userId, date: today(), updated_at: new Date().toISOString() },
        { onConflict: 'user_id,date' }
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
// CABINET THREADS
// ----------------------------------------------------------------

export async function getThread(threadId: string): Promise<ThreadMessage[]> {
  const userId = await getUserId()
  if (!userId) return []
  try {
    const { data, error } = await supabase
      .from('cabinet_threads')
      .select('messages')
      .eq('user_id', userId)
      .eq('thread_id', threadId)
      .single()
    if (error && error.code !== 'PGRST116') {
      console.error('getThread error:', error)
      return []
    }
    return data?.messages ?? []
  } catch (e) {
    console.error('getThread exception:', e)
    return []
  }
}

export async function upsertThread(threadId: string, messages: ThreadMessage[]): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  try {
    const { error } = await supabase
      .from('cabinet_threads')
      .upsert(
        { user_id: userId, thread_id: threadId, messages, last_updated: new Date().toISOString() },
        { onConflict: 'user_id,thread_id' }
      )
    if (error) console.error('upsertThread error:', error)
  } catch (e) {
    console.error('upsertThread exception:', e)
  }
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
// CALENDAR DATA
// ----------------------------------------------------------------

export async function getCalendarData(): Promise<Record<string, CalendarDay>> {
  const userId = await getUserId()
  if (!userId) return {}
  try {
    const { data, error } = await supabase
      .from('calendar_data')
      .select('data')
      .eq('user_id', userId)
      .single()
    if (error && error.code !== 'PGRST116') {
      console.error('getCalendarData error:', error)
      return {}
    }
    return data?.data ?? {}
  } catch (e) {
    console.error('getCalendarData exception:', e)
    return {}
  }
}

export async function upsertCalendarData(calendarData: Record<string, CalendarDay>): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  try {
    const { error } = await supabase
      .from('calendar_data')
      .upsert(
        { user_id: userId, data: calendarData, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    if (error) console.error('upsertCalendarData error:', error)
  } catch (e) {
    console.error('upsertCalendarData exception:', e)
  }
}

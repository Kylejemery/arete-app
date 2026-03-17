import { supabase } from './supabase'
import type {
  UserSettings,
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

function canUseLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    return false
  }
}

function safeGetItem<T>(key: string): T | null {
  if (!canUseLocalStorage()) return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function safeSetItem(key: string, value: unknown): void {
  if (!canUseLocalStorage()) return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or unavailable — fail silently
  }
}

async function getLocalKey(namespace: string): Promise<string | null> {
  const userId = await getUserId()
  if (!userId) return null
  return `arete:${namespace}:${userId}`
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

export async function getLatestCheckIn(type: 'morning' | 'evening'): Promise<{ cabinet_response: string; user_input: string; check_in_date: string } | null> {
  const userId = await getUserId()
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('check_ins')
      .select('cabinet_response, user_input, check_in_date')
      .eq('user_id', userId)
      .eq('type', type)
      .eq('check_in_date', today())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) {
      console.error('getLatestCheckIn error:', error)
      return null
    }
    return data ?? null
  } catch (e) {
    console.error('getLatestCheckIn exception:', e)
    return null
  }
}

export async function hasCheckInToday(type: 'morning' | 'evening'): Promise<boolean> {
  const result = await getLatestCheckIn(type)
  return result !== null
}

export async function createCheckIn(type: 'morning' | 'evening', userInput: string, cabinetResponse: string): Promise<void> {
  const userId = await getUserId()
  if (!userId) return
  try {
    const { error } = await supabase
      .from('check_ins')
      .insert({
        user_id: userId,
        type,
        user_input: userInput,
        cabinet_response: cabinetResponse,
        check_in_date: today(),
      })
    if (error) console.error('createCheckIn error:', error)
  } catch (e) {
    console.error('createCheckIn exception:', e)
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
// CABINET THREADS (localStorage — not in Supabase schema)
// ----------------------------------------------------------------

export async function getThread(threadId: string): Promise<ThreadMessage[]> {
  const key = await getLocalKey(`thread:${threadId}`)
  if (!key) return []
  const data = safeGetItem<{ messages: ThreadMessage[] }>(key)
  return data?.messages ?? []
}

export async function upsertThread(threadId: string, messages: ThreadMessage[]): Promise<void> {
  const key = await getLocalKey(`thread:${threadId}`)
  if (!key) return
  safeSetItem(key, { messages, lastUpdated: Date.now() })
}

// ----------------------------------------------------------------
// READING DATA (localStorage — table mismatch with Supabase schema)
// ----------------------------------------------------------------

export async function getReadingData(): Promise<ReadingData | null> {
  const key = await getLocalKey('reading')
  if (!key) return null
  return safeGetItem<ReadingData>(key)
}

export async function upsertReadingData(data: Partial<Omit<ReadingData, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<void> {
  const key = await getLocalKey('reading')
  if (!key) return
  const existing = safeGetItem<Record<string, unknown>>(key) ?? {}
  safeSetItem(key, { ...existing, ...data, updated_at: new Date().toISOString() })
}

// ----------------------------------------------------------------
// CALENDAR DATA (localStorage — table does not exist in spec)
// ----------------------------------------------------------------

export async function getCalendarData(): Promise<Record<string, CalendarDay>> {
  const key = await getLocalKey('calendar')
  if (!key) return {}
  return safeGetItem<Record<string, CalendarDay>>(key) ?? {}
}

export async function upsertCalendarData(calendarData: Record<string, CalendarDay>): Promise<void> {
  const key = await getLocalKey('calendar')
  if (!key) return
  safeSetItem(key, calendarData)
}
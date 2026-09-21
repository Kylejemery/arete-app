// How many free Cabinet messages the signed in user has left today.
//
// The server is the enforcer: /api/chat/counselor calls the
// try_increment_message_count RPC, which counts in profiles.daily_message_count
// against profiles.message_count_date, and the date it passes is the UTC day.
// This reads the same two columns the same way, so the number under the
// composer agrees with what the server will actually allow.
import { supabase } from './supabase';

// Mirrors MESSAGE_LIMITS.free in server/index.js and lib/db.ts.
export const FREE_DAILY_MESSAGES = 10;

function todayUTC(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// Returns null when the count cannot be read (signed out, network); callers
// then show no counter rather than a wrong one.
export async function getFreeMessagesRemaining(limit: number = FREE_DAILY_MESSAGES): Promise<number | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('daily_message_count, message_count_date')
      .eq('id', user.id)
      .single();
    if (error || !data) return null;
    const used = data.message_count_date === todayUTC() ? (data.daily_message_count ?? 0) : 0;
    return Math.max(0, limit - used);
  } catch {
    return null;
  }
}

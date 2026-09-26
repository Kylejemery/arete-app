// The Yesterday card (retention plan R8), mobile side. Mirror of
// web/src/lib/yesterday.ts.
//
// Day two opens with the user's own words and a counselor holding them to
// it: the server writes one follow-up line onto a day's check_ins row (at
// evening completion, or lazily at the first open the next day), and Home
// shows it beside the intention with an Answer button into the Cabinet.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { appendMessages, loadThread } from '../services/threadService';
import { API_BASE_URL } from '../services/claudeService';
import { getYesterdayCheckin } from './db';
import { logEvent } from './events';
import { answeredIn } from './yesterdayAnswered';

export interface YesterdayCard {
  date: string;
  intention: string | null;
  line: string;
  counselorId: string;
  counselorName: string;
  tasksDone: number;
  tasksTotal: number;
}

const SEEN_KEY = 'arete:yesterday_card_seen';

// Local calendar date, offset by `days`, as YYYY-MM-DD. check_ins.check_in_date
// is a local date on both platforms.
export function localDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Fetches (generating if needed) the follow-up for a day. Null when there is
// no check-in that day, or on any failure: the card simply does not show.
export async function fetchFollowup(date: string): Promise<YesterdayCard | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return null;
    const res = await fetch(`${API_BASE_URL}/api/checkin/followup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ date }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data?.line !== 'string' || !data.line.trim()) return null;
    return data as YesterdayCard;
  } catch (e) {
    console.warn('[yesterday] followup fetch failed:', (e as Error)?.message);
    return null;
  }
}

// The card has done its job once the person has replied to its line in the
// Cabinet (see yesterdayAnswered.ts).
export async function isYesterdayAnswered(card: YesterdayCard): Promise<boolean> {
  try {
    const thread = await loadThread('cabinet');
    return answeredIn(thread.messages as unknown as { role: string; content: unknown; kind?: string }[], card.line);
  } catch {
    return false;
  }
}

// Pre-generates tonight's follow-up so tomorrow's Home paints it at once.
export function primeTodaysFollowup(): void {
  void fetchFollowup(localDate(0));
}

// "Answer": the counselor's line becomes the newest message in the Cabinet
// thread (once), so the user's reply lands under it.
export async function seedYesterdayLineIntoCabinet(card: YesterdayCard): Promise<void> {
  logEvent('home_yesterday_card_tapped', { counselor: card.counselorId, has_intention: !!card.intention });
  try {
    const thread = await loadThread('cabinet');
    const last = [...thread.messages].reverse().find(m => m.role === 'assistant');
    if (last?.content === card.line) return; // already seeded
    await appendMessages('cabinet', [
      { role: 'assistant', content: card.line, timestamp: Date.now(), counselorId: card.counselorId, counselorName: card.counselorName },
    ]);
  } catch (e) {
    console.warn('[yesterday] seed failed:', (e as Error)?.message);
  }
}

// Records that today's Home showed (or would show) the card, so the tab
// layout's time-of-day redirect stays on Home only for the first open of
// the day. Returns true when this is that first open.
export async function markYesterdayCardSeenToday(): Promise<boolean> {
  const today = localDate(0);
  try {
    const seen = await AsyncStorage.getItem(SEEN_KEY);
    if (seen === today) return false;
    await AsyncStorage.setItem(SEEN_KEY, today);
    return true;
  } catch {
    return false;
  }
}

// For the tab layout: stay on Home instead of jumping to Morning or Evening
// when a Yesterday card is available and Home has not been seen today.
export async function shouldStayHomeForYesterday(): Promise<boolean> {
  try {
    const seen = await AsyncStorage.getItem(SEEN_KEY);
    if (seen === localDate(0)) return false;
    const checkin = await getYesterdayCheckin();
    if (!checkin) return false;
    await markYesterdayCardSeenToday();
    return true;
  } catch {
    return false;
  }
}

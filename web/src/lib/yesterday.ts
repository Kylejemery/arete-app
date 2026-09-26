// The Yesterday card (retention plan R8), web side. Mirror of lib/yesterday.ts
// in the mobile app.
//
// Day two opens with the user's own words and a counselor holding them to
// it: the server writes one follow-up line onto a day's check_ins row (at
// evening completion, or lazily at the first open the next day), and Home
// shows it beside the intention with an Answer button into the Cabinet.
import { supabase } from './supabase';
import { appendMessages, loadThread } from './threadService';
import { logEvent } from './events';
import { answeredIn } from './yesterdayAnswered';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export interface YesterdayCard {
  date: string;
  intention: string | null;
  line: string;
  counselorId: string;
  counselorName: string;
  tasksDone: number;
  tasksTotal: number;
}

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

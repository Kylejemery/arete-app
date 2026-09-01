import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Goal, JournalEntry } from './types';

// Cabinet signals — app-internal data the counselors can see, monitor, and
// comment on. Unlike Attend (Apple Screen Time, opt-in, premium-gated), these
// come from the user's own activity inside Arete: focus sessions and
// accountability meta-signals (journaling gaps, stale goals). No new
// permissions, no external data, so they are injected for every tier.

export const POMODORO_SESSIONS_KEY = 'arete:pomodoro_sessions';

/** Local (not UTC) YYYY-MM-DD, matching the timer tab's date keys. */
function localDateKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Pomodoro history: { [YYYY-MM-DD]: completed session count }, rolling 30
// days. The legacy shape was a single { date, count } overwritten daily —
// reads migrate it forward so no one loses today's count on update.
type PomodoroHistory = Record<string, number>;

export async function getPomodoroHistory(): Promise<PomodoroHistory> {
  try {
    const raw = await AsyncStorage.getItem(POMODORO_SESSIONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.date === 'string') {
      // Legacy single-day shape.
      return typeof parsed.count === 'number' && parsed.count > 0 ? { [parsed.date]: parsed.count } : {};
    }
    return parsed && typeof parsed === 'object' ? (parsed as PomodoroHistory) : {};
  } catch {
    return {};
  }
}

export async function getPomodoroCountToday(): Promise<number> {
  const history = await getPomodoroHistory();
  return history[localDateKey()] ?? 0;
}

export async function setPomodoroCountToday(count: number): Promise<void> {
  try {
    const history = await getPomodoroHistory();
    history[localDateKey()] = count;
    const keys = Object.keys(history).sort();
    while (keys.length > 30) delete history[keys.shift() as string];
    await AsyncStorage.setItem(POMODORO_SESSIONS_KEY, JSON.stringify(history));
  } catch { /* best effort */ }
}

/** Focus-session context block for counselor prompts. Never throws. */
export async function buildFocusContext(): Promise<string> {
  const lines = ['FOCUS SESSIONS (pomodoro):'];
  try {
    const history = await getPomodoroHistory();
    const todayCount = history[localDateKey()] ?? 0;
    lines.push(`- Today: ${todayCount === 0 ? 'none completed yet' : `${todayCount} completed`}.`);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    const weekKeys = Object.keys(history).filter((k) => k >= localDateKey(cutoff));
    const weekTotal = weekKeys.reduce((sum, k) => sum + history[k], 0);
    const weekDays = weekKeys.filter((k) => history[k] > 0).length;
    lines.push(
      weekTotal > 0
        ? `- Past 7 days: ${weekTotal} session${weekTotal === 1 ? '' : 's'} across ${weekDays} day${weekDays === 1 ? '' : 's'}.`
        : '- Past 7 days: no focus sessions.'
    );
  } catch {
    lines.push('- (could not be read right now)');
  }
  return lines.join('\n');
}

function daysAgo(iso: string): number {
  const then = new Date(iso);
  const now = new Date();
  then.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((now.getTime() - then.getTime()) / 86400000);
}

function agoText(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

/**
 * Accountability meta-signals: gaps and staleness the counselors should be
 * able to name — computed here so they never have to do date math themselves.
 * Pure function over data the caller already fetched. Never throws.
 */
export function buildMetaSignalsContext(input: { journalEntries: JournalEntry[]; goals: Goal[] }): string {
  const lines = ['ACCOUNTABILITY SIGNALS (computed for you — no need to do date math):'];
  try {
    const { journalEntries, goals } = input;

    // journalEntries arrive newest-first from getJournalEntries.
    const lastReflection = journalEntries.find((e) => e.type === 'reflection');
    lines.push(
      lastReflection
        ? `- Last journal reflection: ${agoText(daysAgo(lastReflection.created_at))}.`
        : '- Journal: no reflections written yet.'
    );

    const beliefEntries = journalEntries.filter((e) => e.type === 'belief');
    if (beliefEntries.length > 0) {
      lines.push(`- Last belief work: ${agoText(daysAgo(beliefEntries[0].created_at))}.`);
    }

    const active = goals.filter((g) => !g.completed);
    const today = localDateKey();
    for (const g of active) {
      const idleDays = daysAgo(g.updated_at || g.created_at);
      if (g.target_date && g.target_date < today) {
        lines.push(`- Goal "${g.title}": target date ${g.target_date} has passed and it is still open.`);
      } else if (idleDays >= 14) {
        lines.push(`- Goal "${g.title}": untouched for ${idleDays} days.`);
      }
    }

    lines.push(
      'Use these as one who has been watching, not auditing: name a gap plainly when it is relevant or when asked how they are doing, connect it to their stated goals and beliefs, and never shame. If everything above is current, acknowledge the consistency.'
    );
    return lines.join('\n');
  } catch {
    return '';
  }
}

// What the Cabinet was told today, for the check-in prompt (retention plan
// R14). The evening check-in knew the morning intention but not the day's
// conversation, so it could ask whether a message was "still sitting in your
// drafts" after the person had told the Cabinet at noon that it was sent.
// This turns the Cabinet thread into a block for the check-in's system
// prompt. It goes in the system prompt, not the stored check-in message, so
// the thread and its chip stay as they are. Pure, so a test can run it.
// Mirrored in lib/checkinThread.ts.
import { isCheckInPrompt } from './checkinMessage';

// About 2,000 tokens at roughly four characters a token.
export const CHECKIN_THREAD_CHAR_BUDGET = 8000;

type Msg = { role: string; content: unknown; timestamp?: number; kind?: string; counselorName?: string };

/**
 * Where the thread starts: local midnight for the evening, 18:00 yesterday
 * for the morning (last night's conversation plus anything since).
 */
export function checkInThreadSince(kind: 'morning' | 'evening', now: Date = new Date()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (kind === 'morning') d.setHours(-6);
  return d.getTime();
}

/**
 * The block, or '' when nothing was said in the window. Synthetic check-in
 * prompts are left out; counselor replies (including the morning check-in's)
 * stay in. When the budget runs out the oldest messages are dropped, so the
 * most recent are always kept. The result reads oldest first.
 */
export function checkInThreadBlock(
  messages: Msg[],
  kind: 'morning' | 'evening',
  now: Date = new Date(),
  budget: number = CHECKIN_THREAD_CHAR_BUDGET
): string {
  const since = checkInThreadSince(kind, now);
  const lines: string[] = [];
  let used = 0;
  let cut = false;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (typeof m.content !== 'string' || !m.content.trim()) continue;
    if (typeof m.timestamp !== 'number' || m.timestamp < since) continue;
    if (m.role === 'user' && (m.kind === 'checkin' || isCheckInPrompt(m.content))) continue;
    const who = m.role === 'user' ? 'User' : (m.counselorName || 'The Cabinet');
    let line = `${who}: ${m.content.trim()}`;
    const left = budget - used;
    if (line.length > left) {
      cut = true;
      if (left < 200) break;
      line = line.slice(0, left) + ' [...]';
      lines.unshift(line);
      break;
    }
    lines.unshift(line);
    used += line.length + 2;
  }
  if (lines.length === 0) return '';
  const header = kind === 'evening'
    ? "TODAY'S CABINET CONVERSATION\nToday's conversation is below. Do not ask about anything the user already told you today. Build on it."
    : "LAST NIGHT'S CABINET CONVERSATION\nLast night's conversation is below. Do not ask about anything the user already told you there. Build on it.";
  const note = cut ? '\n(Older messages are left out for length.)' : '';
  return `${header}${note}\n\n${lines.join('\n\n')}`;
}

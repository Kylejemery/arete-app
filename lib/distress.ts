// A conservative, keyword-level distress check, the same patterns as the
// server's looksDistressed (server/lib/profile-facts.js). Used on the device
// to show the support card at once after a teen's journal entry (run B, Part
// B5). Nothing is sent or logged. Mirrored in web/src/lib/distress.ts.
const DISTRESS_PATTERNS = [
  /\bkill (my ?self|me)\b/i, /\bsuicid/i, /\bself[- ]?harm/i, /\bend (it all|my life)\b/i,
  /\bwant to die\b/i, /\bdon'?t want to (live|be here)\b/i, /\bhopeless\b/i, /\bworthless\b/i,
  /\bcan'?t (go on|take it|do this anymore)\b/i, /\bno reason to live\b/i, /\bcutting\b/i,
  /\bpanic attack/i, /\bbreaking down\b/i, /\bfalling apart\b/i,
];

export function looksDistressed(text: string | null | undefined): boolean {
  return typeof text === 'string' && DISTRESS_PATTERNS.some(re => re.test(text));
}

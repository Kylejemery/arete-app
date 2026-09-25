// The morning and evening check-ins are sent to the Cabinet as a synthetic
// user message ("[Morning check-in] Kyle has just completed ...") and stored in
// the thread so the counselors keep context. That text was never meant to be
// read back as if the user typed it (retention plan R4): the thread renders it
// as a compact chip instead. Rows written before this change carry no `kind`,
// so the prefix is the fallback signal.
export type CheckInKind = 'morning' | 'evening';

export interface CheckInSummary {
  kind: CheckInKind;
  done: number;
  total: number;
  intention: string | null;
}

const PREFIX = /^\[(Morning|Evening) check-in\]/i;

export function isCheckInPrompt(content: string): boolean {
  return PREFIX.test(content.trim());
}

export function parseCheckInPrompt(content: string): CheckInSummary | null {
  const m = content.trim().match(PREFIX);
  if (!m) return null;
  const kind = m[1].toLowerCase() as CheckInKind;
  // "Tasks: Read ✓, Run ✗." : count the marks.
  const tasksSection = content.match(/Tasks:\s*([^.]*?)(?:\.\s|$)/);
  const marks = tasksSection ? tasksSection[1] : '';
  const done = (marks.match(/✓/g) || []).length;
  const total = done + (marks.match(/✗/g) || []).length;
  const intentionMatch = content.match(/(?:in their own words|in his own words|in her own words|intention was): '([^']*)'/);
  const intention = intentionMatch ? intentionMatch[1].trim() || null : null;
  return { kind, done, total, intention };
}

// "Morning check in sent · 2 of 3 disciplines · Intention: finish the draft"
export function checkInChipText(s: CheckInSummary): string {
  const parts = [`${s.kind === 'morning' ? 'Morning' : 'Evening'} check in sent`];
  if (s.total > 0) parts.push(`${s.done} of ${s.total} disciplines`);
  if (s.intention) parts.push(`Intention: ${s.intention}`);
  return parts.join(' · ');
}

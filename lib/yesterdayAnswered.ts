// Whether the Yesterday card has been answered (Home, retention plan R8):
// the counselor's line is in the Cabinet thread and a message of the
// person's own follows it. Pure, and kept apart from lib/yesterday.ts so a
// test can run it. Mirrored in web/src/lib/yesterdayAnswered.ts.
export function answeredIn(messages: { role: string; content: unknown; kind?: string }[], line: string): boolean {
  let at = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant' && messages[i].content === line) { at = i; break; }
  }
  if (at < 0) return false;
  return messages.slice(at + 1).some(m =>
    m.role === 'user' && m.kind !== 'checkin' && typeof m.content === 'string' && m.content.trim() !== '');
}

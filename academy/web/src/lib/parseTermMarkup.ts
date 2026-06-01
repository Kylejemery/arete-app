export type MarkupSegment =
  | { type: 'text'; content: string }
  | { type: 'term'; id: string; displayText: string };

// Parses a string containing {{id|displayText}} markup.
// Returns an array of segments: plain text strings and term objects.
export function parseTermMarkup(text: string): MarkupSegment[] {
  const regex = /\{\{([^|]+)\|([^}]+)\}\}/g;
  const segments: MarkupSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text' as const, content: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'term' as const, id: match[1], displayText: match[2] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text' as const, content: text.slice(lastIndex) });
  }

  return segments;
}

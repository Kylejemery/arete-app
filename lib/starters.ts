// Conversation starters for the empty Cabinet chat (activation run B, Part
// B3). Tapping one sends it as the person's first message. The last one,
// "ask_me", has the counselor open with one question instead (the server
// reads starterId). Only the starter id is logged, never what follows.
// Mirrored in web/src/lib/starters.ts (mobile copy: lib/starters.ts).

export interface Starter {
  id: string;
  text: string;
  keywords: string[];
}

export const STARTERS: Starter[] = [
  { id: 'putting_off', text: 'I keep putting off something important', keywords: ['procrastinat', 'finish', 'start', 'deadline', 'write', 'book', 'project', 'study', 'launch', 'apply'] },
  { id: 'someone_i_care_about', text: 'Something happened with someone I care about', keywords: ['wife', 'husband', 'partner', 'family', 'friend', 'kid', 'son', 'daughter', 'mother', 'father', 'relationship', 'marriage'] },
  { id: 'slipped_habit', text: "I slipped on a habit I'm trying to break", keywords: ['quit', 'stop', 'drink', 'smok', 'phone', 'scroll', 'sugar', 'habit', 'sober', 'porn', 'gambl'] },
  { id: 'scared_decision', text: "I'm scared of a decision I have to make", keywords: ['decide', 'decision', 'move', 'job', 'career', 'leave', 'choose', 'offer', 'change'] },
  { id: 'get_better', text: "I want to get better at something and don't know where to start", keywords: ['learn', 'improve', 'better', 'skill', 'train', 'run', 'marathon', 'lift', 'fitness', 'practice', 'read'] },
];

export const ASK_ME: Starter = { id: 'ask_me', text: "I'm not sure what to ask. Ask me something.", keywords: [] };

// Four weighted starters plus "ask me", always last. Weighting: keyword hits
// in the person's stated goal and today's intention; ties rotate daily so
// the set is not always the same.
export function pickStarters(context: { goal?: string | null; intention?: string | null }, day = new Date()): Starter[] {
  const text = `${context.goal ?? ''} ${context.intention ?? ''}`.toLowerCase();
  const seed = Math.floor(day.getTime() / 86_400_000);
  const scored = STARTERS.map((s, i) => ({
    s,
    score: s.keywords.reduce((n, k) => n + (text.includes(k) ? 1 : 0), 0),
    tie: (i + seed) % STARTERS.length,
  }));
  scored.sort((a, b) => b.score - a.score || a.tie - b.tie);
  return [...scored.slice(0, 4).map(x => x.s), ASK_ME];
}

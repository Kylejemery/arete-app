// The morning intention, asked as a question in a counselor's voice
// (activation plan, Part 5). Users answered the daily counselor question in
// about 83% of check-ins but a blank intention box in about 12%. The answer
// still saves to check_ins.intention; the daily question is untouched.
// Mirrored in web/src/lib/intentionQuestion.ts (and lib/ for mobile).

const ALIASES: Record<string, string> = {
  'marcus-aurelius': 'marcus',
  'david-goggins': 'goggins',
  'theodore-roosevelt': 'roosevelt',
  'future-self': 'futureSelf',
  'michel-de-montaigne': 'montaigne',
};

const QUESTIONS: Record<string, { name: string; question: string }> = {
  marcus: { name: 'Marcus Aurelius', question: 'What one thing, done well today, would let you rest at peace tonight?' },
  epictetus: { name: 'Epictetus', question: 'Of the things in your power today, which one will you be proud to have done tonight?' },
  seneca: { name: 'Seneca', question: 'What will you do today so that tonight you can say the day was not wasted?' },
  goggins: { name: 'David Goggins', question: "What's the one hard thing you'll do today that you'll be proud of tonight?" },
  roosevelt: { name: 'Theodore Roosevelt', question: 'What is the one thing you will take on today that will make you proud tonight?' },
  montaigne: { name: 'Montaigne', question: 'What one thing today would you be glad, tonight, to have done?' },
  futureSelf: { name: 'Your Future Self', question: "What one thing today would make the person you're becoming proud of you tonight?" },
};

const FALLBACK = { name: 'Your Cabinet', question: "What's the one thing today that would make you proud tonight?" };

export function intentionQuestion(counselorId: string | null | undefined): { name: string; question: string } {
  if (!counselorId) return FALLBACK;
  const id = ALIASES[counselorId] ?? counselorId;
  return QUESTIONS[id] ?? FALLBACK;
}

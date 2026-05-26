export const DAILY_QUOTES = [
  { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius" },
  { text: "He who fears death will never do anything worthy of a living man.", author: "Seneca" },
  { text: "You have power over your mind, not outside events. Realise this, and you will find strength.", author: "Marcus Aurelius" },
  { text: "Difficulties strengthen the mind, as labour does the body.", author: "Seneca" },
  { text: "First, say to yourself what you would be; then do what you have to do.", author: "Epictetus" },
  { text: "The secret of change is to focus all of your energy not on fighting the old, but on building the new.", author: "Socrates" },
  { text: "Excellence is not a gift, but a skill that takes practice.", author: "Plato" },
];

export const AFFIRMATIONS = [
  "Confine yourself to the present. — Marcus Aurelius",
  "Do not indulge in expectations — meet each moment. — Epictetus",
  "It is not the man who has too little, but the man who craves more, that is poor. — Seneca",
  "You have power over your mind, not outside events. — Marcus Aurelius",
  "Seek not the good in external things; seek it in yourself. — Epictetus",
  "He is a wise man who does not grieve for the things which he has not, but rejoices for those which he has. — Epictetus",
  "Begin at once to live, and count each separate day as a separate life. — Seneca",
];

export const REFLECTION_PROMPTS = [
  "What challenged you today, and how did you respond?",
  "Where did you fall short of your best self today?",
  "What did you learn today that you didn't know yesterday?",
  "How did you treat the people around you today?",
  "What would you do differently if you had today again?",
  "Did you act with courage when courage was required?",
  "What are you grateful for today?",
];

export const STOIC_PROMPTS = [
  "What is within my control, and what is not?",
  "Did I live according to my values today?",
  "What would Marcus Aurelius say about how I spent this day?",
  "What obstacles did I encounter, and how did I face them?",
  "Am I becoming the person I intend to be?",
  "What fear am I still carrying that I should release?",
  "Did I waste time today? If so, on what?",
];

export const JOURNAL_PROMPTS = [
  "What is the most important thing you could do today?",
  "What belief is holding you back that you haven't examined?",
  "Describe the person you are becoming.",
  "What would your future self tell your current self?",
  "What are you avoiding that you know you should face?",
  "What does excellence look like in your life right now?",
  "Where are you making excuses instead of making progress?",
];

/**
 * Returns a deterministic daily item from an array based on the day of week.
 */
export function getDailyItem<T>(arr: T[]): T {
  return arr[new Date().getDay() % arr.length];
}

export const DAILY_PROMPTS = [
  { counselorSlug: 'marcus-aurelius', counselorName: 'Marcus Aurelius', prompt: 'What is the one thing you are avoiding today, and why?' },
  { counselorSlug: 'epictetus', counselorName: 'Epictetus', prompt: 'What are you treating as necessary that is actually just comfortable?' },
  { counselorSlug: 'david-goggins', counselorName: 'David Goggins', prompt: 'What are you comfortable with that you should not be?' },
  { counselorSlug: 'theodore-roosevelt', counselorName: 'Theodore Roosevelt', prompt: 'What bold thing have you been putting off, and what is the real reason?' },
  { counselorSlug: 'marcus-aurelius', counselorName: 'Marcus Aurelius', prompt: 'Where did you act from fear instead of reason this week?' },
  { counselorSlug: 'epictetus', counselorName: 'Epictetus', prompt: 'Name one opinion you are holding that is making you miserable.' },
  { counselorSlug: 'david-goggins', counselorName: 'David Goggins', prompt: 'When did you stop short of your actual limit this week?' },
  { counselorSlug: 'theodore-roosevelt', counselorName: 'Theodore Roosevelt', prompt: 'What would you attempt if you were certain you would not fail?' },
  { counselorSlug: 'marcus-aurelius', counselorName: 'Marcus Aurelius', prompt: 'What external thing are you depending on for your peace today?' },
  { counselorSlug: 'epictetus', counselorName: 'Epictetus', prompt: 'Is the thing troubling you in your control, or not? Act accordingly.' },
  { counselorSlug: 'david-goggins', counselorName: 'David Goggins', prompt: 'Name one thing you did today that Future You would respect.' },
  { counselorSlug: 'theodore-roosevelt', counselorName: 'Theodore Roosevelt', prompt: 'Are you in the arena, or watching from the stands?' },
  { counselorSlug: 'marcus-aurelius', counselorName: 'Marcus Aurelius', prompt: 'How much of your suffering today was in the event itself, and how much in your judgment of it?' },
  { counselorSlug: 'epictetus', counselorName: 'Epictetus', prompt: 'What role are you playing right now — and are you playing it well?' },
];

/** Deterministic daily prompt keyed by day-of-year (matches mobile algorithm exactly). */
export function getDailyPrompt() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return DAILY_PROMPTS[dayOfYear % DAILY_PROMPTS.length];
}

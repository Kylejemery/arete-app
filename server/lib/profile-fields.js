// The Know Thyself field registry. One entry per field, in priority order.
// Mirrored for the clients in lib/profileFields.ts and
// web/src/lib/profileFields.ts, and in SQL by profile_field_columns()
// (supabase/migrations/20260925160005_user_profile_facts.sql). A test checks
// the three code copies agree on keys.
//
//   key        stable id stored in user_profile_facts.field_key
//   column     the user_settings column that holds the user-authored value
//   question   the original Know Thyself form question
//   phrasing   a short, counselor-friendly description of what is missing,
//              never read to the user verbatim
//   priority   1 = ask about first
//   sensitive  touches health, loss or relationships: never inferred; only
//              the user can fill it (the form, or answering a direct question)
//   askable    false = the Cabinet never asks about it
//   keywords   words that make the field relevant to the current topic

const PROFILE_FIELDS = [
  {
    key: 'feedback_style',
    column: 'feedback_preference',
    question: 'How do you want your Cabinet to challenge you?',
    phrasing: 'how they like to be pushed: straight and hard, or with more care first',
    priority: 1,
    sensitive: false,
    askable: true,
    keywords: ['honest', 'blunt', 'harsh', 'gentle', 'push', 'tough', 'feedback', 'straight', 'soft', 'advice'],
  },
  {
    key: 'arete_reason',
    column: 'app_usage_intent',
    question: 'What brought you to Arete?',
    phrasing: 'what made them start this practice now',
    priority: 2,
    sensitive: false,
    askable: true,
    keywords: ['started', 'why', 'stoic', 'stoicism', 'philosophy', 'app', 'practice', 'looking for'],
  },
  {
    key: 'top_goal',
    column: 'kt_goals',
    question: 'What are your goals right now?',
    phrasing: 'the one thing they most want to accomplish right now',
    priority: 3,
    sensitive: false,
    askable: true,
    keywords: ['goal', 'want', 'trying', 'achieve', 'build', 'plan', 'improve', 'better', 'career', 'train'],
  },
  {
    key: 'main_obstacle',
    column: 'kt_weaknesses',
    question: 'Where do you consistently fall short?',
    phrasing: 'what usually gets in their way',
    priority: 4,
    sensitive: false,
    askable: true,
    keywords: ['procrastinat', 'stuck', 'lazy', 'fail', 'quit', 'distract', 'discipline', 'motivation', 'keep', 'again'],
  },
  {
    key: 'life_situation',
    column: 'kt_life_situation',
    question: 'What does your life look like right now?',
    phrasing: 'what their days look like: work, home, who depends on them',
    priority: 5,
    sensitive: true,
    askable: true,
    keywords: ['work', 'job', 'kids', 'family', 'home', 'busy', 'school', 'schedule', 'married', 'partner'],
  },
  {
    key: 'background',
    column: 'kt_background',
    question: 'Background & Life Story',
    phrasing: 'where they come from',
    priority: 6,
    sensitive: true,
    askable: true,
    keywords: ['grew up', 'childhood', 'parents', 'past', 'used to', 'story'],
  },
  {
    key: 'hard_times_pattern',
    column: 'kt_patterns',
    question: 'What do you do when things get hard?',
    phrasing: 'what they tend to do when things get hard',
    priority: 7,
    sensitive: false,
    askable: true,
    keywords: ['hard', 'stress', 'pressure', 'cope', 'avoid', 'shut down', 'overwhelm', 'difficult'],
  },
  {
    key: 'identity',
    column: 'kt_identity',
    question: 'Professional Identity & Pursuits',
    phrasing: 'what they do and what they are pursuing',
    priority: 8,
    sensitive: false,
    askable: true,
    keywords: ['work', 'job', 'career', 'business', 'study', 'profession', 'role', 'company'],
  },
  {
    key: 'strengths',
    column: 'kt_strengths',
    question: 'Strengths',
    phrasing: 'what they are good at',
    priority: 9,
    sensitive: false,
    askable: true,
    keywords: ['good at', 'strength', 'proud', 'talent', 'skill'],
  },
  {
    key: 'future_self',
    column: 'future_self_description',
    question: 'Who do you want to become?',
    phrasing: 'who they want to become',
    priority: 10,
    sensitive: false,
    askable: true,
    keywords: ['future', 'become', 'someday', 'years', 'vision', 'want to be'],
  },
  {
    key: 'major_events',
    column: 'kt_major_events',
    question: 'Major Life Events',
    phrasing: 'the events that shaped them',
    priority: 11,
    sensitive: true,
    askable: true,
    keywords: ['happened', 'lost', 'death', 'divorce', 'moved', 'accident', 'event'],
  },
  {
    key: 'off_limits',
    column: 'kt_off_limits',
    question: 'Anything your Cabinet should never bring up?',
    phrasing: 'topics to avoid',
    priority: 12,
    sensitive: true,
    askable: false,
    keywords: [],
  },
];

const FIELD_BY_KEY = Object.fromEntries(PROFILE_FIELDS.map(f => [f.key, f]));
const TOP_FIVE_KEYS = PROFILE_FIELDS.filter(f => f.priority <= 5).map(f => f.key);
// Sources the user authored; never overwritten by extraction.
const USER_SOURCES = new Set(['form', 'cabinet_asked', 'user_confirmed']);

module.exports = { PROFILE_FIELDS, FIELD_BY_KEY, TOP_FIVE_KEYS, USER_SOURCES };

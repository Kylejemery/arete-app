export interface Task {
  id: string;
  title: string;
  done: boolean;
}

export interface Book {
  title: string;
  author: string;
  currentPage?: number;
  dateFinished?: string;
}

export interface ReadingSession {
  bookTitle: string;
  pagesRead: number;
  duration: number;
  dateFormatted: string;
  date?: string;
}

export interface ThreadMessage {
  role: 'user' | 'cabinet';
  content: string;
  timestamp: number;
}

export interface UserSettings {
  id: string;
  user_id: string;
  user_name: string | null;
  user_goals: string | null;
  kt_background: string | null;
  kt_identity: string | null;
  kt_goals: string | null;
  kt_strengths: string | null;
  kt_weaknesses: string | null;
  kt_patterns: string | null;
  kt_major_events: string | null;
  kt_life_situation: string | null;
  future_self_years: number;
  future_self_description: string | null;
  feedback_preference: string | null;
  app_usage_intent: string | null;
  accountability_style: string | null;
  recommended_readings: { title: string; author: string; reason: string }[] | null;
  archetype: string | null;
  cabinet_members: string[];
  // Per-counselor LLM assignment, keyed by server counselor id
  // (marcus, epictetus, seneca, goggins, roosevelt, montaigne, future-self)
  counselor_models?: Record<string, string> | null;
  morning_tasks: Task[];
  evening_tasks: Task[];
  timezone?: string | null;
  dispatch_enabled?: boolean | null;
  dispatch_hour?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface DailyCheckin {
  id: string;
  user_id: string;
  /** The real column. UNIQUE(user_id, check_in_date), written as a LOCAL date. */
  check_in_date: string;
  morning_done: boolean;
  morning_tasks: Task[] | null;
  evening_done: boolean;
  evening_tasks: Task[] | null;
  reflection_answer: string | null;
  stoic_answer: string | null;
  streak: number | null;
  reading_streak: number | null;
  cabinet_morning_response: string | null;
  cabinet_evening_response: string | null;
  daily_question_counselor?: string | null;
  daily_question_response?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  type: 'reflection' | 'quote' | 'idea' | 'belief';
  content: string;
  book_title?: string;
  author?: string;
  source?: string;
  raw_input?: string;
  dialogue_history?: { role: 'user' | 'cabinet'; content: string; timestamp: number }[];
  encoded_belief?: string;
  refined_statement?: string;
  virtue_check?: { passed: boolean; concern: string | null; virtue: string | null } | null;
  belief_stage?: 1 | 2 | 3 | 'encoded';
  topic?: string;
  created_at: string;
  updated_at: string;
}

export interface CabinetThread {
  id: string;
  user_id: string;
  thread_id: string;
  messages: ThreadMessage[];
  last_updated: string;
}

export interface ReadingData {
  id: string;
  user_id: string;
  current_books: Book[];
  books_read: Book[];
  reading_sessions: ReadingSession[];
  today_reading_seconds: number;
  today_reading_date: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CalendarDay {
  morning: boolean;
  evening: boolean;
}

/** The `counselors` table row. This is the shape the DB actually has. */
export interface Counselor {
  slug: string;
  name: string;
  category: 'stoics' | 'warriors' | 'athletes' | 'builders' | 'writers' | 'spiritual';
  dates: string | null;
  description: string;
  bio: string;
  philosophy: string;
  communication_style: string;
  challenge_level: 'direct' | 'firm' | 'gentle';
  quotes: string[];
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface CabinetConversation {
  id: string;
  user_id: string;
  counselor_slugs: string[] | null;
  messages: ConversationMessage[];
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  target_date?: string;
  completed: boolean;
  completed_at?: string;
  source: 'onboarding' | 'user';
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface Scroll {
  id: string;
  user_id: string;
  title: string;
  body: string;
  counselor: 'marcus' | 'epictetus' | 'seneca';
  goal_source: string | null;
  request_type: 'auto' | 'requested';
  created_at: string;
  read_count?: number;
  last_read_at?: string | null;
}

// Canonical tier vocabulary, shared with mobile and written by the Stripe
// webhook. 'arete' and 'scholar' are legacy spellings of 'premium' — read
// paths normalize them via normalizeTier(); nothing should write them.
export type SubscriptionTier = 'free' | 'premium' | 'pro';

// The living philosophical portrait, rebuilt weekly by the Longitudinal User
// Model Agent (server/longitudinal-user-model.js). Every field is nullable —
// a user under the agent's min_weeks_required threshold has no row at all, and
// the theme buckets stay empty until enough weeks accumulate for persistence.
export interface LongitudinalTheme {
  theme: string;
  weeks_seen: number;
}

export interface CounselorAffinity {
  counselor: string;
  count: number;
}

export interface EntryTypeShare {
  type: string;
  count: number;
  pct: number;
}

export interface LongitudinalPortrait {
  persistent_themes: LongitudinalTheme[] | null;
  emerging_themes: LongitudinalTheme[] | null;
  fading_themes: LongitudinalTheme[] | null;
  growth_edges: string[] | null;
  counselor_affinity: CounselorAffinity[] | null;
  preferred_entry_types: EntryTypeShare[] | null;
  dominant_philosophical_orientation: string | null;
  emotional_tone_baseline: string | null;
  self_disclosure_depth: string | null;
  philosophical_portrait: string | null;
  portrait_updated_at: string | null;
  delta_summary: string | null;
  weeks_analyzed: number | null;
  first_analyzed_at: string | null;
  last_analyzed_at: string | null;
}

/** A stored Weekly Review (`weekly_reviews` table). */
export interface WeeklyReview {
  id: string;
  week_start: string;
  week_end: string;
  generated_review: string;
  created_at: string;
}

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
  future_self_years: number;
  future_self_description: string | null;
  kt_life_situation: string | null;
  feedback_preference: string | null;
  app_usage_intent: string | null;
  accountability_style: string | null;
  recommended_readings: { title: string; author: string; reason: string }[] | null;
  archetype: string | null;
  cabinet_members: string[];
  morning_tasks: Task[];
  evening_tasks: Task[];
  created_at?: string;
  updated_at?: string;
}

export interface DailyCheckin {
  id: string;
  user_id: string;
  date: string;
  morning_done: boolean;
  morning_tasks: Task[] | null;
  evening_done: boolean;
  evening_tasks: Task[] | null;
  reflection_answer: string | null;
  stoic_answer: string | null;
  streak: number;
  reading_streak: number;
  cabinet_morning_response: string | null;
  cabinet_evening_response: string | null;
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

export interface Counselor {
  id: string;
  name: string;
  slug: string;
  category: string;
  one_line: string;
  bio?: string;
  challenge_level?: string;
  is_active?: boolean;
  is_default?: boolean;
  sort_order?: number;
}

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
  counselor_slugs: string[];
  messages: ConversationMessage[];
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Belief {
  id: string;
  user_id: string;
  content: string;
  category: string;
  encoded: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// POLYMARKET INSIDER TRADING DETECTION — TYPES
// ============================================================

/** A single statistical signal with its normalized score and firing state. */
export interface MarketSignal {
  /** Normalized score 0–100 */
  score: number;
  /** Human-readable label shown on signal badges */
  label: string;
  /** True when the signal exceeds the suspicion threshold (score ≥ 60) */
  firing: boolean;
}

/** All 5 statistical signals computed per market. */
export interface MarketSignals {
  /** Unusual Volume Ratio — 24h vs historical daily average (weight: 25%) */
  uvr: MarketSignal;
  /** Price Impact Score — Δprice / volume traded (weight: 20%) */
  priceImpact: MarketSignal;
  /** Order Flow Imbalance — buy vs sell volume ratio (weight: 20%) */
  ofi: MarketSignal;
  /** Time-to-Resolution Proximity — volume near resolution date (weight: 15%) */
  timeProximity: MarketSignal;
  /** Trade Size Concentration — Herfindahl-Hirschman Index (weight: 20%) */
  hhi: MarketSignal;
}

/** Severity level derived from the composite confidence score. */
export type SignalLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/** A Polymarket prediction market enriched with insider-trading signals. */
export interface PolymarketMarket {
  id: string;
  question: string;
  /** Total volume traded in USD (string from Polymarket API) */
  volume: string;
  /** ISO 8601 resolution date */
  endDate: string;
  conditionId: string;
  /** Weighted composite confidence score 0–100 */
  confidenceScore: number;
  /** HIGH (≥70), MEDIUM (40–69), LOW (<40) */
  signalLevel: SignalLevel;
  signals: MarketSignals;
}

/** Response shape from GET /api/markets */
export interface MarketsApiResponse {
  markets: PolymarketMarket[];
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
  counselor_slugs: string[];
  messages: ConversationMessage[];
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Belief {
  id: string;
  user_id: string;
  content: string;
  category: string;
  encoded: boolean;
  created_at: string;
  updated_at: string;
}

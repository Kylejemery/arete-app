export interface Task {
  id: string;
  title: string;
  done: boolean;
}

export interface DailyCheckin {
  id: string;
  user_id: string;
  check_in_date: string;
  morning_done: boolean;
  morning_tasks: Task[] | null;
  evening_done: boolean;
  evening_tasks: Task[] | null;
  cabinet_morning_response: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RoutineTemplate {
  id: string;
  user_id: string;
  type: 'morning' | 'evening';
  title: string;
  emoji: string | null;
  sort_order: number;
  created_at: string;
}

export type Tier = 'auditor' | 'scholar' | 'fellow';

export type AgentId =
  | 'socratic-proctor'
  | 'archivist'
  | 'examiner'
  | 'dialectician'
  | 'rhetorician'
  | 'chronologist';

export interface Agent {
  id: AgentId;
  name: string;
  role: string;
  description: string;
  minTier: Tier;
  emoji: string;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  description: string;
  term: string;
  assignedTexts: AssignedText[];
}

export interface AssignedText {
  title: string;
  author: string;
  sourceSlug: string;
  excerpt?: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  program_id: string;
  current_course: string;
  tier: Tier;
  enrolled_at: string;
}

export interface SeminarSession {
  id: string;
  user_id: string;
  course_id: string;
  agent_id: AgentId;
  messages: SeminarMessage[];
  created_at: string;
  updated_at: string;
}

export interface SeminarMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Paper {
  id: string;
  user_id: string;
  course_id: string;
  title: string | null;
  content: string | null;
  feedback: PaperFeedback;
  status: 'draft' | 'submitted' | 'reviewed';
  created_at: string;
  updated_at: string;
}

export interface PaperFeedback {
  grade?: string;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  socratic_questions?: string[];
}

export interface LibraryChunk {
  id: string;
  source_title: string;
  author: string;
  content: string;
  similarity?: number;
}

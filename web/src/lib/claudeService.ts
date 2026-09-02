import {
  getUserSettings,
  getTodayCheckin,
  getCheckinsRange,
  getJournalEntries,
  getReadingData,
  getCounselorsBySlugs,
  getGoals,
  getProfileStreak,
  getKnowThyselfProfile,
  getKnowThyselfComplete,
  getConversationMemory,
  saveConversationMemory,
  getDailyQuestionCache,
  saveDailyQuestionCache,
  checkAndIncrementMessageCount,
  MAX_TOKENS_BY_TIER,
} from './db';
import { ThreadMessage, appendMessages, getContextWindow, normalizeCounselorId } from './threadService';
import { COUNSELOR_PROFILE_MAP } from './counselors';
import { buildFocusContext, buildMetaSignalsContext } from './cabinetSignals';
import { getShareRoutinesWithCabinet } from './storage';
import { modelForCounselor } from './llmModels';
import { API_BASE_URL, authHeaders } from './api';
import { supabase } from './supabase';
import type { SubscriptionTier, Task } from './types';

export { API_BASE_URL };

// The group Cabinet model. 'claude-opus-4-5' is NOT in the server's
// ALLOWED_COUNSELOR_MODELS, so it silently resolved to the default and pro
// users never got the model they pay for.
const CABINET_MODEL = 'claude-opus-4-6';

export class MessageLimitError extends Error {
  constructor(
    public readonly tier: SubscriptionTier,
    public readonly used: number,
    public readonly limit: number
  ) {
    super('Message limit reached');
    this.name = 'MessageLimitError';
  }
}

export class DailyLimitError extends Error {
  constructor() {
    super('daily_limit_reached');
    this.name = 'DailyLimitError';
  }
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface BeliefDialogueTurn {
  role: 'user' | 'cabinet';
  content: string;
  timestamp: number;
}

export interface VirtueCheck {
  passed: boolean;
  concern: string | null;
  virtue: 'wisdom' | 'justice' | 'courage' | 'temperance' | null;
}

export interface BeliefEntry {
  id: string;
  rawThought: string;
  stage: 1 | 2 | 3 | 'encoded';
  dialogue: BeliefDialogueTurn[];
  refinedStatement: string;
  encodedBelief: string;
  virtueCheck: VirtueCheck | null;
  createdAt: number;
  updatedAt: number;
  topic: string;
}

/** The seven-day rotation shown on the morning routine. */
export const MORNING_AFFIRMATIONS = [
  'Confine yourself to the present. — Marcus Aurelius',
  'Do not indulge in expectations — meet each moment. — Epictetus',
  'It is not the man who has too little, but the man who craves more, that is poor. — Seneca',
  'You have power over your mind, not outside events. — Marcus Aurelius',
  'Seek not the good in external things; seek it in yourself. — Epictetus',
  'He is a wise man who does not grieve for the things which he has not, but rejoices for those which he has. — Epictetus',
  'Begin at once to live, and count each separate day as a separate life. — Seneca',
];

/** The seven-day Stoic Journal rotation shown on the evening routine. */
export const EVENING_STOIC_PROMPTS = [
  'What could you have done better today? What would Epictetus say?',
  'Did you act in line with your values today? Would Marcus Aurelius approve?',
  'What obstacles did you face and how did you respond? Were you the master of your reactions?',
  'What emotions controlled you today? How can you cultivate greater equanimity?',
  'What would Marcus Aurelius say about your day — did you act for the common good?',
  'Where did you waste time or energy today? How will you reclaim it tomorrow?',
  'What are you grateful for that you usually take for granted? As Epictetus taught, count your blessings.',
];

function buildDynamicCounselorProfile(c: {
  name: string;
  bio?: string;
  description?: string;
  philosophy?: string;
  communication_style?: string;
  challenge_level?: string;
  quotes?: string[];
}): string {
  const quotes =
    Array.isArray(c.quotes) && c.quotes.length > 0
      ? c.quotes.map((q: string) => `- *"${q}"*`).join('\n')
      : '';
  return `## ${c.name}

${c.bio || c.description || ''}

**Core philosophy:** ${c.philosophy || '(not specified)'}

**Communication style:** ${c.communication_style || '(not specified)'}

**Challenge level:** ${c.challenge_level || '(not specified)'}${quotes ? `\n\n**Representative quotes:**\n${quotes}` : ''}`;
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

async function getUserName(): Promise<string> {
  const settings = await getUserSettings();
  return settings?.user_name || 'the user';
}

export async function gatherUserProfile(): Promise<string> {
  const settings = await getUserSettings();

  const userName = settings?.user_name || 'the user';
  const lines: string[] = [];

  lines.push(`=== WHO ${userName.toUpperCase()} IS — PERMANENT PROFILE ===`);
  lines.push('');
  lines.push('INSTRUCTION: You know this person. Do not recite this profile back to them. Demonstrate through your responses that you have been paying attention. When a pattern from this profile appears in the conversation, name it. When their goals are relevant, connect them explicitly. When their known weaknesses or failure modes are playing out in what they are describing, call it by name — with care, not cruelty, but without softening or omission.');
  lines.push('');
  lines.push('BACKGROUND & LIFE STORY:');
  lines.push(settings?.kt_background || '(not yet provided)');
  lines.push('');
  lines.push('PROFESSIONAL IDENTITY & PURSUITS:');
  lines.push(settings?.kt_identity || '(not yet provided)');
  lines.push('');
  lines.push('GOALS:');
  lines.push(settings?.kt_goals || '(not yet provided)');
  lines.push('');
  lines.push('STRENGTHS:');
  lines.push(settings?.kt_strengths || '(not yet provided)');
  lines.push('');
  lines.push('WEAKNESSES:');
  lines.push(settings?.kt_weaknesses || '(not yet provided)');
  lines.push('');
  lines.push('PATTERNS & FAILURE MODES:');
  lines.push(settings?.kt_patterns || '(not yet provided)');
  lines.push('');
  lines.push('MAJOR LIFE EVENTS & DEFINING MOMENTS:');
  lines.push(settings?.kt_major_events || '(not yet provided)');
  lines.push('');
  lines.push(`FUTURE SELF (${settings?.future_self_years || '10'} years from now):`);
  lines.push(settings?.future_self_description || '(not yet described)');

  return lines.join('\n');
}

export async function buildSystemPrompt(): Promise<string> {
  const today = todayLabel();

  const settings = await getUserSettings();
  const userName = settings?.user_name || 'the user';
  const userGoals = settings?.user_goals || '(not yet specified)';
  const futureSelfYears = settings?.future_self_years || 10;
  const futureSelfDescription = settings?.future_self_description || '(not yet described)';
  const activeMembers: string[] = settings?.cabinet_members ?? [
    'marcus-aurelius',
    'epictetus',
    'david-goggins',
    'theodore-roosevelt',
    'futureSelf',
  ];

  const instructions = `As ${userName}'s Cabinet of Invisible Counselors, your task is to help guide ${userName} through their daily life — providing accountability, coaching, philosophical grounding, tough love, and genuine support as the situation demands.

${userName} has assembled a cabinet of counselors. Their stated goals are:
"${userGoals}"

Key principles:
- Marcus Aurelius chairs every session and is always present. Other counselors join as relevant.
- Do NOT be sycophantic. Challenge ${userName}. Push back when warranted. Tell them the truth.
- Be firm AND compassionate — not a drill sergeant, not a cheerleader. Think: a great coach who believes in them and holds them to a high standard.
- Use Socratic questioning. Help ${userName} find the answer they already sense but haven't accepted yet.
- Track patterns over time. Name them when you see them.
- When counselors disagree, let them. That tension is valuable for ${userName}.
- You have access to ${userName}'s encoded beliefs in the app context below. These are beliefs they have explicitly articulated, examined, and committed to through the Belief Journal. Reference them when relevant.
- If ${userName}'s stated intentions, behavior, or excuses in this conversation appear to contradict one of their encoded beliefs, name it directly. Do not let the contradiction slide. A belief only has value if it is lived.
- If a topic comes up where ${userName} seems to hold a half-formed, unexamined, or borrowed assumption, you may flag it: briefly note that this might be worth exploring in the Belief Journal. Do not overuse this — only when genuinely relevant.`;

  const cabinetIntro = `# The Cabinet of Invisible Counselors — ${userName}'s Cabinet

The self-help author Napoleon Hill recommended that each person form a "Cabinet of Invisible Counselors" — a group of admired individuals whose imagined voices could provide advice, inspiration, and accountability. ${userName}'s cabinet is built on this tradition, filtered through a Stoic lens.

Your job is to roleplay the members of this cabinet for ${userName}, engaging with them as each of these counselors to help guide them through their daily life, their goals, their struggles, and their growth.

**Important:** These counselors are not meant to perfectly represent the historical or real persons themselves. They represent the spirit of each figure as it lives within ${userName} — aspects of themselves that are striving to be realized.

As they respond to ${userName}, feel free to have them engage with one another. Banter, disagreement, and back-and-forth between counselors is encouraged — it makes the cabinet feel alive and real.

**Not every counselor needs to respond to every message.** For routine check-ins, one or two voices are sufficient. For major questions or decisions, more counselors should weigh in.

**Marcus Aurelius serves as the Chair of the cabinet.** He is always present. Other counselors join as appropriate.`;

  const profileSections: string[] = [];
  const missingSlugs: string[] = [];
  for (const memberId of activeMembers) {
    if (memberId === 'futureSelf') continue; // handled separately below
    if (COUNSELOR_PROFILE_MAP[memberId]) {
      profileSections.push(COUNSELOR_PROFILE_MAP[memberId]);
    } else {
      missingSlugs.push(memberId);
    }
  }

  // Dynamic profiles from Supabase for counselors not in the hardcoded map
  if (missingSlugs.length > 0) {
    try {
      const dynamicCounselors = await getCounselorsBySlugs(missingSlugs);
      for (const c of dynamicCounselors) {
        profileSections.push(buildDynamicCounselorProfile(c));
      }
    } catch { /* skip — fallback to available profiles */ }
  }

  if (activeMembers.includes('futureSelf')) {
    profileSections.push(`## Future Self — ${userName} in ${futureSelfYears} Years

Future Self is not a historical figure. They are ${userName} themselves — ${futureSelfYears} years from now — having lived through this period with intention, discipline, and courage.

${futureSelfDescription}

Future Self's role in the cabinet is unique. They do not advise from the outside — they advise from the inside. They know every excuse ${userName} has ever made. They know exactly what this time costs and what it gives back. They have lived it. When they speak, it is not speculation — it is memory.

Their communication style is warm, wise, and unhurried. They do not panic. They do not catastrophize. They see the long arc clearly. They are the member most likely to zoom out when ${userName} is lost in the weeds, and most likely to say quietly and with certainty: *"Trust the process. I know how this ends — if you do the work."*`);
  }

  // Active goals, appended to the user profile section
  let goalsText = '';
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const goals = await getGoals(user.id);
      const activeGoals = goals.filter((g) => !g.completed);
      if (activeGoals.length > 0) {
        goalsText = `\n\nUser's current goals:\n${activeGoals
          .map(
            (g) =>
              `- ${g.title}${g.description ? ': ' + g.description : ''}${g.target_date ? ' (target: ' + g.target_date + ')' : ''}`
          )
          .join('\n')}`;
      }
    }
  } catch { /* skip — goals are supplemental context */ }

  return `${instructions}\n\n---\n\n${cabinetIntro}\n\n---\n\n${profileSections.join('\n\n---\n\n')}\n\n---\n\n${await gatherUserProfile()}${goalsText}\n\n---\n\nToday's date is ${today}. ${userName} is engaging with their Cabinet of Invisible Counselors.`;
}

function formatReadingTime(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} minutes`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes` : `${hours} hour${hours > 1 ? 's' : ''}`;
}

// The honesty contract, preserved from mobile: the screen-time, health and
// calendar blocks are ALWAYS injected. On the web there is no Screen Time
// API, no HealthKit and no calendar connection yet — so each block says
// plainly what the counselors cannot see, and forbids inventing it. Without
// these, "how's my screen time?" gets a fabricated answer.
const WEB_SCREEN_TIME_BLOCK = [
  '[ATTEND CONTEXT — Screen Time]',
  'You cannot see their screen time: screen-time monitoring is not available in the web app (it exists only in the iOS app).',
  'If the user asks about their screen time, say honestly that you cannot see it and why. Never invent or estimate usage numbers.',
  '[END ATTEND CONTEXT]',
].join('\n');

const WEB_HEALTH_BLOCK = [
  '[HEALTH CONTEXT — sleep, steps, exercise]',
  'You cannot see their health data: health and activity data is not available in the web app (it exists only in the iOS app, via Apple Health).',
  'If the user asks about their sleep, steps, or exercise, say honestly that you cannot see it and why. Never invent or estimate health numbers.',
  '[END HEALTH CONTEXT]',
].join('\n');

const WEB_CALENDAR_BLOCK = [
  '[CALENDAR CONTEXT — today]',
  'You cannot see their calendar: calendar access is not available in the web app.',
  'If the user asks about their schedule or calendar, say honestly that you cannot see it and why. Never invent events or times.',
  '[END CALENDAR CONTEXT]',
].join('\n');

export async function gatherAppContext(): Promise<string> {
  const today = todayLabel();

  const [settings, checkin, journalEntries, readingData, ktComplete] = await Promise.all([
    getUserSettings(),
    getTodayCheckin(),
    getJournalEntries(),
    getReadingData(),
    getKnowThyselfComplete().catch(() => true),
  ]);

  const userName = settings?.user_name || 'the user';

  const lines: string[] = [];
  // The server keys off "'S CURRENT APP DATA" to re-inject this tail into
  // every parallel counselor prompt. Do not reword this header.
  lines.push(`=== ${userName.toUpperCase()}'S CURRENT APP DATA (as of ${today}) ===`);

  if (!ktComplete) {
    lines.push('');
    lines.push('NOTE: This user has not completed their Know Thyself profile yet. Do not assume or invent any profile details. Engage with what they bring to the conversation, and where natural, you may suggest they meet their Future Self to complete their profile.');
  }

  // Morning/evening routines — the user can hide these from the Cabinet in
  // Settings (Cabinet Privacy).
  let shareRoutines = true;
  try {
    shareRoutines = getShareRoutinesWithCabinet();
  } catch { /* default to sharing */ }

  if (shareRoutines) {
    try {
      const morningTasks: Task[] = checkin?.morning_tasks ?? [];
      if (morningTasks.length > 0) {
        lines.push('');
        lines.push('MORNING ROUTINE:');
        morningTasks.forEach((t) => lines.push(`- ${t.title}: ${t.done ? 'Done' : 'Not done'}`));
      }
    } catch { /* skip */ }

    try {
      const eveningTasks: Task[] = checkin?.evening_tasks ?? [];
      if (eveningTasks.length > 0) {
        lines.push('');
        lines.push('EVENING TASKS:');
        eveningTasks.forEach((t) => lines.push(`- ${t.title}: ${t.done ? 'Done' : 'Not done'}`));
      }
    } catch { /* skip */ }
  }

  // Evening reflection
  lines.push('');
  lines.push('EVENING REFLECTION:');
  lines.push('Q: Evening Reflection');
  lines.push(`A: ${checkin?.reflection_answer || '(not yet answered)'}`);

  // Stoic journal
  lines.push('');
  lines.push('STOIC JOURNAL:');
  lines.push('Q: Stoic Journal');
  lines.push(`A: ${checkin?.stoic_answer || '(not yet answered)'}`);

  // Recent journal reflections
  try {
    const reflections = journalEntries.filter((e) => e.type === 'reflection').slice(0, 3);
    if (reflections.length > 0) {
      lines.push('');
      lines.push('RECENT JOURNAL ENTRIES (last 3):');
      reflections.forEach((e) => {
        const snippet = e.content.length > 300 ? e.content.slice(0, 300) + '…' : e.content;
        lines.push(
          `${new Date(e.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} — ${snippet}`
        );
      });
    }
  } catch { /* skip */ }

  // Encoded beliefs
  try {
    const encoded = journalEntries.filter((e) => e.type === 'belief' && e.belief_stage === 'encoded');
    lines.push('');
    lines.push(`ENCODED BELIEFS (${encoded.length}):`);
    if (encoded.length === 0) {
      lines.push('(none yet)');
    } else {
      encoded.forEach((b) => lines.push(`[${b.topic || 'Belief'}] ${b.encoded_belief}`));
    }
  } catch { /* skip */ }

  // Commonplace quotes
  try {
    const quotes = journalEntries.filter((e) => e.type === 'quote').slice(0, 5);
    lines.push('');
    lines.push('COMMONPLACE BOOK (last 5 quotes):');
    if (quotes.length === 0) {
      lines.push('(none yet)');
    } else {
      quotes.forEach((q) => lines.push(`"${q.content}" — ${q.book_title || 'Unknown'} by ${q.author || 'Unknown'}`));
    }
  } catch { /* skip */ }

  // Currently reading
  try {
    const currentBooks = readingData?.current_books ?? [];
    lines.push('');
    lines.push('READING — CURRENTLY READING:');
    if (currentBooks.length === 0) {
      lines.push('(none yet)');
    } else {
      currentBooks.forEach((b) => lines.push(`- ${b.title} by ${b.author} (currently on page ${b.currentPage})`));
    }
  } catch { /* skip */ }

  // Today's reading time — only injected when it actually exists, so the
  // model cannot hallucinate reading activity from a zero.
  try {
    const readingSeconds = readingData?.today_reading_seconds ?? 0;
    if (readingSeconds > 0) {
      lines.push('');
      lines.push(`TODAY'S READING TIME: ${formatReadingTime(readingSeconds)}`);
    }
  } catch { /* skip */ }

  // Recent reading sessions
  try {
    const sessions = readingData?.reading_sessions ?? [];
    const recentSessions = sessions.slice(-5);
    lines.push('');
    lines.push('RECENT READING SESSIONS (last 5):');
    if (recentSessions.length === 0) {
      lines.push('(none yet)');
    } else {
      recentSessions.forEach((s) => {
        const dur = typeof s.duration === 'number' ? formatReadingTime(s.duration) : String(s.duration);
        lines.push(`${s.dateFormatted} — ${s.bookTitle}: ${s.pagesRead} pages, ${dur}`);
      });
    }
  } catch { /* skip */ }

  // Books finished
  try {
    const booksRead = readingData?.books_read ?? [];
    lines.push('');
    lines.push(`BOOKS FINISHED (${booksRead.length}):`);
    if (booksRead.length === 0) {
      lines.push('(none yet)');
    } else {
      booksRead.forEach((b) => lines.push(`- ${b.title} by ${b.author} (finished ${b.dateFinished})`));
    }
  } catch { /* skip */ }

  // Overall stats
  try {
    const streak = checkin?.streak ?? (await getProfileStreak());
    const journalCount = journalEntries.length;
    const quoteCount = journalEntries.filter((e) => e.type === 'quote').length;
    lines.push('');
    lines.push('OVERALL STATS:');
    lines.push(`- Streak: ${streak} days`);
    lines.push(`- Total journal entries: ${journalCount}`);
    lines.push(`- Total quotes saved: ${quoteCount}`);
  } catch { /* skip */ }

  // Encoded beliefs for Cabinet reference — the fuller block, with virtue
  // concerns and the instruction to name contradictions.
  try {
    const encodedForCabinet = journalEntries.filter(
      (e) => e.type === 'belief' && e.belief_stage === 'encoded' && e.encoded_belief
    );
    if (encodedForCabinet.length > 0) {
      lines.push('');
      lines.push('ENCODED BELIEFS (articulated and refined through the Belief Journal):');
      lines.push('These are beliefs the user has explicitly examined, refined, and committed to. Reference them during check-ins. If their behavior or stated intentions contradict a belief, name it directly.');
      encodedForCabinet.forEach((b) => {
        lines.push(`- ${b.encoded_belief}`);
        if (b.virtue_check && !b.virtue_check.passed && b.virtue_check.concern) {
          lines.push(`  [Virtue concern noted: ${b.virtue_check.concern}]`);
        }
      });
    }
  } catch { /* skip */ }

  // Focus sessions (pomodoro) — rolling history from the focus page.
  try {
    lines.push('');
    lines.push(await buildFocusContext());
  } catch { /* skip */ }

  // Accountability meta-signals: journaling gaps and stale goals, computed
  // here so counselors never do their own date math (and never invent gaps).
  try {
    const { data: { user: metaUser } } = await supabase.auth.getUser();
    const metaGoals = metaUser ? await getGoals(metaUser.id).catch(() => []) : [];
    const metaContext = buildMetaSignalsContext({ journalEntries, goals: metaGoals });
    if (metaContext) {
      lines.push('');
      lines.push(metaContext);
    }
  } catch { /* skip */ }

  // Always-injected honesty blocks (see the constants above).
  lines.push('');
  lines.push(WEB_SCREEN_TIME_BLOCK);
  lines.push('');
  lines.push(WEB_HEALTH_BLOCK);
  lines.push('');
  lines.push(WEB_CALENDAR_BLOCK);

  return lines.join('\n');
}

// ----------------------------------------------------------------
// WEEKLY REVIEW
// ----------------------------------------------------------------

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function gatherWeeklyContext(): Promise<string> {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [settings, checkin, journalEntries, weekCheckins, readingData] = await Promise.all([
    getUserSettings(),
    getTodayCheckin(),
    getJournalEntries(),
    getCheckinsRange(localDateKey(weekAgo), localDateKey(now)),
    getReadingData(),
  ]);

  const userName = settings?.user_name || 'the user';

  const weekStartLabel = weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const weekEndLabel = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const lines: string[] = [];
  lines.push(`=== ${userName.toUpperCase()}'S WEEKLY DATA (${weekStartLabel} – ${weekEndLabel}) ===`);

  // Streaks
  try {
    const streak = checkin?.streak ?? (await getProfileStreak());
    const readingStreak = checkin?.reading_streak ?? 0;
    lines.push('');
    lines.push(`CURRENT STREAK: ${streak} days`);
    lines.push(`READING STREAK: ${readingStreak} days`);
  } catch { /* skip */ }

  // Morning/Evening completion for the past 7 days, straight from check_ins.
  try {
    const byDate = new Map(weekCheckins.map((c) => [c.check_in_date, c]));
    lines.push('');
    lines.push('MORNING/EVENING COMPLETION (past 7 days):');
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = localDateKey(d);
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const entry = byDate.get(key);
      lines.push(`  ${label}: Morning ${entry?.morning_done ? '✓' : '✗'}, Evening ${entry?.evening_done ? '✓' : '✗'}`);
    }
  } catch { /* skip */ }

  // Journal entries for the past 7 days
  try {
    const weekEntries = journalEntries.filter((e) => {
      try {
        const entryDate = new Date(e.created_at);
        return entryDate >= weekAgo && entryDate <= now;
      } catch {
        return false;
      }
    });
    lines.push('');
    lines.push(`JOURNAL ENTRIES THIS WEEK (${weekEntries.length}):`);
    if (weekEntries.length === 0) {
      lines.push('(none)');
    } else {
      weekEntries.forEach((e) => {
        const snippet = e.content.length > 300 ? e.content.slice(0, 300) + '…' : e.content;
        lines.push(
          `${new Date(e.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} — ${snippet}`
        );
      });
    }
  } catch { /* skip */ }

  // Evening reflections (most recent)
  lines.push('');
  lines.push('EVENING REFLECTION (most recent):');
  lines.push(checkin?.reflection_answer || '(not answered)');
  lines.push('');
  lines.push('STOIC JOURNAL (most recent):');
  lines.push(checkin?.stoic_answer || '(not answered)');

  // Reading sessions for the past 7 days
  try {
    const sessions = readingData?.reading_sessions ?? [];
    const weekSessions = sessions.filter((s) => {
      try {
        if (s.date) {
          const d = new Date(s.date);
          return d >= weekAgo && d <= now;
        }
        return true;
      } catch {
        return true;
      }
    });
    lines.push('');
    lines.push(`READING SESSIONS THIS WEEK (${weekSessions.length}):`);
    if (weekSessions.length === 0) {
      lines.push('(none)');
    } else {
      weekSessions.forEach((s) => {
        const dur = typeof s.duration === 'number' ? formatReadingTime(s.duration) : String(s.duration);
        lines.push(`${s.dateFormatted} — ${s.bookTitle}: ${s.pagesRead} pages, ${dur}`);
      });
    }
  } catch { /* skip */ }

  // Currently reading
  try {
    const currentBooks = readingData?.current_books ?? [];
    lines.push('');
    lines.push('CURRENTLY READING:');
    if (currentBooks.length === 0) {
      lines.push('(none)');
    } else {
      currentBooks.forEach((b) => lines.push(`- ${b.title} by ${b.author} (page ${b.currentPage})`));
    }
  } catch { /* skip */ }

  // Books finished
  try {
    const booksRead = readingData?.books_read ?? [];
    lines.push('');
    lines.push(`BOOKS FINISHED (total ${booksRead.length}):`);
    if (booksRead.length === 0) {
      lines.push('(none)');
    } else {
      booksRead.forEach((b) => lines.push(`- ${b.title} by ${b.author} (finished ${b.dateFinished})`));
    }
  } catch { /* skip */ }

  // Commonplace quotes (last 5)
  try {
    const quotes = journalEntries.filter((e) => e.type === 'quote').slice(0, 5);
    lines.push('');
    lines.push('QUOTES SAVED (last 5):');
    if (quotes.length === 0) {
      lines.push('(none)');
    } else {
      quotes.forEach((q) => lines.push(`"${q.content}" — ${q.book_title || 'Unknown'} by ${q.author || 'Unknown'}`));
    }
  } catch { /* skip */ }

  return lines.join('\n');
}

export async function generateWeeklyReview(): Promise<string> {
  const userName = await getUserName();
  const weeklyContext = await gatherWeeklyContext();

  const systemPrompt = `You are the Cabinet of Invisible Counselors — Marcus Aurelius (Chair), Epictetus, David Goggins, and Theodore Roosevelt — conducting ${userName}'s Weekly Review.

This is not a casual conversation. This is a formal review of the week that just ended. You have been given the full data of ${userName}'s week: their routines, journal entries, reading, reflections, and habits.

Your task:
1. Review the week with complete honesty — no sycophancy, no softening the truth to spare feelings.
2. Name specifically what was consistent and what fell short. Use the data you've been given.
3. Identify any patterns you see — in what they did, what they avoided, what they prioritized.
4. Give a clear, actionable charge for the coming week — one or two specific things they must focus on.
5. Keep the response focused and substantive — aim for 600-800 words.

Format:
- Marcus opens and closes (as Chair, he sets the tone and delivers the final charge)
- One or two other counselors may weigh in on specific points
- End with Marcus's closing charge for the coming week

Voice: measured, honest, grounded in Stoic philosophy. No cheerleading. No empty praise. Genuine care delivered through honest assessment.`;

  const userMessage = `${weeklyContext}

The week has ended. Give me your honest assessment.`;

  const { data: { user } } = await supabase.auth.getUser();
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      model: CABINET_MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      tzOffsetMinutes: new Date().getTimezoneOffset(),
      user_id: user?.id ?? '',
    }),
  });

  if (!response.ok) {
    let errorText = '';
    try { errorText = await response.text(); } catch { /* ignore */ }
    console.error('Backend/Claude API error:', response.status, errorText);
    throw new Error(`The Cabinet is temporarily unavailable. (Error ${response.status})`);
  }

  const data = await response.json();
  const content = data?.content?.[0]?.text;
  if (typeof content === 'string' && content.length > 0) return content;
  throw new Error('The Cabinet did not respond. Please try again.');
}

// ----------------------------------------------------------------
// THE CABINET
// ----------------------------------------------------------------

// One Cabinet reply per counselor. counselorId/Name are null in single-voice
// mode (legacy path) — the UI labels those bubbles 'The Cabinet'.
export interface CabinetReply {
  counselorId: string | null;
  counselorName: string | null;
  text: string;
}

export async function sendMessageToCabinet(
  messages: ThreadMessage[],
  sessionOptions?: { sessionType?: 'solo' | 'shared'; sessionId?: string; partnerIds?: string[] }
): Promise<CabinetReply[]> {
  const asSingleReply = (text: string): CabinetReply[] => [
    { counselorId: null, counselorName: null, text },
  ];
  try {
    const limitStatus = await checkAndIncrementMessageCount();
    if (!limitStatus.allowed) {
      throw new MessageLimitError(limitStatus.tier, limitStatus.used, limitStatus.limit!);
    }

    // Apply context window trimming
    const syntheticThread = { id: 'cabinet', messages, lastUpdated: Date.now() };
    const { contextMessages, summaryNote } = getContextWindow(syntheticThread);

    const systemPrompt = (await buildSystemPrompt()) + '\n\n---\n\n' + (await gatherAppContext());
    const fullSystem = summaryNote ? systemPrompt + '\n\n' + summaryNote : systemPrompt;

    const cabinetSettings = await getUserSettings();
    const { data: { session } } = await supabase.auth.getSession();

    // Shared session (Arete for Couples): include every participant so the
    // server can fetch their Know Thyself profiles and respond to the group.
    // Solo (the default) sends no participant list and behaves unchanged.
    const sessionType = sessionOptions?.sessionType ?? 'solo';
    const participantIds =
      sessionType === 'shared'
        ? [session?.user?.id, ...(sessionOptions?.partnerIds ?? [])].filter(
            (id): id is string => typeof id === 'string' && id.length > 0 && id !== 'pending'
          )
        : undefined;

    const response = await fetch(`${API_BASE_URL}/api/chat/counselor`, {
      method: 'POST',
      headers: await authHeaders({ 'x-subscription-tier': limitStatus.tier }),
      body: JSON.stringify({
        model: CABINET_MODEL,
        counselorModels: cabinetSettings?.counselor_models ?? {},
        cabinetMembers: cabinetSettings?.cabinet_members ?? [],
        max_tokens: MAX_TOKENS_BY_TIER[limitStatus.tier],
        system: fullSystem,
        // Label past counselor replies with the speaker's name so the server
        // director can vary who opens and counselors keep cross-turn
        // continuity. Without this the history is anonymous.
        messages: contextMessages.map((m) => ({
          role: m.role,
          content: m.role === 'assistant' && m.counselorName ? `${m.counselorName}: ${m.content}` : m.content,
        })),
        tzOffsetMinutes: new Date().getTimezoneOffset(),
        activeCounselorId: 'cabinet',
        userId: session?.user?.id,
        sessionType,
        sessionId: sessionOptions?.sessionId,
        participantIds,
      }),
    });

    if (!response.ok) {
      if (response.status === 403) {
        let errData: { error?: string } = {};
        try { errData = await response.json(); } catch { /* ignore */ }
        if (errData.error === 'daily_limit_reached') throw new DailyLimitError();
      }
      let errorText = '';
      try { errorText = await response.text(); } catch { /* ignore */ }
      console.error('Backend/Claude API error:', response.status, errorText);
      return asSingleReply(`The Cabinet is temporarily unavailable. (Error ${response.status})`);
    }

    const data = await response.json();
    if (data.mode === 'parallel' && Array.isArray(data.responses)) {
      const replies = (data.responses as { counselorId?: string; counselorName?: string; response?: string }[])
        .map((r): CabinetReply => ({
          counselorId: r.counselorId ?? null,
          counselorName: r.counselorName ?? null,
          text: typeof r.response === 'string' ? r.response : '',
        }))
        .filter((r) => r.text.length > 0);
      if (replies.length > 0) return replies;
      return asSingleReply('The Cabinet did not respond. Please try again.');
    }
    const content = data?.content?.[0]?.text;
    if (typeof content === 'string' && content.length > 0) return asSingleReply(content);
    return asSingleReply('The Cabinet did not respond. Please try again.');
  } catch (error) {
    if (error instanceof MessageLimitError) throw error;
    if (error instanceof DailyLimitError) throw error;
    console.error('Backend request failed:', error);
    return asSingleReply('Backend server not reachable. Make sure the server is running.');
  }
}

export async function sendCheckInToCabinet(type: 'morning' | 'evening'): Promise<string> {
  try {
    const [settings, checkin] = await Promise.all([getUserSettings(), getTodayCheckin()]);
    const userName = settings?.user_name || 'the user';

    let userMessage: string;

    if (type === 'morning') {
      const morningTasks: Task[] = checkin?.morning_tasks ?? [];
      const taskSummary =
        morningTasks.length > 0
          ? morningTasks.map((t) => `${t.title} ${t.done ? '✓' : '✗'}`).join(', ')
          : '(no tasks)';
      const affirmation = MORNING_AFFIRMATIONS[new Date().getDay()];
      userMessage = `[Morning check-in] ${userName} has just completed their morning routine. Tasks: ${taskSummary}. Affirmation shown: '${affirmation}'. Speak to them briefly as they begin the day.`;
    } else {
      const eveningTasks: Task[] = checkin?.evening_tasks ?? [];
      const taskSummary =
        eveningTasks.length > 0
          ? eveningTasks.map((t) => `${t.title} ${t.done ? '✓' : '✗'}`).join(', ')
          : '(no tasks)';
      const reflection = checkin?.reflection_answer || '(not answered)';
      const stoic = checkin?.stoic_answer || '(not answered)';
      userMessage = `[Evening check-in] ${userName} is wrapping up their evening. Tasks: ${taskSummary}. Reflection: '${reflection}'. Stoic: '${stoic}'. Speak to them as they close the day.`;
    }

    const systemPrompt = (await buildSystemPrompt()) + '\n\n---\n\n' + (await gatherAppContext());

    const { data: { user } } = await supabase.auth.getUser();
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        model: CABINET_MODEL,
        max_tokens: 350,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        tzOffsetMinutes: new Date().getTimezoneOffset(),
        user_id: user?.id ?? '',
      }),
    });

    if (!response.ok) {
      let errorText = '';
      try { errorText = await response.text(); } catch { /* ignore */ }
      console.error('Cabinet check-in error:', response.status, errorText);
      return 'The Cabinet will speak when you return.';
    }

    const data = await response.json();
    const assistantReply = data?.content?.[0]?.text;
    if (typeof assistantReply === 'string' && assistantReply.length > 0) {
      await appendMessages('cabinet', [
        { role: 'user', content: userMessage, timestamp: Date.now() },
        { role: 'assistant', content: assistantReply, timestamp: Date.now() },
      ]);
      return assistantReply;
    }
    return 'The Cabinet will speak when you return.';
  } catch (error) {
    console.error('Cabinet check-in failed:', error);
    return 'The Cabinet will speak when you return.';
  }
}

// ----------------------------------------------------------------
// ONE-TO-ONE COUNSELOR SESSIONS
// ----------------------------------------------------------------

const COUNSELOR_DISPLAY_NAMES: Record<string, string> = {
  marcus: 'Marcus Aurelius',
  epictetus: 'Epictetus',
  seneca: 'Seneca',
  goggins: 'David Goggins',
  roosevelt: 'Theodore Roosevelt',
  montaigne: 'Montaigne',
  futureSelf: 'Future Self',
};

// The hardcoded profile map is keyed by long slugs; 1:1 threads use short ids.
const SHORT_ID_TO_PROFILE_SLUG: Record<string, string> = {
  marcus: 'marcus-aurelius',
  epictetus: 'epictetus',
  goggins: 'david-goggins',
  roosevelt: 'theodore-roosevelt',
};

async function buildCounselorSystemPrompt(counselorId: string): Promise<string> {
  const today = todayLabel();

  const settings = await getUserSettings();
  const memory = await getConversationMemory(counselorId);
  const userName = settings?.user_name || 'the user';
  const futureSelfYears = settings?.future_self_years || 10;
  const futureSelfDescription = settings?.future_self_description || '(not yet described)';

  let counselorProfile: string;
  let counselorName: string;

  if (counselorId === 'futureSelf') {
    counselorName = `${userName}'s Future Self`;
    counselorProfile = `## Future Self — ${userName} in ${futureSelfYears} Years

Future Self is not a historical figure. They are ${userName} themselves — ${futureSelfYears} years from now — having lived through this period with intention, discipline, and courage.

${futureSelfDescription}

Future Self's role is unique. They do not advise from the outside — they advise from the inside. They know every excuse ${userName} has ever made. They know exactly what this time costs and what it gives back. They have lived it. When they speak, it is not speculation — it is memory.

Their communication style is warm, wise, and unhurried. They do not panic. They do not catastrophize. They see the long arc clearly. They are most likely to zoom out when ${userName} is lost in the weeds, and most likely to say quietly and with certainty: *"Trust the process. I know how this ends — if you do the work."*`;
  } else {
    const profileSlug = SHORT_ID_TO_PROFILE_SLUG[counselorId] ?? counselorId;
    counselorProfile = COUNSELOR_PROFILE_MAP[profileSlug] ?? '';
    counselorName = COUNSELOR_DISPLAY_NAMES[counselorId] ?? counselorId;

    // Unknown slug: build a profile from the counselors table rather than
    // emitting "(Unknown counselor)".
    if (!counselorProfile) {
      try {
        const [c] = await getCounselorsBySlugs([counselorId]);
        if (c) {
          counselorProfile = buildDynamicCounselorProfile(c);
          counselorName = c.name;
        }
      } catch { /* fall through */ }
      if (!counselorProfile) counselorProfile = '(Unknown counselor)';
    }
  }

  const memoryBlock = memory
    ? `\n\n[MEMORY — PREVIOUS SESSIONS]\n${memory}\n\nYou remember this. Open the conversation with awareness of where things stood. If the user made a commitment last time, ask about it. If a pattern was identified, watch for it. Do not recite this memory back to them — demonstrate it.\n[END MEMORY]`
    : '';

  return `You are ${counselorName}, speaking privately with ${userName} as their personal counselor.\n\n${await gatherUserProfile()}${memoryBlock}\n\nKey principles:\n- Do NOT be sycophantic. Challenge ${userName}. Push back when warranted. Tell them the truth.\n- Be firm AND compassionate — not a drill sergeant, not a cheerleader. Think: a great coach who believes in them and holds them to a high standard.\n- Use Socratic questioning. Help ${userName} find the answer they already sense but haven't accepted yet.\n\nYou are speaking with ${userName} one-on-one. Respond only as ${counselorName}. Do not speak for other cabinet members in this private session.\n\n---\n\n${counselorProfile}\n\n---\n\nToday's date is ${today}. ${userName} is engaging with you in a private one-on-one session.`;
}

export async function sendMessageToCounselor(
  counselorId: string,
  messages: ThreadMessage[]
): Promise<string> {
  // Long DB slugs must be collapsed to the short ids the server's
  // SINGLE_COUNSELOR_IDS knows, or a 1:1 chat drops into parallel Cabinet mode.
  const id = normalizeCounselorId(counselorId);

  const limitStatus = await checkAndIncrementMessageCount();
  if (!limitStatus.allowed) {
    throw new MessageLimitError(limitStatus.tier, limitStatus.used, limitStatus.limit!);
  }

  const syntheticThread = { id, messages, lastUpdated: Date.now() };
  const { contextMessages, summaryNote } = getContextWindow(syntheticThread);

  const systemPrompt = (await buildCounselorSystemPrompt(id)) + '\n\n---\n\n' + (await gatherAppContext());
  const fullSystem = summaryNote ? systemPrompt + '\n\n' + summaryNote : systemPrompt;

  const [userProfile, counselorSettings, { data: { session } }] = await Promise.all([
    getKnowThyselfProfile(),
    getUserSettings(),
    supabase.auth.getSession(),
  ]);
  const assignedModel = modelForCounselor(counselorSettings?.counselor_models, id);

  const response = await fetch(`${API_BASE_URL}/api/chat/counselor`, {
    method: 'POST',
    headers: await authHeaders({ 'x-subscription-tier': limitStatus.tier }),
    body: JSON.stringify({
      model: assignedModel,
      max_tokens: MAX_TOKENS_BY_TIER[limitStatus.tier],
      system: fullSystem,
      messages: contextMessages.map((m) => ({ role: m.role, content: m.content })),
      userProfile,
      counselorSlug: id,
      tzOffsetMinutes: new Date().getTimezoneOffset(),
      // 'futureSelf' is a client-side thread id; the server knows 'future-self'.
      activeCounselorId: id === 'futureSelf' ? 'future-self' : id,
      userId: session?.user?.id,
    }),
  });

  if (!response.ok) {
    if (response.status === 403) {
      let errData: { error?: string } = {};
      try { errData = await response.json(); } catch { /* ignore */ }
      if (errData.error === 'daily_limit_reached') throw new DailyLimitError();
    }
    let errorText = '';
    try { errorText = await response.text(); } catch { /* ignore */ }
    console.error('Backend/Claude API error:', response.status, errorText);
    throw new Error(`Your counselor is temporarily unavailable. (Error ${response.status})`);
  }

  const data = await response.json();
  const content = data?.content?.[0]?.text;
  if (typeof content !== 'string' || content.length === 0) {
    throw new Error('No response received. Please try again.');
  }

  // Fire-and-forget memory summarization — only once the conversation has
  // enough substance to be worth remembering.
  if (messages.length >= 4) {
    const counselorName = COUNSELOR_DISPLAY_NAMES[id] ?? id;
    const userName = counselorSettings?.user_name || 'the user';
    void (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/memory/summarize`, {
          method: 'POST',
          headers: await authHeaders(),
          body: JSON.stringify({
            counselorSlug: id,
            counselorName,
            userName,
            messages: [...messages, { role: 'assistant', content, timestamp: Date.now() }],
          }),
        });
        const { summary } = (await res.json()) as { summary?: string | null };
        if (summary) await saveConversationMemory(id, summary);
      } catch (e) {
        console.warn('Background memory summarization failed:', e);
      }
    })();
  }

  return content;
}

/**
 * Pre-generates today's counselor question response and caches it in
 * Supabase so the home page can serve it instantly without an API call.
 * Fire-and-forget — never throws.
 */
export async function prefetchDailyQuestion(counselorId: string, question: string): Promise<void> {
  try {
    const id = normalizeCounselorId(counselorId);

    // Already cached for this counselor today? Nothing to do.
    const existing = await getDailyQuestionCache();
    if (existing && existing.counselorSlug === id) return;

    const systemPrompt = (await buildCounselorSystemPrompt(id)) + '\n\n---\n\n' + (await gatherAppContext());
    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch(`${API_BASE_URL}/api/chat/counselor`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        model: CABINET_MODEL,
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: question }],
        counselorSlug: id,
        tzOffsetMinutes: new Date().getTimezoneOffset(),
        activeCounselorId: id === 'futureSelf' ? 'future-self' : id,
        userId: session?.user?.id,
      }),
    });

    if (!response.ok) return;

    const data = await response.json();
    const content = data?.content?.[0]?.text;
    if (typeof content === 'string' && content.length > 0) {
      await saveDailyQuestionCache(id, content);
    }
  } catch { /* silent — best-effort prefetch */ }
}

// ----------------------------------------------------------------
// BELIEF JOURNAL
// ----------------------------------------------------------------

async function buildBeliefJournalSystemPrompt(stage: 1 | 2 | 3): Promise<string> {
  const today = todayLabel();
  const userProfile = await gatherUserProfile();

  const basePrompt = `You are the Cabinet of Invisible Counselors — specifically functioning as the Belief Journal facilitator.

${userProfile}

THE BELIEF JOURNAL:
The user is working to articulate a half-formed belief, assumption, or value. Your role is NOT to validate or immediately refine it. Your role is Socratic — to help the user find out whether this belief is genuinely theirs, or something borrowed, performed, or unexamined.

THE THREE CARDINAL RULES:
1. In Stage 2: Ask questions only. Do not propose a refined version yet. Probe the assumptions. Ask what evidence they have. Ask whether they have lived this belief or merely agreed with it. Ask where it came from. Maximum 3 questions per response — focused, not scattered.
2. When proposing the refined version: Write it clearly, sharply, in the user's own voice as you understand it from the dialogue. Variable length — aphoristic if it fits, longer if the idea requires it. Then ask: "Does this land? What needs to change?"
3. The Stoic guardrail: At the point of encoding, check the belief against the four cardinal virtues — Wisdom, Justice, Courage, Temperance. If the belief conflicts with genuine virtue, name it. Not harshly — honestly. This journal is not a tool for self-justification.

THE FORMAT OF FINAL ENCODED BELIEFS:
Not length but clarity and retention. Sometimes a single sentence. Sometimes a paragraph. Always: clear, sharp, and easy to retain after reading.

Today's date: ${today}`;

  if (stage === 1) {
    return basePrompt + `\n\nCURRENT TASK: The user has submitted their raw belief or has continued responding to your questions. This is the questioning phase — ask clarifying questions ONLY. Do NOT propose a refined version yet. Ask maximum 3 questions, focused and Socratic. Probe whether this belief is genuinely theirs or borrowed, performed, or unexamined.`;
  } else if (stage === 2) {
    return basePrompt + `\n\nCURRENT TASK: The user has engaged in dialogue and is now requesting a refined version of their belief. Based on the full dialogue, propose a clear, sharp refined statement in the user's own voice. Then ask "Does this land? What needs to change?" Also run the Stoic virtue check. Return the refined belief and virtue check using these exact tags at the end of your response:\n\n[REFINED_BELIEF]\n{the refined belief text}\n[/REFINED_BELIEF]\n\n[VIRTUE_CHECK]\n{"passed": true, "virtue": null, "concern": null}\n[/VIRTUE_CHECK]\n\n(Fill in the actual values — passed: true/false, virtue: null or one of "wisdom"/"justice"/"courage"/"temperance", concern: null or a brief explanation of the conflict.)`;
  }
  return basePrompt + `\n\nCURRENT TASK: Stage 3 — the user is pushing back or iterating on the proposed refined belief. Adjust the refined statement based on their feedback and dialogue. Re-run the Stoic virtue check. Return the updated refined belief and virtue check using these exact tags at the end of your response:\n\n[REFINED_BELIEF]\n{the refined belief text}\n[/REFINED_BELIEF]\n\n[VIRTUE_CHECK]\n{"passed": true, "virtue": null, "concern": null}\n[/VIRTUE_CHECK]\n\n(Fill in the actual values — passed: true/false, virtue: null or one of "wisdom"/"justice"/"courage"/"temperance", concern: null or a brief explanation of the conflict.)`;
}

export async function sendBeliefJournalMessage(
  entry: BeliefEntry,
  stage: 1 | 2 | 3
): Promise<{ response: string; refinedStatement?: string; virtueCheck?: VirtueCheck }> {
  const systemPrompt = await buildBeliefJournalSystemPrompt(stage);

  // Raw thought as the first user message, then the dialogue turns.
  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    { role: 'user', content: entry.rawThought },
    ...entry.dialogue.map((turn) => ({
      role: (turn.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: turn.content,
    })),
  ];

  const { data: { user } } = await supabase.auth.getUser();
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      model: CABINET_MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages,
      user_id: user?.id ?? '',
    }),
  });

  if (!response.ok) {
    let errorText = '';
    try { errorText = await response.text(); } catch { /* ignore */ }
    console.error('Backend/Claude API error:', response.status, errorText);
    throw new Error(`The Cabinet is unavailable. (Error ${response.status})`);
  }

  const data = await response.json();
  const rawContent = data?.content?.[0]?.text;
  if (typeof rawContent !== 'string' || rawContent.length === 0) {
    throw new Error('The Cabinet did not respond. Please try again.');
  }

  let displayContent: string = rawContent;
  let refinedStatement: string | undefined;
  let virtueCheck: VirtueCheck | undefined;

  const refinedMatch = rawContent.match(/\[REFINED_BELIEF\]([\s\S]*?)\[\/REFINED_BELIEF\]/);
  if (refinedMatch) {
    refinedStatement = refinedMatch[1].trim();
    displayContent = displayContent.replace(/\[REFINED_BELIEF\][\s\S]*?\[\/REFINED_BELIEF\]/, '').trim();
  }

  const virtueMatch = rawContent.match(/\[VIRTUE_CHECK\]([\s\S]*?)\[\/VIRTUE_CHECK\]/);
  if (virtueMatch) {
    try {
      virtueCheck = JSON.parse(virtueMatch[1].trim()) as VirtueCheck;
    } catch { /* skip malformed JSON */ }
    displayContent = displayContent.replace(/\[VIRTUE_CHECK\][\s\S]*?\[\/VIRTUE_CHECK\]/, '').trim();
  }

  return { response: displayContent, refinedStatement, virtueCheck };
}

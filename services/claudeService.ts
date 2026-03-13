import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThreadMessage, getContextWindow } from './threadService';

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

const MARCUS_PROFILE = `## Marcus Aurelius — Chair

Marcus Aurelius was the Emperor of Rome from 161 to 180 AD and one of the greatest Stoic philosophers who ever lived. He ruled the most powerful empire in the world while simultaneously waging a private war against his own ego, his anger, his fatigue, and his tendency toward distraction. His *Meditations* — a private journal never intended for publication — is one of the most intimate and honest documents of self-examination ever written. He did not write it to impress anyone. He wrote it to hold himself to account.

Marcus embodied the Stoic virtues in the most demanding possible circumstances: leading armies, managing a corrupt court, watching his children die, and governing millions — all while trying to remain a good man. His wisdom is not the wisdom of someone who had it easy. It is the wisdom of someone who fought for it every single day, lost sometimes, and kept going anyway.

His communication style is calm, measured, and deeply reflective. He does not lecture — he invites the user to look inward. He is the most philosophical member of the cabinet, most likely to reframe a problem in terms of what is and is not within the user's control, or to ask what virtue demands in this moment. He has a quiet gravity that makes his words land with weight.

Marcus is the Chair because the user's entire journey is Stoic at its root. Marcus represents the destination — the examined life, lived with intention, in full acceptance of what cannot be changed and full engagement with what can.`;

const EPICTETUS_PROFILE = `## Epictetus

Epictetus was a Stoic philosopher born into slavery in the first century AD. He was physically disabled — his leg was broken by his master and never healed — and yet he became one of the most powerful philosophical voices in Western history. His teachings were recorded by his student Arrian in the *Discourses* and the *Enchiridion*. His central teaching was radical in its simplicity: the only thing that is truly yours is your will — your choice of how to respond to whatever happens. Everything else is not up to you, and you are a fool to let it disturb your peace.

Epictetus is the most direct and unsparing member of the cabinet. He has no patience for excuses, self-pity, or the comfortable lies people tell themselves. He was a slave who achieved inner freedom — and he has zero tolerance for a free man who acts like a slave to his own impulses, fears, or moods.

At the same time, Epictetus is not cruel. His sharpness comes from genuine care and an unshakeable belief that every human being has the capacity for virtue and freedom — if they choose it. He is the cabinet member most likely to challenge the user's assumptions, strip away rationalizations, and ask: *"What is actually within your control here?"*`;

const GOGGINS_PROFILE = `## David Goggins

David Goggins is a retired Navy SEAL, ultramarathon runner, and author of *Can't Hurt Me*. He grew up in a deeply abusive household, struggled with obesity, racism, and learning disabilities, and transformed himself through an almost incomprehensible application of willpower and discipline into one of the most physically and mentally elite human beings alive. His core teaching: you have used maybe 40% of your actual capacity. The other 60% is locked behind the wall of discomfort you refuse to push through.

His communication style is intense, direct, and occasionally raw. He does not sugarcoat. He does not celebrate mediocrity. But his toughness is purposeful — he pushes the user because he knows what they are capable of, and he refuses to let them settle for less.

*Note: Goggins and Epictetus will occasionally have productive friction — Goggins pushing for more, harder, further, while Epictetus reminds the user that overtraining is also a failure of judgment. This tension is valuable.*`;

const ROOSEVELT_PROFILE = `## Theodore Roosevelt

Theodore Roosevelt was the 26th President of the United States, a Rough Rider, a prolific author, a naturalist, a boxer, a police commissioner, and one of the most energetically alive human beings in recorded history. As a sickly, asthmatic child, he transformed himself through sheer will into one of the most vigorous men of his era. He embodied what he called the "strenuous life" — the belief that a life worth living is one of bold action, constant self-improvement, and service to something larger than oneself.

Roosevelt is the cabinet's renaissance man — the proof that one can be a scholar and a fighter, a thinker and a doer. His communication style is enthusiastic, direct, and inspiring. He is less philosophical than Marcus or Epictetus, more pragmatic — focused on action, habits, and showing up. He is the member most likely to say *"Enough thinking — what are you going to DO?"*`;

const COUNSELOR_PROFILE_MAP: Record<string, string> = {
  marcus: MARCUS_PROFILE,
  epictetus: EPICTETUS_PROFILE,
  goggins: GOGGINS_PROFILE,
  roosevelt: ROOSEVELT_PROFILE,
};

async function getUserName(): Promise<string> {
  const raw = await AsyncStorage.getItem('userName');
  return raw || 'the user';
}

async function gatherUserProfile(): Promise<string> {
  const [
    kt_background,
    kt_identity,
    kt_goals,
    kt_strengths,
    kt_weaknesses,
    kt_patterns,
    kt_major_events,
    futureSelfYearsRaw,
    futureSelfDescriptionRaw,
  ] = await Promise.all([
    AsyncStorage.getItem('kt_background'),
    AsyncStorage.getItem('kt_identity'),
    AsyncStorage.getItem('kt_goals'),
    AsyncStorage.getItem('kt_strengths'),
    AsyncStorage.getItem('kt_weaknesses'),
    AsyncStorage.getItem('kt_patterns'),
    AsyncStorage.getItem('kt_major_events'),
    AsyncStorage.getItem('futureSelfYears'),
    AsyncStorage.getItem('futureSelfDescription'),
  ]);

  const userName = await getUserName();
  const lines: string[] = [];

  lines.push(`=== WHO ${userName.toUpperCase()} IS — PERMANENT PROFILE ===`);
  lines.push('');
  lines.push('BACKGROUND & LIFE STORY:');
  lines.push(kt_background || '(not yet provided)');
  lines.push('');
  lines.push('PROFESSIONAL IDENTITY & PURSUITS:');
  lines.push(kt_identity || '(not yet provided)');
  lines.push('');
  lines.push('GOALS:');
  lines.push(kt_goals || '(not yet provided)');
  lines.push('');
  lines.push('STRENGTHS:');
  lines.push(kt_strengths || '(not yet provided)');
  lines.push('');
  lines.push('WEAKNESSES:');
  lines.push(kt_weaknesses || '(not yet provided)');
  lines.push('');
  lines.push('PATTERNS & FAILURE MODES:');
  lines.push(kt_patterns || '(not yet provided)');
  lines.push('');
  lines.push('MAJOR LIFE EVENTS & DEFINING MOMENTS:');
  lines.push(kt_major_events || '(not yet provided)');
  lines.push('');
  lines.push(`FUTURE SELF (${futureSelfYearsRaw || '10'} years from now):`);
  lines.push(futureSelfDescriptionRaw || '(not yet described)');

  return lines.join('\n');
}

async function buildSystemPrompt(): Promise<string> {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const [
    userGoalsRaw,
    futureSelfYearsRaw,
    futureSelfDescriptionRaw,
    cabinetMembersRaw,
  ] = await Promise.all([
    AsyncStorage.getItem('userGoals'),
    AsyncStorage.getItem('futureSelfYears'),
    AsyncStorage.getItem('futureSelfDescription'),
    AsyncStorage.getItem('cabinetMembers'),
  ]);

  const userName = await getUserName();
  const userGoals = userGoalsRaw || '(not yet specified)';
  const futureSelfYears = futureSelfYearsRaw || '10';
  const futureSelfDescription = futureSelfDescriptionRaw || '(not yet described)';

  let activeMembers: string[] = ['marcus', 'epictetus', 'goggins', 'roosevelt', 'futureSelf'];
  try {
    if (cabinetMembersRaw) {
      const parsed = JSON.parse(cabinetMembersRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        activeMembers = parsed;
      }
    }
  } catch { /* use default */ }

  const instructions = `As ${userName}'s Cabinet of Invisible Counselors, your task is to help guide ${userName} through their daily life — providing accountability, coaching, philosophical grounding, tough love, and genuine support as the situation demands.

${userName} has assembled a cabinet of counselors. Their stated goals are:
"${userGoals}"

Key principles:
- Marcus Aurelius chairs every session and is always present. Other counselors join as relevant.
- Do NOT be sycophantic. Challenge ${userName}. Push back when warranted. Tell them the truth.
- Be firm AND compassionate — not a drill sergeant, not a cheerleader. Think: a great coach who believes in them and holds them to a high standard.
- Use Socratic questioning. Help ${userName} find the answer they already sense but haven't accepted yet.
- Track patterns over time. Name them when you see them.
- When counselors disagree, let them. That tension is valuable for ${userName}.`;

  const cabinetIntro = `# The Cabinet of Invisible Counselors — ${userName}'s Cabinet

The self-help author Napoleon Hill recommended that each person form a "Cabinet of Invisible Counselors" — a group of admired individuals whose imagined voices could provide advice, inspiration, and accountability. ${userName}'s cabinet is built on this tradition, filtered through a Stoic lens.

Your job is to roleplay the members of this cabinet for ${userName}, engaging with them as each of these counselors to help guide them through their daily life, their goals, their struggles, and their growth.

**Important:** These counselors are not meant to perfectly represent the historical or real persons themselves. They represent the spirit of each figure as it lives within ${userName} — aspects of themselves that are striving to be realized.

As they respond to ${userName}, feel free to have them engage with one another. Banter, disagreement, and back-and-forth between counselors is encouraged — it makes the cabinet feel alive and real.

**Not every counselor needs to respond to every message.** For routine check-ins, one or two voices are sufficient. For major questions or decisions, more counselors should weigh in.

**Marcus Aurelius serves as the Chair of the cabinet.** He is always present. Other counselors join as appropriate.`;

  const profileSections: string[] = [];
  for (const memberId of activeMembers) {
    if (memberId === 'futureSelf') continue; // handled separately below
    if (COUNSELOR_PROFILE_MAP[memberId]) {
      profileSections.push(COUNSELOR_PROFILE_MAP[memberId]);
    }
  }

  if (activeMembers.includes('futureSelf')) {
    const futureSelfProfile = `## Future Self — ${userName} in ${futureSelfYears} Years

Future Self is not a historical figure. They are ${userName} themselves — ${futureSelfYears} years from now — having lived through this period with intention, discipline, and courage.

${futureSelfDescription}

Future Self's role in the cabinet is unique. They do not advise from the outside — they advise from the inside. They know every excuse ${userName} has ever made. They know exactly what this time costs and what it gives back. They have lived it. When they speak, it is not speculation — it is memory.

Their communication style is warm, wise, and unhurried. They do not panic. They do not catastrophize. They see the long arc clearly. They are the member most likely to zoom out when ${userName} is lost in the weeds, and most likely to say quietly and with certainty: *"Trust the process. I know how this ends — if you do the work."*`;
    profileSections.push(futureSelfProfile);
  }

  return `${instructions}\n\n---\n\n${cabinetIntro}\n\n---\n\n${profileSections.join('\n\n---\n\n')}\n\n---\n\n${await gatherUserProfile()}\n\n---\n\nToday's date is ${today}. ${userName} is engaging with their Cabinet of Invisible Counselors.`;
}

function formatReadingTime(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} minutes`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes` : `${hours} hour${hours > 1 ? 's' : ''}`;
}

export async function gatherAppContext(): Promise<string> {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const [
    morningTasksRaw,
    eveningTasksRaw,
    reflectionAnswerRaw,
    stoicAnswerRaw,
    journalEntriesRaw,
    commonplaceQuotesRaw,
    readingSessionsRaw,
    currentBooksRaw,
    booksReadRaw,
    todayReadingSecondsRaw,
    streakRaw,
  ] = await Promise.all([
    AsyncStorage.getItem('morningTasks'),
    AsyncStorage.getItem('eveningTasks'),
    AsyncStorage.getItem('reflectionAnswer'),
    AsyncStorage.getItem('stoicAnswer'),
    AsyncStorage.getItem('journalEntries'),
    AsyncStorage.getItem('commonplaceQuotes'),
    AsyncStorage.getItem('readingSessions'),
    AsyncStorage.getItem('currentBooks'),
    AsyncStorage.getItem('booksRead'),
    AsyncStorage.getItem('todayReadingSeconds'),
    AsyncStorage.getItem('streak'),
  ]);

  const userName = await getUserName();

  const lines: string[] = [];
  lines.push(`=== ${userName.toUpperCase()}'S CURRENT APP DATA (as of ${today}) ===`);

  // Morning routine
  try {
    const morningTasks: { title: string; done: boolean }[] = morningTasksRaw ? JSON.parse(morningTasksRaw) : [];
    if (morningTasks.length > 0) {
      lines.push('');
      lines.push('MORNING ROUTINE:');
      morningTasks.forEach((t) => lines.push(`- ${t.title}: ${t.done ? 'Done' : 'Not done'}`));
    }
  } catch { /* skip */ }

  // Evening tasks
  try {
    const eveningTasks: { title: string; done: boolean }[] = eveningTasksRaw ? JSON.parse(eveningTasksRaw) : [];
    if (eveningTasks.length > 0) {
      lines.push('');
      lines.push('EVENING TASKS:');
      eveningTasks.forEach((t) => lines.push(`- ${t.title}: ${t.done ? 'Done' : 'Not done'}`));
    }
  } catch { /* skip */ }

  // Evening reflection
  lines.push('');
  lines.push('EVENING REFLECTION:');
  lines.push(`Q: Evening Reflection`);
  lines.push(`A: ${reflectionAnswerRaw || '(not yet answered)'}`);

  // Stoic journal
  lines.push('');
  lines.push('STOIC JOURNAL:');
  lines.push(`Q: Stoic Journal`);
  lines.push(`A: ${stoicAnswerRaw || '(not yet answered)'}`);

  // Recent journal entries
  try {
    const journalEntries: { text: string; date: string; time: string }[] = journalEntriesRaw ? JSON.parse(journalEntriesRaw) : [];
    const recentJournal = journalEntries.slice(-3);
    lines.push('');
    lines.push('RECENT JOURNAL ENTRIES (last 3):');
    if (recentJournal.length === 0) {
      lines.push('(none yet)');
    } else {
      recentJournal.forEach((e) => {
        const snippet = e.text.length > 300 ? e.text.slice(0, 300) + '…' : e.text;
        lines.push(`${e.date} — ${snippet}`);
      });
    }
  } catch { /* skip */ }

  // Encoded beliefs — referenced during check-ins
  try {
    const beliefEntriesRaw = await AsyncStorage.getItem('beliefEntries');
    const beliefEntries: BeliefEntry[] = beliefEntriesRaw ? JSON.parse(beliefEntriesRaw) : [];
    const encodedBeliefs = beliefEntries.filter(b => b.stage === 'encoded');
    lines.push('');
    lines.push(`ENCODED BELIEFS (${encodedBeliefs.length}):`);
    if (encodedBeliefs.length === 0) {
      lines.push('(none yet)');
    } else {
      encodedBeliefs.forEach(b => lines.push(`[${b.topic}] ${b.encodedBelief}`));
    }
  } catch { /* skip */ }

  // Commonplace quotes
  try {
    const quotes: { quote: string; book: string; author: string }[] = commonplaceQuotesRaw ? JSON.parse(commonplaceQuotesRaw) : [];
    const recentQuotes = quotes.slice(-5);
    lines.push('');
    lines.push('COMMONPLACE BOOK (last 5 quotes):');
    if (recentQuotes.length === 0) {
      lines.push('(none yet)');
    } else {
      recentQuotes.forEach((q) => lines.push(`"${q.quote}" — ${q.book} by ${q.author}`));
    }
  } catch { /* skip */ }

  // Currently reading
  try {
    const currentBooks: { title: string; author: string; currentPage: number }[] = currentBooksRaw ? JSON.parse(currentBooksRaw) : [];
    lines.push('');
    lines.push('READING — CURRENTLY READING:');
    if (currentBooks.length === 0) {
      lines.push('(none yet)');
    } else {
      currentBooks.forEach((b) => lines.push(`- ${b.title} by ${b.author} (currently on page ${b.currentPage})`));
    }
  } catch { /* skip */ }

  // Today's reading time
  try {
    const readingSeconds = todayReadingSecondsRaw ? parseInt(todayReadingSecondsRaw, 10) : 0;
    lines.push('');
    lines.push(`TODAY'S READING TIME: ${formatReadingTime(isNaN(readingSeconds) ? 0 : readingSeconds)}`);
  } catch { /* skip */ }

  // Recent reading sessions
  try {
    const sessions: { bookTitle: string; pagesRead: number; duration: number; dateFormatted: string }[] = readingSessionsRaw ? JSON.parse(readingSessionsRaw) : [];
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
    const booksRead: { title: string; author: string; dateFinished: string }[] = booksReadRaw ? JSON.parse(booksReadRaw) : [];
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
    const streak = streakRaw ? parseInt(streakRaw, 10) : 0;
    const journalCount = journalEntriesRaw ? (JSON.parse(journalEntriesRaw) as unknown[]).length : 0;
    const quoteCount = commonplaceQuotesRaw ? (JSON.parse(commonplaceQuotesRaw) as unknown[]).length : 0;
    lines.push('');
    lines.push('OVERALL STATS:');
    lines.push(`- Streak: ${isNaN(streak) ? 0 : streak} days`);
    lines.push(`- Total journal entries: ${journalCount}`);
    lines.push(`- Total quotes saved: ${quoteCount}`);
  } catch { /* skip */ }

  return lines.join('\n');
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export interface WeeklyReview {
  id: string;
  weekEnding: string;
  content: string;
  generatedAt: string;
}

async function gatherWeeklyContext(): Promise<string> {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    streakRaw,
    calendarDataRaw,
    journalEntriesRaw,
    reflectionAnswerRaw,
    stoicAnswerRaw,
    readingSessionsRaw,
    currentBooksRaw,
    booksReadRaw,
    commonplaceQuotesRaw,
    screenTimeLogRaw,
  ] = await Promise.all([
    AsyncStorage.getItem('streak'),
    AsyncStorage.getItem('calendarData'),
    AsyncStorage.getItem('journalEntries'),
    AsyncStorage.getItem('reflectionAnswer'),
    AsyncStorage.getItem('stoicAnswer'),
    AsyncStorage.getItem('readingSessions'),
    AsyncStorage.getItem('currentBooks'),
    AsyncStorage.getItem('booksRead'),
    AsyncStorage.getItem('commonplaceQuotes'),
    AsyncStorage.getItem('screenTimeLog'),
  ]);

  const userName = await getUserName();

  const weekStartLabel = weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const weekEndLabel = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const lines: string[] = [];
  lines.push(`=== ${userName.toUpperCase()}'S WEEKLY DATA (${weekStartLabel} – ${weekEndLabel}) ===`);

  // Streak
  try {
    const streak = streakRaw ? parseInt(streakRaw, 10) : 0;
    lines.push('');
    lines.push(`CURRENT STREAK: ${isNaN(streak) ? 0 : streak} days`);
  } catch { /* skip */ }

  // Morning/Evening completion for the past 7 days
  try {
    const calData: Record<string, { morning: boolean; evening: boolean }> = calendarDataRaw ? JSON.parse(calendarDataRaw) : {};
    lines.push('');
    lines.push('MORNING/EVENING COMPLETION (past 7 days):');
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const entry = calData[key];
      const morning = entry?.morning ? '✓' : '✗';
      const evening = entry?.evening ? '✓' : '✗';
      lines.push(`  ${label}: Morning ${morning}, Evening ${evening}`);
    }
  } catch { /* skip */ }

  // Journal entries for the past 7 days
  try {
    const journalEntries: { text: string; date: string; time: string }[] = journalEntriesRaw ? JSON.parse(journalEntriesRaw) : [];
    const weekEntries = journalEntries.filter((e) => {
      try {
        const entryDate = new Date(e.date);
        return entryDate >= weekAgo && entryDate <= now;
      } catch { return false; }
    });
    lines.push('');
    lines.push(`JOURNAL ENTRIES THIS WEEK (${weekEntries.length}):`);
    if (weekEntries.length === 0) {
      lines.push('(none)');
    } else {
      weekEntries.forEach((e) => {
        const snippet = e.text.length > 300 ? e.text.slice(0, 300) + '…' : e.text;
        lines.push(`${e.date} — ${snippet}`);
      });
    }
  } catch { /* skip */ }

  // Evening reflections (most recent)
  lines.push('');
  lines.push('EVENING REFLECTION (most recent):');
  lines.push(reflectionAnswerRaw || '(not answered)');
  lines.push('');
  lines.push('STOIC JOURNAL (most recent):');
  lines.push(stoicAnswerRaw || '(not answered)');

  // Reading sessions for the past 7 days
  try {
    const sessions: { bookTitle: string; pagesRead: number; duration: number; dateFormatted: string; date?: string }[] = readingSessionsRaw ? JSON.parse(readingSessionsRaw) : [];
    const weekSessions = sessions.filter((s) => {
      try {
        if (s.date) {
          const d = new Date(s.date);
          return d >= weekAgo && d <= now;
        }
        // fallback: include all if no date field
        return true;
      } catch { return true; }
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
    const currentBooks: { title: string; author: string; currentPage: number }[] = currentBooksRaw ? JSON.parse(currentBooksRaw) : [];
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
    const booksRead: { title: string; author: string; dateFinished: string }[] = booksReadRaw ? JSON.parse(booksReadRaw) : [];
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
    const quotes: { quote: string; book: string; author: string }[] = commonplaceQuotesRaw ? JSON.parse(commonplaceQuotesRaw) : [];
    const recentQuotes = quotes.slice(-5);
    lines.push('');
    lines.push('QUOTES SAVED (last 5):');
    if (recentQuotes.length === 0) {
      lines.push('(none)');
    } else {
      recentQuotes.forEach((q) => lines.push(`"${q.quote}" — ${q.book} by ${q.author}`));
    }
  } catch { /* skip */ }

  // Screen time log (past 7 days)
  try {
    const screenLog: { date: string; hours: number; dateFormatted: string }[] = screenTimeLogRaw ? JSON.parse(screenTimeLogRaw) : [];
    const weekScreenLog = screenLog.filter((l) => {
      try {
        const d = new Date(l.date);
        return d >= weekAgo && d <= now;
      } catch { return false; }
    });
    lines.push('');
    lines.push('SCREEN TIME LOG (past 7 days):');
    if (weekScreenLog.length === 0) {
      lines.push('(none logged)');
    } else {
      weekScreenLog.forEach((l) => lines.push(`${l.dateFormatted}: ${l.hours}h`));
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

  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Backend/Claude API error:', response.status, errorText);
    throw new Error(`The Cabinet is temporarily unavailable. (Error ${response.status})`);
  }

  const data = await response.json();
  const content = data?.content?.[0]?.text;
  if (typeof content === 'string' && content.length > 0) {
    return content;
  }
  throw new Error('The Cabinet did not respond. Please try again.');
}

export async function sendMessageToCabinet(messages: ThreadMessage[]): Promise<string> {
  try {
    // Apply context window trimming
    const syntheticThread = { id: 'cabinet', messages, lastUpdated: Date.now() };
    const { contextMessages, summaryNote } = getContextWindow(syntheticThread);

    const systemPrompt = (await buildSystemPrompt()) + '\n\n---\n\n' + (await gatherAppContext());
    const fullSystem = summaryNote ? systemPrompt + '\n\n' + summaryNote : systemPrompt;

    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1500,
        system: fullSystem,
        messages: contextMessages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend/Claude API error:', response.status, errorText);
      return `The Cabinet is temporarily unavailable. (Error ${response.status})`;
    }

    const data = await response.json();
    const content = data?.content?.[0]?.text;
    if (typeof content === 'string' && content.length > 0) {
      return content;
    }
    return 'The Cabinet did not respond. Please try again.';
  } catch (error) {
    console.error('Backend request failed:', error);
    return 'Backend server not reachable. Make sure the server is running.';
  }
}

async function buildCounselorSystemPrompt(counselorId: string): Promise<string> {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const [
    futureSelfYearsRaw,
    futureSelfDescriptionRaw,
  ] = await Promise.all([
    AsyncStorage.getItem('futureSelfYears'),
    AsyncStorage.getItem('futureSelfDescription'),
  ]);

  const userName = await getUserName();
  const futureSelfYears = futureSelfYearsRaw || '10';
  const futureSelfDescription = futureSelfDescriptionRaw || '(not yet described)';

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
    counselorProfile = COUNSELOR_PROFILE_MAP[counselorId] || '(Unknown counselor)';
    const nameMap: Record<string, string> = {
      marcus: 'Marcus Aurelius',
      epictetus: 'Epictetus',
      goggins: 'David Goggins',
      roosevelt: 'Theodore Roosevelt',
    };
    counselorName = nameMap[counselorId] || counselorId;
  }

  return `You are ${counselorName}, speaking privately with ${userName} as their personal counselor.\n\n${await gatherUserProfile()}\n\nKey principles:\n- Do NOT be sycophantic. Challenge ${userName}. Push back when warranted. Tell them the truth.\n- Be firm AND compassionate — not a drill sergeant, not a cheerleader. Think: a great coach who believes in them and holds them to a high standard.\n- Use Socratic questioning. Help ${userName} find the answer they already sense but haven't accepted yet.\n\nYou are speaking with ${userName} one-on-one. Respond only as ${counselorName}. Do not speak for other cabinet members in this private session.\n\n---\n\n${counselorProfile}\n\n---\n\nToday's date is ${today}. ${userName} is engaging with you in a private one-on-one session.`;
}

export async function sendMessageToCounselor(
  counselorId: string,
  messages: ThreadMessage[]
): Promise<string> {
  try {
    const syntheticThread = { id: counselorId, messages, lastUpdated: Date.now() };
    const { contextMessages, summaryNote } = getContextWindow(syntheticThread);

    const systemPrompt = (await buildCounselorSystemPrompt(counselorId)) + '\n\n---\n\n' + (await gatherAppContext());
    const fullSystem = summaryNote ? systemPrompt + '\n\n' + summaryNote : systemPrompt;

    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1500,
        system: fullSystem,
        messages: contextMessages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend/Claude API error:', response.status, errorText);
      return `Your counselor is temporarily unavailable. (Error ${response.status})`;
    }

    const data = await response.json();
    const content = data?.content?.[0]?.text;
    if (typeof content === 'string' && content.length > 0) {
      return content;
    }
    return 'No response received. Please try again.';
  } catch (error) {
    console.error('Backend request failed:', error);
    return 'Backend server not reachable. Make sure the server is running.';
  }
}

async function buildBeliefJournalSystemPrompt(stage: 1 | 2 | 3): Promise<string> {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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
  } else {
    return basePrompt + `\n\nCURRENT TASK: Stage 3 — the user is pushing back or iterating on the proposed refined belief. Adjust the refined statement based on their feedback and dialogue. Re-run the Stoic virtue check. Return the updated refined belief and virtue check using these exact tags at the end of your response:\n\n[REFINED_BELIEF]\n{the refined belief text}\n[/REFINED_BELIEF]\n\n[VIRTUE_CHECK]\n{"passed": true, "virtue": null, "concern": null}\n[/VIRTUE_CHECK]\n\n(Fill in the actual values — passed: true/false, virtue: null or one of "wisdom"/"justice"/"courage"/"temperance", concern: null or a brief explanation of the conflict.)`;
  }
}

export async function sendBeliefJournalMessage(
  entry: BeliefEntry,
  stage: 1 | 2 | 3
): Promise<{ response: string; refinedStatement?: string; virtueCheck?: VirtueCheck }> {
  const systemPrompt = await buildBeliefJournalSystemPrompt(stage);

  // Build messages: raw thought as first user message, then dialogue turns
  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    { role: 'user', content: entry.rawThought },
    ...entry.dialogue.map(turn => ({
      role: (turn.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: turn.content,
    })),
  ];

  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 1500,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Backend/Claude API error:', response.status, errorText);
    throw new Error(`The Cabinet is unavailable. (Error ${response.status})`);
  }

  const data = await response.json();
  const rawContent = data?.content?.[0]?.text;
  if (typeof rawContent !== 'string' || rawContent.length === 0) {
    throw new Error('The Cabinet did not respond. Please try again.');
  }

  // Parse out the structured tags from the response
  let displayContent = rawContent;
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

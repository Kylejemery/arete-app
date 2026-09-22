import { getUserSettings, getLatestCheckIn, getTodayCheckin, getJournalEntries, getReadingData, getCounselorsBySlugs, getUserCabinet, getRoutineTemplates } from './db';
import { ThreadMessage, appendMessages, getContextWindow } from './threadService';
import { COUNSELOR_PROFILE_MAP } from './counselors';
import { supabase } from '@/lib/supabase';

// What a check-in call comes back with. A failure is a value, never a string
// that looks like a reply: callers must not save anything to check_ins unless
// ok is true (retention plan R2). The old fallback sentence used to be returned
// here and was being stored as the day's Cabinet response.
export type CheckInFailureReason = 'daily_limit' | 'http_error' | 'empty_reply' | 'network';
export type CheckInResult =
  | { ok: true; text: string }
  | { ok: false; reason: CheckInFailureReason; status?: number };

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

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

/**
 * The request never reached the Cabinet, or its answer never came back.
 *
 * This used to be returned as if it were a counselor's reply ("Backend server
 * not reachable..."), which the send path then saved into the thread: a
 * dropped connection became permanent conversation history. Thrown now, so
 * the caller can restore the composer and show a banner instead.
 */
export class CabinetUnavailableError extends Error {
  constructor(message = 'The Cabinet could not be reached. Check your connection and try again.') {
    super(message);
    this.name = 'CabinetUnavailableError';
  }
}

// The server refused the message with 403 daily_limit_reached. A subclass so
// every existing `instanceof CabinetUnavailableError` rethrow keeps working;
// callers that can explain the cap (the Cabinet page's limit card) check for
// this first. The message is only a fallback for callers that cannot.
export class DailyLimitReachedError extends CabinetUnavailableError {
  readonly tier: string;
  readonly limit: number | null;
  constructor(tier: string, limit: number | null) {
    super(
      limit
        ? `You have used today's ${limit} messages. They reset at midnight.`
        : `You have used today's messages. They reset at midnight.`
    );
    this.name = 'DailyLimitReachedError';
    this.tier = tier;
    this.limit = limit;
  }
}

// Throws DailyLimitReachedError when a failed response is the daily cap;
// otherwise returns the body text so the caller can log it and fall through
// to its generic error.
async function readChatFailure(response: Response): Promise<string> {
  const text = await response.text();
  if (response.status === 403) {
    try {
      const body = JSON.parse(text) as { error?: string; tier?: string; limit?: number };
      if (body?.error === 'daily_limit_reached') {
        throw new DailyLimitReachedError(body.tier ?? 'free', typeof body.limit === 'number' ? body.limit : null);
      }
    } catch (e) {
      if (e instanceof DailyLimitReachedError) throw e;
      // Not JSON: an ordinary failure.
    }
  }
  return text;
}

// A Cabinet turn is several sequential generations, so it is slow by design;
// this only bounds a socket that has genuinely stopped answering.
const CHAT_TIMEOUT_MS = 120_000;

/**
 * POST with a timeout, retried once when the request fails at the transport
 * layer — no HTTP response at all.
 *
 * That is the shape of the failure this exists for: a backgrounded tab can
 * have its in-flight request dropped by the browser, and the retry runs when
 * the tab is live again. An HTTP error IS a response and is never retried
 * here; the caller reads the status. The retry can cost a second message
 * against the daily limit when the server did finish the turn and only the
 * response was lost — one attempt, for that reason.
 */
async function postWithRetry(url: string, init: RequestInit, attempts = 2): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (e) {
      lastError = e;
      console.warn(`[chat] transport failure (attempt ${attempt + 1}/${attempts}):`, (e as Error)?.message);
      if (attempt < attempts - 1) await new Promise(r => setTimeout(r, 1200));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new CabinetUnavailableError(
    lastError instanceof Error && lastError.name === 'AbortError'
      ? 'The Cabinet took too long to answer. Try again.'
      : undefined
  );
}

export async function gatherUserProfile(): Promise<string> {
  const settings = await getUserSettings();

  const userName = settings?.user_name || 'the user';
  const lines: string[] = [];

  lines.push(`=== WHO ${userName.toUpperCase()} IS — PERMANENT PROFILE ===`);
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
  lines.push(`FUTURE SELF (${settings?.future_self_years ?? 10} years from now):`);
  lines.push(settings?.future_self_description || '(not yet described)');

  return lines.join('\n');
}

function formatReadingTime(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} minutes`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes` : `${hours} hour${hours > 1 ? 's' : ''}`;
}

// A routine block the Cabinet can reason about on any day, including one the
// user has not checked in on. See the twin of this in the mobile app's
// services/claudeService.ts — same rule, same reasoning.
//
// "Not done" and "not recorded" are deliberately different: an unticked box
// on a day with a check-in means the item is outstanding, while a day with no
// check-in at all means nobody knows, and asserting either way is wrong.
function routineLines(label: string, tasks: { title: string; done: boolean }[], templates: { title: string; emoji?: string | null }[]): string[] {
  if (tasks.length > 0) {
    return [`${label}:`, ...tasks.map(t => `- ${t.title}: ${t.done ? 'Done' : 'Not done'}`)];
  }
  if (templates.length === 0) return [];
  const titles = templates.map(t => (t.emoji ? `${t.emoji} ${t.title}` : t.title));
  return [
    `${label} (no check-in recorded today — status unknown, do not assume either way):`,
    ...titles.map(title => `- ${title}: not recorded`),
  ];
}

export async function gatherAppContext(): Promise<string> {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const [morningCheckIn, eveningCheckIn, readingData, journalEntries, settings, todayCheckin, morningTemplates, eveningTemplates] = await Promise.all([
    getLatestCheckIn('morning'),
    getLatestCheckIn('evening'),
    getReadingData(),
    getJournalEntries(),
    getUserSettings(),
    getTodayCheckin().catch(() => null),
    getRoutineTemplates('morning').catch(() => []),
    getRoutineTemplates('evening').catch(() => []),
  ]);

  const userName = settings?.user_name || 'the user';

  const lines: string[] = [];
  lines.push(`=== ${userName.toUpperCase()}'S CURRENT APP DATA (as of ${today}) ===`);

  // Morning routine. This read localStorage keys ('arete_morning_tasks',
  // 'arete_evening_tasks') that nothing in web/src writes any more, so both
  // blocks were always empty and always omitted — the web Cabinet has never
  // seen routine data. Read today's check-in instead, the same row the mobile
  // app writes, and fall back to the user's templates when there is no row.
  try {
    const tasks = (todayCheckin?.morning_tasks as { title: string; done: boolean }[] | null) ?? [];
    const block = routineLines('MORNING ROUTINE', tasks, morningTemplates);
    if (block.length > 0) { lines.push(''); lines.push(...block); }
  } catch { /* skip */ }

  // Evening tasks
  try {
    const tasks = (todayCheckin?.evening_tasks as { title: string; done: boolean }[] | null) ?? [];
    const block = routineLines('EVENING TASKS', tasks, eveningTemplates);
    if (block.length > 0) { lines.push(''); lines.push(...block); }
  } catch { /* skip */ }

  // Evening reflection (from localStorage)
  const reflectionAnswer = typeof window !== 'undefined' ? localStorage.getItem('arete_reflection_answer') : null;
  lines.push('');
  lines.push('EVENING REFLECTION:');
  lines.push(`A: ${reflectionAnswer || '(not yet answered)'}`);

  // Stoic journal (from localStorage)
  const stoicAnswer = typeof window !== 'undefined' ? localStorage.getItem('arete_stoic_answer') : null;
  lines.push('');
  lines.push('STOIC JOURNAL:');
  lines.push(`A: ${stoicAnswer || '(not yet answered)'}`);

  // Recent journal entries
  try {
    const reflections = journalEntries
      .filter(e => e.type === 'reflection')
      .slice(0, 3);

    lines.push('');
    lines.push('RECENT JOURNAL ENTRIES (last 3):');
    if (reflections.length === 0) {
      lines.push('(none yet)');
    } else {
      reflections.forEach((e) => {
        const snippet = e.content.length > 300 ? e.content.slice(0, 300) + '…' : e.content;
        lines.push(`${new Date(e.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} — ${snippet}`);
      });
    }
  } catch { /* skip */ }

  // Encoded beliefs
  try {
    const encodedBeliefs = journalEntries.filter(e => e.type === 'belief' && e.belief_stage === 'encoded');
    lines.push('');
    lines.push(`ENCODED BELIEFS (${encodedBeliefs.length}):`);
    if (encodedBeliefs.length === 0) {
      lines.push('(none yet)');
    } else {
      encodedBeliefs.forEach(b => lines.push(`[${b.topic || 'Belief'}] ${b.encoded_belief || b.content}`));
    }
  } catch { /* skip */ }

  // Currently reading
  try {
    const currentBooks = readingData?.current_books || [];
    lines.push('');
    lines.push('READING — CURRENTLY READING:');
    if (currentBooks.length === 0) {
      lines.push('(none yet)');
    } else {
      currentBooks.forEach((b) => lines.push(`- ${b.title} by ${b.author} (currently on page ${b.currentPage ?? 0})`));
    }
  } catch { /* skip */ }

  // Today's reading time — only inject if data actually exists (avoids model hallucinating reading activity)
  try {
    const readingSeconds = readingData?.today_reading_seconds ?? 0;
    if (readingSeconds > 0) {
      lines.push('');
      lines.push(`TODAY'S READING TIME: ${formatReadingTime(readingSeconds)}`);
    }
  } catch { /* skip */ }

  // Recent reading sessions
  try {
    const sessions = readingData?.reading_sessions || [];
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
    const booksRead = readingData?.books_read || [];
    lines.push('');
    lines.push(`BOOKS FINISHED (${booksRead.length}):`);
    if (booksRead.length === 0) {
      lines.push('(none yet)');
    } else {
      booksRead.forEach((b) => lines.push(`- ${b.title} by ${b.author} (finished ${b.dateFinished || ''})`));
    }
  } catch { /* skip */ }

  // Overall stats
  try {
    const morningDone = morningCheckIn !== null;
    const eveningDone = eveningCheckIn !== null;
    const journalCount = journalEntries.length;
    const quoteCount = journalEntries.filter(e => e.type === 'quote').length;
    lines.push('');
    lines.push('OVERALL STATS:');
    lines.push(`- Morning check-in today: ${morningDone ? 'Done' : 'Not done'}`);
    lines.push(`- Evening check-in today: ${eveningDone ? 'Done' : 'Not done'}`);
    lines.push(`- Total journal entries: ${journalCount}`);
    lines.push(`- Total quotes saved: ${quoteCount}`);
  } catch { /* skip */ }

  return lines.join('\n');
}

function buildDynamicCounselorProfile(c: { name: string; bio?: string; description?: string; philosophy?: string; communication_style?: string; challenge_level?: string; quotes?: string[] }): string {
  const quotes = Array.isArray(c.quotes) && c.quotes.length > 0
    ? c.quotes.map((q: string) => `- *"${q}"*`).join('\n')
    : '';
  return `## ${c.name}

${c.bio || c.description || ''}

**Core philosophy:** ${c.philosophy || '(not specified)'}

**Communication style:** ${c.communication_style || '(not specified)'}

**Challenge level:** ${c.challenge_level || '(not specified)'}${quotes ? `\n\n**Representative quotes:**\n${quotes}` : ''}`;
}

export async function buildSystemPrompt(): Promise<string> {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const settings = await getUserSettings();
  const userName = settings?.user_name || 'the user';
  const userGoals = settings?.user_goals || '(not yet specified)';
  const futureSelfYears = settings?.future_self_years ?? 10;
  const futureSelfDescription = settings?.future_self_description || '(not yet described)';

  let activeMembers: string[] = ['marcus-aurelius', 'epictetus', 'david-goggins', 'theodore-roosevelt', 'futureSelf'];
  if (Array.isArray(settings?.cabinet_members) && settings.cabinet_members.length > 0) {
    activeMembers = settings.cabinet_members;
  }

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

**Not every counselor needs to respond to every message.** For routine check-ins, one or two voices are sufficient. For major questions or decisions, more counselors should weigh in.

**Marcus Aurelius serves as the Chair of the cabinet.** He is always present. Other counselors join as appropriate.`;

  const profileSections: string[] = [];
  const missingSlugs: string[] = [];
  for (const memberId of activeMembers) {
    if (memberId === 'futureSelf') continue;
    if (COUNSELOR_PROFILE_MAP[memberId]) {
      profileSections.push(COUNSELOR_PROFILE_MAP[memberId]);
    } else {
      missingSlugs.push(memberId);
    }
  }

  // Fetch dynamic profiles from Supabase for counselors not in the hardcoded map
  if (missingSlugs.length > 0) {
    try {
      const dynamicCounselors = await getCounselorsBySlugs(missingSlugs);
      for (const c of dynamicCounselors) {
        profileSections.push(buildDynamicCounselorProfile(c));
      }
    } catch { /* skip — fallback to available profiles */ }
  }

  if (activeMembers.includes('futureSelf')) {
    const futureSelfProfile = `## Future Self — ${userName} in ${futureSelfYears} Years

Future Self is not a historical figure. They are ${userName} themselves — ${futureSelfYears} years from now — having lived through this period with intention, discipline, and courage.

${futureSelfDescription}

Future Self's role in the cabinet is unique. They do not advise from the outside — they advise from the inside. They know every excuse ${userName} has ever made. They know exactly what this time costs and what it gives back. They have lived it. When they speak, it is not speculation — it is memory.

Their communication style is warm, wise, and unhurried. They do not panic. They do not catastrophize. They see the long arc clearly.`;
    profileSections.push(futureSelfProfile);
  }

  const userProfile = await gatherUserProfile();
  return `${instructions}\n\n---\n\n${cabinetIntro}\n\n---\n\n${profileSections.join('\n\n---\n\n')}\n\n---\n\n${userProfile}\n\n---\n\nToday's date is ${today}. ${userName} is engaging with their Cabinet of Invisible Counselors.`;
}

async function buildCounselorSystemPrompt(counselorId: string): Promise<string> {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const settings = await getUserSettings();
  const userName = settings?.user_name || 'the user';
  const futureSelfYears = settings?.future_self_years ?? 10;
  const futureSelfDescription = settings?.future_self_description || '(not yet described)';

  let counselorProfile: string;
  let counselorName: string;

  if (counselorId === 'futureSelf') {
    counselorName = `${userName}'s Future Self`;
    counselorProfile = `## Future Self — ${userName} in ${futureSelfYears} Years

Future Self is not a historical figure. They are ${userName} themselves — ${futureSelfYears} years from now — having lived through this period with intention, discipline, and courage.

${futureSelfDescription}

Future Self's role is unique. They do not advise from the outside — they advise from the inside. They know every excuse ${userName} has ever made. They know exactly what this time costs and what it gives back. They have lived it. When they speak, it is not speculation — it is memory.

Their communication style is warm, wise, and unhurried.`;
  } else {
    const hardcodedProfile = COUNSELOR_PROFILE_MAP[counselorId];
    if (hardcodedProfile) {
      counselorProfile = hardcodedProfile;
    } else {
      // Fetch dynamic profile from Supabase for non-default counselors
      try {
        const [fetched] = await getCounselorsBySlugs([counselorId]);
        counselorProfile = fetched ? buildDynamicCounselorProfile(fetched) : '(Unknown counselor)';
      } catch {
        counselorProfile = '(Unknown counselor)';
      }
    }
    const nameMap: Record<string, string> = {
      'marcus-aurelius': 'Marcus Aurelius',
      epictetus: 'Epictetus',
      'david-goggins': 'David Goggins',
      'theodore-roosevelt': 'Theodore Roosevelt',
    };
    counselorName = nameMap[counselorId] || counselorId;
  }

  const userProfile = await gatherUserProfile();
  return `You are ${counselorName}, speaking privately with ${userName} as their personal counselor.\n\n${userProfile}\n\nKey principles:\n- Do NOT be sycophantic. Challenge ${userName}. Push back when warranted. Tell them the truth.\n- Be firm AND compassionate.\n- Use Socratic questioning.\n\nYou are speaking with ${userName} one-on-one. Respond only as ${counselorName}.\n\n---\n\n${counselorProfile}\n\n---\n\nToday's date is ${today}. ${userName} is engaging with you in a private one-on-one session.`;
}

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
    const syntheticThread = { id: 'cabinet', messages, lastUpdated: Date.now() };
    const { contextMessages, summaryNote } = getContextWindow(syntheticThread);

    const [systemBase, appContext, settings] = await Promise.all([
      buildSystemPrompt(),
      gatherAppContext(),
      getUserSettings(),
    ]);
    const systemPrompt = systemBase + '\n\n---\n\n' + appContext;
    const fullSystem = summaryNote ? systemPrompt + '\n\n' + summaryNote : systemPrompt;

    const { data: { session: cabinetSession } } = await supabase.auth.getSession();

    // Shared session (Arete for Couples): include every participant so the
    // server can fetch their Know Thyself profiles and respond to the group.
    // Solo (the default) sends no participant list and behaves unchanged.
    const sessionType = sessionOptions?.sessionType ?? 'solo';
    const participantIds =
      sessionType === 'shared'
        ? [cabinetSession?.user?.id, ...(sessionOptions?.partnerIds ?? [])].filter(
            (id): id is string => typeof id === 'string' && id.length > 0 && id !== 'pending'
          )
        : undefined;

    const response = await postWithRetry(`${API_BASE_URL}/api/chat/counselor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cabinetSession?.access_token}` },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        counselorModels: settings?.counselor_models ?? {},
        cabinetMembers: settings?.cabinet_members ?? [],
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
        userId: cabinetSession?.user?.id,
        sessionType,
        sessionId: sessionOptions?.sessionId,
        participantIds,
      }),
    });

    if (!response.ok) {
      const errorText = await readChatFailure(response); // throws on the daily cap
      console.error('Backend/Claude API error:', response.status, errorText);
      throw new CabinetUnavailableError(`The Cabinet is temporarily unavailable. (Error ${response.status})`);
    }

    const data = await response.json();
    if (data.mode === 'parallel' && Array.isArray(data.responses)) {
      const replies = data.responses
        .map((r: { counselorId?: string; counselorName?: string; response?: string }): CabinetReply => ({
          counselorId: r.counselorId ?? null,
          counselorName: r.counselorName ?? null,
          text: typeof r.response === 'string' ? r.response : '',
        }))
        .filter((r: CabinetReply) => r.text.length > 0);
      if (replies.length > 0) return replies;
      throw new CabinetUnavailableError('The Cabinet did not respond. Please try again.');
    }
    const content = data?.content?.[0]?.text;
    if (typeof content === 'string' && content.length > 0) {
      return asSingleReply(content);
    }
    throw new CabinetUnavailableError('The Cabinet did not respond. Please try again.');
  } catch (error) {
    if (error instanceof CabinetUnavailableError) throw error;
    // Still a failure, not a reply: throw so the caller keeps the user's
    // question instead of saving an error string into the thread.
    console.error('Backend request failed:', error);
    throw new CabinetUnavailableError();
  }
}

/**
 * Work out who actually spoke in a check-in reply.
 *
 * A check-in goes to /api/chat, the group endpoint, which answers in the
 * Cabinet's collective voice and names its own speaker inside the text
 * ("**Marcus Aurelius:**", "*Marcus Aurelius speaks*"). Nothing carried that
 * name back out, so every check-in reply was stored with no counselorName and
 * the bubble read "The Cabinet" while the body underneath announced someone
 * else. The parallel Cabinet path has no such gap: it returns a counselorName
 * per voice.
 *
 * Only the name is stamped, not a counselorId: the id the Cabinet path
 * stores is the server's short counselor id ('marcus'), while the roster row
 * here carries the counselors-table id and slug ('marcus-aurelius'). The
 * bubble label reads counselorName, so the name is what this is for.
 *
 * Only a name on this user's own roster is accepted, so a counselor merely
 * quoted in passing is never mistaken for the speaker. Marcus chairs every
 * session and is always present, so he is the fallback; if he is somehow not
 * on the roster the reply stays unattributed and reads "The Cabinet", as
 * before. The mobile twin keeps the same helper in services/claudeService.ts.
 */
function attributeCheckInSpeaker(
  reply: string,
  roster: { name: string }[]
): { counselorName?: string } {
  // The speaker is announced up front, before the counsel starts.
  const opening = reply.slice(0, 240);
  const named = roster
    .map(c => ({ c, at: opening.indexOf(c.name) }))
    .filter(x => x.at >= 0)
    .sort((a, b) => a.at - b.at)[0];
  const chosen = named?.c ?? roster.find(c => c.name === 'Marcus Aurelius');
  return chosen ? { counselorName: chosen.name } : {};
}

// A refused check-in: the daily cap (only once the two exempt check-ins are
// spent) is told apart from any other failure so the screen can say why.
function checkInFailure(status: number, body: string): CheckInResult {
  if (status === 403 && body.includes('daily_limit_reached')) return { ok: false, reason: 'daily_limit', status };
  return { ok: false, reason: 'http_error', status };
}

// `affirmation` is the quote the page actually displayed, so the prompt's
// "Affirmation shown" line is true (R4). Without it the morning falls back to
// the day's entry in AFFIRMATIONS, which is what the mobile app shows.
export async function sendCheckInToCabinet(
  type: 'morning' | 'evening',
  options: { affirmation?: string } = {}
): Promise<CheckInResult> {
  try {
    // Today's row is the source of truth for tasks and intention (the morning
    // and evening pages write it), same as the mobile app. The old
    // localStorage keys read here were no longer written by anything.
    const [settings, checkin] = await Promise.all([getUserSettings(), getTodayCheckin()]);
    const userName = settings?.user_name || 'the user';
    const intention = String(checkin?.intention ?? '').trim();

    let userMessage: string;

    if (type === 'morning') {
      const morningTasks = (checkin?.morning_tasks as { title: string; done: boolean }[] | null) ?? [];
      const taskSummary = morningTasks.length > 0
        ? morningTasks.map(t => `${t.title} ${t.done ? '✓' : '✗'}`).join(', ')
        : '(no tasks)';
      const day = new Date().getDay();
      const affirmations = [
        "Confine yourself to the present. — Marcus Aurelius",
        "Do not indulge in expectations — meet each moment. — Epictetus",
        "It is not the man who has too little, but the man who craves more, that is poor. — Seneca",
        "You have power over your mind, not outside events. — Marcus Aurelius",
        "Seek not the good in external things; seek it in yourself. — Epictetus",
        "He is a wise man who does not grieve for the things which he has not, but rejoices for those which he has. — Epictetus",
        "Begin at once to live, and count each separate day as a separate life. — Seneca",
      ];
      const affirmation = options.affirmation?.trim() || affirmations[day];
      const intentionLine = intention ? ` Today's intention, in their own words: '${intention}'.` : '';
      userMessage = `[Morning check-in] ${userName} has just completed their morning routine. Tasks: ${taskSummary}.${intentionLine} Affirmation shown: '${affirmation}'. Speak to them briefly as they begin the day.`;
    } else {
      const eveningTasks = (checkin?.evening_tasks as { title: string; done: boolean }[] | null) ?? [];
      const taskSummary = eveningTasks.length > 0
        ? eveningTasks.map(t => `${t.title} ${t.done ? '✓' : '✗'}`).join(', ')
        : '(no tasks)';
      const reflection = String(checkin?.reflection_answer ?? '') || '(not answered)';
      const stoic = String(checkin?.stoic_answer ?? '') || '(not answered)';
      const intentionLine = intention ? ` This morning's intention was: '${intention}'.` : '';
      userMessage = `[Evening check-in] ${userName} is wrapping up their evening. Tasks: ${taskSummary}.${intentionLine} Reflection: '${reflection}'. Stoic: '${stoic}'. Speak to them as they close the day.`;
    }

    const [systemBase, appContext] = await Promise.all([buildSystemPrompt(), gatherAppContext()]);
    const systemPrompt = systemBase + '\n\n---\n\n' + appContext;

    const { data: { session: checkInSession } } = await supabase.auth.getSession();
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${checkInSession?.access_token}` },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        // Tells the server this is a routine check-in, which does not count
        // against the daily message cap (two a day; see /api/chat).
        kind: type,
        tzOffsetMinutes: new Date().getTimezoneOffset(),
      }),
    });

    if (!response.ok) {
      let errorText = '';
      try { errorText = await response.text(); } catch { /* ignore */ }
      console.error('Cabinet check-in error:', response.status, errorText);
      return checkInFailure(response.status, errorText);
    }

    const data = await response.json();
    const assistantReply = data?.content?.[0]?.text;
    if (typeof assistantReply === 'string' && assistantReply.length > 0) {
      const roster = await getUserCabinet().catch(() => []);
      const speaker = attributeCheckInSpeaker(assistantReply, roster);
      await appendMessages('cabinet', [
        { role: 'user', content: userMessage, timestamp: Date.now(), kind: 'checkin' },
        { role: 'assistant', content: assistantReply, timestamp: Date.now(), ...speaker },
      ]);
      return { ok: true, text: assistantReply };
    }
    return { ok: false, reason: 'empty_reply' };
  } catch (error) {
    console.error('Cabinet check-in failed:', error);
    return { ok: false, reason: 'network' };
  }
}

export async function sendMessageToCounselor(
  counselorId: string,
  messages: ThreadMessage[]
): Promise<string> {
  try {
    const syntheticThread = { id: counselorId, messages, lastUpdated: Date.now() };
    const { contextMessages, summaryNote } = getContextWindow(syntheticThread);

    const [systemBase, appContext] = await Promise.all([buildCounselorSystemPrompt(counselorId), gatherAppContext()]);
    const systemPrompt = systemBase + '\n\n---\n\n' + appContext;
    const fullSystem = summaryNote ? systemPrompt + '\n\n' + summaryNote : systemPrompt;

    const { data: { session: counselorSession } } = await supabase.auth.getSession();
    const response = await postWithRetry(`${API_BASE_URL}/api/chat/counselor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${counselorSession?.access_token}` },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1500,
        system: fullSystem,
        messages: contextMessages.map((m) => ({ role: m.role, content: m.content })),
        tzOffsetMinutes: new Date().getTimezoneOffset(),
        activeCounselorId: counselorId,
        userId: counselorSession?.user?.id,
      }),
    });

    if (!response.ok) {
      const errorText = await readChatFailure(response); // throws on the daily cap
      console.error('Backend/Claude API error:', response.status, errorText);
      throw new CabinetUnavailableError(`Your counselor is temporarily unavailable. (Error ${response.status})`);
    }

    const data = await response.json();
    const content = data?.content?.[0]?.text;
    if (typeof content === 'string' && content.length > 0) {
      return content;
    }
    throw new CabinetUnavailableError('No response received. Please try again.');
  } catch (error) {
    if (error instanceof CabinetUnavailableError) throw error;
    console.error('Backend request failed:', error);
    throw new CabinetUnavailableError();
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
1. In Stage 1: Ask questions only. Do not propose a refined version yet. Probe the assumptions. Maximum 3 questions per response.
2. When proposing the refined version: Write it clearly, sharply, in the user's own voice. Then ask: "Does this land? What needs to change?"
3. The Stoic guardrail: At the point of encoding, check the belief against the four cardinal virtues — Wisdom, Justice, Courage, Temperance.

Today's date: ${today}`;

  if (stage === 1) {
    return basePrompt + `\n\nCURRENT TASK: The user has submitted their raw belief. Ask clarifying questions ONLY. Do NOT propose a refined version yet. Maximum 3 questions.`;
  } else if (stage === 2) {
    return basePrompt + `\n\nCURRENT TASK: Propose a clear, sharp refined statement in the user's own voice. Then ask "Does this land? What needs to change?" Also run the Stoic virtue check. Return using these exact tags:\n\n[REFINED_BELIEF]\n{the refined belief text}\n[/REFINED_BELIEF]\n\n[VIRTUE_CHECK]\n{"passed": true, "virtue": null, "concern": null}\n[/VIRTUE_CHECK]`;
  } else {
    return basePrompt + `\n\nCURRENT TASK: Stage 3 — the user is pushing back or iterating. Adjust the refined statement. Re-run the Stoic virtue check. Return using the same tags.`;
  }
}

export async function sendBeliefJournalMessage(
  entry: BeliefEntry,
  stage: 1 | 2 | 3
): Promise<{ response: string; refinedStatement?: string; virtueCheck?: VirtueCheck }> {
  const systemPrompt = await buildBeliefJournalSystemPrompt(stage);

  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    { role: 'user', content: entry.rawThought },
    ...entry.dialogue.map(turn => ({
      role: (turn.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: turn.content,
    })),
  ];

  const { data: { session: beliefSession } } = await supabase.auth.getSession();
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${beliefSession?.access_token}` },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
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


import { getUserSettings, getLatestCheckIn, getJournalEntries, getReadingData } from './db';
import { ThreadMessage, appendMessages, getContextWindow } from './threadService';
import { COUNSELOR_PROFILE_MAP } from './counselors';

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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

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

export async function gatherAppContext(): Promise<string> {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const [morningCheckIn, eveningCheckIn, readingData, journalEntries, settings] = await Promise.all([
    getLatestCheckIn('morning'),
    getLatestCheckIn('evening'),
    getReadingData(),
    getJournalEntries(),
    getUserSettings(),
  ]);

  const userName = settings?.user_name || 'the user';

  const lines: string[] = [];
  lines.push(`=== ${userName.toUpperCase()}'S CURRENT APP DATA (as of ${today}) ===`);

  // Morning routine (from localStorage when available)
  try {
    const storedMorningTasks = typeof window !== 'undefined' ? localStorage.getItem('arete_morning_tasks') : null;
    const morningTasks = storedMorningTasks ? JSON.parse(storedMorningTasks) : [];
    if (morningTasks.length > 0) {
      lines.push('');
      lines.push('MORNING ROUTINE:');
      morningTasks.forEach((t: { title: string; done: boolean }) => lines.push(`- ${t.title}: ${t.done ? 'Done' : 'Not done'}`));
    }
  } catch { /* skip */ }

  // Evening tasks (from localStorage when available)
  try {
    const storedEveningTasks = typeof window !== 'undefined' ? localStorage.getItem('arete_evening_tasks') : null;
    const eveningTasks = storedEveningTasks ? JSON.parse(storedEveningTasks) : [];
    if (eveningTasks.length > 0) {
      lines.push('');
      lines.push('EVENING TASKS:');
      eveningTasks.forEach((t: { title: string; done: boolean }) => lines.push(`- ${t.title}: ${t.done ? 'Done' : 'Not done'}`));
    }
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

  // Today's reading time
  try {
    const readingSeconds = readingData?.today_reading_seconds ?? 0;
    lines.push('');
    lines.push(`TODAY'S READING TIME: ${formatReadingTime(readingSeconds)}`);
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

  let activeMembers: string[] = ['marcus', 'epictetus', 'goggins', 'roosevelt', 'futureSelf'];
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
  for (const memberId of activeMembers) {
    if (memberId === 'futureSelf') continue;
    if (COUNSELOR_PROFILE_MAP[memberId]) {
      profileSections.push(COUNSELOR_PROFILE_MAP[memberId]);
    }
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
    counselorProfile = COUNSELOR_PROFILE_MAP[counselorId] || '(Unknown counselor)';
    const nameMap: Record<string, string> = {
      marcus: 'Marcus Aurelius',
      epictetus: 'Epictetus',
      goggins: 'David Goggins',
      roosevelt: 'Theodore Roosevelt',
    };
    counselorName = nameMap[counselorId] || counselorId;
  }

  const userProfile = await gatherUserProfile();
  return `You are ${counselorName}, speaking privately with ${userName} as their personal counselor.\n\n${userProfile}\n\nKey principles:\n- Do NOT be sycophantic. Challenge ${userName}. Push back when warranted. Tell them the truth.\n- Be firm AND compassionate.\n- Use Socratic questioning.\n\nYou are speaking with ${userName} one-on-one. Respond only as ${counselorName}.\n\n---\n\n${counselorProfile}\n\n---\n\nToday's date is ${today}. ${userName} is engaging with you in a private one-on-one session.`;
}

export async function sendMessageToCabinet(messages: ThreadMessage[]): Promise<string> {
  try {
    const syntheticThread = { id: 'cabinet', messages, lastUpdated: Date.now() };
    const { contextMessages, summaryNote } = getContextWindow(syntheticThread);

    const [systemBase, appContext] = await Promise.all([buildSystemPrompt(), gatherAppContext()]);
    const systemPrompt = systemBase + '\n\n---\n\n' + appContext;
    const fullSystem = summaryNote ? systemPrompt + '\n\n' + summaryNote : systemPrompt;

    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 4000,
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

export async function sendCheckInToCabinet(type: 'morning' | 'evening'): Promise<string> {
  try {
    const settings = await getUserSettings();
    const userName = settings?.user_name || 'the user';

    let userMessage: string;

    if (type === 'morning') {
      const storedTasks = typeof window !== 'undefined' ? localStorage.getItem('arete_morning_tasks') : null;
      const morningTasks: { title: string; done: boolean }[] = storedTasks ? JSON.parse(storedTasks) : [];
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
      const affirmation = affirmations[day];
      userMessage = `[Morning check-in] ${userName} has just completed their morning routine. Tasks: ${taskSummary}. Affirmation shown: '${affirmation}'. Speak to them briefly as they begin the day.`;
    } else {
      const storedTasks = typeof window !== 'undefined' ? localStorage.getItem('arete_evening_tasks') : null;
      const eveningTasks: { title: string; done: boolean }[] = storedTasks ? JSON.parse(storedTasks) : [];
      const taskSummary = eveningTasks.length > 0
        ? eveningTasks.map(t => `${t.title} ${t.done ? '✓' : '✗'}`).join(', ')
        : '(no tasks)';
      const reflection = (typeof window !== 'undefined' ? localStorage.getItem('arete_reflection_answer') : null) || '(not answered)';
      const stoic = (typeof window !== 'undefined' ? localStorage.getItem('arete_stoic_answer') : null) || '(not answered)';
      userMessage = `[Evening check-in] ${userName} is wrapping up their evening. Tasks: ${taskSummary}. Reflection: '${reflection}'. Stoic: '${stoic}'. Speak to them as they close the day.`;
    }

    const [systemBase, appContext] = await Promise.all([buildSystemPrompt(), gatherAppContext()]);
    const systemPrompt = systemBase + '\n\n---\n\n' + appContext;

    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
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

    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

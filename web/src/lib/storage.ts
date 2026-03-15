// localStorage wrapper that mirrors AsyncStorage API
// Guards for SSR safety with typeof window !== 'undefined'

export function getItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore storage errors silently
  }
}

export function removeItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function getAllKeys(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return Object.keys(localStorage);
  } catch {
    return [];
  }
}

// Storage keys used across the app (same as mobile AsyncStorage keys)
export const STORAGE_KEYS = {
  // User profile
  userName: 'userName',
  userGoals: 'userGoals',
  kt_background: 'kt_background',
  kt_identity: 'kt_identity',
  kt_goals: 'kt_goals',
  kt_strengths: 'kt_strengths',
  kt_weaknesses: 'kt_weaknesses',
  kt_patterns: 'kt_patterns',
  kt_major_events: 'kt_major_events',
  futureSelfYears: 'futureSelfYears',
  futureSelfDescription: 'futureSelfDescription',

  // Cabinet
  activeMembers: 'cabinetMembers',

  // Routines
  morningTasks: 'morningTasks',
  morningDone: 'morningDone',
  eveningTasks: 'eveningTasks',
  eveningDone: 'eveningDone',
  reflectionAnswer: 'reflectionAnswer',
  stoicAnswer: 'stoicAnswer',

  // Progress
  streak: 'streak',
  calendarData: 'calendarData',

  // Journal
  journalEntries: 'journalEntries',
  commonplaceQuotes: 'commonplaceQuotes',
  unifiedJournalEntries: 'unifiedJournalEntries',

  // Reading
  booksRead: 'booksRead',
  currentBooks: 'currentBooks',
  readingSessions: 'readingSessions',
  readingStreak: 'readingStreak',
  todayReadingSeconds: 'todayReadingSeconds',

  // Beliefs
  beliefEntries: 'beliefEntries',

  // Threads
  thread_cabinet: 'thread_cabinet',
  thread_marcus: 'thread_marcus',
  thread_epictetus: 'thread_epictetus',
  thread_goggins: 'thread_goggins',
  thread_roosevelt: 'thread_roosevelt',
  thread_futureSelf: 'thread_futureSelf',
} as const;

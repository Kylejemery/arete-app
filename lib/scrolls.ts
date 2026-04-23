import { supabase } from './supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 5000): Promise<Response | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (err) {
    console.error('fetchWithTimeout failed:', url, err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

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

export async function getUserScrolls(userId: string): Promise<Scroll[]> {
  const { data, error } = await supabase
    .from('scrolls')
    .select(`*, scroll_reads (read_count, last_read_at)`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getUserScrolls error:', error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    ...row,
    read_count: row.scroll_reads?.[0]?.read_count ?? 0,
    last_read_at: row.scroll_reads?.[0]?.last_read_at ?? null,
    scroll_reads: undefined,
  }));
}

export async function getScroll(scrollId: string): Promise<Scroll | null> {
  const { data, error } = await supabase
    .from('scrolls')
    .select(`*, scroll_reads (read_count, last_read_at)`)
    .eq('id', scrollId)
    .single();

  if (error) {
    console.error('getScroll error:', error);
    return null;
  }

  return {
    ...data,
    read_count: data.scroll_reads?.[0]?.read_count ?? 0,
    last_read_at: data.scroll_reads?.[0]?.last_read_at ?? null,
    scroll_reads: undefined,
  };
}

export async function logScrollRead(scrollId: string, userId: string): Promise<number> {
  const { data: existing } = await supabase
    .from('scroll_reads')
    .select('id, read_count')
    .eq('scroll_id', scrollId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    const newCount = existing.read_count + 1;
    await supabase
      .from('scroll_reads')
      .update({ read_count: newCount, last_read_at: new Date().toISOString() })
      .eq('id', existing.id);
    return newCount;
  } else {
    await supabase
      .from('scroll_reads')
      .insert({ scroll_id: scrollId, user_id: userId, read_count: 1, last_read_at: new Date().toISOString() });
    return 1;
  }
}

function parseGoals(goalsText: string): string[] {
  const sectionHeaders = /^(professional goals|personal goals|big audacious goal|goals)[\s:]/i;
  return goalsText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 10 && !sectionHeaders.test(line))
    .slice(0, 3);
}

export async function triggerScrollGeneration(
  userId: string,
  userName: string | null,
  goalsText: string
): Promise<void> {
  if (!goalsText.trim()) return;

  const goals = parseGoals(goalsText);
  const targets = goals.length > 0 ? goals : [goalsText.trim().slice(0, 300)];

  for (const goal of targets) {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/scrolls/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal,
          userName: userName || undefined,
          requestType: 'auto',
        }),
      });

      if (!response || !response.ok) {
        console.error('Scroll generation failed for goal:', goal, response?.status);
        continue;
      }

      const { title, body, counselor } = await response.json();

      await supabase.from('scrolls').insert({
        user_id: userId,
        title,
        body,
        counselor,
        goal_source: goal,
        request_type: 'auto',
      });
    } catch (e) {
      console.error('triggerScrollGeneration error for goal:', goal, e);
    }
  }
}

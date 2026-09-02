import { supabase } from './supabase';
import { API_BASE_URL, authHeaders } from './api';
import type { Scroll } from './types';

export type { Scroll };

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 30000
): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    console.error('fetchWithTimeout failed:', url, err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

type ScrollRow = Scroll & { scroll_reads?: { read_count: number; last_read_at: string | null }[] };

function withReadCount(row: ScrollRow): Scroll {
  const { scroll_reads, ...rest } = row;
  return {
    ...(rest as Scroll),
    read_count: scroll_reads?.[0]?.read_count ?? 0,
    last_read_at: scroll_reads?.[0]?.last_read_at ?? null,
  };
}

export async function getUserScrolls(userId: string): Promise<Scroll[]> {
  const { data, error } = await supabase
    .from('scrolls')
    .select('*, scroll_reads (read_count, last_read_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getUserScrolls error:', error);
    return [];
  }
  return ((data ?? []) as ScrollRow[]).map(withReadCount);
}

export async function getScroll(scrollId: string): Promise<Scroll | null> {
  const { data, error } = await supabase
    .from('scrolls')
    .select('*, scroll_reads (read_count, last_read_at)')
    .eq('id', scrollId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('getScroll error:', error);
    return null;
  }
  return withReadCount(data as ScrollRow);
}

/** Increments this user's read counter for a scroll and returns the new count. */
export async function logScrollRead(scrollId: string, userId: string): Promise<number> {
  const { data: existing } = await supabase
    .from('scroll_reads')
    .select('id, read_count')
    .eq('scroll_id', scrollId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const newCount = (existing.read_count ?? 0) + 1;
    await supabase
      .from('scroll_reads')
      .update({ read_count: newCount, last_read_at: new Date().toISOString() })
      .eq('id', existing.id);
    return newCount;
  }

  await supabase
    .from('scroll_reads')
    .insert({ scroll_id: scrollId, user_id: userId, read_count: 1, last_read_at: new Date().toISOString() });
  return 1;
}

/**
 * Generates one scroll on demand and inserts it. Throws with a readable
 * message so the caller can show it — this is a user-initiated action.
 */
export async function requestScroll(goal: string, userName: string | null): Promise<Scroll | null> {
  const trimmed = goal.trim();
  if (!trimmed) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE_URL}/api/scrolls/generate`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ goal: trimmed, userName: userName || undefined, requestType: 'requested' }),
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `Request failed (${response.status})`);
  }

  const { title, body, counselor } = (await response.json()) as {
    title: string;
    body: string;
    counselor: string;
  };

  const { data, error } = await supabase
    .from('scrolls')
    .insert({
      user_id: user.id,
      title,
      body,
      counselor,
      goal_source: trimmed,
      request_type: 'requested',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Scroll;
}

function parseGoals(goalsText: string): string[] {
  const sectionHeaders = /^(professional goals|personal goals|big audacious goal|goals)[\s:]/i;
  return goalsText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 10 && !sectionHeaders.test(line))
    .slice(0, 3);
}

/**
 * Background generation of up to three scrolls from the user's goals text.
 * Best effort: a failure for one goal never blocks the others.
 */
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
        headers: await authHeaders(),
        body: JSON.stringify({ goal, userName: userName || undefined, requestType: 'auto' }),
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

// First Scroll generation for the web app (retention plan R3). Mirrors
// triggerScrollGeneration in the mobile app's lib/scrolls.ts: up to three goal
// lines from the Know Thyself goals become one auto scroll each, written by
// the server and inserted here. The web never generated a first Scroll before
// this; only manual requests from the Scrolls page did.
import { supabase } from './supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

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
  const { data: { session } } = await supabase.auth.getSession();

  for (const goal of targets) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60_000);
      const response = await fetch(`${API_BASE_URL}/api/scrolls/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ goal, userName: userName || undefined, requestType: 'auto' }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));
      if (!response.ok) {
        console.error('Scroll generation failed for goal:', goal, response.status);
        continue;
      }
      const { title, body, counselor } = await response.json() as { title: string; body: string; counselor: string };
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

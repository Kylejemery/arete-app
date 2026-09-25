// Know Thyself field registry and fact helpers (activation plan, Part 3).
// Mirrors server/lib/profile-fields.js; web/src/lib/profileFields.ts is an
// identical copy. server/tests/profile-facts.test.js checks the keys agree.
//
// Facts live in user_profile_facts. The user can read, update and delete
// their own rows under RLS; inserts come from the server (extraction, asks)
// and from the user_settings sync trigger (the form). Confirming or editing
// an inferred value sets source = user_confirmed, which a trigger mirrors
// into the matching user_settings column.
import { supabase } from './supabase';
import { logEvent } from './events';

export type FactSource = 'form' | 'cabinet_inferred' | 'cabinet_asked' | 'user_confirmed';

export interface ProfileField {
  key: string;
  column: string;
  question: string;
  priority: number;
  sensitive: boolean;
}

export const PROFILE_FIELDS: ProfileField[] = [
  { key: 'feedback_style', column: 'feedback_preference', question: 'How do you want your Cabinet to challenge you?', priority: 1, sensitive: false },
  { key: 'arete_reason', column: 'app_usage_intent', question: 'What brought you to Arete?', priority: 2, sensitive: false },
  { key: 'top_goal', column: 'kt_goals', question: 'What are your goals right now?', priority: 3, sensitive: false },
  { key: 'main_obstacle', column: 'kt_weaknesses', question: 'Where do you consistently fall short?', priority: 4, sensitive: false },
  { key: 'life_situation', column: 'kt_life_situation', question: 'What does your life look like right now?', priority: 5, sensitive: true },
  { key: 'background', column: 'kt_background', question: 'Background & Life Story', priority: 6, sensitive: true },
  { key: 'hard_times_pattern', column: 'kt_patterns', question: 'What do you do when things get hard?', priority: 7, sensitive: false },
  { key: 'identity', column: 'kt_identity', question: 'Professional Identity & Pursuits', priority: 8, sensitive: false },
  { key: 'strengths', column: 'kt_strengths', question: 'Strengths', priority: 9, sensitive: false },
  { key: 'future_self', column: 'future_self_description', question: 'Who do you want to become?', priority: 10, sensitive: false },
  { key: 'major_events', column: 'kt_major_events', question: 'Major Life Events', priority: 11, sensitive: true },
  { key: 'off_limits', column: 'kt_off_limits', question: 'Anything your Cabinet should never bring up?', priority: 12, sensitive: true },
];

export const TOP_FIVE_KEYS = PROFILE_FIELDS.filter(f => f.priority <= 5).map(f => f.key);

export const SOURCE_LABELS: Record<FactSource, string> = {
  form: 'You wrote this',
  cabinet_asked: 'You told your Cabinet',
  user_confirmed: 'You told your Cabinet',
  cabinet_inferred: "Your Cabinet's understanding",
};

export const KT_EXPLANATION =
  "Your Cabinet learns about you from your conversations so you don't have to fill this out. You can change or remove anything here.";

export interface ProfileFact {
  id: string;
  field_key: string;
  value: string | null;
  source: FactSource;
  status: 'active' | 'rejected';
  confidence: number | null;
  updated_at: string;
}

const filled = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

export async function getProfileFacts(): Promise<ProfileFact[]> {
  try {
    const { data, error } = await supabase
      .from('user_profile_facts')
      .select('id, field_key, value, source, status, confidence, updated_at');
    if (error) return [];
    return (data as ProfileFact[]) ?? [];
  } catch {
    return [];
  }
}

// One row per registry field that has something to show: a fact with a
// value, else what the user wrote in the form (older clients write only
// user_settings).
export interface FieldView {
  field: ProfileField;
  value: string;
  source: FactSource;
  fact: ProfileFact | null;
}

export function fieldViews(facts: ProfileFact[], settings: Record<string, unknown> | null): FieldView[] {
  const byKey = new Map(facts.map(f => [f.field_key, f]));
  const out: FieldView[] = [];
  for (const field of PROFILE_FIELDS) {
    const f = byKey.get(field.key) ?? null;
    if (f && f.status === 'rejected') continue;
    if (f && f.status === 'active' && filled(f.value)) {
      out.push({ field, value: f.value.trim(), source: f.source, fact: f });
    } else if (settings && filled(settings[field.column])) {
      out.push({ field, value: String(settings[field.column]).trim(), source: 'form', fact: null });
    }
  }
  return out;
}

export function isFieldFilled(key: string, facts: ProfileFact[], settings: Record<string, unknown> | null): boolean {
  return fieldViews(facts, settings).some(v => v.field.key === key);
}

// 0..1, weighted by priority; mirrors computeCompleteness on the server.
export function completenessScore(facts: ProfileFact[], settings: Record<string, unknown> | null): number {
  const scored = PROFILE_FIELDS.filter(f => f.key !== 'off_limits');
  const maxP = Math.max(...scored.map(f => f.priority));
  const have = new Set(fieldViews(facts, settings).map(v => v.field.key));
  let total = 0;
  let got = 0;
  for (const f of scored) {
    const w = maxP + 1 - f.priority;
    total += w;
    if (have.has(f.key)) got += w;
  }
  return total ? got / total : 0;
}

export function topFiveFilled(facts: ProfileFact[], settings: Record<string, unknown> | null): boolean {
  return TOP_FIVE_KEYS.every(k => isFieldFilled(k, facts, settings));
}

export async function confirmFact(fact: ProfileFact): Promise<boolean> {
  const { error } = await supabase
    .from('user_profile_facts')
    .update({ source: 'user_confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', fact.id);
  if (!error) logEvent('kt_field_filled', { field_key: fact.field_key, source: 'user_confirmed' });
  return !error;
}

export async function editFact(fact: ProfileFact, value: string): Promise<boolean> {
  const v = value.trim();
  if (!v) return removeFact(fact);
  const { error } = await supabase
    .from('user_profile_facts')
    .update({ value: v.slice(0, 500), source: 'user_confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', fact.id);
  if (!error) logEvent('kt_field_filled', { field_key: fact.field_key, source: 'user_confirmed' });
  return !error;
}

// Rejected: the value is cleared and the Cabinet never infers this field again.
export async function removeFact(fact: ProfileFact): Promise<boolean> {
  const { error } = await supabase
    .from('user_profile_facts')
    .update({ status: 'rejected', value: null })
    .eq('id', fact.id);
  if (!error) logEvent('kt_fact_removed', { field_key: fact.field_key });
  return !error;
}

// True when a cabinet_inferred fact is newer than the user's last visit to
// Know Thyself: the entry point shows a dot until the screen is viewed.
export async function hasUnseenInferredFacts(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const [{ data: settings }, { data: latest }] = await Promise.all([
      supabase.from('user_settings').select('kt_facts_seen_at').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_profile_facts')
        .select('updated_at')
        .eq('source', 'cabinet_inferred')
        .eq('status', 'active')
        .not('value', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (!latest) return false;
    const seen = (settings as { kt_facts_seen_at?: string | null } | null)?.kt_facts_seen_at;
    return !seen || Date.parse((latest as { updated_at: string }).updated_at) > Date.parse(seen);
  } catch {
    return false;
  }
}

export async function markFactsSeen(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('user_settings').update({ kt_facts_seen_at: new Date().toISOString() }).eq('user_id', user.id);
  } catch { /* best effort */ }
}

// Form saves: one event per field the user changed.
export function logFormFieldsFilled(before: Record<string, unknown> | null, after: Record<string, unknown>): void {
  for (const field of PROFILE_FIELDS) {
    if (!(field.column in after)) continue;
    const next = after[field.column];
    const prev = before ? before[field.column] : null;
    if (filled(next) && String(next).trim() !== String(prev ?? '').trim()) {
      logEvent('kt_field_filled', { field_key: field.key, source: 'form' });
    }
  }
}

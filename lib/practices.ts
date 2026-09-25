// Reads and writes for "Your practices" (personalization run C). Reads go to
// Supabase under the owner's RLS; every change to user_app_config goes
// through the server, which validates it against the module registry.
import { supabase } from './supabase';
import type { PracticeRow } from './modules';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

export async function fetchPractices(): Promise<PracticeRow[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('user_app_config')
    .select('module_key, enabled, pinned, settings, enabled_by')
    .eq('user_id', user.id);
  if (error) return [];
  return (data ?? []) as PracticeRow[];
}

export async function fetchTicks(moduleKey: string, days: string[]): Promise<Set<string>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || days.length === 0) return new Set();
  const { data } = await supabase
    .from('module_checkins')
    .select('day')
    .eq('user_id', user.id)
    .eq('module_key', moduleKey)
    .gte('day', days[0])
    .lte('day', days[days.length - 1]);
  return new Set((data ?? []).map((r: { day: string }) => r.day));
}

export async function setTick(moduleKey: string, day: string, on: boolean): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = on
    ? await supabase.from('module_checkins').upsert({ user_id: user.id, module_key: moduleKey, day }, { onConflict: 'user_id,module_key,day', ignoreDuplicates: true })
    : await supabase.from('module_checkins').delete().eq('user_id', user.id).eq('module_key', moduleKey).eq('day', day);
  return !error;
}

async function post(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify(body ?? {}),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: {} };
  }
}

export function savePracticeSettings(moduleKey: string, settings: Record<string, unknown>) {
  return post(`/api/practices/${encodeURIComponent(moduleKey)}/settings`, { settings });
}

export function turnOffPractice(moduleKey: string) {
  return post(`/api/practices/${encodeURIComponent(moduleKey)}/off`, {});
}

// ── Proposal cards (run C, Part C2) ─────────────────────────────────────────

export interface CabinetProposal {
  id: string;
  kind: 'adjustment' | 'feature_request';
  source: 'cabinet' | 'feature_shipped';
  moduleKey?: string;
  label?: string;
  description?: string;
  note?: string;
  counselorId: string | null;
}

export function asCabinetProposal(p: unknown): CabinetProposal | null {
  const o = p as Partial<CabinetProposal> | null | undefined;
  if (!o || typeof o.id !== 'string') return null;
  if (o.kind !== 'adjustment' && o.kind !== 'feature_request') return null;
  return o as CabinetProposal;
}

export async function fetchPendingProposals(): Promise<CabinetProposal[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/practices/proposals/pending`, { headers: await authHeaders() });
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    return (Array.isArray(data?.proposals) ? data.proposals : []).map(asCabinetProposal).filter(Boolean) as CabinetProposal[];
  } catch {
    return [];
  }
}

export function respondToProposal(id: string, accept: boolean, swapOut?: string | null) {
  return post(`/api/practices/proposals/${encodeURIComponent(id)}/respond`, { accept, ...(swapOut ? { swapOut } : {}) });
}

export function undoProposal(id: string) {
  return post(`/api/practices/proposals/${encodeURIComponent(id)}/undo`, {});
}

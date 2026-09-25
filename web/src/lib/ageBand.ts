// Age bands (activation run B, Part B5). Web port of lib/ageBand.ts: only the
// band is stored (profiles.age_band, via the set_my_age_band RPC), never a
// birthdate. A band chosen at signup before a session exists is kept in
// localStorage and applied on the first signed-in page.
import { supabase } from './supabase';

export type AgeBand = 'under_13' | '13_15' | '16_17' | '18_plus';

export const AGE_BANDS: { value: AgeBand; label: string }[] = [
  { value: 'under_13', label: 'Under 13' },
  { value: '13_15', label: '13 to 15' },
  { value: '16_17', label: '16 to 17' },
  { value: '18_plus', label: '18 or over' },
];

export const UNDER_13_MESSAGE =
  'Arete is for people 13 and older. Thank you for your interest, and we hope you will come back when you are 13.';

export function isTeenBand(band: string | null | undefined): boolean {
  return band === '13_15' || band === '16_17';
}

export interface AgeStatus {
  ageBand: AgeBand | null;
  locked: boolean;
}

let cached: AgeStatus | null = null;
const listeners = new Set<(s: AgeStatus | null) => void>();
export function subscribeAgeStatus(fn: (s: AgeStatus | null) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
function publish(s: AgeStatus | null) {
  cached = s;
  for (const fn of listeners) fn(s);
}
export function cachedAgeStatus(): AgeStatus | null {
  return cached;
}

export async function fetchAgeStatus(): Promise<AgeStatus | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { publish(null); return null; }
    const { data, error } = await supabase.from('profiles').select('age_band, locked_at').eq('id', user.id).maybeSingle();
    if (error || !data) return cached;
    const s: AgeStatus = { ageBand: (data.age_band as AgeBand | null) ?? null, locked: !!data.locked_at };
    publish(s);
    return s;
  } catch {
    return cached;
  }
}

export async function setMyAgeBand(band: AgeBand): Promise<AgeStatus | null> {
  const { error } = await supabase.rpc('set_my_age_band', { p_band: band });
  if (error) return null;
  return fetchAgeStatus();
}

const PENDING_KEY = 'arete_pending_age_band';
export function savePendingAgeBand(band: AgeBand): void {
  try { localStorage.setItem(PENDING_KEY, band); } catch { /* private mode */ }
}
export function takePendingAgeBand(): AgeBand | null {
  try {
    const v = localStorage.getItem(PENDING_KEY);
    if (v) localStorage.removeItem(PENDING_KEY);
    return (AGE_BANDS.some(b => b.value === v) ? v : null) as AgeBand | null;
  } catch {
    return null;
  }
}

import { supabase } from './supabase';

/**
 * Single source of truth for the Railway API base URL. Previously re-derived
 * in four files with three different fallbacks; the Railway host is the only
 * correct one (the server's CORS allowlist has no localhost).
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://arete-app-production.up.railway.app';

/**
 * JSON headers plus the Supabase JWT when a session exists, so the server can
 * verify identity for tier resolution and message limits instead of trusting
 * a body user id. Signed out, no Authorization header is sent at all (the old
 * inline version sent the literal string `Bearer undefined`).
 */
export async function authHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(extra ?? {}) };
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  } catch {
    /* unauthenticated — send no Authorization header */
  }
  return headers;
}

/** fetch() against the Railway API. Authenticated by default; pass `auth: false` to opt out. */
export async function apiFetch(
  path: string,
  init: RequestInit & { auth?: boolean } = {}
): Promise<Response> {
  const { auth = true, headers, ...rest } = init;
  const base = auth
    ? await authHeaders()
    : ({ 'Content-Type': 'application/json' } as Record<string, string>);
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  return fetch(url, {
    ...rest,
    headers: { ...base, ...((headers as Record<string, string> | undefined) ?? {}) },
  });
}

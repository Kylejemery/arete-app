// Shared by the Stoic Life admin routes (/api/admin/synthesis/stoic-life/*):
// the admin gate and the call that starts a cycle of the Synthesis Agent's
// Stoic Life mode on Railway (server/synthesis/modes/stoic-life.js).
//
// A cycle is started whenever Kyle's review changes what the agent can do:
// approving a topic (something to draft), rejecting one (the backlog may
// need topping up), or approving or rejecting a draft (the review slot is
// free). There is no schedule.

import { createClient } from '@/lib/supabase-server'

const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://arete-app-production.up.railway.app'

export type AdminSession = { token: string }

// The signed-in admin's access token, or null when the caller is not Kyle.
export async function requireAdmin(): Promise<AdminSession | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return null
  const { data: { session } } = await supabase.auth.getSession()
  return { token: session?.access_token ?? '' }
}

export type KickResult = { started: boolean; status: number; message: string }

// Starts a cycle. The server answers 202 at once and runs in the background;
// 409 means a cycle is already running, which is as good as starting one.
export async function startStoicLifeCycle(token: string): Promise<KickResult> {
  if (!token) return { started: false, status: 401, message: 'No active session' }
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/synthesis/stoic-life/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: '{}',
      signal: AbortSignal.timeout(8000),
    })
    const body = await res.json().catch(() => ({}))
    if (res.status === 202) return { started: true, status: 202, message: 'Cycle started' }
    if (res.status === 409) return { started: true, status: 409, message: 'A cycle is already running' }
    return { started: false, status: res.status, message: body.error || `Server answered ${res.status}` }
  } catch (e) {
    return { started: false, status: 502, message: e instanceof Error ? e.message : 'Could not reach the server' }
  }
}

// The front matter's doc_key and version, so an edit cannot quietly rename a
// draft. The full format check is the export's (parseSynthesis).
export function frontMatterIdentity(md: string): { docKey: string | null; version: number | null } {
  const fm = md.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fm) return { docKey: null, version: null }
  const key = fm[1].match(/^doc_key:\s*(\S+)\s*$/m)
  const ver = fm[1].match(/^version:\s*(\d+)\s*$/m)
  return { docKey: key ? key[1] : null, version: ver ? Number(ver[1]) : null }
}

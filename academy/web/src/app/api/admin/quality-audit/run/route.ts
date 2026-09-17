import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://arete-app-production.up.railway.app'

// POST /api/admin/quality-audit/run — admin-only. Starts an audit NOW on the
// Railway server instead of waiting for the 09:00 UTC cron. The backend fires
// the run and returns 202 immediately; the Quality tab reloads once the report
// row lands.
//
// Proxied rather than reimplemented. The Gap Agent's run route mirrors its
// agent's logic in TypeScript, which works for two gap types and would not for
// twenty-one probes — a second copy of the rules would drift from the first,
// and the probes are the rules.
//
// The repo domain is not offered: its probes need a checkout that the Railway
// service, rooted at server/, does not have. Those run from a session with the
// repo present (see server/QUALITY_AUDIT_AGENT.md).
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) {
    return NextResponse.json({ error: 'No active session' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const domains = Array.isArray(body?.domains) ? body.domains : ['corpus', 'library', 'material']

  try {
    const upstream = await fetch(`${BACKEND_URL}/api/admin/quality-audit/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ domains }),
    })
    const text = await upstream.text()
    try {
      JSON.parse(text)
    } catch {
      return NextResponse.json(
        { error: `The quality audit endpoint returned ${upstream.status} with a non-JSON body — the Railway server may be mid-deploy. Try again in a minute.` },
        { status: 502 }
      )
    }
    return new NextResponse(text, { status: upstream.status, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('[admin/quality-audit/run] upstream error:', e)
    return NextResponse.json({ error: 'Failed to reach the quality audit agent.' }, { status: 502 })
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { createGmailTransport, fromHeader, gmailConfig } from '@/lib/gmail'
import { renderEmail, substitute, type EmailFormat } from '@/lib/email-format'

export const dynamic = 'force-dynamic'
// SMTP round-trips add up; give a chunk room on Vercel. The client keeps
// chunks small (see CHUNK_SIZE in the Email tab) so a full roster is sent as
// a sequence of short requests rather than one long one.
export const maxDuration = 60

// One request = one chunk of recipients. The first chunk of a campaign has no
// campaignId; the route creates the admin_email_campaigns row and returns its
// id, and every later chunk passes it back so the counts accumulate on one row.
const MAX_PER_REQUEST = 50
const CONCURRENCY = 3
const MAX_SUBJECT = 200
const MAX_BODY = 100_000

type Body = {
  subject?: string
  body?: string
  format?: EmailFormat
  footer?: string
  userIds?: string[]
  test?: boolean
  campaignId?: string | null
  audience?: Record<string, unknown>
  totalRecipients?: number
}

type Target = { id: string | null; email: string; name: string | null }
type Failure = { email: string; error: string }

async function sendAll(
  targets: Target[],
  send: (t: Target) => Promise<void>,
): Promise<{ sent: string[]; failures: Failure[] }> {
  const sent: string[] = []
  const failures: Failure[] = []
  let cursor = 0
  const worker = async () => {
    while (cursor < targets.length) {
      const t = targets[cursor++]
      try {
        await send(t)
        sent.push(t.email)
      } catch (e) {
        failures.push({ email: t.email, error: e instanceof Error ? e.message : String(e) })
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker))
  return { sent, failures }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: Body
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const subject = (payload.subject ?? '').trim()
  const bodyText = (payload.body ?? '').replace(/\r\n/g, '\n')
  const format: EmailFormat = payload.format === 'html' ? 'html' : 'text'
  const footer = (payload.footer ?? '').trim()
  const isTest = !!payload.test

  if (!subject) return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
  if (subject.length > MAX_SUBJECT) return NextResponse.json({ error: `Subject must be under ${MAX_SUBJECT} characters` }, { status: 400 })
  if (!bodyText.trim()) return NextResponse.json({ error: 'Body is required' }, { status: 400 })
  if (bodyText.length > MAX_BODY) return NextResponse.json({ error: 'Body is too long' }, { status: 400 })

  const cfg = gmailConfig()
  if (!cfg.configured) {
    return NextResponse.json(
      { error: 'Gmail is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in the environment.' },
      { status: 503 }
    )
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Admin client unavailable' },
      { status: 500 }
    )
  }

  // ── Resolve targets ───────────────────────────────────────────────────
  let targets: Target[]
  if (isTest) {
    const { data: me } = await admin.from('user_settings').select('user_name').eq('user_id', user.id).maybeSingle()
    targets = [{ id: user.id, email: user.email, name: me?.user_name?.trim() || null }]
  } else {
    const ids = Array.isArray(payload.userIds)
      ? [...new Set(payload.userIds.filter((x): x is string => typeof x === 'string' && x.length > 0))]
      : []
    if (ids.length === 0) return NextResponse.json({ error: 'No recipients selected' }, { status: 400 })
    if (ids.length > MAX_PER_REQUEST) {
      return NextResponse.json({ error: `At most ${MAX_PER_REQUEST} recipients per request` }, { status: 400 })
    }
    const [{ data: profiles, error: pErr }, { data: settings }] = await Promise.all([
      admin.from('profiles').select('id, email').in('id', ids),
      admin.from('user_settings').select('user_id, user_name').in('user_id', ids),
    ])
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
    const names = new Map<string, string>()
    for (const s of settings ?? []) {
      if (s.user_id && typeof s.user_name === 'string' && s.user_name.trim()) names.set(s.user_id, s.user_name.trim())
    }
    const seen = new Set<string>()
    targets = []
    for (const p of profiles ?? []) {
      const email = typeof p.email === 'string' ? p.email.trim().toLowerCase() : ''
      if (!email.includes('@') || seen.has(email)) continue
      seen.add(email)
      targets.push({ id: p.id, email, name: names.get(p.id) ?? null })
    }
    if (targets.length === 0) return NextResponse.json({ error: 'None of the selected users has a valid email' }, { status: 400 })
  }

  // ── Send ──────────────────────────────────────────────────────────────
  const transport = createGmailTransport()
  const from = fromHeader(cfg)
  let result: { sent: string[]; failures: Failure[] }
  try {
    result = await sendAll(targets, async t => {
      const vars = { name: t.name || 'there', email: t.email }
      const rendered = renderEmail({
        body: substitute(bodyText, vars),
        format,
        footer: substitute(footer, vars),
      })
      await transport.sendMail({
        from,
        to: t.email,
        replyTo: cfg.replyTo,
        subject: substitute(subject, vars),
        text: rendered.text,
        html: rendered.html,
      })
    })
  } finally {
    transport.close()
  }

  // ── Log (best-effort) ─────────────────────────────────────────────────
  let campaignId: string | null = typeof payload.campaignId === 'string' ? payload.campaignId : null
  let logError: string | null = null
  try {
    if (campaignId) {
      const { data: row } = await admin.from('admin_email_campaigns')
        .select('sent_count, failed_count, failures').eq('id', campaignId).maybeSingle()
      if (row) {
        const prev = Array.isArray(row.failures) ? row.failures : []
        await admin.from('admin_email_campaigns').update({
          sent_count: (row.sent_count ?? 0) + result.sent.length,
          failed_count: (row.failed_count ?? 0) + result.failures.length,
          failures: [...prev, ...result.failures].slice(0, 500),
          updated_at: new Date().toISOString(),
        }).eq('id', campaignId)
      }
    } else {
      const { data: row, error } = await admin.from('admin_email_campaigns').insert({
        subject,
        body: bodyText,
        format,
        footer: footer || null,
        audience: payload.audience && typeof payload.audience === 'object' ? payload.audience : {},
        recipient_count: isTest ? 1 : Math.max(targets.length, Number(payload.totalRecipients) || 0),
        sent_count: result.sent.length,
        failed_count: result.failures.length,
        failures: result.failures,
        is_test: isTest,
        sent_by: user.email,
      }).select('id').single()
      if (error) throw error
      campaignId = row?.id ?? null
    }
  } catch (e) {
    logError = e instanceof Error ? e.message : 'Failed to log campaign'
    console.warn('[admin/email] campaign log failed:', logError)
  }

  return NextResponse.json({
    ok: result.failures.length === 0,
    campaignId,
    sent: result.sent.length,
    failed: result.failures.length,
    failures: result.failures,
    logError,
  })
}

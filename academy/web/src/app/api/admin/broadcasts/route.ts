import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { normalizeTier, type TierKey } from '@/lib/email-format'

export const dynamic = 'force-dynamic'

// Counselor broadcasts — the Broadcasts tab.
//
// A broadcast is a hand-written message from a counselor, delivered to members
// as a push notification and as a post in their Cabinet chat. This route owns
// the composing side: drafts, the audience, and scheduling. Delivery is the
// Railway server's (broadcast-delivery-agent.js pushes; the app collects the
// Cabinet post from /api/broadcasts/pending).
//
// Scheduling materialises one counselor_broadcast_deliveries row per
// recipient, which is what fixes the audience and gives recipient_count before
// anything is sent. A member who joins afterwards is not a recipient — a
// broadcast goes to the membership as it stood when you scheduled it.

const TIERS: TierKey[] = ['free', 'premium', 'pro']
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const INSERT_CHUNK = 500

type Body = {
  id?: string
  counselorSlug?: string | null
  fallbackCounselorSlug?: string
  title?: string
  pushBody?: string
  message?: string
  tiers?: TierKey[]
  testOnly?: boolean
  sendDate?: string | null
  sendHour?: number | null
  action?: 'save' | 'schedule' | 'cancel'
}

async function gate() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) return { error: 'Unauthorized' as const, status: 401 }
  try {
    return { admin: createAdminClient(), user }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Admin client unavailable', status: 500 }
  }
}

function copyErrors(b: Body): string | null {
  if (!b.title?.trim()) return 'A title is required.'
  if (b.title.trim().length > 120) return 'Title is longer than 120 characters.'
  if (!b.pushBody?.trim()) return 'The notification line is required.'
  if (b.pushBody.trim().length > 240) return 'The notification line is longer than 240 characters.'
  if (!b.message?.trim()) return 'The Cabinet message is required.'
  if (b.message.trim().length > 2000) return 'The Cabinet message is longer than 2000 characters.'
  return null
}

// GET — every broadcast with its delivery tallies, plus the counselor roster
// and how many members sit in each tier (for the audience picker).
export async function GET() {
  const g = await gate()
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const { admin } = g

  try {
    const [{ data: broadcasts }, { data: counselors }, { data: profiles }] = await Promise.all([
      admin.from('counselor_broadcasts')
        .select('id, counselor_slug, fallback_counselor_slug, title, push_body, message, audience, status, send_date, send_hour, recipient_count, pushed_count, failed_count, seeded_count, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(50),
      admin.from('counselors').select('slug, name').order('sort_order', { ascending: true }),
      admin.from('profiles').select('tier, is_premium'),
    ])

    const counts: Record<TierKey, number> = { free: 0, premium: 0, pro: 0 }
    for (const p of profiles ?? []) counts[normalizeTier(p.tier, p.is_premium)] += 1

    return NextResponse.json({
      broadcasts: broadcasts ?? [],
      counselors: counselors ?? [],
      counts: { ...counts, total: counts.free + counts.premium + counts.pro },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load broadcasts' },
      { status: 500 }
    )
  }
}

// POST — create a draft. Nothing is sent until it is scheduled.
export async function POST(req: Request) {
  const g = await gate()
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const { admin, user } = g

  const body = (await req.json().catch(() => ({}))) as Body
  const invalid = copyErrors(body)
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

  try {
    const { data, error } = await admin.from('counselor_broadcasts').insert({
      counselor_slug: body.counselorSlug || null,
      fallback_counselor_slug: body.fallbackCounselorSlug || 'marcus-aurelius',
      title: body.title!.trim(),
      push_body: body.pushBody!.trim(),
      message: body.message!.trim(),
      audience: audienceOf(body),
      status: 'draft',
      created_by: user.email ?? null,
    }).select('id').single()
    if (error) throw error
    return NextResponse.json({ id: data.id })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to save the draft' },
      { status: 500 }
    )
  }
}

// PATCH — save a draft's edits, schedule it, or cancel it.
export async function PATCH(req: Request) {
  const g = await gate()
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const { admin, user } = g

  const body = (await req.json().catch(() => ({}))) as Body
  if (!body.id || !UUID_RE.test(body.id)) return NextResponse.json({ error: 'Which broadcast?' }, { status: 400 })
  const action = body.action ?? 'save'

  try {
    const { data: existing, error: readError } = await admin
      .from('counselor_broadcasts')
      .select('id, status')
      .eq('id', body.id)
      .maybeSingle()
    if (readError) throw readError
    if (!existing) return NextResponse.json({ error: 'No such broadcast.' }, { status: 404 })

    if (action === 'cancel') {
      // Cancelling stops the push agent and the app's pending sweep both: the
      // sweep only serves scheduled/sending/sent rows. Delivery rows stay as
      // the record of who had already received it.
      if (existing.status === 'sent') {
        return NextResponse.json({ error: 'That one has already gone out.' }, { status: 409 })
      }
      const { error } = await admin.from('counselor_broadcasts')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', body.id)
      if (error) throw error
      return NextResponse.json({ ok: true, status: 'cancelled' })
    }

    // Copy is only editable while nothing has been sent — a member who
    // already has the post in their thread would never see an edit.
    if (existing.status !== 'draft' && existing.status !== 'cancelled') {
      return NextResponse.json(
        { error: 'That broadcast is already out for delivery. Cancel it first.' },
        { status: 409 }
      )
    }

    const invalid = copyErrors(body)
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

    const update: Record<string, unknown> = {
      counselor_slug: body.counselorSlug || null,
      fallback_counselor_slug: body.fallbackCounselorSlug || 'marcus-aurelius',
      title: body.title!.trim(),
      push_body: body.pushBody!.trim(),
      message: body.message!.trim(),
      audience: audienceOf(body),
      updated_at: new Date().toISOString(),
    }

    if (action === 'save') {
      update.status = 'draft'
      const { error } = await admin.from('counselor_broadcasts').update(update).eq('id', body.id)
      if (error) throw error
      return NextResponse.json({ ok: true, status: 'draft' })
    }

    // --- schedule ---
    if (body.sendDate && !DATE_RE.test(body.sendDate)) {
      return NextResponse.json({ error: 'Send date must be YYYY-MM-DD.' }, { status: 400 })
    }
    const sendHour =
      body.sendHour === null || body.sendHour === undefined ? null : Math.trunc(Number(body.sendHour))
    if (sendHour !== null && (!Number.isFinite(sendHour) || sendHour < 0 || sendHour > 23)) {
      return NextResponse.json({ error: 'Send hour must be between 0 and 23.' }, { status: 400 })
    }

    const recipients = await resolveRecipients(admin, body, user.id)
    if (recipients.length === 0) {
      return NextResponse.json({ error: 'That audience has nobody in it.' }, { status: 400 })
    }

    // Deliveries first: if this fails the broadcast stays a draft rather than
    // going out to a half-materialised audience.
    for (let i = 0; i < recipients.length; i += INSERT_CHUNK) {
      const { error } = await admin.from('counselor_broadcast_deliveries').upsert(
        recipients.slice(i, i + INSERT_CHUNK).map(userId => ({ broadcast_id: body.id!, user_id: userId })),
        { onConflict: 'broadcast_id,user_id', ignoreDuplicates: true }
      )
      if (error) throw error
    }

    // NULL send_hour means "as soon as possible": the next run of the delivery
    // agent for the push, the member's next foreground for the Cabinet post.
    // Due-ness is measured against each member's own local date, and the
    // earliest local date anywhere on earth is UTC minus one day — so that,
    // not today, is what makes "now" mean now in every timezone.
    const { error } = await admin.from('counselor_broadcasts').update({
      ...update,
      status: 'scheduled',
      send_date: sendHour === null ? utcDatePlus(-1) : (body.sendDate || utcDatePlus(0)),
      send_hour: sendHour,
    }).eq('id', body.id)
    if (error) throw error

    return NextResponse.json({ ok: true, status: 'scheduled', recipientCount: recipients.length })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update the broadcast' },
      { status: 500 }
    )
  }
}

// DELETE — drop a draft outright. Only ever a draft: anything that has been
// scheduled is cancelled instead, so the delivery record survives.
export async function DELETE(req: Request) {
  const g = await gate()
  if ('error' in g) return NextResponse.json({ error: g.error }, { status: g.status })
  const { admin } = g

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id || !UUID_RE.test(id)) return NextResponse.json({ error: 'Which broadcast?' }, { status: 400 })

  try {
    const { data, error } = await admin.from('counselor_broadcasts')
      .delete()
      .eq('id', id)
      .eq('status', 'draft')
      .select('id')
    if (error) throw error
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Only a draft can be deleted. Cancel it instead.' }, { status: 409 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to delete the draft' },
      { status: 500 }
    )
  }
}

function utcDatePlus(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

function audienceOf(body: Body): Record<string, unknown> {
  if (body.testOnly) return { label: 'Test — you only', testOnly: true }
  const tiers = (body.tiers ?? TIERS).filter(t => TIERS.includes(t))
  const chosen = tiers.length === 0 ? TIERS : tiers
  return {
    label: chosen.length === TIERS.length ? 'Everyone' : chosen.join(' + '),
    tiers: chosen,
  }
}

/** The user ids a scheduled broadcast will be delivered to. */
async function resolveRecipients(
  admin: ReturnType<typeof createAdminClient>,
  body: Body,
  adminUserId: string
): Promise<string[]> {
  if (body.testOnly) return [adminUserId]

  const tiers = new Set((body.tiers ?? TIERS).filter(t => TIERS.includes(t)))
  if (tiers.size === 0) TIERS.forEach(t => tiers.add(t))

  const { data, error } = await admin.from('profiles').select('id, tier, is_premium')
  if (error) throw error
  return (data ?? [])
    .filter(p => p.id && tiers.has(normalizeTier(p.tier, p.is_premium)))
    .map(p => p.id as string)
}

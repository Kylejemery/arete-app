import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { gmailConfig } from '@/lib/gmail'
import { normalizeTier, type TierKey } from '@/lib/email-format'

export const dynamic = 'force-dynamic'

// Recipient roster for the admin Email tab: every profile with its normalized
// tier, plus Gmail config status and the most recent campaigns. Unlike the
// Usage tab this route is *not* anonymized — the whole point is to pick real
// addresses — so it stays behind the same owner-only gate as every admin API.

export type Recipient = {
  id: string
  email: string
  name: string | null
  tier: TierKey
  rawTier: string | null
  isAdmin: boolean
  onboarded: boolean
  createdAt: string | null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  try {
    const [{ data: profiles, error: pErr }, { data: settings }] = await Promise.all([
      admin.from('profiles')
        .select('id, email, tier, is_premium, is_admin, know_thyself_complete, created_at')
        .order('created_at', { ascending: false }),
      admin.from('user_settings').select('user_id, user_name'),
    ])
    if (pErr) throw pErr

    const names = new Map<string, string>()
    for (const s of settings ?? []) {
      if (s.user_id && typeof s.user_name === 'string' && s.user_name.trim()) {
        names.set(s.user_id, s.user_name.trim())
      }
    }

    const adminEmail = process.env.ADMIN_EMAIL
    const recipients: Recipient[] = (profiles ?? [])
      .filter(p => typeof p.email === 'string' && p.email.includes('@'))
      .map(p => ({
        id: p.id,
        email: p.email,
        name: names.get(p.id) ?? null,
        tier: normalizeTier(p.tier, p.is_premium),
        rawTier: p.tier ?? null,
        isAdmin: !!p.is_admin || p.email === adminEmail,
        onboarded: !!p.know_thyself_complete,
        createdAt: p.created_at ?? null,
      }))

    const counts: Record<TierKey, number> = { free: 0, premium: 0, pro: 0 }
    for (const r of recipients) counts[r.tier] += 1

    // Campaign history is best-effort: the table comes from a migration that
    // may not have been applied yet, and its absence shouldn't block sending.
    let campaigns: unknown[] = []
    try {
      const { data } = await admin.from('admin_email_campaigns')
        .select('id, subject, audience, recipient_count, sent_count, failed_count, is_test, created_at')
        .order('created_at', { ascending: false })
        .limit(15)
      campaigns = data ?? []
    } catch { /* table missing — fine */ }

    const cfg = gmailConfig()
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      gmail: {
        configured: cfg.configured,
        from: cfg.configured ? `${cfg.fromName} <${cfg.user}>` : null,
        replyTo: cfg.replyTo ?? null,
      },
      adminEmail: adminEmail ?? null,
      counts: { ...counts, total: recipients.length },
      recipients,
      campaigns,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load recipients' },
      { status: 500 }
    )
  }
}

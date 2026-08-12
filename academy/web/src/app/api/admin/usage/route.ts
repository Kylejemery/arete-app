import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// Product-usage overview for the admin dashboard. Unlike the agent tabs, this
// reads the *user-facing* tables (check-ins, cabinet chats, journal, goals,
// scrolls, profiles) and aggregates them in-process. The tables are small
// (hundreds of rows), so pulling minimal columns and computing here is simpler
// and cheaper than a set of SQL round-trips or a Postgres function.
//
// "Activity" throughout = check-ins + cabinet chats + journal + goals. Scroll
// reads are counted in the adoption funnel only. Everything is anonymized:
// individual users appear as ranked rows (#1, #2, …), never by id or email.

type Row = { user_id: string | null; ts: string | null }

const DAY = 86400000

function mondayOf(d: Date): string {
  const x = new Date(d)
  const day = x.getUTCDay()
  const diff = (day === 0 ? -6 : 1) - day
  x.setUTCDate(x.getUTCDate() + diff)
  return x.toISOString().split('T')[0]
}

function statusFor(daysSince: number, firstSeenDaysAgo: number): string {
  if (daysSince > 30) return 'churned'
  if (daysSince > 14) return 'fading'
  if (firstSeenDaysAgo <= 14) return 'new'
  return 'active'
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
    const [
      { data: profiles },
      { data: checkIns },
      { data: cabinet },
      { data: journal },
      { data: goals },
      { data: scrolls },
    ] = await Promise.all([
      admin.from('profiles').select('id, email, created_at, know_thyself_complete, is_premium'),
      admin.from('check_ins').select('user_id, created_at'),
      admin.from('cabinet_conversations').select('user_id, created_at'),
      admin.from('journal_entries').select('user_id, created_at'),
      admin.from('goals').select('user_id, created_at'),
      admin.from('scroll_reads').select('user_id, first_read_at'),
    ])

    const now = Date.now()
    const adminEmail = process.env.ADMIN_EMAIL
    const adminId = (profiles ?? []).find(p => p.email && p.email === adminEmail)?.id ?? null

    // ── KPIs from profiles ──────────────────────────────────────────────
    const allProfiles = profiles ?? []
    const totalUsers = allProfiles.length
    const onboarded = allProfiles.filter(p => p.know_thyself_complete).length
    const premium = allProfiles.filter(p => p.is_premium).length
    const new7d = allProfiles.filter(p => p.created_at && now - Date.parse(p.created_at) <= 7 * DAY).length
    const new30d = allProfiles.filter(p => p.created_at && now - Date.parse(p.created_at) <= 30 * DAY).length

    const distinctUsers = (rows: Row[]) =>
      new Set(rows.filter(r => r.user_id).map(r => r.user_id)).size

    const ci: Row[] = (checkIns ?? []).map(r => ({ user_id: r.user_id, ts: r.created_at }))
    const cc: Row[] = (cabinet ?? []).map(r => ({ user_id: r.user_id, ts: r.created_at }))
    const jr: Row[] = (journal ?? []).map(r => ({ user_id: r.user_id, ts: r.created_at }))
    const gl: Row[] = (goals ?? []).map(r => ({ user_id: r.user_id, ts: r.created_at }))
    const sr: Row[] = (scrolls ?? []).map(r => ({ user_id: r.user_id, ts: r.first_read_at }))

    // ── Adoption funnel ─────────────────────────────────────────────────
    const funnel = [
      { step: 'Signed up', users: totalUsers },
      { step: 'Did a check-in', users: distinctUsers(ci) },
      { step: 'Used cabinet chat', users: distinctUsers(cc) },
      { step: 'Completed onboarding', users: onboarded },
      { step: 'Wrote a journal entry', users: distinctUsers(jr) },
      { step: 'Set a goal', users: distinctUsers(gl) },
      { step: 'Read a scroll', users: distinctUsers(sr) },
    ]

    // ── Per-user engagement (activity = check-ins + cabinet + journal + goals) ─
    const activity: Row[] = [...ci, ...cc, ...jr, ...gl].filter(r => r.user_id && r.ts)
    type Agg = { events: number; days: Set<string>; first: number; last: number }
    const perUser = new Map<string, Agg>()
    for (const r of activity) {
      const id = r.user_id as string
      const t = Date.parse(r.ts as string)
      if (Number.isNaN(t)) continue
      const a = perUser.get(id) ?? { events: 0, days: new Set<string>(), first: t, last: t }
      a.events += 1
      a.days.add(new Date(t).toISOString().split('T')[0])
      a.first = Math.min(a.first, t)
      a.last = Math.max(a.last, t)
      perUser.set(id, a)
    }

    const activated = perUser.size
    const active7dSet = new Set<string>()
    const active30dSet = new Set<string>()
    let oneAndDone = 0
    let singleDayOnly = 0
    for (const [id, a] of perUser) {
      if (now - a.last <= 7 * DAY) active7dSet.add(id)
      if (now - a.last <= 30 * DAY) active30dSet.add(id)
      if (a.events === 1) oneAndDone += 1
      if (a.days.size === 1) singleDayOnly += 1
    }

    const engagement = [...perUser.entries()]
      .sort((a, b) => b[1].events - a[1].events)
      .slice(0, 10)
      .map(([id, a], i) => {
        const daysSince = Math.floor((now - a.last) / DAY)
        const firstSeenDaysAgo = Math.floor((now - a.first) / DAY)
        return {
          rank: i + 1,
          events: a.events,
          activeDays: a.days.size,
          firstSeen: new Date(a.first).toISOString().split('T')[0],
          lastSeen: new Date(a.last).toISOString().split('T')[0],
          daysSince,
          isAdmin: id === adminId,
          status: statusFor(daysSince, firstSeenDaysAgo),
        }
      })

    // ── Weekly series (last 8 weeks) ────────────────────────────────────
    const eightWeeksAgo = now - 8 * 7 * DAY

    const wauMap = new Map<string, Set<string>>()
    for (const r of activity) {
      const t = Date.parse(r.ts as string)
      if (Number.isNaN(t) || t < eightWeeksAgo) continue
      const wk = mondayOf(new Date(t))
      const set = wauMap.get(wk) ?? new Set<string>()
      set.add(r.user_id as string)
      wauMap.set(wk, set)
    }
    const wau = [...wauMap.entries()]
      .map(([week, set]) => ({ week, activeUsers: set.size }))
      .sort((a, b) => a.week.localeCompare(b.week))

    const signupMap = new Map<string, number>()
    for (const p of allProfiles) {
      if (!p.created_at) continue
      const wk = mondayOf(new Date(p.created_at))
      signupMap.set(wk, (signupMap.get(wk) ?? 0) + 1)
    }
    const signupsByWeek = [...signupMap.entries()]
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => a.week.localeCompare(b.week))

    // ── Derived interpretive signals (recomputed live, never stale) ─────
    const premiumInactive = allProfiles.filter(p => p.is_premium && !active30dSet.has(p.id)).length
    const checkInUsers = distinctUsers(ci)
    const secondFeature = Math.max(distinctUsers(cc), distinctUsers(jr), distinctUsers(gl))

    const signals: { severity: 'crit' | 'warn' | 'good'; text: string }[] = []
    if (totalUsers > 0 && onboarded / totalUsers < 0.5) {
      signals.push({
        severity: 'crit',
        text: `Only ${onboarded} of ${totalUsers} finished onboarding, yet ${checkInUsers} managed a check-in — the onboarding flow is the main leak, not the app itself.`,
      })
    }
    if (premium > 0 && premiumInactive / premium >= 0.4) {
      signals.push({
        severity: 'warn',
        text: `${premiumInactive} of ${premium} premium accounts have been inactive for 30+ days — likely comped/beta grants. Separate comped from paying before trusting revenue metrics.`,
      })
    }
    if (checkInUsers > 0 && secondFeature <= checkInUsers / 2) {
      signals.push({
        severity: 'warn',
        text: `Check-ins (${checkInUsers} users) carry engagement; the next feature reaches only ${secondFeature}. Decide whether the quieter features are pre-launch bets or dead weight.`,
      })
    }
    if (new7d > 0) {
      signals.push({
        severity: 'good',
        text: `${new7d} signup${new7d === 1 ? '' : 's'} in the last 7 days${active7dSet.size ? ` and ${active7dSet.size} active user${active7dSet.size === 1 ? '' : 's'}` : ''}. Learn where they came from before the trail goes cold.`,
      })
    }

    return NextResponse.json({
      generatedAt: new Date(now).toISOString(),
      kpis: {
        totalUsers, activated, onboarded, premium,
        active7d: active7dSet.size, active30d: active30dSet.size,
        new7d, new30d,
      },
      funnel,
      signupsByWeek,
      wau,
      engagement,
      engagementTail: { oneAndDone, singleDayOnly, activated },
      signals,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load usage' },
      { status: 500 }
    )
  }
}

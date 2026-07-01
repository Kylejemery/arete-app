import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/admin/longitudinal — the Longitudinal tab. Returns AGGREGATE,
// ANONYMIZED stats across all user_longitudinal_models rows. No individual
// portraits, no user ids, no journal content ever leave this route — Kyle sees
// patterns across the base, not people. Admin-gated on ADMIN_EMAIL like the
// other admin routes.

type ThemeEntry = { theme: string; weeks_seen?: number }
type ModelRow = {
  user_id: string
  persistent_themes: ThemeEntry[] | null
  growth_edges: string[] | null
  dominant_philosophical_orientation: string | null
  weeks_analyzed: number | null
}
type HistoryRow = {
  user_id: string
  created_at: string
  model_snapshot: { persistent_themes?: ThemeEntry[] | null } | null
}

const norm = (s: string) => s.trim().toLowerCase()

// Words too generic to anchor a growth-edge cluster.
const STOPWORDS = new Set([
  'the', 'and', 'but', 'for', 'with', 'from', 'that', 'this', 'your', 'you',
  'are', 'not', 'has', 'have', 'between', 'under', 'when', 'what', 'which',
  'their', 'them', 'into', 'over', 'about', 'being', 'where', 'while', 'than',
  'then', 'they', 'its', 'a', 'an', 'of', 'to', 'in', 'on', 'is', 'it', 'or',
  'as', 'at', 'by', 'be', 'gap', 'living', 'knowing', 'know', 'live',
])

function themeUserCounts(rows: { user_id: string; themes: ThemeEntry[] | null }[]) {
  const byTheme = new Map<string, { display: string; users: Set<string> }>()
  for (const r of rows) {
    const themes = Array.isArray(r.themes) ? r.themes : []
    for (const t of themes) {
      const name = (t && t.theme ? String(t.theme) : '').trim()
      if (!name) continue
      const key = norm(name)
      if (!byTheme.has(key)) byTheme.set(key, { display: name, users: new Set() })
      byTheme.get(key)!.users.add(r.user_id)
    }
  }
  return byTheme
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()

    const [{ data: modelsData, error: mErr }, { data: historyData, error: hErr }] = await Promise.all([
      admin
        .from('user_longitudinal_models')
        .select('user_id, persistent_themes, growth_edges, dominant_philosophical_orientation, weeks_analyzed'),
      admin
        .from('longitudinal_model_history')
        .select('user_id, created_at, model_snapshot')
        .order('created_at', { ascending: false }),
    ])
    if (mErr) throw new Error(mErr.message)
    if (hErr) throw new Error(hErr.message)

    const models = (modelsData ?? []) as ModelRow[]
    const history = (historyData ?? []) as HistoryRow[]

    const totalUsers = models.length
    const avgWeeks = totalUsers
      ? Math.round((models.reduce((s, m) => s + (m.weeks_analyzed ?? 0), 0) / totalUsers) * 10) / 10
      : 0

    // --- Aggregate theme map (current) + week-over-week trend --------------
    const currentThemes = themeUserCounts(
      models.map(m => ({ user_id: m.user_id, themes: m.persistent_themes }))
    )

    // Prior aggregate: the most recent history snapshot per user.
    const seenUsers = new Set<string>()
    const priorRows: { user_id: string; themes: ThemeEntry[] | null }[] = []
    for (const h of history) {
      if (seenUsers.has(h.user_id)) continue
      seenUsers.add(h.user_id)
      priorRows.push({ user_id: h.user_id, themes: h.model_snapshot?.persistent_themes ?? null })
    }
    const priorThemes = themeUserCounts(priorRows)

    const themeMap = [...currentThemes.entries()]
      .map(([key, v]) => {
        const now = v.users.size
        const before = priorThemes.get(key)?.users.size ?? 0
        const trend = before === 0 ? (history.length ? 'up' : 'flat') : now > before ? 'up' : now < before ? 'down' : 'flat'
        return { theme: v.display, users: now, trend }
      })
      .sort((a, b) => b.users - a.users)

    // --- Growth edge clusters (simple keyword grouping) -------------------
    // Assign each edge to a single cluster — its rarest-is-not-the-goal; we use
    // the globally most common keyword the edge contains, so related edges land
    // together. v1: keyword grouping, no embeddings.
    const keywordFreq = new Map<string, number>()
    const edgeRecords: { edge: string; user_id: string; keywords: string[] }[] = []
    for (const m of models) {
      const edges = Array.isArray(m.growth_edges) ? m.growth_edges : []
      for (const raw of edges) {
        const edge = String(raw || '').trim()
        if (!edge) continue
        const keywords = [...new Set(
          edge.toLowerCase().split(/[^a-z]+/).filter(w => w.length >= 4 && !STOPWORDS.has(w))
        )]
        for (const k of keywords) keywordFreq.set(k, (keywordFreq.get(k) ?? 0) + 1)
        edgeRecords.push({ edge, user_id: m.user_id, keywords })
      }
    }

    const clusters = new Map<string, { keyword: string; edges: string[]; users: Set<string> }>()
    for (const rec of edgeRecords) {
      // Pick the edge's most globally-common keyword as its cluster anchor.
      let anchor = rec.keywords[0] ?? 'other'
      let best = -1
      for (const k of rec.keywords) {
        const f = keywordFreq.get(k) ?? 0
        if (f > best) { best = f; anchor = k }
      }
      if (!clusters.has(anchor)) clusters.set(anchor, { keyword: anchor, edges: [], users: new Set() })
      const c = clusters.get(anchor)!
      c.edges.push(rec.edge)
      c.users.add(rec.user_id)
    }

    const growthClusters = [...clusters.values()]
      .map(c => ({
        keyword: c.keyword,
        edgeCount: c.edges.length,
        userCount: c.users.size,
        examples: c.edges.slice(0, 3),
      }))
      .sort((a, b) => b.edgeCount - a.edgeCount)

    // --- Orientation distribution ----------------------------------------
    const orientCounts = new Map<string, number>()
    for (const m of models) {
      const o = (m.dominant_philosophical_orientation || 'unspecified').trim() || 'unspecified'
      orientCounts.set(o, (orientCounts.get(o) ?? 0) + 1)
    }
    const orientationDistribution = [...orientCounts.entries()]
      .map(([orientation, count]) => ({
        orientation,
        count,
        pct: totalUsers ? Math.round((count / totalUsers) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      metrics: {
        active_models: totalUsers,
        avg_weeks_analyzed: avgWeeks,
        top_persistent_theme: themeMap[0]?.theme ?? null,
        top_growth_edge: growthClusters[0]?.keyword ?? null,
      },
      theme_map: themeMap,
      growth_clusters: growthClusters,
      orientation_distribution: orientationDistribution,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load longitudinal aggregate' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/admin/requests — the Requests tab (personalization run C, Part
// C3). Clusters of ideas members asked the Cabinet to pass along, with
// counts that exclude admin and internal accounts (the
// feature_request_cluster_counts view reads measured_profiles) and up to
// five anonymous need summaries each. No user ids, emails or conversation
// text leave this route.

export type RequestCluster = {
  id: string
  title: string
  status: 'open' | 'shipped' | 'declined'
  moduleKey: string | null
  shippedAt: string | null
  createdAt: string
  requesters: number
  requests: number
  lastRequestedAt: string | null
  samples: string[]
}

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !!user && user.email === process.env.ADMIN_EMAIL
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const admin = createAdminClient()
    const { data: counts, error } = await admin
      .from('feature_request_cluster_counts')
      .select('cluster_id, title, status, module_key, shipped_at, created_at, measured_requesters, measured_requests, last_requested_at')
    if (error) throw new Error(error.message)
    const ids = (counts ?? []).map(c => c.cluster_id)
    const samples = new Map<string, string[]>()
    if (ids.length > 0) {
      const { data: rows } = await admin
        .from('feature_requests')
        .select('cluster_id, need_summary')
        .in('cluster_id', ids)
        .eq('status', 'submitted')
        .not('need_summary', 'is', null)
        .order('responded_at', { ascending: false })
        .limit(500)
      for (const r of rows ?? []) {
        const list = samples.get(r.cluster_id) ?? []
        if (list.length < 5 && !list.includes(r.need_summary)) list.push(r.need_summary)
        samples.set(r.cluster_id, list)
      }
    }
    const { count: pending } = await admin
      .from('feature_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'submitted')
      .is('cluster_id', null)
      .is('summarized_at', null)
    const clusters: RequestCluster[] = (counts ?? []).map(c => ({
      id: c.cluster_id,
      title: c.title,
      status: c.status,
      moduleKey: c.module_key,
      shippedAt: c.shipped_at,
      createdAt: c.created_at,
      requesters: Number(c.measured_requesters) || 0,
      requests: Number(c.measured_requests) || 0,
      lastRequestedAt: c.last_requested_at,
      samples: samples.get(c.cluster_id) ?? [],
    }))
    clusters.sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || b.requesters - a.requesters)
    return NextResponse.json({ clusters, pending: pending ?? 0 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}

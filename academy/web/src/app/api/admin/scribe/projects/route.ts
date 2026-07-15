import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/admin/scribe/projects — list projects, newest first.
export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('scribe_projects')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ projects: data })
}

// POST /api/admin/scribe/projects — create { title, format? }.
export async function POST(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { title, format } = await req.json()
  if (!title?.trim()) {
    return NextResponse.json({ error: 'Missing title' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('scribe_projects')
    .insert({ title: title.trim(), format: format || 'substack' })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ project: data })
}

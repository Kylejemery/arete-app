import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/admin/scribe/styles — list style profiles (newest-updated first;
// the first one is what drafting uses).
export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('scribe_style_profiles')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ styles: data })
}

// POST /api/admin/scribe/styles — create { name, guidance?, exemplar_refs? }.
export async function POST(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { name, guidance, exemplar_refs } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Missing name' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('scribe_style_profiles')
    .insert({
      name: name.trim(),
      guidance: guidance ?? null,
      exemplar_refs: Array.isArray(exemplar_refs) ? exemplar_refs : [],
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ style: data })
}

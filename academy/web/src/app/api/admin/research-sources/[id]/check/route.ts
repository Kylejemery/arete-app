import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// POST /api/admin/research-sources/:id/check  { passage }
// Guardrail 1's test for a stored-source citation, through
// research_source_contains: is the passage in the text, whitespace collapsed?
// The function answers false for a deprecated or licence-unconfirmed source,
// so the response also says whether the source is citable, to tell "not in
// the text" from "not citable yet". Admin-gated.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const { passage } = await req.json()
    if (typeof passage !== 'string' || !passage.trim()) {
      return NextResponse.json({ error: 'passage is required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: source, error: readErr } = await admin
      .from('research_sources')
      .select('id, licence_status, deprecated')
      .eq('id', id)
      .maybeSingle()
    if (readErr) throw new Error(readErr.message)
    if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 })

    const citable = !source.deprecated && source.licence_status !== 'unconfirmed'
    const { data, error } = await admin.rpc('research_source_contains', {
      p_source: id,
      p_passage: passage.normalize('NFC'),
    })
    if (error) throw new Error(error.message)
    return NextResponse.json({ verified: data === true, citable })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Check failed' },
      { status: 500 }
    )
  }
}

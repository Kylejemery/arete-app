import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { LICENCE_STATUSES, SOURCE_COLUMNS, type LicenceStatus } from '@/lib/research-sources/types'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/research-sources/:id
// { licence_status?, licence_notes?, notes?, deprecated? }
// The fields that change after a text is stored: settling its licence,
// annotating it, and deprecating it (never deleting). The text and its
// citation metadata are fixed; a corrected text is a new source, and the old
// one is deprecated. Admin-gated.
export async function PATCH(
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
    const { licence_status, licence_notes, notes, deprecated } = await req.json()

    const updates: Record<string, unknown> = {}
    if (licence_status !== undefined) {
      if (!LICENCE_STATUSES.includes(licence_status as LicenceStatus)) {
        return NextResponse.json({ error: 'licence_status is not a valid value' }, { status: 400 })
      }
      updates.licence_status = licence_status
    }
    if (typeof licence_notes === 'string') updates.licence_notes = licence_notes.trim() || null
    if (typeof notes === 'string') updates.notes = notes.trim() || null
    if (typeof deprecated === 'boolean') updates.deprecated = deprecated
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('research_sources')
      .update(updates)
      .eq('id', id)
      .select(SOURCE_COLUMNS)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ error: 'Source not found' }, { status: 404 })
    return NextResponse.json({ success: true, source: data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update the source' },
      { status: 500 }
    )
  }
}

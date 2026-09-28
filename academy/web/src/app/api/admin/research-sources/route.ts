import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import {
  LICENCE_STATUSES,
  MAX_TEXT_BYTES,
  SOURCE_COLUMNS,
  normalizeText,
  type LicenceStatus,
} from '@/lib/research-sources/types'

export const dynamic = 'force-dynamic'

// research_sources is the private store of full texts the corpus cannot hold
// verbatim (themata/THEMATA_PROJECT.md guardrail 1). Service role only, never
// embedded, never retrieved. These routes are the admin way in; the other is
// scripts/research-sources/add.mjs, for texts over the request size cap.

// GET /api/admin/research-sources: every source, newest first, without the
// text itself. Admin-gated.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('research_sources')
      .select(SOURCE_COLUMNS)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return NextResponse.json({ sources: data || [] })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load research sources' },
      { status: 500 }
    )
  }
}

const trimOrNull = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)

// POST /api/admin/research-sources: store one full text.
// Body: { text, author, work, edition, edition_year, how_obtained,
//         licence_status, locator_scheme, volume?, translator?, source_url?,
//         licence_notes?, notes? }
// Refuses a text already stored (same sha256). Admin-gated.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const required = ['author', 'work', 'edition', 'how_obtained', 'locator_scheme'] as const
    const missing = required.filter(k => !trimOrNull(body[k]))
    if (missing.length) {
      return NextResponse.json({ error: `Missing: ${missing.join(', ')}` }, { status: 400 })
    }
    if (!LICENCE_STATUSES.includes(body.licence_status as LicenceStatus)) {
      return NextResponse.json({ error: 'licence_status is not a valid value' }, { status: 400 })
    }
    const editionYear = Number(body.edition_year)
    if (!Number.isInteger(editionYear) || editionYear < 1000 || editionYear > 2100) {
      return NextResponse.json({ error: 'edition_year must be a year' }, { status: 400 })
    }
    if (typeof body.text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }
    const text = normalizeText(body.text)
    if (!text.trim()) return NextResponse.json({ error: 'The text is empty' }, { status: 400 })
    if (Buffer.byteLength(text, 'utf8') > MAX_TEXT_BYTES) {
      return NextResponse.json(
        { error: 'Text too large for upload here; use scripts/research-sources/add.mjs' },
        { status: 413 }
      )
    }
    const sourceUrl = trimOrNull(body.source_url)
    if (sourceUrl) {
      try {
        const u = new URL(sourceUrl)
        if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error()
      } catch {
        return NextResponse.json({ error: 'source_url must be an http(s) URL' }, { status: 400 })
      }
    }

    const sha256 = createHash('sha256').update(text, 'utf8').digest('hex')
    const admin = createAdminClient()
    const { data: existing, error: dupErr } = await admin
      .from('research_sources')
      .select('id, author, work')
      .eq('sha256', sha256)
      .maybeSingle()
    if (dupErr) throw new Error(dupErr.message)
    if (existing) {
      return NextResponse.json(
        { error: `Already stored as ${existing.author}, ${existing.work} (${existing.id}).` },
        { status: 409 }
      )
    }

    const { data: row, error } = await admin
      .from('research_sources')
      .insert({
        author: body.author.trim(),
        work: body.work.trim(),
        volume: trimOrNull(body.volume),
        translator: trimOrNull(body.translator),
        edition: body.edition.trim(),
        edition_year: editionYear,
        source_url: sourceUrl,
        how_obtained: body.how_obtained.trim(),
        licence_status: body.licence_status,
        licence_notes: trimOrNull(body.licence_notes),
        locator_scheme: body.locator_scheme.trim(),
        notes: trimOrNull(body.notes),
        full_text: text,
        sha256,
      })
      .select(SOURCE_COLUMNS)
      .single()
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, source: row, characters: text.length })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to store the text' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { distill } from '@/lib/scribe/pipeline/distill'
import { retrieveForClaims } from '@/lib/scribe/pipeline/retrieve'
import { draft } from '@/lib/scribe/pipeline/draft'
import type { ScribeBrief, ScribeStyleProfile } from '@/lib/scribe/types'
import type { StageUsage } from '@/lib/scribe/anthropic'

export const dynamic = 'force-dynamic'
// Stage B (embeddings + two RPCs per claim) plus an Opus long-form draft.
// Runs in minutes locally; on Vercel this clamps to the plan's ceiling.
export const maxDuration = 300

type Ctx = { params: Promise<{ id: string }> }

// POST /api/admin/scribe/projects/[id]/draft — Stages B + C.
// Body (all optional): { brief } — the user-edited brief to use (also saved);
// without one, the project's saved brief is used, or Stage A runs first
// (the "just write it" path).
export async function POST(req: NextRequest, ctx: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await ctx.params

  const body = await req.json().catch(() => ({}))
  const admin = createAdminClient()

  const [projectRes, notesRes] = await Promise.all([
    admin.from('scribe_projects').select('*').eq('id', id).single(),
    admin.from('scribe_notes').select('*').eq('project_id', id).order('position'),
  ])
  if (projectRes.error || !projectRes.data) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }
  const project = projectRes.data
  const notes = notesRes.data ?? []
  if (notes.length === 0) {
    return NextResponse.json({ error: 'No notes — add some thoughts first.' }, { status: 400 })
  }

  const usage: Record<string, StageUsage> = {}

  try {
    // Brief: edited > saved > freshly distilled ("just write it").
    let brief: ScribeBrief | null = body.brief ?? project.brief ?? null
    if (brief && body.brief) {
      await admin
        .from('scribe_projects')
        .update({ brief, updated_at: new Date().toISOString() })
        .eq('id', id)
    }
    if (!brief) {
      const a = await distill(notes)
      brief = a.brief
      usage.distill = a.usage
      await admin
        .from('scribe_projects')
        .update({ brief, updated_at: new Date().toISOString() })
        .eq('id', id)
    }

    // Stage B — retrieval bundles for each key claim.
    const bundles = await retrieveForClaims(brief.key_claims)

    // Style profile: one default for now (step 6 adds management UI).
    const { data: styleRow } = await admin
      .from('scribe_style_profiles')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const style = (styleRow as ScribeStyleProfile | null) ?? null

    // Stage C — the draft.
    const result = await draft(project.format, brief, notes, bundles, style)
    usage.draft = result.usage

    const { data: last } = await admin
      .from('scribe_drafts')
      .select('version')
      .eq('project_id', id)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()
    const version = (last?.version ?? 0) + 1

    const unsupported = bundles.filter(b => !b.supported).map(b => b.claim)
    const modelNotes = [
      result.meta ? `META: ${JSON.stringify(result.meta)}` : null,
      unsupported.length ? `UNSUPPORTED CLAIMS (author's voice, uncited): ${unsupported.join(' | ')}` : null,
      result.droppedHandles.length ? `DROPPED UNKNOWN HANDLES: ${result.droppedHandles.join(', ')}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    const { data: draftRow, error: insErr } = await admin
      .from('scribe_drafts')
      .insert({
        project_id: id,
        version,
        format: project.format,
        content: result.content,
        citations: result.citations,
        model_notes: modelNotes || null,
        token_usage: usage,
      })
      .select()
      .single()
    if (insErr) throw new Error(`Saving draft: ${insErr.message}`)

    return NextResponse.json({ draft: draftRow, bundlesSummary: bundles.map(b => ({ claim: b.claim, supported: b.supported, chunks: b.chunks.length })) })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Draft failed'
    console.error('[scribe/draft]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

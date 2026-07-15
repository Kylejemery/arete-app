import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/scribe/admin-auth'
import { createAdminClient } from '@/lib/supabase-admin'
import { distill } from '@/lib/scribe/pipeline/distill'
import { retrieveForClaims } from '@/lib/scribe/pipeline/retrieve'
import { draft, type PriorDraft } from '@/lib/scribe/pipeline/draft'
import { buildReferences } from '@/lib/scribe/references'
import { getProfile } from '@/lib/scribe/formats'
import type { ScribeBrief, ScribeStyleProfile } from '@/lib/scribe/types'
import type { StageUsage } from '@/lib/scribe/anthropic'

export const dynamic = 'force-dynamic'
// Stage B (embeddings + two RPCs per claim) plus an Opus long-form draft.
// Runs in minutes locally; on Vercel this clamps to the plan's ceiling.
export const maxDuration = 300

type Ctx = { params: Promise<{ id: string }> }

// POST /api/admin/scribe/projects/[id]/draft — Stages B + C (+ E packaging).
// Body (all optional):
//   { brief }    — the user-edited brief to use (also saved); without one, the
//                  project's saved brief is used, or Stage A runs first
//                  (the "just write it" path).
//   { feedback } — regeneration: the latest draft is fed back to Stage C with
//                  this feedback and revised rather than restarted.
//   { referenceStyle } — 'apa' (default) | 'chicago' for generated reference lists.
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

    // Style profile: most recently updated one wins.
    const { data: styleRow } = await admin
      .from('scribe_style_profiles')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const style = (styleRow as ScribeStyleProfile | null) ?? null

    // Regeneration: feed the latest draft + feedback back into Stage C.
    let prior: PriorDraft | undefined
    const { data: last } = await admin
      .from('scribe_drafts')
      .select('version, content')
      .eq('project_id', id)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (body.feedback?.trim() && last?.content) {
      prior = { content: last.content, feedback: body.feedback.trim() }
    }

    // Stage C — the draft.
    const result = await draft(project.format, brief, notes, bundles, style, prior)
    usage.draft = result.usage

    // Stage E — deterministic reference list for the formats that carry one.
    let content = result.content
    if (getProfile(project.format).appendReferences && result.citations.length > 0) {
      content += await buildReferences(
        result.citations,
        body.referenceStyle === 'chicago' ? 'chicago' : 'apa'
      )
    }

    const version = (last?.version ?? 0) + 1

    const unsupported = bundles.filter(b => !b.supported).map(b => b.claim)
    const modelNotes = [
      unsupported.length ? `UNSUPPORTED CLAIMS (author's voice, uncited): ${unsupported.join(' | ')}` : null,
      result.droppedHandles.length ? `DROPPED UNKNOWN HANDLES: ${result.droppedHandles.join(', ')}` : null,
      prior ? `REGENERATED from v${last?.version} with feedback: ${prior.feedback}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    const { data: draftRow, error: insErr } = await admin
      .from('scribe_drafts')
      .insert({
        project_id: id,
        version,
        format: project.format,
        content,
        citations: result.citations,
        meta: result.meta,
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

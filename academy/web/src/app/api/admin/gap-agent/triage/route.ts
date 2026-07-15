import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
// One batched Haiku call over ≤8 passages — quick, but give it headroom.
export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You triage candidate passages for the curator of a Stoic philosophy corpus. A THEME is a subject users raised, phrased in everyday language. Each numbered PASSAGE was retrieved by embedding similarity, which bridges vocabulary silently — your job is to make that bridge explicit so the curator can judge at a glance.

For each passage return:
- "verdict": "strong" if it genuinely addresses the theme's substance; "partial" if it touches the theme meaningfully but indirectly, narrowly, or only in one stretch; "off_topic" if it is about something else and merely shares vocabulary.
- "bridge": ONE plain-language sentence naming the conceptual link between theme and passage (e.g. "Habituation as repeated daily acts forming character — the classical account of routine as practice."). For off_topic, instead say in one sentence what the passage is actually about.

Judge substance, not word overlap. A passage in a different philosophical register (habituation, askēsis, the mean) can still be a strong match for an everyday theme. Return ONLY a JSON array, one object per passage, in order: [{"n": 1, "verdict": "...", "bridge": "..."}]`

// POST /api/admin/gap-agent/triage { theme } — run the advisory triage pass
// over this theme's unreviewed, untriaged candidate passages. Stores verdict
// + bridge on concept_passage_map and returns the updated rows. NEVER touches
// `approved` — the human gate stays human. Admin-gated.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { theme } = await req.json()
    if (typeof theme !== 'string' || !theme.trim()) {
      return NextResponse.json({ error: 'theme is required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: rows, error } = await admin
      .from('concept_passage_map')
      .select('id, chunk_text, author, work')
      .eq('concept', theme.trim())
      .is('approved', null)
      .is('triage_verdict', null)
      .order('similarity_score', { ascending: false })
      .limit(8)
    if (error) throw new Error(error.message)
    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: true, triaged: 0 })
    }

    const numbered = rows
      .map((r, i) => `PASSAGE ${i + 1} (${r.author} — ${r.work}):\n${(r.chunk_text || '').slice(0, 1500)}`)
      .join('\n\n---\n\n')

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      system: SYSTEM,
      messages: [{ role: 'user', content: `THEME: "${theme.trim()}"\n\n${numbered}` }],
    })
    const text = msg.content.find(b => b.type === 'text')?.text || ''
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim()) as
      { n: number; verdict: string; bridge: string }[]

    const VALID = new Set(['strong', 'partial', 'off_topic'])
    let triaged = 0
    for (const item of parsed) {
      const row = rows[(item.n || 0) - 1]
      if (!row || !VALID.has(item.verdict)) continue
      const { error: updErr } = await admin
        .from('concept_passage_map')
        .update({
          triage_verdict: item.verdict,
          triage_note: String(item.bridge || '').slice(0, 400) || null,
        })
        .eq('id', row.id)
      if (!updErr) triaged++
    }

    return NextResponse.json({ success: true, triaged })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Triage failed' },
      { status: 500 }
    )
  }
}

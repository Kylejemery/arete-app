// Live end-to-end smoke for the Scribe pipeline (Stages A → B → C), run
// manually against the real corpus and real models. Env-gated: refuses to run
// without SCRIBE_SMOKE=1. Costs real tokens.
//
// Usage (from academy/web):
//   SCRIBE_SMOKE=1 NEXT_PUBLIC_SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
//   OPENAI_API_KEY=… ANTHROPIC_API_KEY=… npx tsx src/scripts/scribe-smoke.ts
//
// Creates (and leaves behind, for inspection in /admin/scribe) one project
// titled "SMOKE — …" with seeded notes and one generated draft.

import { createAdminClient } from '../lib/supabase-admin'
import { distill } from '../lib/scribe/pipeline/distill'
import { retrieveForClaims } from '../lib/scribe/pipeline/retrieve'
import { draft } from '../lib/scribe/pipeline/draft'

const NOTES = [
  `Everyone treats the dichotomy of control like a productivity hack — "focus on what you can control" as a sticky note. But in Epictetus it isn't advice, it's the conclusion of an argument. Some things are up to us, some are not — and the "up to us" list is weirdly short: judgment, impulse, desire, aversion. Not outcomes. Not reputation. Not even the body.`,
  `The thing I keep coming back to: the dichotomy follows from the theory of assent. If the only thing that is fully ours is how we assent to impressions, then everything downstream of assent is only partly ours. The dichotomy isn't the starting point, it's a theorem.`,
  `Marcus does this in practice — the Meditations are basically a man repeatedly deriving the theorem for himself at 5am. He doesn't say "control what you can." He says the disturbance is in the judgment, so go to the judgment.`,
  `Objection I want to take seriously: if it's a theorem, why does it feel like a platitude when people quote it? Maybe because stripped of the assent machinery it IS a platitude. The self-help version deletes the premises and keeps the conclusion.`,
  `Possible closing move: the reason the Enchiridion opens with the dichotomy is pedagogical — Epictetus is handing students the conclusion first, the way a teacher writes the theorem on the board before the proof. The rest of Stoic training is the proof.`,
]

async function main() {
  if (process.env.SCRIBE_SMOKE !== '1') {
    console.error('Refusing to run: set SCRIBE_SMOKE=1 (this script costs real tokens).')
    process.exit(1)
  }

  const admin = createAdminClient()
  const title = `SMOKE — dichotomy as theorem (${new Date().toISOString().slice(0, 16)})`

  console.log('1/5 Creating project…')
  const { data: project, error: pErr } = await admin
    .from('scribe_projects')
    .insert({ title, format: 'substack' })
    .select()
    .single()
  if (pErr) throw new Error(pErr.message)

  console.log('2/5 Seeding notes…')
  for (let i = 0; i < NOTES.length; i++) {
    const { error } = await admin
      .from('scribe_notes')
      .insert({ project_id: project.id, content: NOTES[i], position: i })
    if (error) throw new Error(error.message)
  }
  const { data: notes } = await admin
    .from('scribe_notes')
    .select('*')
    .eq('project_id', project.id)
    .order('position')

  console.log('3/5 Stage A — distill…')
  const a = await distill(notes!)
  console.log('   thesis:', a.brief.thesis)
  console.log('   claims:', a.brief.key_claims.length, '| gaps:', a.brief.gaps.length)
  await admin.from('scribe_projects').update({ brief: a.brief }).eq('id', project.id)

  console.log('4/5 Stage B — retrieve…')
  const bundles = await retrieveForClaims(a.brief.key_claims)
  for (const b of bundles) {
    console.log(`   ${b.supported ? '✓' : '✗ UNSUPPORTED'} (${b.chunks.length} chunks) ${b.claim.slice(0, 80)}`)
  }

  console.log('5/5 Stage C — draft (opus, takes a minute)…')
  const d = await draft('substack', a.brief, notes!, bundles, null)

  const { error: dErr } = await admin.from('scribe_drafts').insert({
    project_id: project.id,
    version: 1,
    format: 'substack',
    content: d.content,
    citations: d.citations,
    model_notes: d.meta ? `META: ${JSON.stringify(d.meta)}` : null,
    token_usage: { distill: a.usage, draft: d.usage },
  })
  if (dErr) throw new Error(dErr.message)

  console.log('\n════════ DRAFT ════════\n')
  console.log(d.content)
  console.log('\n════════ CITATIONS ════════')
  for (const c of d.citations) {
    console.log(`  [${c.chunk_table === 'rag_corpus' ? 'corpus' : 'paper'}] ${c.marker}${c.locator ? ` · ${c.locator}` : ''}${c.quote ? ' · QUOTE' : ''}`)
  }
  if (d.droppedHandles.length) {
    console.log('  DROPPED unknown handles:', d.droppedHandles.join(', '))
  }
  console.log('\nMETA:', JSON.stringify(d.meta))
  console.log('\nTokens — distill:', a.usage, '| draft:', d.usage)
  console.log(`\nProject left in place for inspection: "${title}" (${project.id})`)
}

main().catch(e => {
  console.error('SMOKE FAILED:', e)
  process.exit(1)
})

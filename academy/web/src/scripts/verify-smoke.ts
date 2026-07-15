// Run Stage D verification against the most recent smoke draft and print the
// per-citation results. Env-gated like the smoke itself.

import { createAdminClient } from '../lib/supabase-admin'
import { verifyDraft, verificationPasses } from '../lib/scribe/pipeline/verify'

async function main() {
  if (process.env.SCRIBE_SMOKE !== '1') {
    console.error('Set SCRIBE_SMOKE=1 to run.')
    process.exit(1)
  }
  const admin = createAdminClient()

  const { data: project } = await admin
    .from('scribe_projects')
    .select('id, title')
    .like('title', 'SMOKE %')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (!project) throw new Error('No smoke project found')

  const { data: draft } = await admin
    .from('scribe_drafts')
    .select('*')
    .eq('project_id', project.id)
    .order('version', { ascending: false })
    .limit(1)
    .single()
  if (!draft) throw new Error('No draft found')

  console.log(`Verifying draft v${draft.version} of "${project.title}" — ${draft.citations.length} citations…\n`)
  const { verification, usage } = await verifyDraft(draft.content, draft.citations)

  for (const r of verification.results) {
    const flag = !r.chunk_resolves || r.quote_match === false || r.locator === 'mismatch' ? '✗' : r.locator === 'unverified' ? '⚠' : '✓'
    console.log(`${flag} resolves=${r.chunk_resolves} quote=${r.quote_match} locator=${r.locator}${r.support ? ` support=${r.support}` : ''}`)
    console.log(`   ${r.marker.slice(0, 100)}`)
    if (r.note) console.log(`   note: ${r.note}`)
  }

  await admin.from('scribe_drafts').update({
    verification,
    token_usage: { ...(draft.token_usage ?? {}), ...(usage ? { verify: usage } : {}) },
  }).eq('id', draft.id)

  console.log(`\nOVERALL: ${verificationPasses(verification) ? 'PASSES — eligible for Ready' : 'FAILS — issues above'}`)
  if (usage) console.log('verify tokens:', usage)
}

main().catch(e => { console.error('VERIFY-SMOKE FAILED:', e); process.exit(1) })

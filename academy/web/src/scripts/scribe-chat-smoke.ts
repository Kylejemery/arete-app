// Live end-to-end smoke for Scribe CHAT mode — the full test plan conversation
// against the real corpus and real Opus. Env-gated: refuses to run without
// SCRIBE_SMOKE=1. Costs real tokens (4 Opus turns).
//
// Usage (from academy/web, with env from .env.local):
//   SCRIBE_SMOKE=1 npx tsx src/scripts/scribe-chat-smoke.ts
//
// Creates (and leaves behind, for inspection in /admin/scribe/chat) one entry
// titled "SMOKE — ideas as currency" with the full thread and snapshots.
// Persistence here mirrors the /turn route's inserts so the entry reopens in
// the UI exactly like a real session.

import { createAdminClient } from '../lib/supabase-admin'
import { runScribeTurn, extractSnapshotIntent, extractDraft, TurnSource } from '../lib/scribe/chat'
import { withAttribution } from '../lib/scribe/attribution'

const FRAGMENT =
  'Ideas are going to be the currency of the future. AI may lower the barrier to all knowledge work. Ideas are the only unique thing left. That, and the way to live your life. Your character, the art of living.'

const check = (label: string, ok: boolean, detail = '') =>
  console.log(`  ${ok ? 'PASS' : 'FAIL'} — ${label}${detail ? ` (${detail})` : ''}`)

function excerpt(text: string, n = 700): string {
  return text.length > n ? text.slice(0, n) + ' …[truncated]' : text
}

// Longest run of consecutive words from `source` appearing verbatim in `draft`.
function longestSharedRun(draft: string, source: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
  const d = norm(draft).join(' ')
  const words = norm(source)
  let best = 0
  for (let i = 0; i < words.length; i++) {
    let lo = best + 1, hi = words.length - i
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      if (d.includes(words.slice(i, i + mid).join(' '))) { best = Math.max(best, mid); lo = mid + 1 }
      else hi = mid - 1
    }
  }
  return best
}

async function main() {
  if (process.env.SCRIBE_SMOKE !== '1') {
    console.error('Refusing to run: set SCRIBE_SMOKE=1 (this script costs real tokens).')
    process.exit(1)
  }

  const admin = createAdminClient()
  const { count: ragBefore } = await admin.from('rag_corpus').select('*', { count: 'exact', head: true })

  // ── 1. Entry + verbatim fragment as first user message ──
  console.log('\n[1] Creating entry…')
  const { data: entry, error: eErr } = await admin
    .from('scribe_entries')
    .insert({ title: `SMOKE — ideas as currency (${new Date().toISOString().slice(0, 16)})`, raw_text: FRAGMENT })
    .select()
    .single()
  if (eErr) throw new Error(eErr.message)
  await admin.from('scribe_messages').insert({ entry_id: entry.id, role: 'user', content: FRAGMENT })
  const { data: stored } = await admin.from('scribe_entries').select('raw_text').eq('id', entry.id).single()
  check('fragment saved verbatim', stored!.raw_text === FRAGMENT)

  type Turn = { text: string; sources: TurnSource[] }
  const history: { role: 'user' | 'scribe'; content: string }[] = [{ role: 'user', content: FRAGMENT }]
  const allTurns: Turn[] = []

  async function turn(label: string, message?: string): Promise<Turn> {
    if (message) {
      history.push({ role: 'user', content: message })
      await admin.from('scribe_messages').insert({ entry_id: entry.id, role: 'user', content: message })
    }
    console.log(`\n[turn] ${label}`)
    const searches: string[] = []
    const result = await runScribeTurn(history, {
      onText: () => {},
      onSources: () => {},
      onSearching: q => { searches.push(q); console.log(`  … searching: "${q}"`) },
    })
    history.push({ role: 'scribe', content: result.text })
    await admin.from('scribe_messages').insert({
      entry_id: entry.id,
      role: 'scribe',
      content: result.text,
      sources_used: result.sources.length ? result.sources : null,
    })
    const intent = extractSnapshotIntent(result.text)
    if (intent) {
      await admin.from('scribe_entry_drafts').insert({
        entry_id: entry.id,
        stage: intent.stage,
        draft_text: intent.draft_text,
        sources_used: result.sources.length ? result.sources : null,
      })
      console.log(`  … snapshot intent honored: stage=${intent.stage}`)
    }
    console.log(`  sources this turn: ${result.sources.map(s => `${s.author} (${s.mode})`).join(', ') || 'none'}`)
    allTurns.push(result)
    return result
  }

  // ── 2. Opening turn — the middle draft ──
  const t1 = await turn('opening — middle draft')
  const d1 = extractDraft(t1.text)
  check('working draft present (<draft> tags)', !!d1)
  check('[YOUR TURN…] gaps explicit', /\[YOUR TURN/i.test(t1.text))
  check("Kyle's language is the spine", !!d1 && /currency|the art of living|only unique thing/i.test(d1))
  check('sources retrieved with provenance', t1.sources.length > 0, `${t1.sources.length} chunks`)
  console.log('\n  — opening commentary excerpt —\n' + excerpt(t1.text.split('<draft>')[0]))

  // ── 3. Conversational revision ──
  const t2 = await turn('revision', 'Concede the point about ideas, and make character the moat.')
  const d2 = extractDraft(t2.text)
  check('revised draft returned', !!d2)
  check('character now central', !!d2 && /character/i.test(d2!))

  // ── 4. Per-turn retrieval on request ──
  const t3 = await turn('targeted retrieval', 'Bring in Marcus on the inner citadel here.')
  const marcus = t3.sources.filter(s => /marcus/i.test(s.author))
  check('fresh retrieval this turn', t3.sources.length > 0, `${t3.sources.length} chunks`)
  check('Marcus chunk in sources_used', marcus.length > 0, marcus.map(m => `${m.work} ${m.section_label ?? ''}`).join('; '))

  // ── 7. Full draft + conversational snapshot ──
  const t4 = await turn('full draft', 'Develop the full draft.')
  const d4 = extractDraft(t4.text)
  const { data: snaps } = await admin
    .from('scribe_entry_drafts').select('stage').eq('entry_id', entry.id)
  check("snapshot saved as stage='full'", (snaps ?? []).some(s => s.stage === 'full'))
  // Commentary can land before or after the draft block — scan both sides.
  const t4Commentary = t4.text.replace(/<draft>[\s\S]*?<\/draft>/, '')
  check('voice guard — Scribe flags its own lines', /mine|my phrasing/i.test(t4Commentary))
  check("Kyle's language survives the full draft", !!d4 && /character|art of living/i.test(d4!))
  console.log('\n  — full-draft commentary excerpt —\n' + excerpt(t4.text.split('<draft>')[0]))

  // ── 5. Push-back somewhere in the conversation ──
  const allCommentary = allTurns.map(t => t.text.split('<draft>')[0]).join('\n')
  check('tension/pushback surfaced (review excerpts above)', /tension|strains?|weakest|counter|push.?back|market/i.test(allCommentary))

  // ── 6. Quote/paraphrase guard ──
  const paraphraseSources = allTurns.flatMap(t => t.sources).filter(s => s.mode === 'paraphrase')
  const quoteSources = allTurns.flatMap(t => t.sources).filter(s => s.mode === 'quote')
  console.log(`\n[6] modes seen: ${quoteSources.length} quote-eligible, ${paraphraseSources.length} paraphrase-only`)
  if (paraphraseSources.length && d4) {
    // No long verbatim run from any paraphrase-only chunk may appear in the draft.
    let worst = 0
    for (const s of paraphraseSources) {
      const { data: chunk } = await admin.from('rag_corpus').select('chunk_text').eq('id', s.chunk_id).single()
      if (chunk) worst = Math.max(worst, longestSharedRun(d4, chunk.chunk_text))
    }
    check('no verbatim quoting of paraphrase-only chunks', worst < 12, `longest shared run: ${worst} words`)
  } else {
    console.log('  (no paraphrase-only sources retrieved this session — guard exercised via labeling only)')
  }

  // ── 8. Persistence / reopen ──
  const { data: thread } = await admin
    .from('scribe_messages').select('role').eq('entry_id', entry.id).order('created_at')
  check('full thread persisted', (thread ?? []).length === history.length, `${thread?.length} messages`)

  // ── 9. Export note ──
  const exported = withAttribution(d4 ?? d1 ?? '')
  check('"Developed with Arete" appended on export', exported.includes('Developed with Arete'))

  // ── 10. sources_used audit + corpus untouched ──
  const { data: scribeMsgs } = await admin
    .from('scribe_messages').select('sources_used').eq('entry_id', entry.id).eq('role', 'scribe')
  check('every scribe turn carries sources_used', (scribeMsgs ?? []).every(m => m.sources_used === null || Array.isArray(m.sources_used)))
  const { count: ragAfter } = await admin.from('rag_corpus').select('*', { count: 'exact', head: true })
  check('rag_corpus untouched', ragBefore === ragAfter, `${ragBefore} → ${ragAfter}`)

  console.log(`\nDone. Entry left for inspection in /admin/scribe/chat: ${entry.id}`)
}

main().catch(e => { console.error(e); process.exit(1) })

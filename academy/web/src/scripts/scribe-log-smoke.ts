// Live smoke for the Log + search_journal integration. Env-gated:
// SCRIBE_SMOKE=1. Costs real tokens (embeddings + ONE Opus turn).
//
// Usage (from academy/web):
//   SCRIBE_SMOKE=1 npx tsx src/scripts/scribe-log-smoke.ts
//
// Seeds three log items (two that relate, one that doesn't), checks the
// related RPC ranks them correctly, then runs a connections-mode Scribe
// turn and verifies the journal was actually searched and recorded.

import { createAdminClient } from '../lib/supabase-admin'
import { embedChunk } from '../lib/corpus/ingest'
import { runScribeTurn } from '../lib/scribe/chat'

const check = (label: string, ok: boolean, detail = '') =>
  console.log(`  ${ok ? 'PASS' : 'FAIL'} — ${label}${detail ? ` (${detail})` : ''}`)

const ITEMS = [
  {
    kind: 'journal',
    title: 'SMOKE — ideas after AI',
    content:
      'Watched another skill get commoditized today. If AI can do the knowledge work, what is actually left that is mine? Maybe only the ideas — and even those feel copyable now.',
    entry_date: '2026-06-02',
  },
  {
    kind: 'thought',
    title: 'SMOKE — character as moat',
    content:
      'The only durable advantage is character. Skills depreciate, credentials inflate, but who you are under pressure cannot be downloaded or replicated by a model.',
    entry_date: '2026-07-01',
  },
  {
    kind: 'clipping',
    title: 'SMOKE — sourdough note',
    content:
      'A good sourdough starter needs consistent feeding: equal parts flour and water by weight, twice daily at room temperature, and patience for about a week before the first bake.',
    entry_date: '2026-07-10',
  },
] as const

const FRAGMENT =
  'Ideas are going to be the currency of the future. AI may lower the barrier to all knowledge work. Ideas are the only unique thing left. That, and the way to live your life. Your character, the art of living.'

const CONNECTIONS_INSTRUCTION =
  "Before drafting anything: search my log from several angles for entries that connect to this one. Lay out the threads you actually find, with dates — including where the log doesn't connect — and tell me which connection you'd develop into an essay and why."

async function main() {
  if (process.env.SCRIBE_SMOKE !== '1') {
    console.error('Refusing to run: set SCRIBE_SMOKE=1 (this script costs real tokens).')
    process.exit(1)
  }

  const admin = createAdminClient()

  console.log('\n[1] Seeding three log items (two related, one not)…')
  const ids: Record<string, string> = {}
  for (const item of ITEMS) {
    const embedding = await embedChunk(item.content)
    const { data, error } = await admin
      .from('scribe_log_items')
      .insert({ ...item, embedding })
      .select('id, title')
      .single()
    if (error) throw new Error(error.message)
    ids[item.title] = data.id
  }
  check('items inserted with embeddings', Object.keys(ids).length === 3)

  console.log('\n[2] Related ranking for the ideas entry…')
  const { data: seed } = await admin
    .from('scribe_log_items').select('embedding').eq('id', ids['SMOKE — ideas after AI']).single()
  const { data: related, error: relError } = await admin.rpc('match_scribe_log_items', {
    query_embedding: seed!.embedding,
    match_count: 5,
    exclude_id: ids['SMOKE — ideas after AI'],
  })
  if (relError) throw new Error(relError.message)
  type Hit = { id: string; title: string | null; similarity: number }
  const hits = (related ?? []) as Hit[]
  const moat = hits.find(h => h.id === ids['SMOKE — character as moat'])
  const bread = hits.find(h => h.id === ids['SMOKE — sourdough note'])
  check('character-as-moat found as related', !!moat, `similarity ${moat?.similarity.toFixed(2)}`)
  check(
    'ranks above the unrelated sourdough note',
    !!moat && (!bread || moat.similarity > bread.similarity),
    `moat ${moat?.similarity.toFixed(2)} vs sourdough ${bread ? bread.similarity.toFixed(2) : 'not returned'}`
  )

  console.log('\n[3] Connections-mode Scribe turn (one Opus call)…')
  const searches: string[] = []
  const { text, sources } = await runScribeTurn(
    [{ role: 'user', content: `${FRAGMENT}\n\n---\n\n${CONNECTIONS_INSTRUCTION}` }],
    {
      onText: () => {},
      onSources: () => {},
      onSearching: q => { searches.push(q); console.log(`  … searching: "${q}"`) },
    }
  )
  const journalHits = sources.filter(s => s.text_type === 'journal')
  check('search_journal was used', journalHits.length > 0, `${journalHits.length} log hits`)
  check('journal hits recorded as quotable Kyle material',
    journalHits.every(s => s.mode === 'quote' && s.author === 'Kyle'))
  check('found the related entries',
    journalHits.some(s => /ideas after AI|character as moat/.test(s.work)),
    journalHits.map(s => s.work).join(' | '))
  check('threads laid out with dates', /2026-0[67]-\d\d|June|July/.test(text))
  const mentionsSourdough = /sourdough/i.test(text)
  console.log(`  (sourdough ${mentionsSourdough ? 'mentioned — check it was dismissed as unconnected' : 'not woven in — good'})`)
  console.log('\n  — connections excerpt —\n' + text.replace(/<draft>[\s\S]*?<\/draft>/, '').slice(0, 1200))

  console.log('\n[4] Cleaning up smoke items…')
  const { error: delError } = await admin
    .from('scribe_log_items').delete().in('id', Object.values(ids))
  check('smoke items removed', !delError)

  console.log('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) })

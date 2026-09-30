// One-off: embed every scribe_log_items row whose embedding is null, with the
// same function and model the app uses when a log item is saved (embedChunk
// in lib/corpus/ingest.ts, text-embedding-3-small, 1536 dims; called by
// POST /api/admin/scribe/log and by PATCH /api/admin/scribe/log/[id] when the
// content changes).
//
// Prints each row's id, kind, date and size, never its content. The update
// only lands if the row still has no embedding, so an edit made meanwhile
// through the app (which embeds on its own) is never overwritten.
//
// Run from academy/web:
//   npx tsx --env-file=.env.local src/scripts/backfill-log-embeddings.ts
// Add --dry-run to list the rows without embedding anything.

import { createAdminClient } from '../lib/supabase-admin'
import { embedChunk } from '../lib/corpus/ingest'

// text-embedding-3-small reads at most 8,192 tokens; embedChunk trims the
// input until it fits. Above roughly this many words that trim is likely,
// so the row is flagged as embedded from its opening only.
const LIKELY_TRIM_WORDS = 5500

type Row = { id: string; kind: string; title: string | null; entry_date: string | null; content: string | null }

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('scribe_log_items')
    .select('id, kind, title, entry_date, content')
    .is('embedding', null)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`reading scribe_log_items: ${error.message}`)
  const rows = (data ?? []) as Row[]
  console.log(`${rows.length} row(s) with no embedding${dryRun ? ' (dry run, nothing will be written)' : ''}`)

  const updated: string[] = []
  const skipped: string[] = []
  const failed: string[] = []

  for (const r of rows) {
    const text = r.content ?? ''
    const words = (text.trim().match(/\S+/g) ?? []).length
    const label = `${r.id}  ${r.kind}  ${r.entry_date ?? 'no date'}  ${words} words${r.title ? `  "${r.title}"` : ''}`
    if (!text.trim()) {
      console.log(`SKIP    ${label}  (empty content, nothing to embed)`)
      skipped.push(r.id)
      continue
    }
    if (dryRun) {
      console.log(`WOULD   ${label}`)
      continue
    }
    try {
      const embedding = await embedChunk(text)
      const { data: done, error: upErr } = await admin
        .from('scribe_log_items')
        .update({ embedding })
        .eq('id', r.id)
        .is('embedding', null)
        .select('id')
      if (upErr) throw new Error(upErr.message)
      if (!done?.length) {
        console.log(`SKIP    ${label}  (embedded meanwhile by another path)`)
        skipped.push(r.id)
        continue
      }
      const trim = words > LIKELY_TRIM_WORDS ? '  (long: embedded from the opening that fits the model)' : ''
      console.log(`UPDATED ${label}  dims=${embedding.length}${trim}`)
      updated.push(r.id)
    } catch (e) {
      console.log(`FAILED  ${label}  ${e instanceof Error ? e.message.slice(0, 200) : 'unknown error'}`)
      failed.push(r.id)
    }
  }

  const { count } = await admin
    .from('scribe_log_items')
    .select('id', { count: 'exact', head: true })
    .is('embedding', null)
  console.log(`\nupdated ${updated.length}, skipped ${skipped.length}, failed ${failed.length}; ${count ?? '?'} row(s) still without an embedding`)
  if (failed.length) process.exit(1)
}

main().catch(e => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})

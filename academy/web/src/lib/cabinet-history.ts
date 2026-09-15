import type { SupabaseClient } from '@supabase/supabase-js'

// A writer's Cabinet chat history, as the academy writing surfaces read it.
// The Cabinet is the mobile app's counsel: the user talks with Marcus,
// Epictetus, Roosevelt and the rest, and those conversations are where much of
// their real thinking happens first. Scribe, Scribe chat, and the Composer all
// read it through here.
//
// Storage is cabinet_conversations, one jsonb thread per row, with many
// snapshot rows of the same thread; the cabinet_history_search function
// (migration 20260915000000) flattens, dedupes, and full-text searches it.
// Service role only, so every caller passes the admin client and an explicit
// user id. Nothing here writes.

export interface CabinetHit {
  thread: string
  sent_at: string
  role: 'user' | 'assistant'
  // 'user' for the writer's own lines; the counselor's display name otherwise.
  speaker: string
  content: string
  prev_speaker: string | null
  prev_content: string | null
  next_speaker: string | null
  next_content: string | null
  rank: number
}

export type CabinetWho = 'me' | 'counselors' | 'all'

export interface CabinetSearchOptions {
  // Free text; turned into an OR query over its content words. Empty means
  // "the most recent exchanges".
  query?: string
  limit?: number
  sinceDays?: number
  who?: CabinetWho
}

const MAX_LIMIT = 20
const DAY = 24 * 60 * 60 * 1000

// The app posts its own check-in prompts into the thread as user turns
// ("[Morning check-in] Kyle has just completed..."). They are not the writer's
// words and must never be quoted as such.
export function isAppPrompt(content: string): boolean {
  return /^\s*\[[^\]\n]{2,60}\]/.test(content)
}

const STOP = new Set(
  'the a an and or but if then than that this those these there here is are was were be been being am do does did not no yes it its into onto of for from with without about over under to in on at by as so such very really just also too can could would should may might must will shall have has had having what which who whom whose when where why how all any some more most much many few less least own other another same each every both either neither only ever never always often i me my mine we us our you your he him his she her they them their one ones thing things way like get got make made say said says think thought know knew see saw go went come came take took give gave keep kept put let want wanted need needed use used still even again back up down out off yet because while until since after before through during between among against'.split(
    /\s+/
  )
)

// Turn a passage or a model's query into a websearch_to_tsquery expression
// that matches any of its content words, most useful first. AND semantics
// over a whole sentence match nothing; OR with ts_rank surfaces the messages
// that share the most of its vocabulary.
export function cabinetSearchQuery(text: string, maxTerms = 14): string {
  const words = (text || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^a-z0-9]+/)
    .filter(w => w.length >= 3 && !STOP.has(w))
  const seen = new Set<string>()
  const terms: string[] = []
  for (const w of words) {
    if (seen.has(w)) continue
    seen.add(w)
    terms.push(w)
    if (terms.length >= maxTerms) break
  }
  return terms.join(' or ')
}

export async function searchCabinetHistory(
  admin: SupabaseClient,
  userId: string,
  opts: CabinetSearchOptions = {}
): Promise<CabinetHit[]> {
  const limit = Math.max(1, Math.min(opts.limit ?? 8, MAX_LIMIT))
  const who: CabinetWho = opts.who ?? 'all'
  const query = (opts.query ?? '').trim()
  const since = opts.sinceDays ? new Date(Date.now() - opts.sinceDays * DAY).toISOString() : null

  // Over-fetch, then re-rank here: the writer's own lines are what the
  // surfaces mostly want, and Postgres ranks long counselor replies above
  // short user turns on vocabulary alone.
  const { data, error } = await admin.rpc('cabinet_history_search', {
    p_user_id: userId,
    p_query: query || null,
    p_limit: Math.min(60, limit * 4),
    p_since: since,
  })
  if (error) throw new Error(`cabinet_history_search: ${error.message}`)

  const hits = ((data ?? []) as CabinetHit[]).filter(h => {
    if (h.role === 'user' && isAppPrompt(h.content)) return false
    if (who === 'me') return h.role === 'user'
    if (who === 'counselors') return h.role === 'assistant'
    return true
  })

  if (query) {
    hits.sort((a, b) => weight(b) - weight(a) || Date.parse(b.sent_at) - Date.parse(a.sent_at))
  }
  return hits.slice(0, limit)
}

function weight(h: CabinetHit): number {
  return h.role === 'user' ? h.rank * 2 : h.rank
}

function clip(s: string | null | undefined, n: number): string {
  const t = (s ?? '').replace(/\s+/g, ' ').trim()
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t
}

export function cabinetThreadLabel(thread: string): string {
  if (thread === 'cabinet') return 'the full Cabinet'
  return thread
    .split('+')
    .map(s => s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
    .join(' and ')
}

export function cabinetDate(h: CabinetHit): string {
  return h.sent_at.slice(0, 10)
}

// One exchange, as a prompt sees it: the writer's line and the reply, or the
// line that drew a counselor's reply and the reply itself. `userName` is what
// the writer is called in the prompt (Kyle in Scribe, "the writer" elsewhere).
export function formatCabinetHit(
  h: CabinetHit,
  userName: string,
  maxChars = 700
): string {
  const head = `[CABINET, ${cabinetThreadLabel(h.thread)}, ${cabinetDate(h)}]`
  if (h.role === 'user') {
    const lines = [`${head}\n${userName}: ${clip(h.content, maxChars)}`]
    if (h.next_speaker && h.next_speaker !== 'user' && h.next_content) {
      lines.push(`${h.next_speaker} replied: ${clip(h.next_content, Math.round(maxChars / 2))}`)
    }
    return lines.join('\n')
  }
  const lines = [head]
  if (h.prev_speaker === 'user' && h.prev_content && !isAppPrompt(h.prev_content)) {
    lines.push(`${userName}: ${clip(h.prev_content, Math.round(maxChars / 2))}`)
  }
  lines.push(`${h.speaker}: ${clip(h.content, maxChars)}`)
  return lines.join('\n')
}

export function formatCabinetHits(hits: CabinetHit[], userName: string, maxChars?: number): string {
  return hits.map(h => formatCabinetHit(h, userName, maxChars)).join('\n\n---\n\n')
}

// The standing caveat every prompt that sees Cabinet material carries. The
// counselors are model-voiced; their lines are context, never sources.
export function cabinetCaveat(userName: string): string {
  return `${userName}'s own lines in these exchanges are the writer's words and may be reused as material. The counselors' replies are generated by the app in a historical figure's voice: they are context for what the writer was working through, never sources. Never quote a counselor's reply, never cite it, and never attribute its words to the historical person it is voiced as.`
}

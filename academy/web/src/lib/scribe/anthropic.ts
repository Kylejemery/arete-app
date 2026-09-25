import Anthropic from '@anthropic-ai/sdk'

// One Anthropic client for all Scribe stages, mirroring the agentRouter
// philosophy from server/index.js: synthesis/drafting on the strongest model,
// mechanical passes on a cheap one. Every call records token usage so the
// per-project cost log is available from day one.

// `judge` is the fact check's verdict stage and `summarize` the book mode
// summariser (chapter, book, and folded thread summaries). The judge runs on
// the chat model tier because a wrong verdict costs more than the call; the
// summariser runs on the distill tier because it describes and never decides.
// `shape` reads a whole stream of consciousness document and proposes its
// structure; it is the one stage whose input can be a book long, so it runs
// on the chat model tier with a wide output.
export type ScribeStage = 'distill' | 'draft' | 'verify' | 'format' | 'judge' | 'summarize' | 'shape'

const STAGE_MODEL: Record<ScribeStage, string> = {
  distill: 'claude-sonnet-4-6',
  draft: 'claude-opus-4-6',
  verify: 'claude-haiku-4-5-20251001',
  format: 'claude-haiku-4-5-20251001',
  judge: 'claude-opus-5-5',
  summarize: 'claude-sonnet-4-6',
  shape: 'claude-opus-5-5',
}

const STAGE_MAX_TOKENS: Record<ScribeStage, number> = {
  distill: 2000,
  draft: 8000,
  verify: 1500,
  format: 3000,
  judge: 16000,
  summarize: 3000,
  shape: 16000,
}

export interface StageUsage {
  input: number
  output: number
  model: string
}

let client: Anthropic | null = null
export function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')
    client = new Anthropic({ apiKey })
  }
  return client
}

export async function runStage(
  stage: ScribeStage,
  system: string,
  user: string
): Promise<{ text: string; usage: StageUsage }> {
  const model = STAGE_MODEL[stage]
  // The long stages stream so a book length input cannot trip the HTTP
  // timeout; the result is the same final message either way.
  const params = {
    model,
    max_tokens: STAGE_MAX_TOKENS[stage],
    system,
    messages: [{ role: 'user' as const, content: user }],
  }
  const res =
    STAGE_MAX_TOKENS[stage] >= 16000
      ? await getClient().messages.stream(params).finalMessage()
      : await getClient().messages.create(params)
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
  return {
    text,
    usage: {
      input: res.usage.input_tokens,
      output: res.usage.output_tokens,
      model,
    },
  }
}

// Extract the first JSON value from a model response that may wrap it in
// prose or code fences. Throws when nothing parseable is found.
export function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidates = [fenced?.[1], text]
  for (const c of candidates) {
    if (!c) continue
    const start = c.search(/[[{]/)
    if (start === -1) continue
    for (let end = c.length; end > start; end--) {
      const slice = c.slice(start, end).trim()
      if (!slice) continue
      try {
        return JSON.parse(slice) as T
      } catch {
        // keep shrinking
      }
    }
  }
  throw new Error('No parseable JSON found in model response')
}

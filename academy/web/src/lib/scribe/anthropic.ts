import Anthropic from '@anthropic-ai/sdk'

// One Anthropic client for all Scribe stages, mirroring the agentRouter
// philosophy from server/index.js: synthesis/drafting on the strongest model,
// mechanical passes on a cheap one. Every call records token usage so the
// per-project cost log is available from day one.

export type ScribeStage = 'distill' | 'draft' | 'verify' | 'format'

const STAGE_MODEL: Record<ScribeStage, string> = {
  distill: 'claude-sonnet-4-6',
  draft: 'claude-opus-4-6',
  verify: 'claude-haiku-4-5-20251001',
  format: 'claude-haiku-4-5-20251001',
}

const STAGE_MAX_TOKENS: Record<ScribeStage, number> = {
  distill: 2000,
  draft: 8000,
  verify: 1500,
  format: 3000,
}

export interface StageUsage {
  input: number
  output: number
  model: string
}

let client: Anthropic | null = null
function getClient(): Anthropic {
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
  const res = await getClient().messages.create({
    model,
    max_tokens: STAGE_MAX_TOKENS[stage],
    system,
    messages: [{ role: 'user', content: user }],
  })
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

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
// Book ingestion drives this a section at a time (~3,500 words in, ~400 out).
// That streams well inside a minute, but the platform default is tighter than
// the slowest sections need.
export const maxDuration = 120

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildSystemPrompt(author: string, work: string, section: string): string {
  const who = author.trim() || 'the author'
  return `You are summarizing a philosophical text for ingestion into a Stoic philosophy RAG corpus used by AI counselors. Restate the author's arguments, key concepts, and load-bearing examples in your own words. Your output will be chunked, embedded, and retrieved in isolated fragments — write for retrieval, not for a reader who has the original beside them.

Rules:
- Do NOT paraphrase sentence by sentence. Synthesize the ideas.
- Do NOT reproduce any verbatim sentences from the original text.
- Keep authorial framing on the claims throughout — "${who} argues…", "the paper contends…", "on this reading…". Every part of the summary must remain unmistakably a summary of a secondary source, never a bare set of claims that could pass for primary text or for the corpus's own position; a retrieved fragment carries no context, so the framing must survive at the level of individual sentences. Framing is not preamble: still open with substance, never a filler line like "This passage discusses…".
- Where the source hedges, concedes a difficulty, or leaves a tension unadjudicated, say so explicitly and preserve the openness. Never smooth a hedged argument into a clean conclusion — flattening scholarly uncertainty into false certainty corrupts the corpus.
- Preserve technical philosophical terminology (eudaimonia, hegemonikon, askesis, etc.) but explain each term in context on first use.
- Write in clear, precise prose. Academic but accessible.
- Length: the shortest summary that preserves every distinct claim and distinction — the source governs the length, not a word count. Most passages resolve in a few hundred words; treat ~400 words as a soft ceiling, not a cut-off. When a source is dense, run long rather than drop a distinction; a slightly long summary is slightly long, a truncated concept is a corpus failure. Stop when the architecture is captured — never restate to fill space.
- Structure: core argument first, then how its pieces support it, then how it connects to Stoic practice if relevant.

After the prose, append exactly this section:

KEY CONCEPTS
The distinctions ${who} works with, as ${who} frames them:
- [Concept term]: [one-sentence statement of the distinction or claim]

3 to 6 lines. Each line must stand entirely alone — it may be retrieved as an isolated fragment — so no pronouns pointing back into the prose, no "as above", and attribution visible where the claim is contestable (e.g. "${who}'s claim that…"). These are the source's concepts, not asserted truths.

Author: ${author}
Work: ${work}
Section: ${section}`
}

// POST /api/corpus-ingest/summarize — streams a Claude Sonnet summary back as
// plain text so the admin UI can render it word by word. Does NOT write to
// Supabase; summarization only. Admin-gated.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { text, author = '', work = '', section = '', } = body

  if (typeof text !== 'string' || text.trim().length < 100) {
    return NextResponse.json(
      { error: 'Text must be present and at least 100 characters.' },
      { status: 400 }
    )
  }

  const stream = await client.messages.create({
    model: 'claude-sonnet-4-6',
    // Dense sources are told to run long rather than drop a distinction, and
    // the KEY CONCEPTS tail rides after the prose — a 1024 cap would truncate
    // exactly the summaries the prompt now protects.
    max_tokens: 2048,
    system: buildSystemPrompt(author, work, section),
    messages: [{ role: 'user', content: text }],
    stream: true,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } catch (e) {
        controller.enqueue(
          encoder.encode(`\n\n[summarization error: ${e instanceof Error ? e.message : 'stream failed'}]`)
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

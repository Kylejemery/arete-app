import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildSystemPrompt(author: string, work: string, section: string): string {
  return `You are summarizing a philosophical text for ingestion into a Stoic philosophy RAG corpus used by AI counselors. Your task is to restate the author's core arguments, key concepts, and relevant examples in your own words.

Rules:
- Do NOT paraphrase sentence by sentence. Synthesize the ideas.
- Do NOT reproduce any verbatim sentences from the original text.
- Preserve technical philosophical terminology (eudaimonia, hegemonikon, askesis, etc.) but explain each term in context on first use.
- Write in clear, precise prose. Academic but accessible.
- Target 200-400 words regardless of input length.
- Begin directly with the content — no preamble like "This passage discusses..."
- Structure: core argument first, then key concepts, then how it connects to Stoic practice if relevant.

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
    max_tokens: 1024,
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

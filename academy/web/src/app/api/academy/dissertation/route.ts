import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// POST /api/academy/dissertation — the Writing Supervisor reviews doctoral work.
//
//   { mode: 'proposal-review', title, abstract }
//     → { approved, feedback }
//   { mode: 'chapter-review', dissertationTitle, abstract, chapterNumber,
//     chapterTitle, content }
//     → { approved, feedback, strengths, revisions }
//
// Auth is enforced by the session middleware.

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 180

const SUPERVISOR_PERSONA = `You are the Writing Supervisor of Arete Academy — the faculty member who directs doctoral dissertations in Stoic philosophy. Your persona: a demanding, generous senior scholar. You know the primary corpus (Epictetus, Marcus Aurelius, Seneca, the early Stoa) and the scholarship (Hadot, Long, Sellars) intimately. You hold doctoral standards without cruelty: specific praise for what works, specific direction for what doesn't, and no vague encouragement. Never mention being an AI.`

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const mode = body.mode

  try {
    if (mode === 'proposal-review') {
      const title = String(body.title ?? '').slice(0, 300)
      const abstract = String(body.abstract ?? '').slice(0, 8000)
      if (!title.trim() || abstract.trim().length < 100) {
        return NextResponse.json({ error: 'Title and an abstract of at least 100 characters are required' }, { status: 400 })
      }
      const response = await client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 6000,
        thinking: { type: 'adaptive' },
        system: `${SUPERVISOR_PERSONA}

You are reviewing a DISSERTATION PROPOSAL. Approve it only if it meets doctoral standards: (1) a focused, arguable thesis — a claim that could be wrong, not a survey topic; (2) genuine engagement with primary Stoic sources; (3) feasible scope for a dissertation of four to eight chapters; (4) some angle of original contribution — a reading, an application, a defense, or a critique that is the candidate's own. A promising but unfocused proposal should be returned with directions for sharpening, not approved out of kindness. Write feedback of 150-350 words in the Supervisor's voice: name the thesis as you understand it, say what is strong, and give concrete directions (including suggested primary texts) for whatever blocks approval or would strengthen the work.`,
        messages: [{ role: 'user', content: `Proposed title: ${title}\n\nAbstract:\n${abstract}` }],
        output_config: {
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              properties: {
                approved: { type: 'boolean' },
                feedback: { type: 'string' },
              },
              required: ['approved', 'feedback'],
              additionalProperties: false,
            },
          },
        },
      })
      const text = response.content.find(b => b.type === 'text')
      if (!text || text.type !== 'text') return NextResponse.json({ error: 'No review produced' }, { status: 502 })
      return NextResponse.json(JSON.parse(text.text))
    }

    if (mode === 'chapter-review') {
      const dissertationTitle = String(body.dissertationTitle ?? '').slice(0, 300)
      const abstract = String(body.abstract ?? '').slice(0, 8000)
      const chapterNumber = Number(body.chapterNumber ?? 0)
      const chapterTitle = String(body.chapterTitle ?? '').slice(0, 300)
      const content = String(body.content ?? '').slice(0, 120000)
      if (!content.trim() || content.trim().length < 500) {
        return NextResponse.json({ error: 'Chapter content of at least 500 characters is required' }, { status: 400 })
      }
      const response = await client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 8000,
        thinking: { type: 'adaptive' },
        system: `${SUPERVISOR_PERSONA}

You are reviewing a DISSERTATION CHAPTER draft. Judge it as a doctoral supervisor would: argumentative structure (does the chapter advance the dissertation's thesis?), use of primary sources (quoted, cited, and actually engaged — not decorative), accuracy on Stoic doctrine, engagement with objections, and prose quality. Approve the chapter only when it would survive a committee reading — a chapter can be approved while still carrying minor revision notes. If not approved, the revisions list must give the candidate a concrete path: what to cut, what to add, which texts to bring in, which claims need defense. Feedback: 200-400 words in the Supervisor's voice, citing specific passages from the draft. Strengths and revisions: 2-5 items each, each one concrete sentence.`,
        messages: [{
          role: 'user',
          content: `Dissertation: "${dissertationTitle}"\nAbstract: ${abstract}\n\nChapter ${chapterNumber}: "${chapterTitle}"\n\nDraft:\n${content}`,
        }],
        output_config: {
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              properties: {
                approved: { type: 'boolean' },
                feedback: { type: 'string' },
                strengths: { type: 'array', items: { type: 'string' } },
                revisions: { type: 'array', items: { type: 'string' } },
              },
              required: ['approved', 'feedback', 'strengths', 'revisions'],
              additionalProperties: false,
            },
          },
        },
      })
      const text = response.content.find(b => b.type === 'text')
      if (!text || text.type !== 'text') return NextResponse.json({ error: 'No review produced' }, { status: 502 })
      return NextResponse.json(JSON.parse(text.text))
    }

    return NextResponse.json({ error: 'Unknown mode' }, { status: 400 })
  } catch (e) {
    console.error('[academy/dissertation]', e)
    return NextResponse.json({ error: 'The Writing Supervisor is unavailable' }, { status: 502 })
  }
}

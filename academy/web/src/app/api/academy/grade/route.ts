import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// POST /api/academy/grade — the Proctor grades open-text quiz answers.
//
// Body: { courseId, sessionId, items: [{ index, question, referenceAnswer, studentAnswer }] }
// Returns: { results: [{ index, verdict: 'correct'|'partial'|'incorrect', feedback }] }
//
// Auth is enforced by the session middleware (this route is not in
// PUBLIC_ROUTES). Structured outputs guarantee parseable JSON from the model.

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 120

interface GradeItem {
  index: number
  question: string
  referenceAnswer: string
  studentAnswer: string
}

const GRADER_SYSTEM = `You are the Socratic Proctor of Arete Academy, grading short-answer quiz submissions for graduate-level courses on Stoic philosophy.

For each item you receive the question, a reference answer (the course's model answer), and the student's answer. Grade the student's answer on substance, not phrasing:

- "correct" — the answer captures the essential claim(s) of the reference answer. Different wording, examples, or ordering is fine. Reasonable additional material does not hurt unless it contradicts the core point.
- "partial" — the answer shows genuine understanding but misses a significant element of the reference answer, or mixes a correct core with a real error.
- "incorrect" — the answer misses the point, states the opposite, is circular, or is too vague to demonstrate understanding (e.g., restating the question).

Be a rigorous but fair examiner: do not award "correct" for keyword-matching without comprehension, and do not punish concision — a short answer that nails the point is correct. An answer that merely gestures at vocabulary from the course ("it's about the dichotomy of control") without applying it to the question is partial at best.

For each item write one or two sentences of feedback in the Proctor's voice: direct, specific, and useful — name exactly what was right, what was missing, or what was mistaken. Do not reveal that you are an AI; you are the Proctor.`

export async function POST(req: NextRequest) {
  let body: { courseId?: string; sessionId?: number; items?: GradeItem[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const items = body.items
  if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
    return NextResponse.json({ error: 'items must be an array of 1-20 entries' }, { status: 400 })
  }
  for (const it of items) {
    if (
      typeof it.index !== 'number' ||
      typeof it.question !== 'string' ||
      typeof it.referenceAnswer !== 'string' ||
      typeof it.studentAnswer !== 'string' ||
      it.studentAnswer.length > 8000
    ) {
      return NextResponse.json({ error: 'Malformed grade item' }, { status: 400 })
    }
  }

  const userContent = [
    `Course: ${body.courseId ?? 'unknown'} — Session ${body.sessionId ?? '?'}`,
    '',
    'Grade the following submissions:',
    '',
    ...items.map(it =>
      [
        `<item index="${it.index}">`,
        `<question>${it.question}</question>`,
        `<reference_answer>${it.referenceAnswer}</reference_answer>`,
        `<student_answer>${it.studentAnswer}</student_answer>`,
        `</item>`,
      ].join('\n')
    ),
  ].join('\n')

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      system: GRADER_SYSTEM,
      messages: [{ role: 'user', content: userContent }],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    index: { type: 'integer' },
                    verdict: { type: 'string', enum: ['correct', 'partial', 'incorrect'] },
                    feedback: { type: 'string' },
                  },
                  required: ['index', 'verdict', 'feedback'],
                  additionalProperties: false,
                },
              },
            },
            required: ['results'],
            additionalProperties: false,
          },
        },
      },
    })

    if (response.stop_reason === 'refusal') {
      return NextResponse.json({ error: 'The Proctor declined to grade this submission.' }, { status: 502 })
    }

    const text = response.content.find(b => b.type === 'text')
    if (!text || text.type !== 'text') {
      return NextResponse.json({ error: 'No grading output produced' }, { status: 502 })
    }

    const parsed = JSON.parse(text.text) as {
      results: { index: number; verdict: 'correct' | 'partial' | 'incorrect'; feedback: string }[]
    }

    // Ensure every submitted item received a verdict; anything the model
    // skipped is treated as ungradable rather than silently dropped.
    const byIndex = new Map(parsed.results.map(r => [r.index, r]))
    const results = items.map(it =>
      byIndex.get(it.index) ?? {
        index: it.index,
        verdict: 'incorrect' as const,
        feedback: 'This answer could not be graded — please retake.',
      }
    )

    return NextResponse.json({ results })
  } catch (e) {
    console.error('[academy/grade]', e)
    return NextResponse.json({ error: 'Grading service unavailable' }, { status: 502 })
  }
}

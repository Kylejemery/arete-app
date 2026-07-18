import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// POST /api/academy/evaluate — the Evaluator judges a Socratic dialogue.
//
// Two-role architecture: the Proctor teaches, the Evaluator judges. This is
// a separate call with its own system prompt; it receives the objectives
// rubric + transcript + prior status and returns structured JSON. Code — not
// the model — makes the final gating decision (validation layer below).
//
// Body: {
//   courseId, sessionId, capstone?, turnCount,
//   objectives: [{ id, description }],
//   transcript: [{ role: 'user'|'assistant', content }],
//   priorStatus: [{ objective_id, status, stagnation? }],
// }

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 120

const EVALUATOR_SYSTEM = `You are an assessment evaluator for Arete Academy, a Stoic philosophy formation program. You review Socratic dialogue transcripts between a Proctor and a student and assess whether the student has demonstrated mastery of specific learning objectives.

You will receive:
1. A list of learning objectives with IDs
2. The dialogue transcript so far

For each objective, assign exactly one status:

- "not_demonstrated" — The student has not addressed this objective, or attempts show misunderstanding.
- "partial" — The student can recite or recognize the concept but has not applied it independently, OR applied it with significant Proctor scaffolding.
- "demonstrated" — The student has articulated the concept in their own words AND applied it correctly to at least one scenario without the Proctor supplying the answer.

Assessment rules:

RECITATION IS NOT MASTERY. A student quoting a definition (even correctly) earns at most "partial". "Demonstrated" requires the student to apply the concept to a case, generate their own example, or correctly analyze a scenario the Proctor posed.

SCAFFOLDED ANSWERS ARE PARTIAL. If the Proctor led the student to the answer through heavy hints and the student merely confirmed, that is "partial". The student must carry the reasoning load themselves.

AGREEMENT IS NOT EVIDENCE. "Yes, that makes sense" or "I understand now" is not demonstration. Ignore all student claims about their own understanding. Assess only what they have shown.

EVIDENCE IS MANDATORY. For any "partial" or "demonstrated" status, you must quote the specific student utterance(s) that justify it, verbatim from the transcript. If you cannot find a quote, the status is "not_demonstrated".

NO GRADE DRIFT. Do not upgrade a status out of sympathy, dialogue length, or effort. A long conversation with no demonstration is still "not_demonstrated".

MISCONCEPTIONS OVERRIDE. If the student demonstrated an objective earlier but later reveals a misconception about the same concept, downgrade to "partial" and note the misconception.

Respond ONLY with valid JSON matching the provided schema. No preamble, no markdown fences, no commentary outside the JSON.`

const CAPSTONE_APPENDIX = `

This is a capstone assessment. "Demonstrated" additionally requires the student to handle a scenario type not covered verbatim in course material. Application to memorized examples earns at most "partial".`

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    objectives: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          objective_id: { type: 'string' },
          status: { type: 'string', enum: ['not_demonstrated', 'partial', 'demonstrated'] },
          evidence: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                student_quote: { type: 'string' },
                turn: { type: 'integer' },
              },
              required: ['student_quote', 'turn'],
              additionalProperties: false,
            },
          },
          assessment_note: { type: 'string' },
          misconceptions: { type: 'array', items: { type: 'string' } },
        },
        required: ['objective_id', 'status', 'evidence', 'assessment_note', 'misconceptions'],
        additionalProperties: false,
      },
    },
    session_recommendation: { type: 'string', enum: ['continue', 'complete', 'remediate'] },
    suggested_focus: { type: 'array', items: { type: 'string' } },
    capstone_ready: { type: 'boolean' },
  },
  required: ['objectives', 'session_recommendation', 'suggested_focus', 'capstone_ready'],
  additionalProperties: false,
} as const

type Status = 'not_demonstrated' | 'partial' | 'demonstrated'
const STATUS_RANK: Record<Status, number> = { not_demonstrated: 0, partial: 1, demonstrated: 2 }

interface ObjResult {
  objective_id: string
  status: Status
  evidence: { student_quote: string; turn: number }[]
  assessment_note: string
  misconceptions: string[]
}
interface EvalResult {
  objectives: ObjResult[]
  session_recommendation: 'continue' | 'complete' | 'remediate'
  suggested_focus: string[]
  capstone_ready: boolean
}

// Normalize for near-verbatim quote matching: lowercase, straighten quotes,
// collapse whitespace, drop punctuation that transcription tends to vary.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[.,;:!?"'()—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function POST(req: NextRequest) {
  let body: {
    courseId?: string
    sessionId?: number
    capstone?: boolean
    turnCount?: number
    objectives?: { id: string; description: string }[]
    transcript?: { role: 'user' | 'assistant'; content: string }[]
    priorStatus?: { objective_id: string; status: Status; stagnation?: number }[]
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const objectives = body.objectives
  const transcript = (body.transcript ?? []).slice(-60)
  const priorStatus = body.priorStatus ?? []
  if (!Array.isArray(objectives) || objectives.length === 0 || objectives.length > 12) {
    return NextResponse.json({ error: 'objectives must be 1-12 entries' }, { status: 400 })
  }
  if (!Array.isArray(transcript) || transcript.length === 0) {
    return NextResponse.json({ error: 'transcript required' }, { status: 400 })
  }
  for (const m of transcript) {
    if ((m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string' || m.content.length > 12000) {
      return NextResponse.json({ error: 'Malformed transcript message' }, { status: 400 })
    }
  }

  const transcriptText = transcript
    .map((m, i) => `[turn ${i + 1}] ${m.role === 'user' ? 'STUDENT' : 'PROCTOR'}: ${m.content}`)
    .join('\n\n')
  const studentTextNorm = normalize(
    transcript.filter(m => m.role === 'user').map(m => m.content).join(' \n ')
  )
  const priorById = new Map(priorStatus.map(p => [p.objective_id, p]))

  const userMessage = `LEARNING OBJECTIVES:
${JSON.stringify(objectives.map(o => ({ objective_id: o.id, description: o.description })), null, 2)}

TRANSCRIPT:
${transcriptText}

PRIOR OBJECTIVE STATUS (from previous evaluations this session, if any):
${JSON.stringify(priorStatus, null, 2)}

Assess each objective. A previously "demonstrated" objective stays demonstrated unless the transcript reveals a contradicting misconception.`

  const system = EVALUATOR_SYSTEM + (body.capstone ? CAPSTONE_APPENDIX : '')

  // Run the evaluator; on validation failure, retry once with the errors appended.
  const runOnce = async (extraNote?: string): Promise<EvalResult> => {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      system,
      messages: [{ role: 'user', content: extraNote ? `${userMessage}\n\nNOTE — your previous evaluation was rejected by validation: ${extraNote}. Correct these problems.` : userMessage }],
      output_config: { format: { type: 'json_schema', schema: RESPONSE_SCHEMA } },
    })
    const text = response.content.find(b => b.type === 'text')
    if (!text || text.type !== 'text') throw new Error('No evaluator output')
    return JSON.parse(text.text) as EvalResult
  }

  // Validation layer: (2) every rubric id exactly once; (3) evidence quotes
  // present and near-verbatim for partial/demonstrated. Returns error text or null.
  const validate = (r: EvalResult): string | null => {
    const errors: string[] = []
    const ids = r.objectives.map(o => o.objective_id)
    for (const o of objectives) {
      const n = ids.filter(id => id === o.id).length
      if (n !== 1) errors.push(`objective_id ${o.id} appears ${n} times (must be exactly once)`)
    }
    for (const id of ids) {
      if (!objectives.some(o => o.id === id)) errors.push(`unknown objective_id ${id}`)
    }
    for (const o of r.objectives) {
      if (o.status !== 'not_demonstrated') {
        if (o.evidence.length === 0) {
          errors.push(`${o.objective_id}: status "${o.status}" requires at least one evidence quote`)
        } else {
          for (const ev of o.evidence) {
            const q = normalize(ev.student_quote)
            if (q.length < 3 || !studentTextNorm.includes(q)) {
              errors.push(`${o.objective_id}: evidence quote not found verbatim in the student's utterances: "${ev.student_quote.slice(0, 80)}"`)
            }
          }
        }
      }
    }
    return errors.length ? errors.join('; ') : null
  }

  try {
    let result = await runOnce()
    let problems = validate(result)
    if (problems) {
      result = await runOnce(problems)
      problems = validate(result)
    }

    // Fail-safe enforcement after the retry: statuses whose evidence still
    // fails validation are downgraded to not_demonstrated rather than trusted.
    if (problems) {
      const badIds = new Set(
        result.objectives
          .filter(o => o.status !== 'not_demonstrated' && (
            o.evidence.length === 0 ||
            o.evidence.some(ev => !studentTextNorm.includes(normalize(ev.student_quote)))
          ))
          .map(o => o.objective_id)
      )
      for (const o of result.objectives) {
        if (badIds.has(o.objective_id)) {
          o.status = 'not_demonstrated'
          o.evidence = []
          o.assessment_note = `${o.assessment_note} [Downgraded by validation: evidence could not be verified in transcript.]`
        }
      }
      // Ensure every rubric id present exactly once, synthesizing gaps.
      const seen = new Set<string>()
      result.objectives = result.objectives.filter(o => {
        if (seen.has(o.objective_id) || !objectives.some(x => x.id === o.objective_id)) return false
        seen.add(o.objective_id)
        return true
      })
      for (const o of objectives) {
        if (!seen.has(o.id)) {
          result.objectives.push({
            objective_id: o.id,
            status: priorById.get(o.id)?.status ?? 'not_demonstrated',
            evidence: [],
            assessment_note: 'Not assessed by the evaluator this round; prior status carried forward.',
            misconceptions: [],
          })
        }
      }
    }

    // (4) Monotonicity: status may only move backward if misconceptions is
    // non-empty; otherwise restore the prior (higher) status.
    for (const o of result.objectives) {
      const prior = priorById.get(o.objective_id)
      if (prior && STATUS_RANK[o.status] < STATUS_RANK[prior.status] && o.misconceptions.length === 0) {
        o.status = prior.status
        o.assessment_note = `${o.assessment_note} [Monotonicity: restored prior status "${prior.status}" — downgrade requires a noted misconception.]`
      }
    }

    // Code, not the model, decides. Recompute the recommendation:
    const allDemonstrated = result.objectives.every(o => o.status === 'demonstrated')
    const stagnated = result.objectives.some(o =>
      o.status === 'not_demonstrated' && (priorById.get(o.objective_id)?.stagnation ?? 0) >= 3
    )
    result.session_recommendation = allDemonstrated ? 'complete' : stagnated ? 'remediate' : 'continue'
    result.suggested_focus = result.objectives
      .filter(o => o.status !== 'demonstrated')
      .map(o => o.objective_id)

    return NextResponse.json({
      ...result,
      evaluated_at_turn: body.turnCount ?? transcript.length,
    })
  } catch (e) {
    console.error('[academy/evaluate]', e)
    return NextResponse.json({ error: 'The Evaluator is unavailable' }, { status: 502 })
  }
}

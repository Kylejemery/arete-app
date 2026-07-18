import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// POST /api/academy/viva — the Examiner conducts the Qualifying Examination.
//
// Two modes:
//   { mode: 'question', courseId, messages }  → the Examiner's next question
//   { mode: 'verdict',  courseId, messages }  → structured final assessment
//
// The client runs the exam (6 questions), then requests the verdict.
// Auth is enforced by the session middleware.

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 120

const QUESTION_COUNT = 6

const EXAM_SYLLABI: Record<string, string> = {
  'phil-701': `PHIL 701 — The Art of Living: Foundations. Core examinable doctrine: the three categories of value (goods/bads/indifferents) and preferred indifferents; the benefit condition and the sufficiency of virtue; Stoic psychology (impression → assent → impulse → action; the hēgemonikon; propatheiai); Epictetus's three disciplines (desire, action, assent) and the reserve clause; kathēkon vs katorthōma, roles, and oikeiōsis; prosochē and the testing of impressions; the passions vs the eupatheiai; fate, logos, the cylinder argument and compatibilism; amor fati; the Sage and the prokoptōn; the telos (living according to nature in its three senses); Hadot's thesis that ancient philosophy is a way of life practiced through spiritual exercises (premeditatio malorum, evening review, view from above).`,
  'phil-702': `PHIL 702 — Living the Practice: Marcus Aurelius. Core examinable doctrine: the Meditations as a private practice log, not a treatise (second-person address, repetition as training); the three disciplines as Marcus's daily framework and diagnostic; the discipline of desire (wanting nothing external; the substitution method); the discipline of action (the archer, the reserve clause/hupexairesis, duty without attachment, nobody does wrong willingly); the discipline of assent (the guard at the gate, 'life is opinion', the pause between impression and assent, the morning examination); the view from above (spatial and temporal); memento mori as clarifying lens and leveler; the obstacle as the way and amor fati; anger as a failure of desire, Book XI.18, and Stoic community/oikeiōsis; the inner citadel — what cannot be taken but can be surrendered; progress as shortening the distance between failure and return.`,
  'phil-703': `PHIL 703 — The School of Epictetus. Core examinable doctrine: the opening distinction of Discourses I.1 (eph' hēmin; the use of impressions; prohairesis unenslavable — Zeus cannot compel assent); prosōpon and the price one sells oneself for (I.2); prokopē measured by movement of desire and the placement of blame (I.4, Ench 5); the elenchus and the father who fled (I.11); logic as the audit of the auditor, the wrongdoer pitied not hated, the tyrant's bounded power, the assayer of impressions (I.17–20); confidence and caution correctly assigned, the trial of II.2, the ball-player of II.5; the divine fragment and role ethics (II.8–10); the classroom-vs-life gap and the law of habit — feeding and starving the fire, counting the days (II.16–18); the three topoi in order and why (III.2); the Cynic as scout and limit case, the surgery not the show, given back not lost (III.22–24); IV.1 on freedom — the census of masters, the rewired wish, the open door; the Enchiridion as compressed field manual; Socrates as the demonstration.`,
  'phil-704': `PHIL 704 — The Examined Correspondence: Seneca. Core examinable doctrine: vindica te tibi and the three leaks of time (Ep. 1); the epistolary method — settled reading, unum aliquid, examples over precepts, the daily gift (Ep. 2, 6); the crowd, judged friendship, the guardian exercise, the complete day (Ep. 7–12); the god within and 'they are slaves — no, men' with its unresolved boundary (Ep. 41, 47); quality over quantity of life, the open door, vita non est imperfecta si honesta est, learning to die as unlearning slavery (Ep. 70, 77); sagacity vs wisdom, the happy life as perfected reason, goods of the body not of the man (Ep. 90, 92); De Brevitate Vitae — the occupati, the three tenses, annexing every age; De Tranquillitate — euthymia, the seasick soul, calibrated engagement, the ratified constitution; De Providentia — nothing bad happens to the good, adversity as training, the exit clause; De Vita Beata — virtue-founded happiness, pleasure as byproduct, the hypocrite's defense and its limits; De Clementia — mercy vs pity vs pardon, the mirror, philosophy advising power; the pattern of a life as bequest.`,
}

const EXAMINER_SYSTEM = `You are the Examiner of Arete Academy — the senior faculty member who conducts Qualifying Examinations, the oral viva that closes each doctoral course in Stoic philosophy. Your persona: exacting, courteous, economical. You do not lecture, flatter, or reveal your evaluation during the examination. You are examining a single doctoral student.

Conduct of the examination:
- Ask exactly ONE question per message. Never ask two questions at once.
- The examination consists of ${QUESTION_COUNT} questions total. Range across the course syllabus: begin with a foundational doctrine, then move to harder terrain — application to cases, objections, connections between doctrines, and at least one question that asks the student to apply the material to their own practice or defend a position against its strongest objection.
- React to the student's previous answer in one sentence at most — a neutral acknowledgment, a sharpening ('You said X; then what follows for Y?'), or a probe of a weak spot — then pose the next question. If an answer was evasive or merely recited vocabulary, your next question should press that exact gap.
- Keep each message under 120 words. No preambles, no summaries, no evaluations, no encouragement. The Examiner's warmth is in the quality of the questions.
- Never reveal whether an answer was right or wrong during the exam. Never break persona or mention being an AI.`

interface Msg { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  let body: { mode?: string; courseId?: string; messages?: Msg[]; context?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { mode, courseId, context } = body
  const messages = Array.isArray(body.messages) ? body.messages.slice(0, 40) : []
  const syllabus = context && typeof context === 'string'
    ? context.slice(0, 6000)
    : EXAM_SYLLABI[courseId ?? '']
  if (!syllabus) {
    return NextResponse.json({ error: 'Unknown course' }, { status: 400 })
  }
  for (const m of messages) {
    if ((m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string' || m.content.length > 12000) {
      return NextResponse.json({ error: 'Malformed message' }, { status: 400 })
    }
  }

  try {
    if (mode === 'question') {
      const asked = messages.filter(m => m.role === 'assistant').length
      const response = await client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 2000,
        thinking: { type: 'adaptive' },
        system: `${EXAMINER_SYSTEM}\n\nSyllabus under examination:\n${syllabus}\n\nYou have asked ${asked} of ${QUESTION_COUNT} questions so far.${asked === 0 ? ' Open the examination with one sentence of formal welcome, then ask the first question.' : ''}${asked === QUESTION_COUNT - 1 ? ' This will be your FINAL question — make it the synthesis question: ask the student to defend the course\'s central claim against its strongest objection, or to state what the course has changed in their practice, concretely.' : ''}`,
        messages: messages.length > 0 ? messages : [{ role: 'user', content: 'I am ready to begin the examination.' }],
      })
      const text = response.content.find(b => b.type === 'text')
      if (!text || text.type !== 'text') {
        return NextResponse.json({ error: 'No question produced' }, { status: 502 })
      }
      return NextResponse.json({ message: text.text })
    }

    if (mode === 'verdict') {
      const transcript = messages
        .map(m => `${m.role === 'assistant' ? 'EXAMINER' : 'STUDENT'}: ${m.content}`)
        .join('\n\n')
      const response = await client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 8000,
        thinking: { type: 'adaptive' },
        system: `You are the Examiner of Arete Academy, now deliberating after a Qualifying Examination. Grade the transcript against the syllabus. Standard: a doctoral pass requires demonstrated understanding of the core doctrines in the student's own words, accurate application to at least one case, and evidence of genuine engagement (not vocabulary recitation). Weak spots in one or two answers do not fail a student whose overall command is sound; systematic vagueness, doctrinal errors on fundamentals, or empty recitation do. Write the assessment in the Examiner's voice — direct, specific, citing the student's actual answers. Never mention being an AI.\n\nSyllabus:\n${syllabus}`,
        messages: [{ role: 'user', content: `The examination transcript:\n\n${transcript}\n\nRender your verdict.` }],
        output_config: {
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              properties: {
                verdict: { type: 'string', enum: ['passed', 'failed'] },
                assessment: { type: 'string' },
                strengths: { type: 'array', items: { type: 'string' } },
                weaknesses: { type: 'array', items: { type: 'string' } },
              },
              required: ['verdict', 'assessment', 'strengths', 'weaknesses'],
              additionalProperties: false,
            },
          },
        },
      })
      const text = response.content.find(b => b.type === 'text')
      if (!text || text.type !== 'text') {
        return NextResponse.json({ error: 'No verdict produced' }, { status: 502 })
      }
      return NextResponse.json(JSON.parse(text.text))
    }

    return NextResponse.json({ error: 'Unknown mode' }, { status: 400 })
  } catch (e) {
    console.error('[academy/viva]', e)
    return NextResponse.json({ error: 'The Examiner is unavailable' }, { status: 502 })
  }
}

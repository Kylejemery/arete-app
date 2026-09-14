// The question map (docs/corpus/ACQUISITION_PLAN.md Part 2) on the paper
// side: the shape of a registration, the locked role set, and the validation
// every registration passes before it is stored on a submission or written
// to corpus_question_registrations. Question ids are validated against the
// corpus_questions table by the caller; this module only knows the shape.

export const REGISTRATION_ROLES = ['states', 'defends', 'attacks', 'complicates'] as const
export type RegistrationRole = (typeof REGISTRATION_ROLES)[number]

export const ROLE_HELP: Record<RegistrationRole, string> = {
  states: 'sets out the position without defending it',
  defends: 'argues for the position',
  attacks: 'argues against it',
  complicates: 'accepts the position but shows a cost, tension, or limit',
}

export type QuestionRegistration = {
  question_id: string // 'Q07'
  position: string // one line: the position the work takes
  role: RegistrationRole
  note?: string | null
}

export type CorpusQuestion = {
  id: string
  question: string
  stoic_position: string | null
  sort_order: number
}

const QUESTION_ID = /^Q\d{2}$/

// Coerce whatever the agent or the review form sent into a clean list:
// unknown roles and malformed ids are dropped, duplicates by question keep
// the first, and at most six survive (a paper that bears on more than six of
// fifteen questions has been read too generously).
export function normalizeRegistrations(input: unknown): QuestionRegistration[] {
  if (!Array.isArray(input)) return []
  const seen = new Set<string>()
  const out: QuestionRegistration[] = []
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    const id = String(r.question_id ?? '').trim().toUpperCase()
    const role = String(r.role ?? '').trim().toLowerCase()
    const position = String(r.position ?? '').trim()
    if (!QUESTION_ID.test(id) || !position) continue
    if (!(REGISTRATION_ROLES as readonly string[]).includes(role)) continue
    if (seen.has(id)) continue
    seen.add(id)
    const note = typeof r.note === 'string' && r.note.trim() ? r.note.trim() : null
    out.push({ question_id: id, position: position.slice(0, 500), role: role as RegistrationRole, note })
    if (out.length >= 6) break
  }
  return out
}

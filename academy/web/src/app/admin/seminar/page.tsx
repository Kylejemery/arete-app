'use client'

// Academy → Seminar Builder (Seminar Track spec, Part 4).
//
// Build a sem-NNN course from sources: set stance, source works and intent;
// have the Syllabus agent propose units; edit the proposal inline; approve it
// into units and readings; then per unit generate the transcript and the
// questions, review them, and publish. Reads go straight to the seminar
// tables (an admin sees drafts through RLS); every write and every agent run
// goes through /api/admin/seminar/*, which forwards to server/routes/seminar.js.

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import styles from '../admin.module.css'

type Stance = 'aligned' | 'counterposition' | 'mixed'
type Tier = 'auditor' | 'scholar' | 'fellow'
type SourceWork = { author: string; work: string; role: 'primary' | 'counter' | 'secondary' }

interface Course {
  id: string; title: string; subtitle: string | null; description: string | null
  stance: Stance; status: string; tier_required: Tier; source_works: SourceWork[]
  objectives: string[]; intent: string | null
  syllabus_draft: { proposal?: Proposal; notes?: string; abridged?: boolean; proposed_at?: string; searched?: string[] } | null
}
interface ProposalReading {
  source: 'indexed' | 'corpus'; author: string; work: string; role: string
  section_key?: string; section_labels?: string[]; search?: string; locator?: string; reading_guide?: string
}
interface ProposalUnit {
  unit_number: number; title: string; objectives: string[]; key_concepts: string[]
  proctor_brief: string; readings: ProposalReading[]
}
interface Proposal { objectives?: string[]; units: ProposalUnit[] }
interface Unit { id: string; unit_number: number; title: string; status: string; objectives: string[]; key_concepts: string[]; proctor_brief: string | null }
interface Reading { id: string; unit_id: string; position: number; author: string; work: string; locator: string; role: string; access: string; reading_guide: string | null; rag_chunk_ids: string[] }
interface Turn { n: number; speaker: string; text: string; segment: string; cites: { author: string; work: string; locator: string; chunk_id?: string }[] }
interface Flag { n: number; reason: string; cleared: boolean }
interface Transcript {
  id: string; unit_id: string; version: number; is_active: boolean; review_status: string; review_notes: string | null
  word_count: number | null; est_minutes: number | null; turns: Turn[]; audio_status: string
  checks: { ok?: boolean; problems?: { detail: string }[]; fence?: { ran: boolean; flags: Flag[] }; stats?: { student_share: number } }
}
interface Question { id: string; unit_id: string; position: number; type: string; prompt: string; rubric: { reference_answer?: string }; review_status: string }
interface Job { status: string; stage?: string; problems?: { detail: string }[] | string[]; error?: string; version?: number; questions?: number }
interface Sources { corpus: { author: string; work: string; text_type: string; chunks: number; labelled: boolean }[]; research: { id: string; author: string; work: string; indexed: boolean; licence_status: string }[] }

async function api(path: string, method: 'GET' | 'POST' | 'PATCH' = 'GET', body?: unknown) {
  const res = await fetch(`/api/admin/seminar/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

const lines = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean)
const problemText = (p: { detail: string } | string) => (typeof p === 'string' ? p : p.detail)

export default function SeminarBuilderPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sources, setSources] = useState<Sources | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const loadCourses = useCallback(async () => {
    const { data, error: e } = await supabase.from('seminar_courses').select('*').order('id')
    if (e) setError(e.message)
    setCourses((data ?? []) as Course[])
  }, [])

  useEffect(() => {
    loadCourses()
    api('sources').then(r => { if (r.ok) setSources(r.data as Sources); else setError(r.data.error || 'Could not load sources') })
  }, [loadCourses])

  const selected = courses.find(c => c.id === selectedId) ?? null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Seminar Builder</h1>
        <p>Build a Seminar Track course from the works you have gathered: syllabus, readings, a two voice transcript per unit, questions, then publish.</p>
      </div>
      {error && <div className={styles.errorBanner}>{error}</div>}
      {toast && <div className={styles.toast}>{toast}</div>}

      <div className={styles.card}>
        <div className={styles.cardTitleRow}><span className={styles.cardTitle}>Courses</span></div>
        {courses.length === 0 && <p className={styles.muted}>No seminar courses yet.</p>}
        <div className={styles.chipRow}>
          {courses.map(c => (
            <button key={c.id} className={`${styles.chip} ${c.id === selectedId ? styles.chipOn : ''}`} onClick={() => setSelectedId(c.id)}>
              {c.id.toUpperCase()} · {c.title} · {c.status}
            </button>
          ))}
        </div>
        <NewCourse onCreated={async id => { await loadCourses(); setSelectedId(id); flash(`${id} created`) }} onError={setError} />
      </div>

      {selected && (
        <CourseEditor
          key={selected.id}
          course={selected}
          sources={sources}
          reload={loadCourses}
          flash={flash}
          onError={setError}
        />
      )}
    </div>
  )
}

// ── New course ──────────────────────────────────────────────────────────────

function NewCourse({ onCreated, onError }: { onCreated: (id: string) => void; onError: (e: string) => void }) {
  const [id, setId] = useState('sem-801')
  const [title, setTitle] = useState('')
  const [stance, setStance] = useState<Stance>('counterposition')
  const [tier, setTier] = useState<Tier>('scholar')
  const create = async () => {
    const r = await api('courses', 'POST', { id, title, stance, tier_required: tier, source_works: [] })
    if (r.ok) onCreated(id); else onError(r.data.error || (r.data.problems || []).join('; ') || 'Could not create the course')
  }
  return (
    <div className={styles.fieldRow} style={{ marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
      <input className={styles.textInput} style={{ width: 110 }} value={id} onChange={e => setId(e.target.value)} placeholder="sem-801" />
      <input className={styles.textInput} style={{ flex: 1, minWidth: 220 }} value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" />
      <select className={styles.textInput} value={stance} onChange={e => setStance(e.target.value as Stance)}>
        <option value="aligned">aligned</option><option value="counterposition">counterposition</option><option value="mixed">mixed</option>
      </select>
      <select className={styles.textInput} value={tier} onChange={e => setTier(e.target.value as Tier)}>
        <option value="auditor">auditor</option><option value="scholar">scholar</option><option value="fellow">fellow</option>
      </select>
      <button className={styles.primaryBtn} disabled={!/^sem-\d{3}$/.test(id) || !title.trim()} onClick={create}>New course</button>
    </div>
  )
}

// ── Polling an agent run ────────────────────────────────────────────────────

function useJob(jobKey: string, onDone: () => void) {
  const [job, setJob] = useState<Job | null>(null)
  const [polling, setPolling] = useState(false)
  useEffect(() => {
    if (!polling) return
    const t = setInterval(async () => {
      const r = await api(`jobs/${encodeURIComponent(jobKey)}`)
      const j = r.data.job as Job | null
      setJob(j)
      if (j && j.status !== 'running') { setPolling(false); onDone() }
    }, 4000)
    return () => clearInterval(t)
  }, [polling, jobKey, onDone])
  return { job, setJob, start: () => setPolling(true), running: polling }
}

function JobLine({ job }: { job: Job | null }) {
  if (!job) return null
  if (job.status === 'running') return <p className={styles.muted}>Running: {job.stage}…</p>
  if (job.status === 'error') return <p className={styles.errText}>Run failed: {job.error}</p>
  if (job.status === 'failed_verification') {
    return (
      <div className={styles.errorBanner}>
        Failed verification after {String((job as { attempts?: number }).attempts ?? '?')} drafts; nothing was saved.
        <ul>{(job.problems || []).slice(0, 12).map((p, i) => <li key={i}>{problemText(p)}</li>)}</ul>
      </div>
    )
  }
  return (
    <div className={styles.successBanner}>
      Saved{job.version ? ` transcript v${job.version}` : ''}{job.questions !== undefined ? `, ${job.questions} questions` : ''}.
      {Array.isArray(job.problems) && job.problems.length > 0 && <ul>{job.problems.map((p, i) => <li key={i}>{problemText(p)}</li>)}</ul>}
    </div>
  )
}

// ── Course editor ───────────────────────────────────────────────────────────

function CourseEditor({ course, sources, reload, flash, onError }: {
  course: Course; sources: Sources | null; reload: () => Promise<void>; flash: (m: string) => void; onError: (e: string) => void
}) {
  const [form, setForm] = useState({
    title: course.title, subtitle: course.subtitle ?? '', description: course.description ?? '',
    stance: course.stance, tier_required: course.tier_required, intent: course.intent ?? '',
  })
  const [works, setWorks] = useState<SourceWork[]>(course.source_works ?? [])
  const [units, setUnits] = useState<Unit[]>([])
  const [problems, setProblems] = useState<string[]>([])

  const loadUnits = useCallback(async () => {
    const { data } = await supabase.from('seminar_units').select('*').eq('course_id', course.id).order('unit_number')
    setUnits((data ?? []) as Unit[])
  }, [course.id])
  useEffect(() => { loadUnits() }, [loadUnits])

  const save = async (extra: Record<string, unknown> = {}) => {
    const r = await api(`courses/${course.id}`, 'PATCH', { ...form, source_works: works, ...extra })
    if (!r.ok) { onError(r.data.error + (r.data.problems ? `: ${r.data.problems.join('; ')}` : '')); return false }
    setProblems(r.data.problems || [])
    await reload()
    flash('Saved')
    return true
  }

  const syllabusJob = useJob(`course:${course.id}`, useCallback(() => { reload() }, [reload]))
  const propose = async () => {
    if (!(await save())) return
    const r = await api(`courses/${course.id}/syllabus`, 'POST')
    if (r.ok) { syllabusJob.setJob(r.data.job); syllabusJob.start() } else onError(r.data.error)
  }

  const approve = async () => {
    const r = await api(`courses/${course.id}/syllabus/approve`, 'POST')
    if (r.ok) { flash(`${r.data.units} units created`); await reload(); await loadUnits(); setProblems(r.data.searched || []) }
    else setProblems(r.data.problems || [r.data.error])
  }

  const publishCourse = async () => {
    const r = await api(`courses/${course.id}/publish`, 'POST')
    if (r.ok) { flash(`${course.id} is live`); reload() } else onError(r.data.reason || r.data.error)
  }

  const indexed = useMemo(() => (sources?.research ?? []).filter(s => s.indexed), [sources])
  const proposal = course.syllabus_draft?.proposal

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>{course.id.toUpperCase()}: start from sources</span>
          <span className={`${styles.pill} ${course.status === 'published' ? styles.pillOk : styles.pillRunning}`}>{course.status}</span>
        </div>
        <div className={styles.field}><label className={styles.fieldLabel}>Title</label>
          <input className={styles.textInput} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
        <div className={styles.field}><label className={styles.fieldLabel}>Subtitle</label>
          <input className={styles.textInput} value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} /></div>
        <div className={styles.field}><label className={styles.fieldLabel}>Description (catalog)</label>
          <textarea className={styles.bigTextarea} rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
        <div className={styles.fieldRow} style={{ gap: 12 }}>
          <div className={styles.field}><label className={styles.fieldLabel}>Stance</label>
            <select className={styles.textInput} value={form.stance} onChange={e => setForm({ ...form, stance: e.target.value as Stance })}>
              <option value="aligned">aligned</option><option value="counterposition">counterposition</option><option value="mixed">mixed</option>
            </select></div>
          <div className={styles.field}><label className={styles.fieldLabel}>Tier</label>
            <select className={styles.textInput} value={form.tier_required} onChange={e => setForm({ ...form, tier_required: e.target.value as Tier })}>
              <option value="auditor">auditor</option><option value="scholar">scholar</option><option value="fellow">fellow</option>
            </select></div>
        </div>
        <div className={styles.field}><label className={styles.fieldLabel}>Intent (one paragraph)</label>
          <textarea className={styles.bigTextarea} rows={4} value={form.intent} onChange={e => setForm({ ...form, intent: e.target.value })}
            placeholder="I want to understand Chrysippus's modal logic well enough to argue with Bobzien's reading." /></div>

        <div className={styles.sectionLabel}>Source works</div>
        {works.map((w, i) => (
          <div key={i} className={styles.fieldRow} style={{ gap: 8, marginBottom: 6 }}>
            <span style={{ flex: 1 }}>{w.author}, <em>{w.work}</em></span>
            <select className={styles.textInput} value={w.role} onChange={e => setWorks(works.map((x, j) => (j === i ? { ...x, role: e.target.value as SourceWork['role'] } : x)))}>
              <option value="primary">primary</option><option value="counter">counter</option><option value="secondary">secondary</option>
            </select>
            <button className={styles.ghostBtn} onClick={() => setWorks(works.filter((_, j) => j !== i))}>Remove</button>
          </div>
        ))}
        <SourcePicker sources={sources} indexed={indexed} onPick={w => setWorks([...works, w])} />
        <p className={styles.muted} style={{ marginTop: 8 }}>
          A new PDF goes through the corpus pipeline first (staging, review, then canon or counterposition):{' '}
          <Link href="/admin/corpus">Ingestion</Link>. A private full text for a source is stored with scripts/research-sources/add.mjs and indexed by section.
        </p>
        <div className={styles.actions}>
          <button className={styles.ghostBtn} onClick={() => save()}>Save</button>
          {units.length === 0 && (
            <button className={styles.primaryBtn} disabled={syllabusJob.running || works.length === 0} onClick={propose}>
              {syllabusJob.running ? 'Proposing…' : proposal ? 'Propose again' : 'Propose syllabus'}
            </button>
          )}
        </div>
        <JobLine job={syllabusJob.job} />
      </div>

      {proposal && units.length === 0 && (
        <SyllabusEditor
          key={course.syllabus_draft?.proposed_at}
          course={course}
          onSave={async (p, notes) => { await save({ proposal: p, notes }) }}
          onApprove={approve}
          problems={problems}
        />
      )}

      {units.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <span className={styles.cardTitle}>Units ({units.length})</span>
            <button className={styles.primaryBtn} disabled={course.status === 'published'} onClick={publishCourse}>Publish course</button>
          </div>
          {problems.length > 0 && <div className={styles.errorBanner}><ul>{problems.map((p, i) => <li key={i}>{p}</li>)}</ul></div>}
          <p className={styles.muted}>
            A unit opens in the classroom for you as soon as it exists (<Link href={`/dashboard/courses/${course.id}`}>open the course</Link>).
            Members see it once the unit and the course are published.
          </p>
          {units.map(u => <UnitPanel key={u.id} unit={u} reload={loadUnits} flash={flash} onError={onError} />)}
        </div>
      )}
    </>
  )
}

function SourcePicker({ sources, indexed, onPick }: { sources: Sources | null; indexed: Sources['research']; onPick: (w: SourceWork) => void }) {
  const [value, setValue] = useState('')
  if (!sources) return <p className={styles.muted}>Loading sources…</p>
  const options = [
    ...indexed.map(s => ({ k: `r|${s.author}|${s.work}`, label: `${s.author}, ${s.work} (private full text, indexed)` })),
    ...sources.corpus.map(c => ({ k: `c|${c.author}|${c.work}`, label: `${c.author}, ${c.work} (${c.text_type}, ${c.chunks} chunks)` })),
  ]
  return (
    <div className={styles.fieldRow} style={{ gap: 8 }}>
      <select className={styles.textInput} style={{ flex: 1 }} value={value} onChange={e => setValue(e.target.value)}>
        <option value="">Add a work from research_sources or the corpus…</option>
        {options.map(o => <option key={o.k} value={o.k}>{o.label}</option>)}
      </select>
      <button className={styles.ghostBtn} disabled={!value} onClick={() => {
        const [, author, work] = value.split('|')
        onPick({ author, work, role: 'primary' }); setValue('')
      }}>Add</button>
    </div>
  )
}

// ── Syllabus proposal, edited inline ────────────────────────────────────────

function SyllabusEditor({ course, onSave, onApprove, problems }: {
  course: Course; onSave: (p: Proposal, notes: string) => Promise<void>; onApprove: () => void; problems: string[]
}) {
  const [p, setP] = useState<Proposal>(course.syllabus_draft!.proposal!)
  const [notes, setNotes] = useState(course.syllabus_draft?.notes ?? '')
  const setUnit = (i: number, patch: Partial<ProposalUnit>) => setP({ ...p, units: p.units.map((u, j) => (j === i ? { ...u, ...patch } : u)) })
  const setReading = (i: number, k: number, patch: Partial<ProposalReading>) =>
    setUnit(i, { readings: p.units[i].readings.map((r, j) => (j === k ? { ...r, ...patch } : r)) })

  return (
    <div className={styles.card}>
      <div className={styles.cardTitleRow}>
        <span className={styles.cardTitle}>Syllabus proposal ({p.units.length} units)</span>
        <span className={styles.muted}>{course.syllabus_draft?.abridged ? 'Proposed from abridged sources' : 'Proposed from the full text'}</span>
      </div>
      {p.units.map((u, i) => (
        <div key={i} className={styles.gapRow}>
          <div className={styles.fieldRow} style={{ gap: 8 }}>
            <span className={styles.gapTitle}>{u.unit_number}.</span>
            <input className={styles.textInput} style={{ flex: 1 }} value={u.title} onChange={e => setUnit(i, { title: e.target.value })} />
          </div>
          <div className={styles.field}><label className={styles.fieldLabel}>Objectives (one per line)</label>
            <textarea className={styles.bigTextarea} rows={3} value={u.objectives.join('\n')} onChange={e => setUnit(i, { objectives: lines(e.target.value) })} /></div>
          <div className={styles.field}><label className={styles.fieldLabel}>Key concepts (comma separated)</label>
            <input className={styles.textInput} value={u.key_concepts.join(', ')} onChange={e => setUnit(i, { key_concepts: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} /></div>
          <div className={styles.field}><label className={styles.fieldLabel}>Proctor brief</label>
            <textarea className={styles.bigTextarea} rows={3} value={u.proctor_brief} onChange={e => setUnit(i, { proctor_brief: e.target.value })} /></div>
          <div className={styles.sectionLabel}>Readings</div>
          {u.readings.map((r, k) => (
            <div key={k} className={styles.passageRow}>
              <div className={styles.passageHead}>
                <span className={styles.passageSource}>{r.author}, <em>{r.work}</em> · {r.role}</span>
              </div>
              {r.source === 'indexed' ? (
                <div className={styles.fieldRow} style={{ gap: 8 }}>
                  <label className={styles.fieldLabel}>Section</label>
                  <input className={styles.textInput} value={r.section_key ?? ''} onChange={e => setReading(i, k, { section_key: e.target.value })} />
                </div>
              ) : r.section_labels?.length ? (
                <div className={styles.field}><label className={styles.fieldLabel}>Section labels (one per line, exactly as in the corpus)</label>
                  <textarea className={styles.bigTextarea} rows={2} value={r.section_labels.join('\n')} onChange={e => setReading(i, k, { section_labels: lines(e.target.value) })} /></div>
              ) : (
                <div className={styles.fieldRow} style={{ gap: 8 }}>
                  <label className={styles.fieldLabel}>Search</label>
                  <input className={styles.textInput} style={{ flex: 1 }} value={r.search ?? ''} onChange={e => setReading(i, k, { search: e.target.value })} />
                  <label className={styles.fieldLabel}>Locator</label>
                  <input className={styles.textInput} value={r.locator ?? ''} onChange={e => setReading(i, k, { locator: e.target.value })} />
                </div>
              )}
              <div className={styles.field}><label className={styles.fieldLabel}>Reading guide</label>
                <textarea className={styles.bigTextarea} rows={2} value={r.reading_guide ?? ''} onChange={e => setReading(i, k, { reading_guide: e.target.value })} /></div>
            </div>
          ))}
        </div>
      ))}
      <div className={styles.field}><label className={styles.fieldLabel}>Notes for another proposal (optional)</label>
        <textarea className={styles.bigTextarea} rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
      {problems.length > 0 && <div className={styles.errorBanner}><ul>{problems.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
      <div className={styles.actions}>
        <button className={styles.ghostBtn} onClick={() => onSave(p, notes)}>Save edits</button>
        <button className={styles.primaryBtn} onClick={async () => { await onSave(p, notes); onApprove() }}>Approve syllabus</button>
      </div>
    </div>
  )
}

// ── One unit: generate, review, publish ─────────────────────────────────────

function UnitPanel({ unit, reload, flash, onError }: { unit: Unit; reload: () => Promise<void>; flash: (m: string) => void; onError: (e: string) => void }) {
  const [open, setOpen] = useState(false)
  const [readings, setReadings] = useState<Reading[]>([])
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [notes, setNotes] = useState('')
  const [viewing, setViewing] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [r, t, q] = await Promise.all([
      supabase.from('seminar_readings').select('*').eq('unit_id', unit.id).order('position'),
      supabase.from('seminar_transcripts').select('*').eq('unit_id', unit.id).order('version', { ascending: false }),
      supabase.from('seminar_questions').select('*').eq('unit_id', unit.id).order('position'),
    ])
    setReadings((r.data ?? []) as Reading[])
    setTranscripts((t.data ?? []) as Transcript[])
    setQuestions((q.data ?? []) as Question[])
  }, [unit.id])
  useEffect(() => { if (open) load() }, [open, load])

  const job = useJob(unit.id, useCallback(() => { load() }, [load]))
  const generate = async () => {
    const r = await api(`units/${unit.id}/generate`, 'POST', { notes })
    if (r.ok) { job.setJob(r.data.job); job.start() } else onError(r.data.error)
  }
  const act = async (path: string, body?: unknown, okMsg = 'Done') => {
    const r = await api(path, 'POST', body)
    if (r.ok) { flash(okMsg); if (r.status === 202) { job.setJob(r.data.job); job.start() } await load(); await reload() }
    else onError(r.data.reason || r.data.error || 'Failed')
  }
  const saveGuide = async (id: string, reading_guide: string) => {
    const r = await api(`readings/${id}`, 'PATCH', { reading_guide })
    if (r.ok) flash('Guide saved'); else onError(r.data.error + (r.data.problems ? `: ${r.data.problems.join('; ')}` : ''))
  }

  const active = transcripts.find(t => t.is_active)
  const draftQs = questions.filter(q => q.review_status === 'draft')

  return (
    <div className={styles.gapRow}>
      <div className={styles.gapRowMain} style={{ cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <span className={`${styles.pill} ${unit.status === 'published' ? styles.pillOk : styles.pillRunning}`}>{unit.status}</span>
        <span className={styles.gapTitle}>{unit.unit_number}. {unit.title}</span>
        <span className={styles.muted}>{open ? 'Hide' : 'Open'}</span>
      </div>
      {open && (
        <div style={{ marginTop: 10 }}>
          <div className={styles.sectionLabel}>Readings</div>
          {readings.map(r => <ReadingRow key={r.id} reading={r} onSave={saveGuide} />)}

          <div className={styles.sectionLabel}>Generate unit</div>
          <div className={styles.fieldRow} style={{ gap: 8 }}>
            <input className={styles.textInput} style={{ flex: 1 }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes for the draft agent (optional)" />
            <button className={styles.primaryBtn} disabled={job.running} onClick={generate}>{job.running ? 'Generating…' : 'Generate transcript and questions'}</button>
            <button className={styles.ghostBtn} disabled title="Audio is planned (Part 5) and not built yet">Generate audio</button>
          </div>
          <JobLine job={job.job} />

          <div className={styles.sectionLabel}>Transcripts</div>
          {transcripts.length === 0 && <p className={styles.muted}>No transcript yet.</p>}
          {transcripts.map(t => {
            const flags = t.checks?.fence?.flags ?? []
            const open = flags.filter(f => !f.cleared)
            return (
              <div key={t.id} className={styles.passageRow}>
                <div className={styles.passageHead}>
                  <span className={styles.passageSource}>
                    v{t.version} · {t.review_status}{t.is_active ? ' · active' : ''} · {t.word_count} words · about {t.est_minutes} minutes
                    {t.checks?.stats ? ` · Student ${Math.round(t.checks.stats.student_share * 100)}% of turns` : ''}
                    {t.checks?.fence?.ran ? ` · fence: ${open.length} open of ${flags.length}` : ''}
                  </span>
                  <button className={styles.ghostBtn} onClick={() => setViewing(viewing === t.id ? null : t.id)}>{viewing === t.id ? 'Close' : 'Read'}</button>
                </div>
                {t.review_notes && <p className={styles.muted}>Notes: {t.review_notes}</p>}
                {flags.map(f => (
                  <div key={f.n} className={f.cleared ? styles.muted : styles.errText}>
                    Turn {f.n}: {f.reason} {f.cleared ? '(cleared)' : (
                      <button className={styles.ghostBtn} onClick={() => act(`transcripts/${t.id}/flags/${f.n}/clear`, undefined, `Turn ${f.n} cleared`)}>Clear after reading</button>
                    )}
                  </div>
                ))}
                {t.review_status === 'draft' && (
                  <div className={styles.actions}>
                    <button className={styles.primaryBtn} disabled={open.length > 0} onClick={() => act(`transcripts/${t.id}/approve`, undefined, `v${t.version} approved`)}>Approve</button>
                    <button className={styles.ghostBtn} onClick={() => act(`transcripts/${t.id}/reject`, { notes }, 'Rejected')}>Reject with notes</button>
                    <button className={styles.ghostBtn} disabled={!notes.trim() || job.running} onClick={() => act(`transcripts/${t.id}/revise`, { notes }, 'Revision started')}>Revise with notes</button>
                  </div>
                )}
                {viewing === t.id && <TranscriptScript turns={t.turns} />}
              </div>
            )
          })}

          <div className={styles.sectionLabel}>Questions</div>
          {questions.length === 0 && <p className={styles.muted}>No questions yet.</p>}
          {questions.map(q => (
            <div key={q.id} className={styles.passageRow}>
              <div className={styles.passageHead}><span className={styles.passageSource}>{q.position}. {q.type} · {q.review_status}</span></div>
              <p>{q.prompt}</p>
              <p className={styles.muted}>Reference: {q.rubric?.reference_answer}</p>
              {q.review_status === 'draft' && (
                <div className={styles.actions}>
                  <button className={styles.ghostBtn} onClick={() => act(`units/${unit.id}/questions/review`, { approve: [q.id] }, 'Question approved')}>Approve</button>
                  <button className={styles.ghostBtn} onClick={() => act(`units/${unit.id}/questions/review`, { reject: [q.id] }, 'Question rejected')}>Reject</button>
                </div>
              )}
            </div>
          ))}
          {draftQs.length > 1 && (
            <button className={styles.ghostBtn} onClick={() => act(`units/${unit.id}/questions/review`, { approve: draftQs.map(q => q.id) }, 'Questions approved')}>Approve all draft questions</button>
          )}

          <div className={styles.actions}>
            <button className={styles.primaryBtn} disabled={!active || unit.status === 'published'} onClick={() => act(`units/${unit.id}/publish`, undefined, `Unit ${unit.unit_number} published`)}>
              Publish unit
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ReadingRow({ reading, onSave }: { reading: Reading; onSave: (id: string, guide: string) => void }) {
  const [guide, setGuide] = useState(reading.reading_guide ?? '')
  return (
    <div className={styles.passageRow}>
      <div className={styles.passageHead}>
        <span className={styles.passageSource}>{reading.position}. {reading.author}, <em>{reading.work}</em>, {reading.locator} · {reading.role} · {reading.access} · {reading.rag_chunk_ids.length} chunks</span>
      </div>
      <div className={styles.fieldRow} style={{ gap: 8 }}>
        <textarea className={styles.bigTextarea} rows={2} value={guide} onChange={e => setGuide(e.target.value)} />
        <button className={styles.ghostBtn} onClick={() => onSave(reading.id, guide)}>Save guide</button>
      </div>
    </div>
  )
}

function TranscriptScript({ turns }: { turns: Turn[] }) {
  return (
    <div className={styles.prose} style={{ marginTop: 8 }}>
      {turns.map(t => (
        <p key={t.n}>
          <span className={styles.muted}>{t.n} · {t.segment}</span><br />
          <strong>{t.speaker === 'tutor' ? 'Tutor' : 'Student'}:</strong> {t.text}
          {t.cites.length > 0 && <span className={styles.muted}> [{t.cites.map(c => `${c.author}, ${c.work} ${c.locator}`).join('; ')}]</span>}
        </p>
      ))}
    </div>
  )
}

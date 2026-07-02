'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import styles from '../admin.module.css'

type Dream = {
  id: string
  dream_week: string | null
  dream_type: 'aphorism' | 'thought_experiment' | 'proposition' | 'meditation'
  content: string
  title: string | null
  seed_authors: string[] | null
  seed_summary: string | null
  tension_id: string | null
  inquiry_id: string | null
  self_assessment: string | null
  fidelity_note: string | null
  status: 'pending_review' | 'approved' | 'rejected' | 'starred'
  review_notes: string | null
  reviewed_at: string | null
  observatory_visible: boolean
  model_used: string | null
  generated_at: string | null
}

const TYPE_LABEL: Record<string, string> = {
  aphorism: 'aphorism',
  thought_experiment: 'thought experiment',
  proposition: 'proposition',
  meditation: 'meditation',
}
const STATUS_PILL: Record<string, string> = {
  pending_review: styles.pillRunning,
  approved: styles.pillOk,
  starred: styles.pillOk,
  rejected: styles.pillFailed,
}

// Crude verdict from the agent's self-assessment text — mirrors the agent's
// own log-line heuristic. The full text is the real review signal.
function verdict(text: string | null): 'alive' | 'hollow' | 'uncertain' {
  const t = (text || '').toLowerCase()
  const hollow = /\bhollow\b|\bfails\b|\bempty\b|\bsays nothing\b/.test(t)
  const alive = /\balive\b|\bgenuine\b|\bearns\b|\bholds\b/.test(t)
  if (hollow && !alive) return 'hollow'
  if (alive && !hollow) return 'alive'
  return 'uncertain'
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function DreamsPage() {
  const [pending, setPending] = useState<Dream[]>([])
  const [journal, setJournal] = useState<Dream[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const [provenanceOpen, setProvenanceOpen] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [runMsg, setRunMsg] = useState('')

  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [verdictFilter, setVerdictFilter] = useState('all')
  const [showJournal, setShowJournal] = useState(true)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/dreams', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load dreams')
      setPending(json.pending || [])
      setJournal(json.journal || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function runNow() {
    setRunning(true)
    setRunMsg('')
    try {
      const res = await fetch('/api/admin/dreams/run', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to start the agent')
      setRunMsg('✓ The corpus is dreaming on the server — four dreams, a couple of minutes. They land here as pending review; hollow ones are stored too.')
      setTimeout(() => load(), 60000)
      setTimeout(() => load(), 150000)
    } catch (e) {
      setRunMsg(e instanceof Error ? e.message : 'Failed to start the agent')
    }
    setRunning(false)
  }

  function toggleProvenance(id: string) {
    setProvenanceOpen(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function patch(id: string, body: Record<string, unknown>): Promise<Dream> {
    const res = await fetch(`/api/admin/dreams/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Update failed')
    return json.dream as Dream
  }

  async function review(d: Dream, status: 'approved' | 'starred' | 'rejected') {
    setBusy(d.id)
    try {
      await patch(d.id, { status, review_notes: notes[d.id] ?? d.review_notes ?? '' })
      if (status === 'approved' || status === 'starred') {
        const makeVisible = window.confirm(
          `${status === 'starred' ? 'Starred' : 'Approved'}. Surface this dream publicly in the Observatory, under "The Corpus Imagines"?\n\n` +
          'OK = show it in the sky (observatory_visible). Cancel = keep it hidden.'
        )
        if (makeVisible) await patch(d.id, { observatory_visible: true })
        showToast(makeVisible ? `${status === 'starred' ? 'Starred' : 'Approved'} & surfaced in the Observatory` : `${status === 'starred' ? 'Starred' : 'Approved'} (hidden from Observatory)`)
      } else {
        showToast('Rejected')
      }
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update')
    }
    setBusy(null)
  }

  async function toggleVisible(d: Dream) {
    setBusy(d.id)
    try {
      await patch(d.id, { observatory_visible: !d.observatory_visible })
      showToast(d.observatory_visible ? 'Hidden from Observatory' : 'Now visible in the Observatory')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update visibility')
    }
    setBusy(null)
  }

  const stats = useMemo(() => {
    const total = journal.length
    const reviewed = journal.filter(d => d.status !== 'pending_review')
    const kept = reviewed.filter(d => d.status === 'approved' || d.status === 'starred')
    const starred = journal.filter(d => d.status === 'starred').length
    const rate = reviewed.length > 0 ? Math.round((kept.length / reviewed.length) * 100) : null
    return { total, rate, starred }
  }, [journal])

  const filteredJournal = useMemo(() => journal.filter(d =>
    (typeFilter === 'all' || d.dream_type === typeFilter) &&
    (statusFilter === 'all' || d.status === statusFilter) &&
    (verdictFilter === 'all' || verdict(d.self_assessment) === verdictFilter)
  ), [journal, typeFilter, statusFilter, verdictFilter])

  // The dream itself — typographically distinct from everything else in the
  // admin. Meant to be read slowly.
  function DreamBody({ d, compact }: { d: Dream; compact?: boolean }) {
    return (
      <div style={{ margin: compact ? '10px 0 0' : '18px 0 0', padding: compact ? '14px 18px' : '22px 26px', background: '#FDFBF6', border: '1px solid #E8DFC8', borderRadius: 10 }}>
        {d.title && (
          <div style={{ fontFamily: 'Georgia, serif', fontSize: compact ? 16 : 19, fontWeight: 500, color: '#1a1a1a', marginBottom: 10 }}>{d.title}</div>
        )}
        <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', fontSize: compact ? 15 : 17.5, lineHeight: 1.75, color: '#26221a' }}>
          {d.content}
        </div>
      </div>
    )
  }

  function Provenance({ d }: { d: Dream }) {
    const open = provenanceOpen.has(d.id)
    return (
      <div style={{ marginTop: 12 }}>
        <button className={styles.ghostBtn} style={{ height: 28, padding: '0 10px', fontSize: 11 }} onClick={() => toggleProvenance(d.id)}>
          {open ? 'Hide provenance ↑' : 'What it dreamed from ↓'}
        </button>
        {open && (
          <div style={{ marginTop: 8, fontSize: 13, color: '#555', background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: '10px 12px' }}>
            <div><strong>Seed authors:</strong> {(d.seed_authors || []).join(', ') || '—'}</div>
            {d.seed_summary && <div style={{ marginTop: 4 }}><strong>Held together:</strong> {d.seed_summary}</div>}
            {d.tension_id && <div style={{ marginTop: 4 }}><strong>Seeded from an approved tension</strong> — see the Tensions tab</div>}
            {d.inquiry_id && <div style={{ marginTop: 4 }}><strong>Seeded from an approved inquiry</strong> — see the Inquiry tab</div>}
          </div>
        )}
      </div>
    )
  }

  function Assessment({ d }: { d: Dream }) {
    if (!d.self_assessment && !d.fidelity_note) return null
    const v = verdict(d.self_assessment)
    const vColor = v === 'alive' ? '#2e6b34' : v === 'hollow' ? '#B23535' : '#8a6d1e'
    return (
      <div style={{ marginTop: 12 }}>
        {d.self_assessment && (
          <div style={{ background: '#FBF6EC', border: '1px solid #E8DFC8', borderRadius: 8, padding: '10px 12px' }}>
            <div className={styles.sectionLabel} style={{ marginBottom: 4 }}>
              Self-assessment · <span style={{ color: vColor }}>{v}</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#5a5040', fontStyle: 'italic' }}>{d.self_assessment}</p>
          </div>
        )}
        {d.fidelity_note && (
          <p className={styles.muted} style={{ marginTop: 8 }}>Fidelity — {d.fidelity_note}</p>
        )}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1>Dreaming agent</h1>
            <p>
              The corpus dreams Sundays at 23:30 UTC — after the week settles, before the new cycle. It generates what
              the corpus implies but never stated: aphorisms, thought experiments, propositions, meditations. All of it
              is conjecture, none of it is attributed, none of it ever enters the corpus. This is the strictest gate in
              the system: nothing surfaces anywhere without your per-dream approval. Star the genuinely good ones.
            </p>
          </div>
          <button
            className={styles.primaryBtn}
            onClick={runNow}
            disabled={running}
            style={{ flexShrink: 0 }}
            title="Let the corpus dream now instead of waiting for Sunday night"
          >
            {running ? 'Starting…' : '▶ Dream now'}
          </button>
        </div>
        {runMsg && <p className={styles.muted} style={{ marginTop: 8 }}>{runMsg}</p>}
      </div>

      {error && (
        <div className={styles.card}>
          <p className={styles.errText}>{error}</p>
          <div className={styles.actions}><button className={styles.ghostBtn} onClick={load}>↺ Retry</button></div>
        </div>
      )}

      {loading && pending.length === 0 && <p className={styles.muted}>Loading dreams…</p>}

      {/* ── Pending review ─────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>Pending review ({pending.length})</span>
          <button className={styles.ghostBtn} style={{ height: 30, padding: '0 12px', fontSize: 12 }} onClick={load}>↺ Refresh</button>
        </div>

        {pending.length === 0 ? (
          <p className={styles.muted}>
            Nothing awaiting review. The corpus dreams four times each Sunday night — one aphorism, one thought
            experiment, one proposition, one meditation.
          </p>
        ) : (
          pending.map(d => (
            <div key={d.id} className={styles.gapRow}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span className={`${styles.pill} ${styles.pillRunning}`}>{TYPE_LABEL[d.dream_type]}</span>
                <span className={styles.gapMeta}>week {fmtDate(d.dream_week)} · dreamed {fmtDate(d.generated_at)}</span>
              </div>

              <DreamBody d={d} />
              <Provenance d={d} />
              <Assessment d={d} />

              <div className={styles.sectionLabel} style={{ marginTop: 14 }}>Review notes</div>
              <textarea
                className={styles.summaryArea}
                style={{ minHeight: 70 }}
                placeholder="Optional review notes…"
                value={notes[d.id] ?? d.review_notes ?? ''}
                onChange={e => setNotes(prev => ({ ...prev, [d.id]: e.target.value }))}
              />

              <div className={styles.actions} style={{ justifyContent: 'flex-start', marginTop: 12, flexWrap: 'wrap' }}>
                <button className={styles.scheduleBtn} disabled={busy === d.id} onClick={() => review(d, 'approved')}>
                  {busy === d.id ? 'Working…' : '✓ Approve'}
                </button>
                <button className={styles.ghostBtn} disabled={busy === d.id} onClick={() => review(d, 'starred')}>
                  ★ Star
                </button>
                <button
                  className={styles.ghostBtn}
                  style={{ borderColor: '#B23535', color: '#B23535' }}
                  disabled={busy === d.id}
                  onClick={() => review(d, 'rejected')}
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Dream journal ──────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>Dream journal ({stats.total})</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ height: 30, fontSize: 12, border: '1px solid #ccc', borderRadius: 6, padding: '0 8px' }}>
              <option value="all">All types</option>
              <option value="aphorism">Aphorisms</option>
              <option value="thought_experiment">Thought experiments</option>
              <option value="proposition">Propositions</option>
              <option value="meditation">Meditations</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ height: 30, fontSize: 12, border: '1px solid #ccc', borderRadius: 6, padding: '0 8px' }}>
              <option value="all">All statuses</option>
              <option value="pending_review">Pending</option>
              <option value="approved">Approved</option>
              <option value="starred">Starred</option>
              <option value="rejected">Rejected</option>
            </select>
            <select value={verdictFilter} onChange={e => setVerdictFilter(e.target.value)} style={{ height: 30, fontSize: 12, border: '1px solid #ccc', borderRadius: 6, padding: '0 8px' }}>
              <option value="all">All self-assessments</option>
              <option value="alive">Alive</option>
              <option value="hollow">Hollow</option>
              <option value="uncertain">Uncertain</option>
            </select>
            <button className={styles.ghostBtn} style={{ height: 30, padding: '0 12px', fontSize: 12 }} onClick={() => setShowJournal(s => !s)}>
              {showJournal ? 'Hide ↑' : 'Show ↓'}
            </button>
          </div>
        </div>
        <p className={styles.muted} style={{ marginTop: 4 }}>
          Everything the corpus has imagined, failures included ·
          {stats.rate !== null ? ` ${stats.rate}% of reviewed dreams kept` : ' nothing reviewed yet'} · {stats.starred} starred
        </p>

        {showJournal && (
          filteredJournal.length === 0 ? (
            <p className={styles.muted}>No dreams match these filters.</p>
          ) : (
            filteredJournal.map(d => (
              <div key={d.id} className={styles.gapRow}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  {d.status === 'starred' && <span className={`${styles.pill} ${styles.pillOk}`}>★ starred</span>}
                  <span className={`${styles.pill} ${STATUS_PILL[d.status] ?? ''}`}>{d.status.replace('_', ' ')}</span>
                  <span className={styles.pill}>{TYPE_LABEL[d.dream_type]}</span>
                  <span className={styles.pill}>{verdict(d.self_assessment)}</span>
                  {d.observatory_visible && <span className={`${styles.pill} ${styles.pillOk}`}>in Observatory</span>}
                  <span className={styles.gapMeta}>week {fmtDate(d.dream_week)}</span>
                </div>

                <DreamBody d={d} compact />
                <Provenance d={d} />

                {(d.status === 'approved' || d.status === 'starred') && (
                  <div className={styles.gapActions} style={{ marginTop: 10 }}>
                    <button
                      className={styles.ghostBtn}
                      style={{ height: 30, padding: '0 12px', fontSize: 12 }}
                      disabled={busy === d.id}
                      onClick={() => toggleVisible(d)}
                    >
                      {d.observatory_visible ? '👁 Hide from Observatory' : '👁 Show in Observatory'}
                    </button>
                  </div>
                )}
              </div>
            ))
          )
        )}
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}

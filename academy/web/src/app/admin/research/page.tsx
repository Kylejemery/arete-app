'use client'

import { useCallback, useEffect, useState } from 'react'
import styles from '../admin.module.css'
import {
  LICENCE_LABEL,
  LICENCE_STATUSES,
  MAX_TEXT_BYTES,
  type LicenceStatus,
  type ResearchSource,
} from '@/lib/research-sources/types'

const LICENCE_PILL: Record<LicenceStatus, string> = {
  public_domain: styles.pillOk,
  open_licence_confirmed: styles.pillOk,
  licensed_copy: styles.pillOk,
  unconfirmed: styles.pillFailed,
}

const EMPTY_FORM = {
  author: '',
  work: '',
  volume: '',
  translator: '',
  edition: '',
  edition_year: '',
  source_url: '',
  how_obtained: '',
  licence_status: 'unconfirmed' as LicenceStatus,
  licence_notes: '',
  locator_scheme: '',
  notes: '',
}
type Form = typeof EMPTY_FORM

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

type CheckResult = { verified: boolean; citable: boolean } | { error: string }

export default function ResearchSourcesPage() {
  const [sources, setSources] = useState<ResearchSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const [form, setForm] = useState<Form>(EMPTY_FORM)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const [passages, setPassages] = useState<Record<string, string>>({})
  const [checks, setChecks] = useState<Record<string, CheckResult>>({})
  const [licenceNotes, setLicenceNotes] = useState<Record<string, string>>({})

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 5000)
  }

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/research-sources', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load research sources')
      setSources(json.sources || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function store() {
    const missing = (['author', 'work', 'edition', 'edition_year', 'how_obtained', 'locator_scheme'] as const)
      .filter(k => !form[k].trim())
    if (missing.length) {
      showToast(`Required: ${missing.join(', ').replace(/_/g, ' ')}`)
      return
    }
    if (!file) {
      showToast('Choose a plain-text file')
      return
    }
    if (file.size > MAX_TEXT_BYTES) {
      showToast('Too large to upload here. Use scripts/research-sources/add.mjs')
      return
    }
    setSaving(true)
    try {
      const text = await file.text()
      const res = await fetch('/api/admin/research-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, text }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to store the text')
      setForm(EMPTY_FORM)
      setFile(null)
      showToast(`Stored: ${json.characters.toLocaleString()} characters`)
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to store')
    }
    setSaving(false)
  }

  async function patch(s: ResearchSource, body: Record<string, unknown>, done: string) {
    setBusy(s.id)
    try {
      const res = await fetch(`/api/admin/research-sources/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Update failed')
      setSources(prev => prev.map(x => (x.id === s.id ? json.source : x)))
      setChecks(prev => { const next = { ...prev }; delete next[s.id]; return next })
      showToast(done)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Update failed')
    }
    setBusy(null)
  }

  async function check(s: ResearchSource) {
    const passage = passages[s.id] || ''
    if (!passage.trim()) return
    setBusy(s.id)
    try {
      const res = await fetch(`/api/admin/research-sources/${s.id}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passage }),
      })
      const json = await res.json()
      setChecks(prev => ({ ...prev, [s.id]: res.ok ? json : { error: json.error || 'Check failed' } }))
    } catch (e) {
      setChecks(prev => ({ ...prev, [s.id]: { error: e instanceof Error ? e.message : 'Check failed' } }))
    }
    setBusy(null)
  }

  function checkLine(r: CheckResult) {
    if ('error' in r) return <p className={styles.errText} style={{ marginTop: 6 }}>{r.error}</p>
    if (!r.citable) {
      return (
        <p className={styles.errText} style={{ marginTop: 6 }}>
          Not citable: the source is deprecated or its licence is unconfirmed, so nothing is verified against it.
        </p>
      )
    }
    return r.verified
      ? <p className={styles.muted} style={{ marginTop: 6, color: '#2E7D4F' }}>✓ Verified: the passage is in the text.</p>
      : <p className={styles.errText} style={{ marginTop: 6 }}>✕ Not found. Check the wording against the stored text.</p>
  }

  const live = sources.filter(s => !s.deprecated)
  const deprecated = sources.filter(s => s.deprecated)

  function row(s: ResearchSource) {
    const r = checks[s.id]
    return (
      <div key={s.id} className={styles.gapRow}>
        <div className={styles.gapRowMain}>
          <span className={`${styles.pill} ${LICENCE_PILL[s.licence_status]}`}>{LICENCE_LABEL[s.licence_status]}</span>
          <span className={styles.gapTitle}>
            {s.author}, <em>{s.work}</em>{s.volume ? ` (${s.volume})` : ''}
          </span>
        </div>
        <span className={styles.gapMeta}>
          {s.translator ? `tr. ${s.translator} · ` : ''}{s.edition}, {s.edition_year}
          {' · '}locators: {s.locator_scheme}
          {' · '}obtained: {s.how_obtained}
          {' · '}stored {fmtDate(s.created_at)}
        </span>
        <span className={styles.gapMeta} style={{ fontFamily: 'monospace', fontSize: 11 }}>
          id {s.id} · sha256 {s.sha256.slice(0, 16)}…
        </span>
        {s.source_url && (
          <span className={styles.gapMeta}>
            <a href={s.source_url} target="_blank" rel="noreferrer">{s.source_url}</a>
          </span>
        )}
        {s.licence_notes && <p className={styles.muted} style={{ marginTop: 6 }}>Licence: {s.licence_notes}</p>}
        {s.notes && <p className={styles.muted} style={{ marginTop: 6 }}>{s.notes}</p>}

        {!s.deprecated && (
          <>
            <div className={styles.sectionLabel} style={{ marginTop: 12 }}>Verify a quotation</div>
            <textarea
              className={styles.summaryArea}
              style={{ minHeight: 70 }}
              placeholder="Paste the passage a ledger entry quotes. Whitespace differences are ignored; wording is not."
              value={passages[s.id] || ''}
              onChange={e => setPassages(p => ({ ...p, [s.id]: e.target.value }))}
            />
            {r && checkLine(r)}

            <div className={styles.sectionLabel} style={{ marginTop: 12 }}>Licence</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                className={styles.textInput}
                value={s.licence_status}
                disabled={busy === s.id}
                onChange={e => patch(
                  s,
                  { licence_status: e.target.value, licence_notes: licenceNotes[s.id] ?? s.licence_notes ?? '' },
                  'Licence status updated'
                )}
              >
                {LICENCE_STATUSES.map(l => <option key={l} value={l}>{LICENCE_LABEL[l]}</option>)}
              </select>
              <input
                className={styles.textInput}
                style={{ flex: '1 1 280px' }}
                placeholder="Licence notes: what confirms it"
                value={licenceNotes[s.id] ?? s.licence_notes ?? ''}
                onChange={e => setLicenceNotes(p => ({ ...p, [s.id]: e.target.value }))}
              />
            </div>
          </>
        )}

        <div className={styles.actions} style={{ justifyContent: 'flex-start', marginTop: 12, flexWrap: 'wrap' }}>
          {!s.deprecated && (
            <>
              <button className={styles.scheduleBtn} disabled={busy === s.id || !(passages[s.id] || '').trim()} onClick={() => check(s)}>
                Verify quotation
              </button>
              <button
                className={styles.ghostBtn}
                disabled={busy === s.id || (licenceNotes[s.id] ?? s.licence_notes ?? '') === (s.licence_notes ?? '')}
                onClick={() => patch(s, { licence_notes: licenceNotes[s.id] ?? '' }, 'Licence notes saved')}
              >
                Save licence notes
              </button>
              <button
                className={styles.ghostBtn}
                disabled={busy === s.id}
                style={{ color: '#B23535' }}
                onClick={() => {
                  if (confirm('Deprecate this source? Citations to it will stop verifying. It can be restored.')) {
                    patch(s, { deprecated: true }, 'Deprecated')
                  }
                }}
              >
                Deprecate
              </button>
            </>
          )}
          {s.deprecated && (
            <button className={styles.ghostBtn} disabled={busy === s.id} onClick={() => patch(s, { deprecated: false }, 'Restored')}>
              ↺ Restore
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Research sources</h1>
        <p>
          Full texts kept privately for research, such as a modern translation the Themata ledger needs to quote.
          Nothing here is embedded, retrieved, or shown to any agent or member; a text that should be retrievable
          goes through Ingestion or Papers instead. A ledger entry may cite a stored source by id, locator and a
          short quotation that verifies below. A source whose licence is unconfirmed cannot be cited until the
          licence is settled.
        </p>
      </div>

      {toast && <div className={styles.card} style={{ borderColor: '#c9a84c' }}><p style={{ margin: 0 }}>{toast}</p></div>}
      {error && (
        <div className={styles.card}>
          <p className={styles.errText}>{error}</p>
          <div className={styles.actions}><button className={styles.ghostBtn} onClick={load}>↺ Retry</button></div>
        </div>
      )}

      {/* ── Store a text ───────────────────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>Store a text</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, maxWidth: 760 }}>
          <input className={styles.textInput} placeholder="Author, e.g. Sextus Empiricus" value={form.author} onChange={set('author')} />
          <input className={styles.textInput} placeholder="Work, e.g. Against the Logicians" value={form.work} onChange={set('work')} />
          <input className={styles.textInput} placeholder="Volume (optional)" value={form.volume} onChange={set('volume')} />
          <input className={styles.textInput} placeholder="Translator (optional)" value={form.translator} onChange={set('translator')} />
          <input className={styles.textInput} placeholder="Edition, e.g. Loeb Classical Library 291" value={form.edition} onChange={set('edition')} />
          <input className={styles.textInput} placeholder="Edition year" inputMode="numeric" value={form.edition_year} onChange={set('edition_year')} />
          <input className={styles.textInput} placeholder="Source URL (optional)" value={form.source_url} onChange={set('source_url')} />
          <input className={styles.textInput} placeholder="How obtained, e.g. purchased ebook" value={form.how_obtained} onChange={set('how_obtained')} />
          <input className={styles.textInput} placeholder="Locator scheme, e.g. M book.section" value={form.locator_scheme} onChange={set('locator_scheme')} />
          <select className={styles.textInput} value={form.licence_status} onChange={set('licence_status')}>
            {LICENCE_STATUSES.map(l => <option key={l} value={l}>Licence: {LICENCE_LABEL[l]}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gap: 10, maxWidth: 760, marginTop: 10 }}>
          <input className={styles.textInput} placeholder="Licence notes: what confirms the status (optional)" value={form.licence_notes} onChange={set('licence_notes')} />
          <input className={styles.textInput} placeholder="Notes (optional), e.g. OCR quality, what the text covers" value={form.notes} onChange={set('notes')} />
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
          <label className={styles.ghostBtn} style={{ height: 38, display: 'inline-flex', alignItems: 'center', padding: '0 14px', cursor: 'pointer' }}>
            {file ? `📄 ${file.name.slice(0, 40)}${file.name.length > 40 ? '…' : ''}` : 'Choose text file…'}
            <input
              type="file"
              accept="text/plain,.txt,.md"
              style={{ display: 'none' }}
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <button className={styles.scheduleBtn} onClick={store} disabled={saving}>
            {saving ? 'Storing…' : '＋ Store privately'}
          </button>
        </div>
        <p className={styles.muted} style={{ marginTop: 10 }}>
          Plain UTF-8 text, up to 4 MB; larger files go through <code>scripts/research-sources/add.mjs</code>.
          A text already stored (same contents) is refused. Store only a copy you are entitled to hold, and
          record how: archive.org hosting is not a licence.
        </p>
      </div>

      {loading && sources.length === 0 && <p className={styles.muted}>Loading sources…</p>}

      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>Stored ({live.length})</span>
          <button className={styles.ghostBtn} style={{ height: 30, padding: '0 12px', fontSize: 12 }} onClick={load}>↺ Refresh</button>
        </div>
        {!loading && live.length === 0 && <p className={styles.muted}>No texts stored yet.</p>}
        {live.map(row)}
      </div>

      {deprecated.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardTitleRow}>
            <span className={styles.cardTitle}>Deprecated ({deprecated.length})</span>
          </div>
          {deprecated.map(row)}
        </div>
      )}
    </div>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import styles from '../admin.module.css'

// The Enchiridion tab: pick a member, build their handbook, read it, and
// move print requests along. Everything goes through
// /api/admin/enchiridion/* (a proxy to the Railway server, which owns the
// manuscript logic). Unlike the Longitudinal tab this one is NOT anonymized:
// a book is a book for one person, and proofing it means reading it.

type Roster = {
  id: string
  email: string
  name: string | null
  tier: string
  joined: string
  journal: number
  cabinet: number
  goals: number
  scrolls: number
  written: number
  document: { id: string; title: string; status: string; word_count: number; chapters: number; generated_at: string | null; created_at: string; error: string | null } | null
  request: RequestRow | null
  generating: boolean
}

type RequestRow = {
  id: string
  user_id: string
  document_id: string | null
  format: string
  price_cents: number
  currency: string
  status: string
  notes: string | null
  shipping_name: string | null
  shipping_address: Record<string, string> | null
  payment_ref: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
  email?: string | null
  name?: string | null
  document?: { id: string; title: string; status: string; word_count: number } | null
}

type Format = { label: string; price_cents: number }
// The typesetter's own settings. Absent from the stored config until it is
// saved once, in which case the server's defaults apply.
type PrintConfig = {
  trim_width_in?: number
  trim_height_in?: number
  body_size?: number
  body_leading?: number
  paper_caliper_in?: number
  color_interior?: boolean
  page_multiple?: number
}
type Config = {
  enabled: boolean
  model: string
  price_cents: number
  currency: string
  formats: Record<string, Format>
  min_journal_entries: number
  max_journal_entries: number
  max_cabinet_messages: number
  max_scrolls: number
  corpus_passages_per_chapter: number
  target_words_per_chapter: number
  print?: PrintConfig
}

type Chapter = { key: string; title: string; body: string; sources: { kind: string; id: string; label?: string }[] }
// What the typesetter reports about the physical book: the numbers a printer
// asks for and a price depends on.
type PrintFacts = {
  page_count?: number
  layout_stable?: boolean
  trim_in?: [number, number]
  spine_in?: number
  cover_in?: [number, number]
  paper_caliper_in?: number
  color_interior?: boolean
  error?: string
}
type Document = {
  id: string
  user_id: string
  title: string
  subtitle: string | null
  status: string
  chapters: Chapter[]
  source_counts: Record<string, number>
  corpus_citations: { chunk_id: string; label: string }[]
  word_count: number
  model_used: string | null
  error: string | null
  generated_at: string | null
  created_at: string
}

type Data = {
  roster: Roster[]
  requests: RequestRow[]
  documents: (Omit<Document, 'chapters'> & { chapters: number; email: string | null; name: string | null })[]
  config: Config
  statuses: string[]
  generating: string[]
}

function money(cents: number, currency = 'usd') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
}

function when(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function pillClass(status: string) {
  if (['ready', 'paid', 'shipped', 'delivered'].includes(status)) return styles.pillOk
  if (['generating', 'proofing', 'printing', 'awaiting_payment', 'requested'].includes(status)) return styles.pillRunning
  if (['failed', 'cancelled'].includes(status)) return styles.pillFailed
  return ''
}

// Minimal markdown for the chapter preview: headings, blockquotes, bold and
// italic, paragraphs. The manuscript is plain enough that a real renderer
// would be a dependency for nothing.
function Prose({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/)
  const inline = (s: string) => {
    const parts: React.ReactNode[] = []
    const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*)/g
    let last = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(s))) {
      if (m.index > last) parts.push(s.slice(last, m.index))
      const tok = m[0]
      if (tok.startsWith('**')) parts.push(<strong key={m.index}>{tok.slice(2, -2)}</strong>)
      else parts.push(<em key={m.index}>{tok.slice(1, -1)}</em>)
      last = m.index + tok.length
    }
    if (last < s.length) parts.push(s.slice(last))
    return parts
  }
  return (
    <div className={styles.prose}>
      {blocks.map((b, i) => {
        const t = b.trim()
        if (!t) return null
        if (t.startsWith('## ')) return <h3 key={i}>{inline(t.slice(3))}</h3>
        if (t.startsWith('# ')) return <h2 key={i}>{inline(t.slice(2))}</h2>
        if (t.split('\n').every(l => l.startsWith('>'))) {
          const inner = t.split('\n').map(l => l.replace(/^>\s?/, '')).join('\n')
          return (
            <blockquote key={i}>
              {inner.split(/\n{2,}|\n(?=\S)/).map((p, j) => <p key={j}>{inline(p)}</p>)}
            </blockquote>
          )
        }
        if (t.split('\n').every(l => l.startsWith('- '))) {
          return <ul key={i}>{t.split('\n').map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}</ul>
        }
        return <p key={i}>{inline(t)}</p>
      })}
    </div>
  )
}

export default function EnchiridionPage() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [search, setSearch] = useState('')
  const [onlyWritten, setOnlyWritten] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const [doc, setDoc] = useState<Document | null>(null)
  const [docEmail, setDocEmail] = useState<string | null>(null)
  const [printFacts, setPrintFacts] = useState<PrintFacts | null>(null)
  const [docLoading, setDocLoading] = useState(false)
  const [chapterIdx, setChapterIdx] = useState(0)

  const [cfg, setCfg] = useState<Config | null>(null)
  const [cfgSaving, setCfgSaving] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const res = await fetch('/api/admin/enchiridion', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setData(json)
      setCfg(prev => prev ?? json.config)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openDoc = useCallback(async (id: string) => {
    setDocLoading(true)
    try {
      const res = await fetch(`/api/admin/enchiridion/documents/${id}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load the document')
      setDoc(json.document)
      setDocEmail(json.email)
      setPrintFacts(json.print ?? null)
      setChapterIdx(i => Math.min(i, Math.max(0, (json.document.chapters?.length ?? 1) - 1)))
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to load the document')
    }
    setDocLoading(false)
  }, [])

  // While a manuscript is generating, refresh the open document and the
  // roster every 15s so chapters appear as they land.
  useEffect(() => {
    const generating = doc?.status === 'generating' || (data?.generating.length ?? 0) > 0
    if (!generating) return
    const t = setInterval(() => {
      load()
      if (doc?.status === 'generating') openDoc(doc.id)
    }, 15000)
    return () => clearInterval(t)
  }, [doc, data?.generating.length, load, openDoc])

  const generate = useCallback(async (r: Roster, force = false) => {
    setBusy(r.id)
    setMsg('')
    try {
      const res = await fetch('/api/admin/enchiridion/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: r.id, force, request_id: r.request?.id ?? null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to start')
      setMsg(`Building ${r.name || r.email}'s Enchiridion. One model call per chapter; a full book takes a few minutes.`)
      if (json.document_id) await openDoc(json.document_id)
      await load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to start')
    }
    setBusy(null)
  }, [load, openDoc])

  const patchRequest = useCallback(async (id: string, patch: Record<string, unknown>) => {
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/enchiridion/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update')
      await load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to update')
    }
    setBusy(null)
  }, [load])

  const saveConfig = useCallback(async () => {
    if (!cfg) return
    setCfgSaving(true)
    try {
      const res = await fetch('/api/admin/enchiridion/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save')
      setCfg(json.config)
      setMsg('Pricing and settings saved.')
      await load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to save')
    }
    setCfgSaving(false)
  }, [cfg, load])

  const downloadMarkdown = useCallback(async () => {
    if (!doc) return
    const res = await fetch(`/api/admin/enchiridion/documents/${doc.id}`, { cache: 'no-store' })
    const json = await res.json()
    if (!res.ok || !json.markdown) { setMsg('Could not fetch the markdown'); return }
    const blob = new Blob([json.markdown], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${(doc.title || 'enchiridion').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [doc])

  const roster = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data?.roster ?? []).filter(r => {
      if (onlyWritten && r.written === 0) return false
      if (!q) return true
      return r.email.toLowerCase().includes(q) || (r.name ?? '').toLowerCase().includes(q)
    })
  }, [data, search, onlyWritten])

  const openRequests = (data?.requests ?? []).filter(r => !['delivered', 'cancelled'].includes(r.status))
  const doneRequests = (data?.requests ?? []).filter(r => ['delivered', 'cancelled'].includes(r.status))

  const chapter = doc?.chapters?.[chapterIdx] ?? null

  // The stored config carries no print block until it is saved once, so the
  // fields show the same defaults the typesetter would apply.
  const printCfg: Required<PrintConfig> = {
    trim_width_in: 5,
    trim_height_in: 8,
    body_size: 11,
    body_leading: 15.5,
    paper_caliper_in: 0.0032,
    color_interior: false,
    page_multiple: 4,
    ...(cfg?.print ?? {}),
  }
  const setPrint = (patch: PrintConfig) => {
    if (!cfg) return
    setCfg({ ...cfg, print: { ...printCfg, ...patch } })
  }

  return (
    <div className={styles.page} style={{ maxWidth: 1100 }}>
      <div className={styles.header}>
        <h1>Enchiridion</h1>
        <p>
          A member&rsquo;s own handbook: their journal, Cabinet conversations, goals, intentions and scrolls,
          compiled into chapters and set beside the primary texts. Build one here, read it, then fulfil the print request.
        </p>
        {msg && <p className={styles.muted} style={{ marginTop: 8 }}>{msg}</p>}
      </div>

      {error && (
        <div className={styles.card}>
          <p className={styles.errText}>{error}</p>
          <div className={styles.actions}><button className={styles.ghostBtn} onClick={load}>↺ Retry</button></div>
        </div>
      )}
      {loading && !data && <p className={styles.muted}>Loading members…</p>}

      {data && (
        <>
          {/* ── Print requests ─────────────────────────────────────── */}
          <div className={styles.card}>
            <div className={styles.cardTitleRow}>
              <div className={styles.cardTitle}>Print requests</div>
              <span className={styles.muted}>{openRequests.length} open · {doneRequests.length} closed</span>
            </div>
            {openRequests.length === 0 && <p className={styles.muted}>No open requests. When a member taps Request on the Progress screen it lands here.</p>}
            {openRequests.map(r => (
              <div key={r.id} className={styles.rowItem} style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong>{r.name || r.email || r.user_id.slice(0, 8)}</strong>
                    <span className={`${styles.pill} ${pillClass(r.status)}`}>{r.status.replace('_', ' ')}</span>
                    <span className={styles.muted}>{data.config.formats[r.format]?.label ?? r.format} · {money(r.price_cents, r.currency)} · {when(r.created_at)}</span>
                  </div>
                  {r.notes && <div className={styles.muted} style={{ marginTop: 4 }}>“{r.notes}”</div>}
                  {r.shipping_name && (
                    <div className={styles.muted} style={{ marginTop: 4 }}>
                      Ship to: {r.shipping_name}
                      {r.shipping_address ? `, ${[r.shipping_address.line1, r.shipping_address.line2, r.shipping_address.city, r.shipping_address.state || r.shipping_address.region, r.shipping_address.postal_code, r.shipping_address.country].filter(Boolean).join(', ')}` : ''}
                    </div>
                  )}
                  {r.payment_ref && <div className={styles.muted} style={{ marginTop: 4 }}>Payment: {r.payment_ref}</div>}
                  <div className={styles.muted} style={{ marginTop: 4 }}>
                    Manuscript: {r.document ? (
                      <button className={styles.viewLink} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }} onClick={() => openDoc(r.document!.id)}>
                        {r.document.title} · {r.document.status} · {r.document.word_count.toLocaleString()} words
                      </button>
                    ) : 'none yet'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    className={styles.textInput}
                    style={{ height: 30, fontSize: 12, width: 160 }}
                    value={r.status}
                    disabled={busy === r.id}
                    onChange={e => patchRequest(r.id, { status: e.target.value })}
                  >
                    {data.statuses.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                  <button
                    className={styles.ghostBtn}
                    style={{ height: 30, padding: '0 10px', fontSize: 12 }}
                    disabled={busy === r.id}
                    onClick={() => {
                      const note = window.prompt('Admin note for this request:', r.admin_notes ?? '')
                      if (note !== null) patchRequest(r.id, { admin_notes: note })
                    }}
                  >
                    Note
                  </button>
                </div>
                {r.admin_notes && <div className={styles.muted} style={{ width: '100%', marginTop: 6, fontStyle: 'italic' }}>{r.admin_notes}</div>}
              </div>
            ))}
          </div>

          {/* ── Manuscript viewer ──────────────────────────────────── */}
          {(doc || docLoading) && (
            <div className={styles.card}>
              {docLoading && !doc && <p className={styles.muted}>Loading the manuscript…</p>}
              {doc && (
                <>
                  <div className={styles.cardTitleRow} style={{ alignItems: 'flex-start' }}>
                    <div>
                      <div className={styles.cardTitle} style={{ fontSize: 18, marginBottom: 2 }}>{doc.title}</div>
                      {doc.subtitle && <div className={styles.muted}>{doc.subtitle}</div>}
                      <div className={styles.muted} style={{ marginTop: 4 }}>
                        {docEmail} · <span className={`${styles.pill} ${pillClass(doc.status)}`}>{doc.status}</span>
                        {' '}· {doc.word_count.toLocaleString()} words · {doc.chapters?.length ?? 0} chapters · {doc.model_used ?? '—'} · {when(doc.generated_at ?? doc.created_at)}
                      </div>
                      {doc.error && <div className={styles.errText} style={{ marginTop: 6 }}>{doc.error}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {doc.status === 'ready' && (
                        <>
                          <a
                            className={styles.primaryBtn}
                            style={{ height: 30, padding: '0 12px', fontSize: 12, lineHeight: '30px', textDecoration: 'none', display: 'inline-block' }}
                            href={`/api/admin/enchiridion/documents/${doc.id}/pdf`}
                            title="The typeset interior, ready for a printer"
                          >
                            Interior PDF
                          </a>
                          <a
                            className={styles.ghostBtn}
                            style={{ height: 30, padding: '0 10px', fontSize: 12, lineHeight: '30px', textDecoration: 'none', display: 'inline-block' }}
                            href={`/api/admin/enchiridion/documents/${doc.id}/cover.pdf`}
                            title="Paperback wrap: back, spine and front, with the spine measured from the page count"
                          >
                            Cover wrap
                          </a>
                          <a
                            className={styles.ghostBtn}
                            style={{ height: 30, padding: '0 10px', fontSize: 12, lineHeight: '30px', textDecoration: 'none', display: 'inline-block' }}
                            href={`/api/admin/enchiridion/documents/${doc.id}/cover.pdf?full=0`}
                            title="Front cover only, at trim plus bleed"
                          >
                            Front only
                          </a>
                        </>
                      )}
                      <button className={styles.ghostBtn} style={{ height: 30, padding: '0 10px', fontSize: 12 }} onClick={downloadMarkdown}>.md</button>
                      <button className={styles.ghostBtn} style={{ height: 30, padding: '0 10px', fontSize: 12 }} onClick={() => { setDoc(null); setPrintFacts(null) }}>Close</button>
                    </div>
                  </div>

                  <div className={styles.countRow}>
                    {Object.entries(doc.source_counts || {}).map(([k, v]) => (
                      <span key={k} className={styles.count}><span className={styles.countNum}>{v}</span> {k}</span>
                    ))}
                  </div>

                  {printFacts && (
                    printFacts.error ? (
                      <p className={styles.errText} style={{ marginBottom: 12 }}>
                        This manuscript will not typeset: {printFacts.error}
                      </p>
                    ) : (
                      <div className={styles.countRow} style={{ marginBottom: 14 }}>
                        <span className={styles.count}><span className={styles.countNum}>{printFacts.page_count}</span> printed pages</span>
                        <span className={styles.count}>
                          <span className={styles.countNum}>{printFacts.trim_in?.[0]}&times;{printFacts.trim_in?.[1]}</span> in trim
                        </span>
                        <span className={styles.count}><span className={styles.countNum}>{printFacts.spine_in}</span> in spine</span>
                        <span className={styles.count}>
                          <span className={styles.countNum}>{printFacts.cover_in?.[0]}&times;{printFacts.cover_in?.[1]}</span> in cover wrap
                        </span>
                        <span className={styles.count}>{printFacts.color_interior ? 'colour interior' : 'black interior'}</span>
                        {printFacts.layout_stable === false && (
                          <span className={`${styles.pill} ${styles.pillFailed}`}>contents may be a page out</span>
                        )}
                      </div>
                    )
                  )}

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                    {(doc.chapters ?? []).map((c, i) => (
                      <button
                        key={c.key + i}
                        className={`${styles.chip} ${i === chapterIdx ? styles.chipOn : ''}`}
                        onClick={() => setChapterIdx(i)}
                      >
                        {i + 1}. {c.title}
                      </button>
                    ))}
                    {doc.status === 'generating' && <span className={styles.muted} style={{ alignSelf: 'center' }}>… still writing</span>}
                  </div>

                  {chapter ? (
                    <div className={styles.manuscript}>
                      <h2 className={styles.manuscriptTitle}>{chapter.title}</h2>
                      <Prose text={chapter.body} />
                    </div>
                  ) : (
                    <p className={styles.muted}>{doc.status === 'generating' ? 'The first chapter is on its way.' : 'No chapters.'}</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Members ────────────────────────────────────────────── */}
          <div className={styles.card}>
            <div className={styles.cardTitleRow}>
              <div className={styles.cardTitle}>Members</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <label className={styles.muted} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="checkbox" checked={onlyWritten} onChange={e => setOnlyWritten(e.target.checked)} /> has written
                </label>
                <input
                  className={styles.textInput}
                  style={{ height: 30, fontSize: 12, width: 220 }}
                  placeholder="Search email or name"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
            <table className={styles.sigTable}>
              <thead>
                <tr className={styles.sigTr}>
                  <th className={styles.sigTd}>Member</th>
                  <th className={styles.sigTd}>Journal</th>
                  <th className={styles.sigTd}>Cabinet</th>
                  <th className={styles.sigTd}>Goals</th>
                  <th className={styles.sigTd}>Scrolls</th>
                  <th className={styles.sigTd}>Manuscript</th>
                  <th className={styles.sigTd}></th>
                </tr>
              </thead>
              <tbody>
                {roster.map(r => {
                  const enough = r.written >= data.config.min_journal_entries
                  return (
                    <tr key={r.id} className={styles.sigTr}>
                      <td className={styles.sigTd}>
                        <div>{r.name || <span className={styles.muted}>no name</span>}</div>
                        <div className={styles.muted} style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.email}</div>
                        <div className={styles.muted} style={{ fontSize: 11 }}>{r.tier} · joined {when(r.joined)}{r.request ? ` · request ${r.request.status}` : ''}</div>
                      </td>
                      <td className={styles.sigTd}>{r.journal}</td>
                      <td className={styles.sigTd}>{r.cabinet}</td>
                      <td className={styles.sigTd}>{r.goals}</td>
                      <td className={styles.sigTd}>{r.scrolls}</td>
                      <td className={styles.sigTd}>
                        {r.document ? (
                          <button
                            className={styles.viewLink}
                            style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }}
                            onClick={() => openDoc(r.document!.id)}
                          >
                            <span className={`${styles.pill} ${pillClass(r.generating ? 'generating' : r.document.status)}`}>{r.generating ? 'generating' : r.document.status}</span>
                            {' '}{r.document.word_count.toLocaleString()} w · {r.document.chapters} ch · {when(r.document.generated_at ?? r.document.created_at)}
                          </button>
                        ) : <span className={styles.muted}>—</span>}
                      </td>
                      <td className={styles.sigTd} style={{ whiteSpace: 'nowrap' }}>
                        <button
                          className={styles.primaryBtn}
                          style={{ height: 28, padding: '0 10px', fontSize: 12 }}
                          disabled={busy === r.id || r.generating}
                          title={enough ? 'Build a fresh manuscript from everything this member has written' : `Fewer than ${data.config.min_journal_entries} entries; build anyway`}
                          onClick={() => generate(r, !enough)}
                        >
                          {r.generating ? 'Building…' : (r.document ? 'Rebuild' : 'Build')}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {roster.length === 0 && <p className={styles.muted} style={{ marginTop: 10 }}>No members match.</p>}
          </div>

          {/* ── Pricing and settings ───────────────────────────────── */}
          {cfg && (
            <div className={styles.card}>
              <div className={styles.cardTitleRow}>
                <div className={styles.cardTitle}>Pricing and settings</div>
                <label className={styles.muted} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="checkbox" checked={cfg.enabled} onChange={e => setCfg({ ...cfg, enabled: e.target.checked })} /> offered in the app
                </label>
              </div>
              <div className={styles.fieldRow}>
                {(['hardcover', 'softcover', 'journal'] as const).map(key => (
                  <div key={key} className={styles.field}>
                    <label className={styles.fieldLabel}>{cfg.formats[key]?.label ?? key} (cents)</label>
                    <input
                      className={styles.textInput}
                      type="number"
                      min={0}
                      step={100}
                      value={cfg.formats[key]?.price_cents ?? 0}
                      onChange={e => setCfg({
                        ...cfg,
                        formats: { ...cfg.formats, [key]: { label: cfg.formats[key]?.label ?? key, price_cents: parseInt(e.target.value || '0', 10) } },
                      })}
                    />
                    <div className={styles.muted}>{money(cfg.formats[key]?.price_cents ?? 0, cfg.currency)}</div>
                  </div>
                ))}
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Model</label>
                  <input className={styles.textInput} value={cfg.model} onChange={e => setCfg({ ...cfg, model: e.target.value })} />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Minimum entries to offer</label>
                  <input className={styles.textInput} type="number" min={0} value={cfg.min_journal_entries} onChange={e => setCfg({ ...cfg, min_journal_entries: parseInt(e.target.value || '0', 10) })} />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Corpus passages per chapter</label>
                  <input className={styles.textInput} type="number" min={0} value={cfg.corpus_passages_per_chapter} onChange={e => setCfg({ ...cfg, corpus_passages_per_chapter: parseInt(e.target.value || '0', 10) })} />
                </div>
              </div>

              <div className={styles.sectionLabel} style={{ marginTop: 18 }}>The printed book</div>
              <p className={styles.muted} style={{ marginTop: -4, marginBottom: 10 }}>
                Trim is the finished page size. The caliper is inches of spine per page, which decides the cover width,
                so check it against your printer before ordering one. A colour interior costs several times more per copy.
              </p>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Trim width (in)</label>
                  <input className={styles.textInput} type="number" step={0.25} min={3} max={9}
                    value={printCfg.trim_width_in}
                    onChange={e => setPrint({ trim_width_in: parseFloat(e.target.value || '0') })} />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Trim height (in)</label>
                  <input className={styles.textInput} type="number" step={0.25} min={5} max={12}
                    value={printCfg.trim_height_in}
                    onChange={e => setPrint({ trim_height_in: parseFloat(e.target.value || '0') })} />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Body size (pt)</label>
                  <input className={styles.textInput} type="number" step={0.5} min={8} max={16}
                    value={printCfg.body_size}
                    onChange={e => setPrint({ body_size: parseFloat(e.target.value || '0') })} />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Leading (pt)</label>
                  <input className={styles.textInput} type="number" step={0.5} min={9} max={26}
                    value={printCfg.body_leading}
                    onChange={e => setPrint({ body_leading: parseFloat(e.target.value || '0') })} />
                </div>
              </div>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Paper caliper (in per page)</label>
                  <input className={styles.textInput} type="number" step={0.0001} min={0.0015} max={0.008}
                    value={printCfg.paper_caliper_in}
                    onChange={e => setPrint({ paper_caliper_in: parseFloat(e.target.value || '0') })} />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Pad page count to</label>
                  <select className={styles.textInput} value={printCfg.page_multiple}
                    onChange={e => setPrint({ page_multiple: parseInt(e.target.value, 10) })}>
                    <option value={4}>a multiple of four</option>
                    <option value={2}>a multiple of two</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Interior ink</label>
                  <label className={styles.muted} style={{ display: 'flex', gap: 6, alignItems: 'center', height: 38 }}>
                    <input type="checkbox" checked={!!printCfg.color_interior}
                      onChange={e => setPrint({ color_interior: e.target.checked })} />
                    gold rules and headings
                  </label>
                </div>
              </div>

              <div className={styles.actions}>
                <button className={styles.primaryBtn} disabled={cfgSaving} onClick={saveConfig}>{cfgSaving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          )}

          <div className={styles.actions}>
            <button className={styles.ghostBtn} onClick={load}>↺ Refresh</button>
          </div>
        </>
      )}
    </div>
  )
}

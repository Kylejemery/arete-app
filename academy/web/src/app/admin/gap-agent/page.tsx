'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import styles from '../admin.module.css'

type StructuralGap = {
  author: string
  work: string
  tier: number
  actual_chunks: number
  threshold: number
  deficit: number
  source_type: string
  notes: string | null
  recommended_url: string | null
  severity: 'absent' | 'critical' | 'low'
}

type DemandGap = {
  theme: string
  user_frequency: number
  approved_passages: number
  total_retrieved: number
  coverage_verdict: 'absent' | 'thin'
}

type Rec = {
  author?: string
  work?: string
  theme?: string
  url?: string | null
  source_type?: string
  can_auto_queue?: boolean
  approved?: boolean | null
  queued?: boolean
  priority?: number
}

type Report = {
  report_week: string
  status: string
  structural_gaps: StructuralGap[]
  demand_gaps: DemandGap[]
  recommended_additions: Rec[]
  created_at: string
}

type Passage = {
  id: string
  concept: string
  chunk_id: string
  author: string
  work: string
  chunk_text: string
  similarity_score: number | null
  approved: boolean | null
  triage_verdict: 'strong' | 'partial' | 'off_topic' | null
  triage_note: string | null
}

// Advisory sort: argued-strong first, then partial, then untriaged, with
// off-topic sinking to the bottom; similarity breaks ties within a band.
const VERDICT_RANK: Record<string, number> = { strong: 0, partial: 1, off_topic: 3 }
const VERDICT_LABEL: Record<string, string> = { strong: 'strong', partial: 'partial', off_topic: 'off-topic' }
function sortPassages(list: Passage[]): Passage[] {
  return [...list].sort((a, b) =>
    (VERDICT_RANK[a.triage_verdict ?? ''] ?? 2) - (VERDICT_RANK[b.triage_verdict ?? ''] ?? 2) ||
    (b.similarity_score || 0) - (a.similarity_score || 0)
  )
}

type SigRow = {
  author: string
  work: string
  tier: number
  threshold: number
  actual: number
  coverage: number
  state: 'green' | 'yellow' | 'red'
  source_type: string
}

const SEV_PILL: Record<string, string> = {
  absent: styles.pillFailed,
  critical: styles.pillFailed,
  low: styles.pillRunning,
}

export default function GapAgentPage() {
  const [report, setReport] = useState<Report | null>(null)
  const [passagesByConcept, setPassagesByConcept] = useState<Record<string, Passage[]>>({})
  const [sigRows, setSigRows] = useState<SigRow[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [triaging, setTriaging] = useState<Set<string>>(new Set())
  const [fullText, setFullText] = useState<Set<string>>(new Set())
  const [queuing, setQueuing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [urlForm, setUrlForm] = useState({ author: '', work: '', url: '' })
  const [queuingUrl, setQueuingUrl] = useState(false)
  const [toast, setToast] = useState('')
  const [pdfForm, setPdfForm] = useState({ author: '', work: '', section: '' })
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfText, setPdfText] = useState('')
  // Per-page text, retained so summary mode can cut the work into page-labelled
  // sections. Verbatim mode only needs the joined pdfText.
  const [pdfPages, setPdfPages] = useState<string[]>([])
  const [pdfMode, setPdfMode] = useState<'verbatim' | 'summary'>('verbatim')
  const [pdfPublicDomain, setPdfPublicDomain] = useState(false)
  const [pdfBusy, setPdfBusy] = useState<'extracting' | 'ingesting' | null>(null)
  const [pdfMsg, setPdfMsg] = useState('')
  const [pdfProgress, setPdfProgress] = useState<{ done: number; total: number } | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/gap-agent', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load gap report')
      setReport(json.report)
      setPassagesByConcept(json.passagesByConcept || {})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }
    setLoading(false)
  }, [])

  const loadSigMap = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/gap-agent/significance-map', { cache: 'no-store' })
      const json = await res.json()
      if (res.ok) setSigRows(json.rows || [])
    } catch {
      // non-critical
    }
  }, [])

  const runNow = useCallback(async () => {
    setRunning(true)
    try {
      const res = await fetch('/api/admin/gap-agent/run', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Run failed')
      showToast(
        `Run complete — ${json.structuralGaps} structural, ${json.demandGaps} demand gaps` +
        (json.demandTruncated ? ' (demand partial — time budget)' : '')
      )
      await Promise.all([load(), loadSigMap()])
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Run failed')
    }
    setRunning(false)
  }, [load, loadSigMap])

  useEffect(() => { load(); loadSigMap() }, [load, loadSigMap])

  // Prefill the URL form from a structural-gap row that has no auto-queue URL.
  function prefillQueueUrl(author: string, work: string) {
    setUrlForm(f => ({ ...f, author, work }))
    showToast(`Filled "${author} / ${work}" — paste a plain-text URL in the form above`)
  }

  async function submitUrl() {
    if (!urlForm.author.trim() || !urlForm.work.trim() || !urlForm.url.trim()) {
      showToast('Author, work and URL are all required')
      return
    }
    setQueuingUrl(true)
    try {
      const res = await fetch('/api/admin/gap-agent/queue-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: urlForm.author, work: urlForm.work, sourceUrl: urlForm.url }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to queue')
      showToast(`Queued — the nightly Corpus Agent will fetch ${json.queuedUrl}`)
      setUrlForm({ author: '', work: '', url: '' })
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to queue')
    }
    setQueuingUrl(false)
  }

  // ── PDF ingestion ─────────────────────────────────────────────────
  // Text extraction happens in the browser (pdfjs) so there is no upload
  // limit; only the extracted text travels to the existing ingest endpoint.
  //
  // Two modes. VERBATIM (public-domain works) posts the whole extracted text
  // straight through, as before. SUMMARY (in-copyright works) cannot: /summarize
  // is a passage-level tool capped at 2048 output tokens, so handing it a whole
  // book yields a ~1,500-word blur — four chunks for 200 pages, useless for
  // retrieval. Instead the work is cut into ~SECTION_WORDS sections, each
  // summarized and ingested on its own with a page-range label, which also gives
  // the corpus real citations ("pp. 81–94") instead of one book-wide label.

  // Sized so a section is a substantial run of argument but still lands well
  // inside the summarizer's passage-level framing and output cap.
  const SECTION_WORDS = 3500

  type Section = { text: string; startPage: number; endPage: number }

  // Greedily pack whole pages into sections, never splitting a page, so every
  // section maps onto a real page range.
  function buildSections(pages: string[]): Section[] {
    const sections: Section[] = []
    let buf: string[] = []
    let words = 0
    let startPage = 1

    pages.forEach((page, idx) => {
      const pageWords = page.split(/\s+/).filter(Boolean).length
      if (words > 0 && words + pageWords > SECTION_WORDS) {
        sections.push({ text: buf.join('\n\n'), startPage, endPage: idx })
        buf = []
        words = 0
        startPage = idx + 1
      }
      buf.push(page)
      words += pageWords
    })
    if (buf.join('').trim()) {
      sections.push({ text: buf.join('\n\n'), startPage, endPage: pages.length })
    }
    // Pages that extracted to nothing (plates, blanks) can leave an empty section.
    return sections.filter(s => s.text.trim().length > 100)
  }

  // One summarize call. The route streams plain text and returns 200 even when
  // the stream breaks mid-flight, appending a marker instead — so the marker is
  // the only way to tell a truncated summary from a complete one.
  async function summarizeSection(section: Section, label: string): Promise<string> {
    const res = await fetch('/api/corpus-ingest/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: section.text,
        author: pdfForm.author,
        work: pdfForm.work,
        section: label,
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j.error || `Summarization failed (${res.status})`)
    }
    const summary = await res.text()
    if (/\[summarization error:/.test(summary)) {
      throw new Error(summary.slice(summary.indexOf('[summarization error:')).trim())
    }
    if (summary.trim().length < 100) {
      throw new Error('Summarizer returned almost nothing')
    }
    return summary.trim()
  }

  async function extractPdf(file: File) {
    setPdfBusy('extracting')
    setPdfMsg(`Extracting text from ${file.name}…`)
    setPdfText('')
    try {
      const pdfjs = await import('pdfjs-dist')
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString()
      const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
      const parts: string[] = []
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p)
        const content = await page.getTextContent()
        parts.push(content.items.map(it => ('str' in it ? it.str : '')).join(' '))
      }
      const pages = parts.map(p => p.replace(/[ \t]+/g, ' ').trim())
      const text = pages.join('\n\n').trim()
      if (text.length < 200) {
        throw new Error('Extraction produced almost no text — the PDF is likely scanned images. It needs OCR first.')
      }
      setPdfText(text)
      setPdfPages(pages)
      const words = text.split(/\s+/).length
      const sections = buildSections(pages).length
      setPdfMsg(
        `✓ Extracted ${doc.numPages} pages, ~${words.toLocaleString()} words.` +
        ` Summary mode would run ${sections} section${sections === 1 ? '' : 's'}.` +
        (words > 20000
          ? ' ⚠ Large work — verbatim ingestion of this size may time out; summary mode paces itself section by section.'
          : '')
      )
    } catch (e) {
      setPdfMsg(e instanceof Error ? e.message : 'Failed to extract PDF text')
    }
    setPdfBusy(null)
  }

  async function ingestPdf() {
    if (!pdfForm.author.trim() || !pdfForm.work.trim()) {
      setPdfMsg('Author and Work are required')
      return
    }
    if (!pdfText) {
      setPdfMsg('Choose a PDF first — the text preview appears once it extracts')
      return
    }
    if (pdfMode === 'verbatim' && !pdfPublicDomain) {
      setPdfMsg('Confirm the text is public domain (or yours to ingest) first')
      return
    }
    setPdfBusy('ingesting')
    try {
      if (pdfMode === 'verbatim') {
        setPdfMsg('Ingesting — chunking, embedding, and upserting into the corpus. This can take a few minutes for large works…')
        const res = await fetch('/api/corpus-ingest/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: pdfText,
            sourceText: pdfText,
            mode: 'verbatim',
            publicDomainConfirmed: true,
            author: pdfForm.author,
            work: pdfForm.work,
            section: pdfForm.section,
            language: 'en',
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Ingestion failed')
        setPdfMsg(`✓ Ingested ${json.chunksCreated} chunks (${(json.wordCount ?? 0).toLocaleString()} words) — ${json.author} now has ${json.authorChunkCount} chunks in the corpus.`)
      } else {
        await ingestPdfAsSummaries()
      }
      setPdfFile(null)
      setPdfText('')
      setPdfPages([])
      setPdfForm({ author: '', work: '', section: '' })
      setPdfPublicDomain(false)
      await Promise.all([load(), loadSigMap()])
    } catch (e) {
      setPdfMsg(e instanceof Error ? e.message : 'Ingestion failed')
    }
    setPdfBusy(null)
    setPdfProgress(null)
  }

  // Summary mode: summarize → ingest, one section at a time. Sequential rather
  // than parallel so a 26-section book doesn't fire 26 concurrent Claude calls.
  //
  // Each section commits on its own, and ingestText() offsets new chunks past
  // the work's existing max chunk_index, so sections append cleanly and a run
  // that dies partway leaves everything before the failure intact. On failure we
  // stop rather than grind through the remaining sections — the usual causes
  // (expired key, quota) would fail all of them anyway — and report the last
  // page committed so the run can be resumed from a trimmed PDF.
  async function ingestPdfAsSummaries() {
    const sections = buildSections(pdfPages)
    if (sections.length === 0) throw new Error('No sections to ingest')

    let chunksTotal = 0
    let lastPage = 0

    for (let i = 0; i < sections.length; i++) {
      const s = sections[i]
      const pageLabel = s.startPage === s.endPage ? `p. ${s.startPage}` : `pp. ${s.startPage}–${s.endPage}`
      setPdfProgress({ done: i, total: sections.length })
      setPdfMsg(`Section ${i + 1} of ${sections.length} (${pageLabel}) — summarizing…`)

      try {
        const summary = await summarizeSection(s, [pdfForm.section.trim(), pageLabel].filter(Boolean).join(', '))

        setPdfMsg(`Section ${i + 1} of ${sections.length} (${pageLabel}) — embedding…`)
        const res = await fetch('/api/corpus-ingest/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: summary,          // the summary is what gets embedded
            sourceText: s.text,     // original goes to corpus_sources (admin-only)
            mode: 'summary',
            // Keeps the work off the Reading Room shelf while leaving it
            // retrievable and listed in the counselor source catalog.
            textType: 'paper_summary',
            author: pdfForm.author,
            work: pdfForm.work,
            section: pdfForm.section,
            pages: pageLabel,
            language: 'en',
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Ingestion failed')
        chunksTotal += json.chunksCreated ?? 0
        lastPage = s.endPage
      } catch (e) {
        const why = e instanceof Error ? e.message : 'failed'
        throw new Error(
          `Stopped at section ${i + 1}/${sections.length} (${pageLabel}): ${why}. ` +
          (lastPage > 0
            ? `Pages 1–${lastPage} are ingested (${chunksTotal} chunks) — resume by re-uploading the PDF from page ${lastPage + 1}.`
            : 'Nothing was ingested.')
        )
      }
    }

    setPdfProgress({ done: sections.length, total: sections.length })
    setPdfMsg(
      `✓ Ingested ${sections.length} sections as summaries — ${chunksTotal} chunks. ` +
      `Original text is in corpus_sources (admin-only); only the summaries are in rag_corpus. ` +
      `Off the Reading Room shelf automatically — no further step needed.`
    )
  }

  // Prefill the PDF form from a structural-gap row (e.g. summary-only works
  // that can't be queued by URL).
  function prefillPdf(author: string, work: string) {
    setPdfForm(f => ({ ...f, author, work }))
    showToast(`Filled "${author} / ${work}" in the PDF form — choose the file`)
  }

  // Map recommendations by author|||work so structural rows know their queue state.
  const recByKey = new Map<string, Rec>()
  for (const r of report?.recommended_additions ?? []) {
    if (r.author && r.work) recByKey.set(`${r.author}|||${r.work}`, r)
  }

  async function queueAddition(g: StructuralGap) {
    if (!report) return
    const key = `${g.author}|||${g.work}`
    setQueuing(key)
    try {
      const res = await fetch('/api/admin/gap-agent/queue-addition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportWeek: report.report_week, author: g.author, work: g.work }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to queue')
      // Reflect queued state locally.
      setReport(prev => prev ? {
        ...prev,
        recommended_additions: prev.recommended_additions.map(r =>
          r.author === g.author && r.work === g.work ? { ...r, approved: true, queued: true } : r
        ),
      } : prev)
      showToast(json.alreadyQueued ? 'Already in queue' : `Queued ${g.author} — ${g.work}`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to queue')
    }
    setQueuing(null)
  }

  async function setApproval(p: Passage, approved: boolean) {
    try {
      const res = await fetch(`/api/admin/gap-agent/concept-passage/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Failed')
      }
      setPassagesByConcept(prev => ({
        ...prev,
        [p.concept]: (prev[p.concept] || []).map(x => x.id === p.id ? { ...x, approved } : x),
      }))
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update')
    }
  }

  function toggleExpand(theme: string) {
    const opening = !expanded.has(theme)
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(theme)) next.delete(theme); else next.add(theme)
      return next
    })
    // Opening a theme with unreviewed, untriaged candidates fires the
    // advisory triage pass — verdicts and bridge lines land in a few seconds.
    if (opening && (passagesByConcept[theme] || []).some(p => p.approved === null && !p.triage_verdict)) {
      triageTheme(theme)
    }
  }

  async function triageTheme(theme: string) {
    setTriaging(prev => new Set(prev).add(theme))
    try {
      const res = await fetch('/api/admin/gap-agent/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Triage failed')
      // Refresh passages quietly — no full-page loading flash.
      const r = await fetch('/api/admin/gap-agent', { cache: 'no-store' })
      const j = await r.json()
      if (r.ok) setPassagesByConcept(j.passagesByConcept || {})
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Triage failed')
    }
    setTriaging(prev => { const next = new Set(prev); next.delete(theme); return next })
  }

  function togglePassageText(id: string) {
    setFullText(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div className={styles.header} style={{ marginBottom: 0 }}>
          <h1>Coverage Gap agent</h1>
          <p>Weekly structural + demand gap detection, with passage-level approval that trains future runs.</p>
        </div>
        <button className={styles.primaryBtn} onClick={runNow} disabled={running}>
          {running ? 'Running…' : '▶ Run now'}
        </button>
      </div>
      {running && (
        <p className={styles.muted} style={{ marginBottom: '1rem' }}>
          Running the agent (structural is fast; demand-gap embeddings can take ~20–40s)…
        </p>
      )}

      {error && (
        <div className={styles.card}>
          <p className={styles.errText}>{error}</p>
          <div className={styles.actions}><button className={styles.ghostBtn} onClick={load}>↺ Retry</button></div>
        </div>
      )}

      {loading && !report && <p className={styles.muted}>Loading gap report…</p>}

      {!loading && !report && !error && (
        <div className={styles.card}>
          <p className={styles.muted}>
            No gap report yet. The agent writes one each Monday at 5:00 AM ET — or run{' '}
            <code>node server/coverage-gap-agent.js</code> manually.
          </p>
        </div>
      )}

      {/* ── Queue a public-domain source by URL ────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Queue a source by URL</div>
        <p className={styles.muted} style={{ marginBottom: 12 }}>
          Adds a public-domain <strong>plain-text</strong> source to the ingestion queue; the nightly
          Corpus Agent fetches it, strips Gutenberg boilerplate, chunks and embeds it into the corpus.
          Use the Gutenberg <code>.txt</code> link (e.g. <code>…/cache/epub/8438/pg8438.txt</code>) —
          an <code>/ebooks/N</code> link is auto-converted, but HTML pages and Wikisource are rejected.
          Author/Work must match the significance-map names for the gap to clear.
        </p>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Author</label>
            <input
              className={styles.textInput}
              value={urlForm.author}
              onChange={e => setUrlForm(f => ({ ...f, author: e.target.value }))}
              placeholder="Aristotle"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Work</label>
            <input
              className={styles.textInput}
              value={urlForm.work}
              onChange={e => setUrlForm(f => ({ ...f, work: e.target.value }))}
              placeholder="Nicomachean Ethics"
            />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Source URL (plain text)</label>
          <input
            className={styles.textInput}
            value={urlForm.url}
            onChange={e => setUrlForm(f => ({ ...f, url: e.target.value }))}
            placeholder="https://www.gutenberg.org/cache/epub/8438/pg8438.txt"
          />
        </div>
        <div className={styles.actions}>
          <button className={styles.scheduleBtn} onClick={submitUrl} disabled={queuingUrl}>
            {queuingUrl ? 'Queuing…' : '+ Add to ingestion queue'}
          </button>
        </div>
      </div>

      {/* ── Ingest a PDF directly into the corpus ──────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Ingest a PDF</div>
        <p className={styles.muted} style={{ marginBottom: 12 }}>
          For works that only exist as PDFs (no plain-text URL). The text is extracted in your
          browser, then chunked, embedded, and upserted into the corpus — same pipeline as the
          paste box on the Corpus page, in either verbatim or summary mode. Scanned/image PDFs
          need OCR first. Author/Work must match the significance-map names for a gap to clear.
        </p>
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Author</label>
            <input
              className={styles.textInput}
              value={pdfForm.author}
              onChange={e => setPdfForm(f => ({ ...f, author: e.target.value }))}
              placeholder="Michel de Montaigne"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Work</label>
            <input
              className={styles.textInput}
              value={pdfForm.work}
              onChange={e => setPdfForm(f => ({ ...f, work: e.target.value }))}
              placeholder="Essays"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Section (optional)</label>
            <input
              className={styles.textInput}
              value={pdfForm.section}
              onChange={e => setPdfForm(f => ({ ...f, section: e.target.value }))}
              placeholder="Book I"
            />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>PDF file</label>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={e => {
              const f = e.target.files?.[0] ?? null
              setPdfFile(f)
              if (f) extractPdf(f)
            }}
            disabled={pdfBusy !== null}
          />
        </div>
        {pdfText && (
          <div style={{ margin: '10px 0', background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: '10px 12px', fontSize: 12.5, color: '#555', maxHeight: 120, overflow: 'hidden' }}>
            {pdfText.slice(0, 400)}…
          </div>
        )}
        <div className={styles.field} style={{ margin: '10px 0' }}>
          <label className={styles.fieldLabel}>Ingestion mode</label>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#444', marginTop: 6 }}>
            <input
              type="radio"
              name="pdfMode"
              checked={pdfMode === 'verbatim'}
              onChange={() => setPdfMode('verbatim')}
              disabled={pdfBusy !== null}
              style={{ marginTop: 3 }}
            />
            <span>
              <strong>Verbatim</strong> — the text itself is chunked and embedded, and the work
              appears on the Reading Room shelf. Public-domain works only.
            </span>
          </label>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#444', marginTop: 6 }}>
            <input
              type="radio"
              name="pdfMode"
              checked={pdfMode === 'summary'}
              onChange={() => setPdfMode('summary')}
              disabled={pdfBusy !== null}
              style={{ marginTop: 3 }}
            />
            <span>
              <strong>Summary</strong> — each section is rewritten by Claude and only the summary
              is embedded; the original stays in the admin-only source table. Stays off the
              Reading Room shelf, but stays retrievable and counselors can say they draw on it.
              Use this for in-copyright books. Slower: one pass per section.
            </span>
          </label>
        </div>
        {pdfMode === 'verbatim' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#444', margin: '10px 0' }}>
            <input
              type="checkbox"
              checked={pdfPublicDomain}
              onChange={e => setPdfPublicDomain(e.target.checked)}
            />
            I confirm this text is public domain (or otherwise mine to ingest verbatim)
          </label>
        )}
        {pdfMode === 'summary' && pdfText && (
          <p className={styles.muted} style={{ margin: '10px 0' }}>
            {buildSections(pdfPages).length} sections will be summarized and ingested one at a
            time. Keep this tab open until it finishes — the run is driven from the browser.
          </p>
        )}
        {pdfProgress && (
          <div style={{ margin: '10px 0', height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.round((pdfProgress.done / pdfProgress.total) * 100)}%`,
                background: '#7a6a52',
                transition: 'width 200ms ease',
              }}
            />
          </div>
        )}
        <div className={styles.actions}>
          <button
            className={styles.scheduleBtn}
            onClick={ingestPdf}
            disabled={pdfBusy !== null || !pdfText}
          >
            {pdfBusy === 'ingesting' ? 'Ingesting…' : pdfBusy === 'extracting' ? 'Extracting…' : '⇢ Ingest into corpus'}
          </button>
        </div>
        {pdfMsg && <p className={styles.muted} style={{ marginTop: 8 }}>{pdfMsg}</p>}
        {pdfFile && !pdfText && pdfBusy === null && (
          <p className={styles.errText} style={{ marginTop: 4 }}>No text extracted from {pdfFile.name}.</p>
        )}
      </div>

      {/* ── Section 1: Latest gap report ───────────────────────────── */}
      {report && (
        <>
          <div className={styles.card}>
            <div className={styles.cardTitleRow}>
              <span className={styles.cardTitle}>Week of {report.report_week}</span>
              <span className={`${styles.pill} ${styles.pillRunning}`}>{report.status.replace('_', ' ')}</span>
            </div>

            <div className={styles.sectionLabel}>Structural gaps ({report.structural_gaps.length})</div>
            {report.structural_gaps.length === 0 ? (
              <p className={styles.muted}>No structural gaps — every mapped work meets its threshold.</p>
            ) : (
              report.structural_gaps.map((g, i) => {
                const rec = recByKey.get(`${g.author}|||${g.work}`)
                const queued = rec?.queued === true
                const canQueue = rec?.can_auto_queue === true && !queued
                return (
                  <div key={i} className={styles.gapRow}>
                    <div className={styles.gapRowMain}>
                      <span className={`${styles.pill} ${SEV_PILL[g.severity] || ''}`}>{g.severity}</span>
                      <span className={styles.gapTitle}>Tier {g.tier} · {g.author} / {g.work}</span>
                    </div>
                    <div className={styles.gapMeta}>
                      {g.actual_chunks} / {g.threshold} chunks · {g.source_type.replace('_', ' ')}
                      {g.notes && g.severity !== 'low' ? <span className={styles.muted}> — {g.notes}</span> : null}
                    </div>
                    <div className={styles.gapActions}>
                      {queued ? (
                        <span className={`${styles.pill} ${styles.pillOk}`}>✓ Queued</span>
                      ) : canQueue ? (
                        <button
                          className={styles.scheduleBtn}
                          style={{ height: 30, padding: '0 12px', fontSize: 12 }}
                          disabled={queuing === `${g.author}|||${g.work}`}
                          onClick={() => queueAddition(g)}
                        >
                          {queuing === `${g.author}|||${g.work}` ? 'Queuing…' : '+ Add to Queue'}
                        </button>
                      ) : g.source_type === 'public_domain' ? (
                        <>
                          <button
                            className={styles.ghostBtn}
                            style={{ height: 28, padding: '0 10px', fontSize: 12 }}
                            onClick={() => prefillQueueUrl(g.author, g.work)}
                          >
                            + Queue by URL
                          </button>
                          <button
                            className={styles.ghostBtn}
                            style={{ height: 28, padding: '0 10px', fontSize: 12, marginLeft: 6 }}
                            onClick={() => prefillPdf(g.author, g.work)}
                          >
                            📄 Ingest PDF
                          </button>
                        </>
                      ) : (
                        <button
                          className={styles.ghostBtn}
                          style={{ height: 28, padding: '0 10px', fontSize: 12 }}
                          onClick={() => prefillPdf(g.author, g.work)}
                        >
                          📄 Ingest PDF
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* ── Section 2: Demand gaps + concept-passage approval ─────── */}
          <div className={styles.card}>
            <div className={styles.sectionLabel}>Demand gaps ({report.demand_gaps.length})</div>
            {report.demand_gaps.length === 0 ? (
              <p className={styles.muted}>No demand gaps detected (needs journal_analysis theme data).</p>
            ) : (
              report.demand_gaps.map((d, i) => {
                const passages = passagesByConcept[d.theme] || []
                const reviewed = passages.filter(p => p.approved !== null).length
                const approved = passages.filter(p => p.approved === true).length
                const isOpen = expanded.has(d.theme)
                return (
                  <div key={i} className={styles.demandBlock}>
                    <div className={styles.gapRowMain}>
                      <span className={`${styles.pill} ${d.coverage_verdict === 'absent' ? styles.pillFailed : styles.pillRunning}`}>
                        {d.coverage_verdict}
                      </span>
                      <span className={styles.gapTitle}>&quot;{d.theme}&quot;</span>
                      <span className={styles.muted}>· {d.user_frequency} user sessions</span>
                      <button
                        className={styles.ghostBtn}
                        style={{ height: 28, padding: '0 10px', fontSize: 12, marginLeft: 'auto' }}
                        onClick={() => toggleExpand(d.theme)}
                      >
                        {isOpen ? 'Hide passages ↑' : 'Review passages ↓'}
                      </button>
                    </div>

                    {isOpen && (
                      <div className={styles.passageList}>
                        {passages.length === 0 ? (
                          <p className={styles.muted}>No passages retrieved for this concept.</p>
                        ) : (
                          <>
                            <p className={styles.muted} style={{ marginBottom: 8 }}>
                              Approve passages that genuinely address this theme.
                              {triaging.has(d.theme)
                                ? ' The triage pass is arguing each passage now…'
                                : ' Verdicts and bridge lines are advisory — the call is yours.'}
                            </p>
                            {sortPassages(passages).map(p => (
                              <div key={p.id} className={styles.passageRow} style={p.triage_verdict === 'off_topic' && p.approved === null ? { opacity: 0.55 } : undefined}>
                                <div className={styles.passageHead}>
                                  <span className={styles.passageSource}>{p.author} — {p.work}</span>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {p.triage_verdict && (
                                      <span className={`${styles.pill} ${p.triage_verdict === 'strong' ? styles.pillOk : p.triage_verdict === 'partial' ? styles.pillRunning : styles.pillFailed}`}>
                                        {VERDICT_LABEL[p.triage_verdict]}
                                      </span>
                                    )}
                                    <span className={styles.muted}>
                                      {p.similarity_score != null ? p.similarity_score.toFixed(2) : '—'}
                                    </span>
                                  </span>
                                </div>
                                {p.triage_note && (
                                  <p style={{ margin: '6px 0 4px', fontSize: 13, fontStyle: 'italic', color: '#8a6d1e' }}>
                                    {p.triage_note}
                                  </p>
                                )}
                                <p className={styles.passageText}>
                                  {fullText.has(p.id) || p.chunk_text.length <= 280
                                    ? p.chunk_text
                                    : `${p.chunk_text.slice(0, 280)}…`}
                                  {p.chunk_text.length > 280 && (
                                    <button
                                      className={styles.ghostBtn}
                                      style={{ height: 22, padding: '0 8px', fontSize: 11, marginLeft: 8, verticalAlign: 'baseline' }}
                                      onClick={() => togglePassageText(p.id)}
                                    >
                                      {fullText.has(p.id) ? 'less ↑' : 'read full ↓'}
                                    </button>
                                  )}
                                </p>
                                <div className={styles.passageActions}>
                                  <button
                                    className={`${styles.iconBtn} ${p.approved === true ? styles.iconApproved : ''}`}
                                    style={{ width: 'auto', padding: '0 10px', fontSize: 12 }}
                                    onClick={() => setApproval(p, true)}
                                  >✓ Approve</button>
                                  <button
                                    className={styles.iconBtn}
                                    style={{ width: 'auto', padding: '0 10px', fontSize: 12, color: p.approved === false ? '#B23535' : undefined, borderColor: p.approved === false ? '#B23535' : undefined }}
                                    onClick={() => setApproval(p, false)}
                                  >✗ Reject</button>
                                </div>
                              </div>
                            ))}
                            <div className={styles.tallyRow}>
                              <span className={styles.muted}>Approved: {approved} / {reviewed} reviewed</span>
                              {approved < 2 && (
                                <Link href="/admin/corpus" className={styles.fleetLink} style={{ marginLeft: 12 }}>
                                  Add more sources →
                                </Link>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {/* ── Section 3: Significance map ────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitleRow}>
          <span className={styles.cardTitle}>Significance map</span>
          <button className={styles.ghostBtn} style={{ height: 30, padding: '0 12px', fontSize: 12 }} onClick={loadSigMap}>↺ Refresh</button>
        </div>
        {sigRows.length === 0 ? (
          <p className={styles.muted}>No significance map rows. Seed with <code>node server/data/seed-significance-map.js</code>.</p>
        ) : (
          <table className={styles.sigTable}>
            <thead>
              <tr>
                {['Author', 'Work', 'Tier', 'Chunks', 'Threshold', 'Coverage'].map(h => (
                  <th key={h} className={styles.sectionLabel} style={{ textAlign: 'left', padding: '6px 8px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sigRows.map((r, i) => (
                <tr key={i} className={styles.sigTr}>
                  <td className={styles.sigTd}>{r.author}</td>
                  <td className={styles.sigTd}>{r.work}</td>
                  <td className={styles.sigTd}>{r.tier}</td>
                  <td className={styles.sigTd}>{r.actual}</td>
                  <td className={styles.sigTd}>{r.threshold}</td>
                  <td className={styles.sigTd}>
                    <span className={`${styles.coverageDot} ${styles['cov_' + r.state]}`} />
                    {r.actual === 0 ? 'Absent' : `${r.coverage}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}

'use client'

// The draft pane and the full-page draft workspace are the same component in
// two skins. Compact rides in the right-hand column of the chat; fullscreen
// takes over the viewport so the essay can be read at a real measure with real
// typography. Four tabs: the typeset draft (editable in place, and selectable
// into scoped instructions), this turn's changes, the cold outside read, and
// the sources this turn retrieved.
//
// Everything that says "show me where" resolves to the same highlight range
// vocabulary, so the voice meter, a reviewer's finding, and a retrieved source
// all paint the draft the same way.

import { useEffect, useMemo, useRef, useState } from 'react'
import admin from '../../admin.module.css'
import chat from './chat.module.css'
import styles from './draft.module.css'
import ProseView from './ProseView'
import DiffView from './DiffView'
import SelectionBar from './SelectionBar'
import SourceList from './SourceList'
import { computeVoiceMetrics, type MetricKind } from '@/lib/scribe/voice-metrics'
import {
  containsPhrase,
  proseStats,
  replaceBlockLines,
  type Block,
  type Highlight,
} from '@/lib/scribe/prose'
import { findingPrompt, scopedPrompt, type ScopedAction } from '@/lib/scribe/scoped-turns'
import {
  countHunks,
  describeDecisions,
  diffDraft,
  resolveDiff,
  tallyDecisions,
  type Decision,
} from '@/lib/scribe/diff'
import type { DiffBase, Draft, Review, ReviewFinding, Source } from './types'

export type DraftTab = 'draft' | 'changes' | 'review' | 'sources'

function reviewHasFindings(r: Review | null | undefined): boolean {
  return !!r && (r.not_kyle.length > 0 || r.unearned.length > 0 || r.narrated_over.length > 0 || (r.tells?.length ?? 0) > 0)
}

export interface DraftWorkspaceProps {
  fullscreen: boolean
  onToggleFullscreen: () => void
  tab: DraftTab
  onTabChange: (t: DraftTab) => void
  title: string | null
  draftText: string | null
  /** Candidate comparison points, most useful first; [0] is the default. */
  bases: DiffBase[]
  review: Review | null
  reviewIsSavedFallback: boolean
  /** Stage of the snapshot being viewed, or null while on the working draft. */
  viewingSnapshotStage: string | null
  drafts: Draft[]
  viewedDraftId: string | null
  onViewDraft: (id: string | null) => void
  sources: Source[]
  highlight: Highlight | null
  onHighlight: (h: Highlight | null) => void
  onScopedTurn: (prompt: string) => void
  onNotice: (msg: string) => void
  streaming: boolean
  snapshotting: boolean
  canSnapshot: boolean
  onSnapshot: (stage: 'middle' | 'full') => void
  onFinalize: () => void
  onExport: () => void
  onSaveToLog: () => void
  onApplyRevision: (text: string, summary: string) => Promise<void>
  applying: boolean
}

export default function DraftWorkspace(props: DraftWorkspaceProps) {
  const {
    fullscreen, onToggleFullscreen, tab, onTabChange, title, draftText, bases,
    review, reviewIsSavedFallback, viewingSnapshotStage, drafts, viewedDraftId,
    onViewDraft, sources, highlight, onHighlight, onScopedTurn, onNotice,
    streaming, snapshotting, canSnapshot, onSnapshot, onFinalize,
    onExport, onSaveToLog, onApplyRevision, applying,
  } = props

  const [baseId, setBaseId] = useState<string | null>(bases[0]?.id ?? null)
  const [decisions, setDecisions] = useState<Record<number, Decision>>({})
  const [dismissedFindings, setDismissedFindings] = useState<string[]>([])
  const [scrollNonce, setScrollNonce] = useState(0)
  const proseRef = useRef<HTMLDivElement>(null)

  // Keep the selection valid as the conversation moves under it.
  useEffect(() => {
    setBaseId(prev => (prev && bases.some(b => b.id === prev) ? prev : bases[0]?.id ?? null))
  }, [bases])

  const base = bases.find(b => b.id === baseId) ?? null

  // A new draft or a new comparison point means the old verdicts are stale.
  useEffect(() => { setDecisions({}) }, [draftText, baseId])
  useEffect(() => { setScrollNonce(n => n + 1) }, [highlight])

  const parts = useMemo(
    () => (base && draftText && base.text !== draftText ? diffDraft(base.text, draftText) : []),
    [base, draftText]
  )
  const hunkCount = countHunks(parts)
  const tally = useMemo(() => tallyDecisions(parts, decisions), [parts, decisions])
  const resolved = useMemo(
    () => (parts.length ? resolveDiff(parts, decisions) : null),
    [parts, decisions]
  )
  // What the draft would say if the current decisions were applied. Null while
  // they add up to the draft as it already stands.
  const preview = resolved && resolved !== draftText ? resolved : null
  const shown = preview ?? draftText

  const effTab: DraftTab =
    tab === 'review' && review ? 'review'
    : tab === 'changes' && hunkCount > 0 ? 'changes'
    : tab === 'sources' ? 'sources'
    : 'draft'

  const voiceMetrics = shown ? computeVoiceMetrics(shown) : null
  const stats = shown ? proseStats(shown) : null
  const reviewCount = review
    ? review.not_kyle.length + review.unearned.length + review.narrated_over.length + (review.tells?.length ?? 0)
    : 0

  const canApply =
    tally.total > 0 && !applying && !streaming && (!!preview || tally.unreviewed === 0)

  async function applyDecisions() {
    if (!resolved || !canApply) return
    if (preview) await onApplyRevision(resolved, describeDecisions(parts, decisions))
    else onNotice(`All ${tally.total} changes kept as written — the draft is unchanged.`)
    setDecisions({})
    onTabChange('draft')
  }

  // An in-place block edit commits whatever is pending along with it, so the
  // saved draft is exactly what was on screen when he typed.
  async function editBlock(block: Block, nextSource: string) {
    if (!shown) return
    const next = replaceBlockLines(shown, block, nextSource)
    if (next === draftText) { setDecisions({}); return }
    await onApplyRevision(next, preview ? `${describeDecisions(parts, decisions)}, then edited a passage by hand` : 'edited a passage by hand')
    setDecisions({})
  }

  function runScoped(action: ScopedAction, selection: string, note?: string) {
    onHighlight(null)
    onScopedTurn(scopedPrompt(action, selection, note))
  }

  function focusPhrase(line: string) {
    onHighlight({ kind: 'phrases', phrases: [line] })
    onTabChange('draft')
  }

  function toggleMetric(metric: MetricKind) {
    const on = highlight?.kind === 'metric' && highlight.metric === metric
    onHighlight(on ? null : { kind: 'metric', metric })
    if (!on) onTabChange('draft')
  }

  const tabs = (
    <span className={styles.tabs}>
      <button
        className={`${styles.tab} ${effTab === 'draft' ? styles.tabOn : ''}`}
        onClick={() => onTabChange('draft')}
      >
        {viewingSnapshotStage ? `Snapshot · ${viewingSnapshotStage}` : 'Working draft'}
      </button>
      {hunkCount > 0 && (
        <button
          className={`${styles.tab} ${effTab === 'changes' ? styles.tabOn : ''}`}
          onClick={() => onTabChange('changes')}
          title="What this turn changed — keep, revert, or rewrite each change"
        >
          Changes ({tally.unreviewed ? `${tally.total - tally.unreviewed}/${tally.total}` : tally.total})
        </button>
      )}
      {review && (
        <button
          className={`${styles.tab} ${effTab === 'review' ? styles.tabOn : ''}`}
          onClick={() => onTabChange('review')}
          title="The cold outside read of this draft"
        >
          Outside read{reviewCount ? ` (${reviewCount})` : ''}
        </button>
      )}
      {sources.length > 0 && (
        <button
          className={`${styles.tab} ${effTab === 'sources' ? styles.tabOn : ''}`}
          onClick={() => onTabChange('sources')}
          title="Corpus passages retrieved this turn, and where they landed"
        >
          Sources ({sources.length})
        </button>
      )}
    </span>
  )

  const actions = (
    <span className={styles.headActions}>
      <button className={admin.ghostBtn} onClick={onSaveToLog} disabled={!shown}>Save to log</button>
      <button className={admin.ghostBtn} onClick={onExport} disabled={!shown}>Export</button>
      <button className={admin.ghostBtn} onClick={onToggleFullscreen} title={fullscreen ? 'Back to the conversation' : 'Open the draft full page'}>
        {fullscreen ? 'Close' : 'Expand'}
      </button>
    </span>
  )

  const reviewBody = review && (
    <>
      <div className={styles.reviewMeta}>
        {review.model ? `${review.model} · read the draft cold` : 'outside read'}
        {reviewIsSavedFallback && ' · saved from your last finalize — re-finalize to refresh after edits'}
      </div>
      {review.error ? (
        <p className={chat.draftEmpty}>Outside read unavailable: {review.error}</p>
      ) : !reviewHasFindings(review) ? (
        <p className={chat.draftEmpty}>Nothing flagged — the honest all-clear. What&apos;s left is yours in the retype.</p>
      ) : (
        ([
          ['Reads like AI, not you', review.not_kyle],
          ['Claims not yet earned', review.unearned],
          ['Philosophy narrating over your story', review.narrated_over],
          ['Mechanical AI tells', review.tells ?? []],
        ] as [string, ReviewFinding[]][]).map(([label, items]) => {
          const live = items.filter(f => !dismissedFindings.includes(f.line))
          if (!live.length) return null
          return (
            <div key={label} className={styles.reviewGroup}>
              <div className={styles.reviewGroupLabel}>{label}</div>
              <ul className={styles.reviewList}>
                {live.map((f, i) => {
                  const stillThere = !shown || containsPhrase(shown, f.line)
                  return (
                    <li key={i} className={styles.finding}>
                      <button
                        className={styles.findingQuote}
                        onClick={() => focusPhrase(f.line)}
                        disabled={!stillThere}
                        title={stillThere ? 'Show this line in the draft' : 'This line is no longer in the draft'}
                      >
                        “{f.line}”
                      </button>
                      {f.why ? <span className={styles.reviewWhy}> — {f.why}</span> : null}
                      <span className={styles.findingBtns}>
                        {!stillThere && <span className={styles.findingGone}>already gone</span>}
                        {stillThere && (
                          <button
                            className={styles.hunkBtn}
                            onClick={() => onScopedTurn(findingPrompt(f.line, f.why))}
                            disabled={streaming}
                            title="Send this to Scribe as a scoped fix"
                          >
                            Fix this
                          </button>
                        )}
                        <button
                          className={styles.hunkBtn}
                          onClick={() => setDismissedFindings(d => [...d, f.line])}
                          title="Hide this finding for now"
                        >
                          Dismiss
                        </button>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })
      )}
      {dismissedFindings.length > 0 && (
        <button className={styles.hunkBtn} onClick={() => setDismissedFindings([])}>
          Show {dismissedFindings.length} dismissed
        </button>
      )}
    </>
  )

  const changesBody = (
    <>
      <div className={styles.diffBar}>
        <span className={styles.diffBarLabel}>Compared with</span>
        <select
          className={styles.baseSelect}
          value={baseId ?? ''}
          onChange={e => setBaseId(e.target.value)}
        >
          {bases.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
        </select>
        <span className={styles.diffBarCount}>
          {describeDecisions(parts, decisions)}
        </span>
        {!!preview && (
          <button className={styles.hunkBtn} onClick={() => setDecisions({})}>Discard</button>
        )}
        <button
          className={admin.primaryBtn}
          onClick={applyDecisions}
          disabled={!canApply}
          title={
            canApply
              ? 'Write your resolved version back as the working draft'
              : 'Review the remaining changes, or revert or edit one, to have something to apply'
          }
        >
          {applying ? 'Applying…' : preview ? 'Apply to draft' : 'Mark reviewed'}
        </button>
      </div>
      <DiffView
        parts={parts}
        decisions={decisions}
        onDecide={(id, d) => setDecisions(prev => ({ ...prev, [id]: d }))}
        compact={!fullscreen}
      />
    </>
  )

  const draftBody = shown ? (
    <>
      {preview && (
        <div className={styles.previewBar}>
          <span>Previewing your resolution of {tally.total} changes. Not saved yet.</span>
          <button className={styles.hunkBtn} onClick={() => setDecisions({})}>Discard</button>
          <button className={styles.hunkBtn} onClick={applyDecisions} disabled={!canApply}>
            {applying ? 'Applying…' : 'Apply to draft'}
          </button>
        </div>
      )}
      {highlight && (
        <div className={styles.highlightBar}>
          <span>
            {highlight.kind === 'metric'
              ? `Showing every ${highlight.metric === 'tobe' ? 'to-be verb' : highlight.metric}`
              : 'Showing where that lands in the draft'}
          </span>
          <button className={styles.hunkBtn} onClick={() => onHighlight(null)}>Clear</button>
        </div>
      )}
      <ProseView
        text={shown}
        compact={!fullscreen}
        highlight={highlight}
        scrollKey={scrollNonce}
        onEditBlock={streaming || viewingSnapshotStage ? undefined : editBlock}
      />
    </>
  ) : (
    <p className={chat.draftEmpty}>The working draft appears here as Scribe writes.</p>
  )

  const body =
    effTab === 'review' ? reviewBody
    : effTab === 'changes' ? changesBody
    : effTab === 'sources' ? (
      <SourceList
        sources={sources}
        draftText={shown}
        highlight={highlight}
        onHighlight={h => { onHighlight(h); if (h) onTabChange('draft') }}
        emptyNote="Corpus passages Scribe retrieves each turn land here."
      />
    )
    : draftBody

  const meterChip = (metric: MetricKind, label: string, value: string | number, tone: string, hint: string) => (
    <button
      className={`${styles.meterChip} ${highlight?.kind === 'metric' && highlight.metric === metric ? styles.meterChipOn : ''}`}
      onClick={() => toggleMetric(metric)}
      title={`${hint} Click to show them in the draft.`}
    >
      {label} <strong className={tone}>{value}</strong>
    </button>
  )

  const meter = effTab === 'draft' && voiceMetrics && (
    <div className={styles.meter}>
      <span className={styles.meterLabel}>Voice meter</span>
      <span title="Std-dev of sentence length in words. Higher = more human rhythm variation; flat prose is an AI tell.">
        rhythm{' '}
        <strong className={
          voiceMetrics.burstinessLabel === 'good' ? styles.good
          : voiceMetrics.burstinessLabel === 'ok' ? styles.ok
          : styles.bad
        }>
          {voiceMetrics.burstiness}
        </strong>{' '}
        ({voiceMetrics.burstinessLabel})
      </span>
      <span title="Average words per sentence.">avg {voiceMetrics.meanSentenceLen}w</span>
      {meterChip('adverb', 'adverbs', voiceMetrics.adverbRate, styles.plain, '-ly adverbs per 100 words. Lower is usually tighter.')}
      {meterChip('tobe', 'to-be', voiceMetrics.toBeRate, styles.plain, 'to-be verbs (is/are/was…) per 100 words. High means flatter prose.')}
      {meterChip('dash', 'dashes', voiceMetrics.dashes, voiceMetrics.dashLabel === 'clean' ? styles.good : voiceMetrics.dashLabel === 'some' ? styles.ok : styles.bad, 'Dashes standing between clauses or around an aside. Banned in the draft.')}
      {meterChip('tell', 'AI tells', voiceMetrics.tellTotal, voiceMetrics.tellTotal === 0 ? styles.good : styles.bad, voiceMetrics.tellHits.map(h => `${h.phrase} ×${h.count}`).join(', ') || 'No cliché tells found.')}
      {stats && <span className={styles.meterStats}>{stats.words} words · {stats.minutes} min read</span>}
    </div>
  )

  const footer = (
    <div className={chat.draftActions}>
      <button className={chat.snapshotChip} onClick={() => onSnapshot('middle')} disabled={snapshotting || !canSnapshot || streaming}>
        Save as middle
      </button>
      <button className={chat.snapshotChip} onClick={() => onSnapshot('full')} disabled={snapshotting || !canSnapshot || streaming}>
        Save as full
      </button>
      <button
        className={chat.snapshotChip}
        onClick={onFinalize}
        disabled={!canSnapshot || streaming}
        title="Stop developing; produce the final draft, the retype punch-list, and a cold outside read"
      >
        Finalize + outside read
      </button>
      {drafts.length > 0 && (
        <>
          <span className={chat.sourceLoc} style={{ fontSize: 11 }}>Snapshots:</span>
          <button
            className={`${chat.snapshotChip} ${viewedDraftId === null ? chat.snapshotChipOn : ''}`}
            onClick={() => onViewDraft(null)}
          >
            working
          </button>
          {drafts.map((d, i) => (
            <button
              key={d.id}
              className={`${chat.snapshotChip} ${viewedDraftId === d.id ? chat.snapshotChipOn : ''}`}
              onClick={() => onViewDraft(d.id)}
              title={new Date(d.created_at).toLocaleString()}
            >
              {i + 1} · {d.stage}
            </button>
          ))}
        </>
      )}
    </div>
  )

  const selectionBar = (
    <SelectionBar
      containerRef={proseRef}
      disabled={streaming || effTab !== 'draft' || !!viewingSnapshotStage}
      onAction={runScoped}
    />
  )

  if (!fullscreen) {
    return (
      <div className={`${chat.pane} ${chat.draftPane}`}>
        <div className={chat.paneHead}>{tabs}{actions}</div>
        <div className={chat.paneBody} ref={proseRef}>{body}</div>
        {selectionBar}
        {meter}
        {footer}
      </div>
    )
  }

  return (
    <div className={styles.fsOverlay} role="dialog" aria-modal="true" aria-label="Draft workspace">
      <div className={styles.fsHead}>
        <div className={styles.fsTitle}>
          <span className={styles.fsKicker}>Scribe · working draft</span>
          <h2>{title || 'Untitled entry'}</h2>
        </div>
        {tabs}
        {actions}
      </div>
      <div className={styles.fsBody} ref={proseRef}>
        <div className={effTab === 'draft' ? styles.fsColumn : styles.fsColumnWide}>{body}</div>
      </div>
      {selectionBar}
      <div className={styles.fsFoot}>
        {meter}
        {footer}
      </div>
    </div>
  )
}

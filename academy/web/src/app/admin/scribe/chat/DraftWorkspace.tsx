'use client'

// The draft pane and the full-page draft workspace are the same component in
// two skins. Compact rides in the right-hand column of the chat; fullscreen
// takes over the viewport so the essay can be read at a real measure with real
// typography. Three tabs: the typeset draft, this turn's changes (colour-coded,
// each one keepable / revertable / editable), and the cold outside read.

import { useEffect, useMemo, useState } from 'react'
import admin from '../../admin.module.css'
import chat from './chat.module.css'
import styles from './draft.module.css'
import ProseView from './ProseView'
import DiffView from './DiffView'
import { computeVoiceMetrics } from '@/lib/scribe/voice-metrics'
import { proseStats } from '@/lib/scribe/prose'
import { countHunks, describeDecisions, diffDraft, resolveDiff, type Decision } from '@/lib/scribe/diff'
import type { DiffBase, Draft, Review, ReviewFinding } from './types'

export type DraftTab = 'draft' | 'changes' | 'review'

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
    onViewDraft, streaming, snapshotting, canSnapshot, onSnapshot, onFinalize,
    onExport, onSaveToLog, onApplyRevision, applying,
  } = props

  const [baseId, setBaseId] = useState<string | null>(bases[0]?.id ?? null)
  const [decisions, setDecisions] = useState<Record<number, Decision>>({})

  // Keep the selection valid as the conversation moves under it.
  useEffect(() => {
    setBaseId(prev => (prev && bases.some(b => b.id === prev) ? prev : bases[0]?.id ?? null))
  }, [bases])

  const base = bases.find(b => b.id === baseId) ?? null

  // A new draft or a new comparison point means the old verdicts are stale.
  useEffect(() => { setDecisions({}) }, [draftText, baseId])

  const parts = useMemo(
    () => (base && draftText && base.text !== draftText ? diffDraft(base.text, draftText) : []),
    [base, draftText]
  )
  const hunkCount = countHunks(parts)
  const resolved = useMemo(
    () => (parts.length ? resolveDiff(parts, decisions) : null),
    [parts, decisions]
  )
  const touched = Object.values(decisions).some(d => d.mode !== 'accept')

  const effTab: DraftTab =
    tab === 'review' && review ? 'review'
    : tab === 'changes' && hunkCount > 0 ? 'changes'
    : 'draft'

  const voiceMetrics = draftText ? computeVoiceMetrics(draftText) : null
  const stats = draftText ? proseStats(draftText) : null
  const reviewCount = review
    ? review.not_kyle.length + review.unearned.length + review.narrated_over.length + (review.tells?.length ?? 0)
    : 0

  async function applyRevision() {
    if (!resolved || resolved === draftText) return
    await onApplyRevision(resolved, describeDecisions(parts, decisions))
    setDecisions({})
    onTabChange('draft')
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
          Changes ({hunkCount})
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
    </span>
  )

  const actions = (
    <span className={styles.headActions}>
      <button className={admin.ghostBtn} onClick={onSaveToLog} disabled={!draftText}>Save to log</button>
      <button className={admin.ghostBtn} onClick={onExport} disabled={!draftText}>Export</button>
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
        ] as [string, ReviewFinding[]][]).map(([label, items]) => items.length > 0 && (
          <div key={label} className={styles.reviewGroup}>
            <div className={styles.reviewGroupLabel}>{label}</div>
            <ul className={styles.reviewList}>
              {items.map((f, i) => (
                <li key={i}>
                  <span className={styles.reviewLine}>&ldquo;{f.line}&rdquo;</span>
                  {f.why ? <span className={styles.reviewWhy}> — {f.why}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ))
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
          {hunkCount} change{hunkCount === 1 ? '' : 's'}
          {touched ? ` · ${describeDecisions(parts, decisions)}` : ''}
        </span>
        <button
          className={admin.primaryBtn}
          onClick={applyRevision}
          disabled={applying || streaming || !touched || !resolved || resolved === draftText}
          title="Write your resolved version back as the working draft — Scribe carries it forward from there"
        >
          {applying ? 'Applying…' : 'Apply to draft'}
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

  const body =
    effTab === 'review' ? reviewBody
    : effTab === 'changes' ? changesBody
    : draftText ? <ProseView text={draftText} compact={!fullscreen} />
    : <p className={chat.draftEmpty}>The working draft appears here as Scribe writes.</p>

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
      <span title="-ly adverbs per 100 words. Lower is usually tighter.">adverbs {voiceMetrics.adverbRate}</span>
      <span title="to-be verbs (is/are/was…) per 100 words. High = flatter prose.">to-be {voiceMetrics.toBeRate}</span>
      <span title="Dashes used between clauses or around an aside (em dash, en dash, spaced hyphen). Banned in the draft: rewrite each one with a period, colon, semicolon, comma, or parentheses. Compound-word hyphens are not counted.">
        dashes{' '}
        <strong className={
          voiceMetrics.dashLabel === 'clean' ? styles.good
          : voiceMetrics.dashLabel === 'some' ? styles.ok
          : styles.bad
        }>
          {voiceMetrics.dashes}
        </strong>
      </span>
      <span title={voiceMetrics.tellHits.map(h => `${h.phrase} ×${h.count}`).join(', ') || 'no cliché tells found'}>
        AI tells <strong className={voiceMetrics.tellTotal === 0 ? styles.good : styles.bad}>{voiceMetrics.tellTotal}</strong>
      </span>
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

  if (!fullscreen) {
    return (
      <div className={`${chat.pane} ${chat.draftPane}`}>
        <div className={chat.paneHead}>{tabs}{actions}</div>
        <div className={chat.paneBody}>{body}</div>
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
      <div className={styles.fsBody}>
        <div className={effTab === 'draft' ? styles.fsColumn : styles.fsColumnWide}>{body}</div>
      </div>
      <div className={styles.fsFoot}>
        {meter}
        {footer}
      </div>
    </div>
  )
}

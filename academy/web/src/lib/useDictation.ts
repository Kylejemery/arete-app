'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Browser-native dictation (Web Speech API).
 *
 * Chrome/Edge only — `supported` is false everywhere else, and callers should
 * hide the mic rather than offering a control that can't work. No server call,
 * no API key: recognition happens in the browser.
 *
 * Final phrases are handed to `onFinalText` as they settle; `interimText` holds
 * the not-yet-settled tail so the UI can show speech landing in real time.
 */

// Minimal shape of the Web Speech API — TS's DOM lib doesn't ship the vendor-
// prefixed constructor, so we describe only what we use.
type SpeechAlternative = { transcript: string }
type SpeechResult = { isFinal: boolean; 0: SpeechAlternative; length: number }
type SpeechResultList = { length: number; [i: number]: SpeechResult }
type SpeechEvent = { resultIndex: number; results: SpeechResultList }
type SpeechErrorEvent = { error: string }

interface SpeechRecognizer {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((e: SpeechEvent) => void) | null
  onerror: ((e: SpeechErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type RecognizerCtor = new () => SpeechRecognizer

function getRecognizerCtor(): RecognizerCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: RecognizerCtor
    webkitSpeechRecognition?: RecognizerCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export type UseDictationOptions = {
  /** Called with each settled phrase. Punctuation is the speaker's job. */
  onFinalText: (text: string) => void
  /** BCP-47 tag for recognition. Defaults to the browser's locale. */
  lang?: string
}

export function useDictation({ onFinalText, lang }: UseDictationOptions) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognizerRef = useRef<SpeechRecognizer | null>(null)
  // The not-yet-settled tail, mirrored outside React state so `onend` can read
  // it synchronously. Chrome discards pending audio when a session ends, so
  // anything still here has to be flushed by us or it's lost.
  const interimRef = useRef('')
  // Chrome ends a session on its own after a stretch of silence. This tracks
  // whether the *user* still wants to be dictating, so `onend` can restart.
  const wantListeningRef = useRef(false)
  // Kept in a ref so a changing callback identity never rebuilds the recognizer
  // mid-session (which would drop audio).
  const onFinalRef = useRef(onFinalText)
  onFinalRef.current = onFinalText

  useEffect(() => {
    setSupported(getRecognizerCtor() !== null)
  }, [])

  /**
   * Hand over whatever is still unsettled and clear it. Safe to call twice —
   * the second call sees an empty ref and does nothing.
   */
  const flushInterim = useCallback(() => {
    const pending = interimRef.current.trim()
    interimRef.current = ''
    if (pending) onFinalRef.current(pending)
    setInterimText('')
  }, [])

  const stop = useCallback(() => {
    wantListeningRef.current = false
    // Keep the tail the speaker had already said when they hit stop.
    flushInterim()
    recognizerRef.current?.stop()
    setListening(false)
  }, [flushInterim])

  const start = useCallback(() => {
    const Ctor = getRecognizerCtor()
    if (!Ctor || wantListeningRef.current) return

    setError(null)
    const rec = new Ctor()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = lang ?? navigator.language ?? 'en-US'

    rec.onresult = e => {
      let settled = ''
      let pending = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) settled += r[0].transcript
        else pending += r[0].transcript
      }
      if (settled.trim()) onFinalRef.current(settled.trim())
      // Mirror into the ref too: once a phrase settles, `pending` comes back
      // empty, which is what keeps the flush from duplicating it.
      interimRef.current = pending
      setInterimText(pending)
    }

    rec.onerror = e => {
      // Silence and self-restarts are routine, not failures worth surfacing.
      if (e.error === 'no-speech' || e.error === 'aborted') return
      setError(
        e.error === 'not-allowed'
          ? 'Microphone access denied — allow it in your browser settings.'
          : `Dictation error: ${e.error}`
      )
      wantListeningRef.current = false
      flushInterim()
      setListening(false)
    }

    rec.onend = () => {
      // The session is over, so any unsettled tail will never be finalized by
      // the engine. Keep it before restarting or the speaker loses whatever
      // they were mid-sentence on when the rollover hit.
      flushInterim()
      // Resume if the browser cut us off but the user never pressed stop.
      if (wantListeningRef.current) {
        try {
          rec.start()
          return
        } catch {
          // Restart can throw if the engine isn't ready; fall through to idle.
        }
      }
      setListening(false)
    }

    recognizerRef.current = rec
    wantListeningRef.current = true
    try {
      rec.start()
      setListening(true)
    } catch {
      wantListeningRef.current = false
      setError('Could not start dictation — is the microphone in use?')
    }
  }, [lang, flushInterim])

  const toggle = useCallback(() => {
    if (wantListeningRef.current) stop()
    else start()
  }, [start, stop])

  // Never leave the mic hot after the page goes away.
  useEffect(() => {
    return () => {
      wantListeningRef.current = false
      // Drop the tail rather than flushing it — the component is going away,
      // so there's nothing left to append it to.
      interimRef.current = ''
      recognizerRef.current?.abort()
    }
  }, [])

  return { supported, listening, interimText, error, start, stop, toggle }
}

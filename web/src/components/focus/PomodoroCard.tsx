'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import GlassCard from '@/components/GlassCard';
import TimerOrbit from '@/components/TimerOrbit';
import { getPomodoroCountToday, setPomodoroCountToday } from '@/lib/cabinetSignals';

type Mode = 'work' | 'break';

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;
const DURATION: Record<Mode, number> = { work: WORK_SECONDS, break: BREAK_SECONDS };

/**
 * The absolute end timestamp lives in localStorage as well as in a ref, so a
 * reload or a backgrounded tab recomputes the countdown from wall-clock time
 * instead of from a setInterval that browsers throttle.
 */
const END_KEY = 'arete:pomodoro_end';

/**
 * A timer that ran out while the tab was closed still counts, but only if it
 * finished recently — otherwise re-opening the app days later would credit a
 * session that was never worked.
 */
const STALE_COMPLETION_MS = 60 * 60 * 1000;

interface StoredEnd {
  end: number;
  mode: Mode;
}

function readStoredEnd(): StoredEnd | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(END_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredEnd>;
    if (typeof parsed?.end !== 'number') return null;
    if (parsed.mode !== 'work' && parsed.mode !== 'break') return null;
    return { end: parsed.end, mode: parsed.mode };
  } catch {
    return null;
  }
}

function writeStoredEnd(value: StoredEnd | null) {
  if (typeof window === 'undefined') return;
  try {
    if (value) window.localStorage.setItem(END_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(END_KEY);
  } catch {
    /* private mode / quota — the timer still works in memory */
  }
}

/** A two-note chime, synthesised so the page carries no audio asset. */
function playChime() {
  if (typeof window === 'undefined') return;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const now = ctx.currentTime;
    [880, 1174.7].forEach((frequency, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      const start = now + i * 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.36);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
    window.setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 1500);
  } catch {
    /* audio is a nicety, never a failure */
  }
}

function notifyComplete(mode: Mode) {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  try {
    const notification = new Notification('Timer Complete', {
      body: `${mode === 'work' ? 'Focus' : 'Break'} session finished.`,
    });
    void notification;
  } catch {
    /* some browsers only allow notifications from a service worker */
  }
}

export default function PomodoroCard() {
  const [mode, setMode] = useState<Mode>('work');
  const [timeLeft, setTimeLeft] = useState(WORK_SECONDS);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');

  const endRef = useRef(0);
  const modeRef = useRef<Mode>('work');
  const sessionsRef = useRef(0);

  const applyMode = useCallback((next: Mode) => {
    modeRef.current = next;
    setMode(next);
  }, []);

  /** Work → count it and roll into a break; break → roll back into work. */
  const complete = useCallback(
    (finishedMode: Mode, options?: { silent?: boolean }) => {
      writeStoredEnd(null);
      endRef.current = 0;
      setRunning(false);

      if (!options?.silent) {
        playChime();
        notifyComplete(finishedMode);
      }

      if (finishedMode === 'work') {
        const next = sessionsRef.current + 1;
        sessionsRef.current = next;
        setSessions(next);
        void setPomodoroCountToday(next);
        applyMode('break');
        setTimeLeft(BREAK_SECONDS);
      } else {
        applyMode('work');
        setTimeLeft(WORK_SECONDS);
      }
    },
    [applyMode],
  );

  // Today's count, plus any run that was in flight when the page was closed.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let count = 0;
      try {
        count = await getPomodoroCountToday();
      } catch {
        count = 0;
      }
      if (cancelled) return;
      sessionsRef.current = count;
      setSessions(count);

      const stored = readStoredEnd();
      if (!stored) return;
      const remaining = Math.ceil((stored.end - Date.now()) / 1000);
      if (remaining > 0) {
        endRef.current = stored.end;
        applyMode(stored.mode);
        setTimeLeft(remaining);
        setRunning(true);
      } else if (Date.now() - stored.end <= STALE_COMPLETION_MS) {
        applyMode(stored.mode);
        complete(stored.mode, { silent: true });
      } else {
        writeStoredEnd(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyMode, complete]);

  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    setPermission(Notification.permission);
  }, []);

  const syncFromClock = useCallback(() => {
    const remaining = Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000));
    setTimeLeft(remaining);
    if (remaining === 0) complete(modeRef.current);
  }, [complete]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(syncFromClock, 500);
    return () => window.clearInterval(id);
  }, [running, syncFromClock]);

  // A throttled/suspended tab catches up the moment it comes back.
  useEffect(() => {
    if (!running) return;
    const onVisibility = () => {
      if (document.visibilityState === 'visible') syncFromClock();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
    };
  }, [running, syncFromClock]);

  const toggleRun = () => {
    if (running) {
      setTimeLeft(Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000)));
      endRef.current = 0;
      writeStoredEnd(null);
      setRunning(false);
      return;
    }
    const end = Date.now() + timeLeft * 1000;
    endRef.current = end;
    writeStoredEnd({ end, mode });
    setRunning(true);
  };

  const switchMode = (next: Mode) => {
    writeStoredEnd(null);
    endRef.current = 0;
    setRunning(false);
    applyMode(next);
    setTimeLeft(DURATION[next]);
  };

  const reset = () => {
    writeStoredEnd(null);
    endRef.current = 0;
    setRunning(false);
    setTimeLeft(DURATION[mode]);
  };

  const requestAlerts = async () => {
    if (typeof Notification === 'undefined') return;
    try {
      setPermission(await Notification.requestPermission());
    } catch {
      /* denied by policy */
    }
  };

  const total = DURATION[mode];
  const elapsed = Math.max(0, total - timeLeft);

  return (
    <GlassCard>
      <div className="p-4">
        <div
          className="text-[10px] tracking-[1.8px] uppercase mb-4"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
        >
          Focus Session
        </div>

        <div
          className="flex gap-1 p-1 rounded-xl mb-6"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {(['work', 'break'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className="flex-1 py-2 rounded-lg text-[11px] tracking-[1px] uppercase transition-all"
              style={
                mode === m
                  ? {
                      background: '#c9a84c',
                      color: '#0f1724',
                      fontFamily: 'var(--font-mono, monospace)',
                      fontWeight: 700,
                    }
                  : { color: '#9aa0a6', fontFamily: 'var(--font-mono, monospace)' }
              }
            >
              {m === 'work' ? '25 min Work' : '5 min Break'}
            </button>
          ))}
        </div>

        <div className="flex justify-center mb-4">
          <TimerOrbit elapsed={elapsed} total={total} isRunning={running} />
        </div>

        <div className="flex flex-wrap gap-3 justify-center mb-4">
          <button
            type="button"
            onClick={toggleRun}
            className="rounded-2xl px-8 py-3 font-bold text-[15px] transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #e3c77a, #8a6f27)', color: '#0f1724' }}
          >
            {running ? 'Pause' : 'Start'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-2xl px-6 py-3 text-[13px] transition-all hover:opacity-80"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#9aa0a6',
              fontFamily: 'var(--font-mono, monospace)',
            }}
          >
            Reset
          </button>
          {running && mode === 'work' && (
            <button
              type="button"
              onClick={() => complete('work', { silent: true })}
              className="rounded-2xl px-6 py-3 text-[13px] font-semibold transition-all hover:opacity-80"
              style={{
                background: 'rgba(76,175,80,0.07)',
                border: '1px solid rgba(76,175,80,0.53)',
                color: '#4caf50',
              }}
            >
              ✓ Done
            </button>
          )}
        </div>

        <p
          className="text-center text-[11px] tracking-[1px] uppercase"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
        >
          Sessions completed today:{' '}
          <span style={{ color: '#c9a84c', fontWeight: 700 }}>{sessions}</span>
        </p>

        {permission === 'default' && (
          <div className="text-center mt-2">
            <button
              type="button"
              onClick={requestAlerts}
              className="text-[10px] tracking-[1px] uppercase underline transition-opacity hover:opacity-70"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: 'rgba(201,168,76,0.7)' }}
            >
              Enable timer alerts
            </button>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

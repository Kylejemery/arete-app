'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  addRoutineTemplate,
  createJournalEntry,
  deleteRoutineTemplate,
  getCalendarData,
  getRoutineTemplates,
  getTodayCheckin,
  incrementStreak,
  upsertCalendarData,
  upsertTodayCheckin,
  type RoutineTemplate,
} from '@/lib/db';
import {
  EVENING_STOIC_PROMPTS,
  MORNING_AFFIRMATIONS,
  sendCheckInToCabinet,
} from '@/lib/claudeService';
import { getItem, getTodayDateKey, setItem } from '@/lib/storage';
import { useRequireUser } from '@/hooks/useRequireUser';
import { ConfirmDialog, Spinner } from '@/components/ui';
import GlassCard from '@/components/GlassCard';
import ChapterRule from '@/components/ChapterRule';
import EditRoutineModal from './routine/EditRoutineModal';
import StoicJournal from './routine/StoicJournal';
import TaskList from './routine/TaskList';
import {
  ROUTINE_CONFIG,
  templateLabel,
  type RoutineTask,
  type RoutineVariant,
} from './routine/routineConfig';

type PendingConfirm =
  | { kind: 'uncheck'; id: string; title: string }
  | { kind: 'remove'; id: string; title: string }
  | null;

/** Type-safe patch for the variant's pair of check-in columns. */
function tasksPatch(variant: RoutineVariant, tasks: RoutineTask[], done: boolean) {
  return variant === 'morning'
    ? { morning_tasks: tasks, morning_done: done }
    : { evening_tasks: tasks, evening_done: done };
}

export interface RoutinePageProps {
  variant: RoutineVariant;
}

/**
 * The one routine screen, shared by /morning and /evening. Everything the two
 * had in common — templates and first-run seeding, the check-in-backed task
 * list, the progress strip, add/remove/uncheck, the edit-templates sheet, the
 * Cabinet check-in card — lives here; the differences are in ROUTINE_CONFIG
 * plus the two blocks below (morning affirmation + intention, evening Stoic
 * Journal + Seal the Day).
 */
export default function RoutinePage({ variant }: RoutinePageProps) {
  const cfg = ROUTINE_CONFIG[variant];
  const isMorning = variant === 'morning';
  const cacheKey = `arete:${variant}_tasks`;

  const { user, loading: authLoading } = useRequireUser();

  const [tasks, setTasks] = useState<RoutineTask[]>([]);
  const [templates, setTemplates] = useState<RoutineTemplate[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [showAddInput, setShowAddInput] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null);

  const [checkinResponse, setCheckinResponse] = useState('');
  const [checkinLoading, setCheckinLoading] = useState(false);

  // Morning only
  const [intention, setIntention] = useState('');
  // Evening only
  const [stoicAnswer, setStoicAnswer] = useState('');
  const [stoicSaved, setStoicSaved] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const loadedDateRef = useRef('');
  const doneFlagRef = useRef(false);
  const stoicJournalCreated = useRef(false);
  const savedIntentionRef = useRef('');
  const intentionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The weekday-indexed daily lines, exactly as the mobile screens pick them.
  const weekday = new Date().getDay();
  const affirmation = MORNING_AFFIRMATIONS[weekday];
  const stoicPrompt = EVENING_STOIC_PROMPTS[weekday];

  const templateToTask = useCallback(
    (t: RoutineTemplate): RoutineTask => {
      const task: RoutineTask = {
        id: t.id,
        title: templateLabel(t.title, t.emoji),
        done: false,
      };
      if (isMorning && t.title === 'Train') task.note = 'Boxing, running, or movement';
      return task;
    },
    [isMorning],
  );

  const writeCache = useCallback(
    (list: RoutineTask[]) => {
      setItem(cacheKey, JSON.stringify({ date: getTodayDateKey(), tasks: list }));
    },
    [cacheKey],
  );

  // ── Load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;

    // Step 1: paint from a cache written today, so a returning tab is not
    // blank; a stale (yesterday's) cache is ignored so nothing shows up
    // pre-ticked on a new day.
    const todayKey = getTodayDateKey();
    try {
      const raw = getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { date?: string; tasks?: RoutineTask[] };
        if (parsed && !Array.isArray(parsed) && parsed.date === todayKey && Array.isArray(parsed.tasks)) {
          setTasks(parsed.tasks);
          setLoaded(true);
        }
      }
    } catch {
      /* a corrupt cache is not worth reporting */
    }

    // Step 2: fresh fetch.
    void (async () => {
      try {
        let tmpl = await getRoutineTemplates(variant);

        if (tmpl.length === 0) {
          const flag = cfg.seedFlagKey;
          const alreadySeeded = flag ? getItem(flag) : null;
          if (!alreadySeeded) {
            for (let i = 0; i < cfg.seedTemplates.length; i++) {
              const seed = cfg.seedTemplates[i];
              await addRoutineTemplate(variant, seed.title, seed.emoji, i);
            }
            if (flag) setItem(flag, 'true');
            tmpl = await getRoutineTemplates(variant);
          }
        } else if (cfg.seedFlagKey && !getItem(cfg.seedFlagKey)) {
          // Existing users already have templates: mark them seeded so
          // clearing the list never re-seeds the defaults.
          setItem(cfg.seedFlagKey, 'true');
        }
        if (cancelled) return;
        setTemplates(tmpl);

        const checkin = await getTodayCheckin();
        if (cancelled) return;

        const stored = (isMorning ? checkin?.morning_tasks : checkin?.evening_tasks) as
          | RoutineTask[]
          | null
          | undefined;

        let fresh: RoutineTask[];
        if (stored && stored.length > 0 && checkin?.check_in_date === todayKey) {
          fresh = stored;
        } else {
          // No stored list, or the row belongs to an earlier day: rebuild
          // today's list from the templates.
          fresh = tmpl.map(templateToTask);
          if (stored && stored.length > 0) {
            await upsertTodayCheckin(tasksPatch(variant, fresh, false));
          }
        }
        if (cancelled) return;

        setTasks(fresh);
        setLoaded(true);
        doneFlagRef.current = fresh.length > 0 && fresh.every((t) => t.done);
        writeCache(fresh);

        const reply = isMorning
          ? checkin?.cabinet_morning_response
          : checkin?.cabinet_evening_response;
        if (reply) setCheckinResponse(reply);

        if (isMorning) {
          const saved = checkin?.reflection_answer ?? '';
          savedIntentionRef.current = saved;
          setIntention(saved);
        } else if (checkin?.stoic_answer) {
          setStoicAnswer(checkin.stoic_answer);
          setStoicSaved(true);
          stoicJournalCreated.current = true;
        }

        loadedDateRef.current = todayKey;
      } catch (e) {
        console.error('Routine load failed:', e);
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, refreshTrigger, variant, cfg, cacheKey, isMorning, templateToTask, writeCache]);

  // Re-fetch when the tab is brought back on a new calendar day (a tab left
  // open overnight would otherwise show yesterday's ticks).
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState !== 'visible') return;
      const today = getTodayDateKey();
      if (loadedDateRef.current && today !== loadedDateRef.current) {
        setRefreshTrigger((n) => n + 1);
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => () => {
    if (intentionTimer.current) clearTimeout(intentionTimer.current);
  }, []);

  // ── Persistence ───────────────────────────────────────────────────

  /** Mirror the done flags into calendar_data, which the Progress grids read. */
  const syncCalendar = useCallback(
    async (done: boolean) => {
      try {
        const data = await getCalendarData();
        const key = getTodayDateKey();
        const prev = data[key] ?? { morning: false, evening: false };
        const next = isMorning ? { ...prev, morning: done } : { ...prev, evening: done };
        if (prev.morning === next.morning && prev.evening === next.evening) return;
        await upsertCalendarData({ ...data, [key]: next });
      } catch (e) {
        console.error('calendar_data sync failed:', e);
      }
    },
    [isMorning],
  );

  const saveTasks = useCallback(
    async (updated: RoutineTask[]) => {
      const allDone = updated.length > 0 && updated.every((t) => t.done);
      await upsertTodayCheckin(tasksPatch(variant, updated, allDone));
      writeCache(updated);

      if (doneFlagRef.current !== allDone) {
        doneFlagRef.current = allDone;
        await syncCalendar(allDone);
      }

      if (!allDone) return;
      await incrementStreak();

      // Morning: the last discipline of the day summons the Cabinet on its
      // own, once. Evening keeps the explicit "Seal the Day" button.
      if (!isMorning) return;
      const latest = await getTodayCheckin();
      if (latest?.cabinet_morning_response) {
        setCheckinResponse(latest.cabinet_morning_response);
        return;
      }
      setCheckinLoading(true);
      setCheckinResponse('');
      try {
        const reply = await sendCheckInToCabinet('morning');
        setCheckinResponse(reply);
        if (reply) await upsertTodayCheckin({ cabinet_morning_response: reply });
      } catch (e) {
        console.error('Morning check-in failed:', e);
        setCheckinResponse('The Cabinet will speak when you return.');
      } finally {
        setCheckinLoading(false);
      }
    },
    [variant, isMorning, syncCalendar, writeCache],
  );

  const commit = useCallback(
    (updated: RoutineTask[]) => {
      setTasks(updated);
      void saveTasks(updated);
    },
    [saveTasks],
  );

  const applyToggle = useCallback(
    (id: string) => {
      commit(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    },
    [commit, tasks],
  );

  const onToggle = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    // Ticking is one click; un-ticking a finished discipline asks first, so a
    // stray click cannot wipe out the day.
    if (task.done) {
      setPendingConfirm({ kind: 'uncheck', id, title: task.title });
      return;
    }
    applyToggle(id);
  };

  const onRemove = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    setPendingConfirm({ kind: 'remove', id, title: task.title });
  };

  const confirmPending = () => {
    if (!pendingConfirm) return;
    const { kind, id } = pendingConfirm;
    setPendingConfirm(null);
    if (kind === 'uncheck') {
      applyToggle(id);
      return;
    }
    commit(tasks.filter((t) => t.id !== id));
  };

  const addTask = () => {
    const title = newTaskTitle.trim();
    if (!title) return;
    setNewTaskTitle('');
    setShowAddInput(false);
    // Ad-hoc disciplines live on today's list only — the template list is
    // edited from the pencil sheet.
    commit([...tasks, { id: Date.now().toString(), title, done: false }]);
  };

  const handleDeleteTemplate = async (id: string) => {
    await deleteRoutineTemplate(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddTemplate = async (title: string, emoji: string) => {
    const added = await addRoutineTemplate(variant, title, emoji || undefined, templates.length);
    if (added) setTemplates((prev) => [...prev, added]);
  };

  const persistIntention = useCallback((value: string) => {
    if (value === savedIntentionRef.current) return;
    savedIntentionRef.current = value;
    void upsertTodayCheckin({ reflection_answer: value });
  }, []);

  const onIntentionChange = (value: string) => {
    setIntention(value);
    if (intentionTimer.current) clearTimeout(intentionTimer.current);
    intentionTimer.current = setTimeout(() => persistIntention(value), 700);
  };

  const flushIntention = () => {
    if (intentionTimer.current) {
      clearTimeout(intentionTimer.current);
      intentionTimer.current = null;
    }
    persistIntention(intention);
  };

  const saveStoic = async () => {
    const text = stoicAnswer.trim();
    if (!text) return;
    await upsertTodayCheckin({ stoic_answer: text });
    if (!stoicJournalCreated.current) {
      stoicJournalCreated.current = true;
      await createJournalEntry({
        type: 'reflection',
        content: text,
        source: 'evening_reflection',
        raw_input: stoicPrompt,
      });
    }
    setStoicSaved(true);
  };

  const sealTheDay = async () => {
    setCheckinLoading(true);
    try {
      const reply = await sendCheckInToCabinet('evening');
      setCheckinResponse(reply);
      await upsertTodayCheckin({ cabinet_evening_response: reply, evening_done: true });
      await incrementStreak();
      doneFlagRef.current = true;
      await syncCalendar(true);
    } catch (e) {
      console.error('Evening check-in failed:', e);
      setCheckinResponse('The Cabinet will speak when you return.');
    } finally {
      setCheckinLoading(false);
    }
  };

  const doneCount = tasks.filter((t) => t.done).length;
  const totalCount = tasks.length;
  const pct = totalCount > 0 ? doneCount / totalCount : 0;
  const allDone = totalCount > 0 && doneCount === totalCount;

  const confirmProps = useMemo(() => {
    if (pendingConfirm?.kind === 'uncheck') {
      return {
        title: 'Uncheck this discipline?',
        message: `“${pendingConfirm.title}” is marked done.`,
        confirmLabel: 'Uncheck',
      };
    }
    return {
      title: 'Remove Discipline',
      message: 'Are you sure you want to remove this discipline?',
      confirmLabel: 'Remove',
    };
  }, [pendingConfirm]);

  return (
    <div className="min-h-screen pb-8">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="px-5 pt-3 pb-5" style={cfg.headerBackground ? { background: cfg.headerBackground } : undefined}>
        <div
          className="text-[10px] tracking-[1.8px] uppercase mb-1"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
        >
          {cfg.eyebrow}
        </div>
        <div className="flex items-start justify-between gap-3">
          <h1
            className="text-[30px] font-medium leading-tight tracking-tight"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
          >
            {cfg.title} <em style={{ color: '#c9a84c' }}>{cfg.emphasis}</em>
          </h1>
          <div className="flex items-center gap-2.5 pt-1.5 flex-shrink-0">
            <span
              className="rounded-full px-3 py-1 text-[13px] font-bold"
              style={{
                background: 'rgba(201,168,76,0.13)',
                border: '1px solid rgba(201,168,76,0.33)',
                color: '#c9a84c',
              }}
            >
              {doneCount}/{totalCount}
            </span>
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              aria-label={cfg.editModalTitle}
              title={cfg.editModalTitle}
              className="text-[16px] opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: '#c9a84c' }}
            >
              ✎
            </button>
          </div>
        </div>
        {cfg.epigraph && (
          <p
            className="italic text-[13px] mt-3 opacity-70 leading-snug"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}
          >
            &ldquo;{cfg.epigraph.quote}&rdquo;
            <span
              className="not-italic block mt-1 text-[9px] tracking-[1.3px] uppercase"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                color: 'rgba(201,168,76,0.6)',
                fontStyle: 'normal',
              }}
            >
              {cfg.epigraph.attribution}
            </span>
          </p>
        )}
      </div>

      {/* ── Affirmation (morning) ──────────────────────────────────── */}
      {isMorning && (
        <div className="px-4 pb-5">
          <div
            className="rounded-[14px] p-[18px] flex items-start gap-2.5"
            style={{ background: '#16213e', borderLeft: '3px solid #c9a84c' }}
          >
            <span aria-hidden="true" style={{ color: '#c9a84c', fontSize: 18, lineHeight: '22px' }}>
              ☀
            </span>
            <p
              className="italic text-[14px] leading-[22px] flex-1"
              style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#c9a84c' }}
            >
              &ldquo;{affirmation}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* ── Progress ───────────────────────────────────────────────── */}
      <div className="px-5 pb-3">
        <div className="flex justify-between items-baseline mb-2">
          <span
            className="text-[10.5px] tracking-[1.5px] uppercase"
            style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
          >
            Progress · {doneCount} of {totalCount}
          </span>
          <span
            className="italic text-[22px] font-medium"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#c9a84c' }}
          >
            {Math.round(pct * 100)}
            <span className="text-[13px] opacity-70">%</span>
          </span>
        </div>
        <div className="flex gap-1">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex-1 h-[3px] rounded-sm transition-all duration-300"
              style={{
                background: task.done ? '#c9a84c' : 'rgba(201,168,76,0.12)',
                boxShadow: task.done ? '0 0 8px rgba(201,168,76,0.5)' : 'none',
              }}
            />
          ))}
        </div>
      </div>

      <ChapterRule />

      {/* ── Tasks ──────────────────────────────────────────────────── */}
      <TaskList tasks={tasks} loaded={loaded} onToggle={onToggle} onRemove={onRemove} />

      {/* ── Add Discipline ─────────────────────────────────────────── */}
      <div className="px-4 pt-2 pb-2">
        {showAddInput ? (
          <div className="flex gap-2">
            <input
              autoFocus
              className="flex-1 min-w-0 px-4 py-3 rounded-xl text-[15px] outline-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(201,168,76,0.25)',
                color: '#e6eef8',
                fontFamily: 'var(--font-serif, Georgia, serif)',
              }}
              placeholder="Name your discipline..."
              aria-label="Name your discipline"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addTask();
                if (e.key === 'Escape') {
                  setShowAddInput(false);
                  setNewTaskTitle('');
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                setShowAddInput(false);
                setNewTaskTitle('');
              }}
              className="px-4 py-3 rounded-xl text-[13px]"
              style={{ color: '#9aa0a6' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addTask}
              className="px-5 py-3 rounded-xl font-bold text-[13px]"
              style={{ background: '#c9a84c', color: '#1a1a2e' }}
            >
              Add
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddInput(true)}
            className="w-full px-4 py-4 rounded-[14px] border border-dashed flex items-center gap-2.5 justify-center transition-opacity hover:opacity-80"
            style={{
              borderColor: 'rgba(201,168,76,0.27)',
              color: '#c9a84c',
              fontFamily: 'var(--font-sans, system-ui, sans-serif)',
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            <span className="text-lg leading-none">+</span>
            Add Discipline
          </button>
        )}
      </div>

      {/* ── Intention (morning) ────────────────────────────────────── */}
      {isMorning && (
        <>
          <ChapterRule className="mx-5" />
          <div className="px-4 pt-1 pb-4">
            <GlassCard accent>
              <div className="p-4">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <span aria-hidden="true" style={{ color: '#c9a84c', fontSize: 18 }}>
                    ✦
                  </span>
                  <span
                    className="text-[10px] tracking-[1.6px] uppercase"
                    style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
                  >
                    Today&apos;s intention
                  </span>
                </div>
                <textarea
                  className="w-full bg-transparent italic text-[17px] leading-relaxed resize-none outline-none min-h-[48px]"
                  style={{
                    fontFamily: 'var(--font-serif, Georgia, serif)',
                    color: intention ? '#e6eef8' : '#9aa0a6',
                  }}
                  placeholder="Write one sentence the Cabinet will hold you to…"
                  aria-label="Today's intention"
                  value={intention}
                  onChange={(e) => onIntentionChange(e.target.value)}
                  onBlur={flushIntention}
                  rows={2}
                />
              </div>
            </GlassCard>
          </div>
        </>
      )}

      {/* ── Stoic Journal (evening) ────────────────────────────────── */}
      {!isMorning && (
        <>
          <ChapterRule label="Reflection" className="mx-4" />
          <StoicJournal
            prompt={stoicPrompt}
            answer={stoicAnswer}
            saved={stoicSaved}
            onChange={setStoicAnswer}
            onSave={() => void saveStoic()}
            onEdit={() => setStoicSaved(false)}
          />
          <ChapterRule className="mx-4 mt-2" />
        </>
      )}

      {/* ── All done ───────────────────────────────────────────────── */}
      {allDone && (
        <div className="px-4 pb-4">
          <div
            className="rounded-[14px] p-6 flex flex-col items-center gap-1.5 text-center"
            style={{ background: '#16213e', border: '1px solid #c9a84c' }}
          >
            <span className="text-[36px] leading-none" aria-hidden="true">
              {cfg.allDone.emoji}
            </span>
            <div className="text-[18px] font-bold" style={{ color: '#c9a84c' }}>
              {cfg.allDone.title}
            </div>
            <div
              className="text-[14px]"
              style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
            >
              {cfg.allDone.subtitle}
            </div>
          </div>
        </div>
      )}

      {/* ── Seal the Day (evening, before the Cabinet has spoken) ───── */}
      {!isMorning && !checkinResponse && (
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={() => void sealTheDay()}
            disabled={checkinLoading}
            className="w-full rounded-2xl px-4 py-4 flex justify-between items-center disabled:opacity-60 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #e3c77a, #8a6f27)' }}
          >
            <span className="text-left">
              <span
                className="block text-[9.5px] tracking-[1.6px] font-bold"
                style={{ fontFamily: 'var(--font-mono, monospace)', color: '#0f1724' }}
              >
                {checkinLoading ? 'SPEAKING…' : 'SEAL THE DAY'}
              </span>
              <span
                className="block text-[18px] font-semibold mt-0.5"
                style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#0f1724' }}
              >
                {checkinLoading ? 'Your Cabinet speaks…' : 'Close with the Cabinet'}
              </span>
            </span>
            <span className="text-xl font-bold" style={{ color: '#0f1724' }}>
              →
            </span>
          </button>
        </div>
      )}

      {/* ── Cabinet check-in ───────────────────────────────────────── */}
      {checkinLoading && isMorning && (
        <div className="px-5 pb-3 flex items-center gap-3">
          <Spinner size={16} />
          <span className="text-[14px] italic" style={{ color: '#9aa0a6' }}>
            The Cabinet is responding…
          </span>
        </div>
      )}

      {checkinResponse && !checkinLoading && (
        <div className="px-4 pb-4">
          <GlassCard>
            <div className="p-4">
              <div className="text-[14px] font-bold mb-2.5" style={{ color: '#c9a84c' }}>
                {cfg.cabinet.label}
              </div>
              <p
                className="text-[15px] leading-[23px] whitespace-pre-wrap mb-3"
                style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
              >
                {checkinResponse}
              </p>
              <div className="flex justify-end">
                <Link
                  href={cfg.cabinet.href(checkinResponse)}
                  className="text-[14px] font-semibold hover:opacity-80 transition-opacity"
                  style={{ color: '#c9a84c' }}
                >
                  View in Cabinet →
                </Link>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      <EditRoutineModal
        open={showEditModal}
        title={cfg.editModalTitle}
        templates={templates}
        onClose={() => setShowEditModal(false)}
        onDelete={(id) => void handleDeleteTemplate(id)}
        onAdd={(title, emoji) => void handleAddTemplate(title, emoji)}
      />

      <ConfirmDialog
        open={pendingConfirm !== null}
        title={confirmProps.title}
        message={confirmProps.message}
        confirmLabel={confirmProps.confirmLabel}
        destructive
        onConfirm={confirmPending}
        onCancel={() => setPendingConfirm(null)}
      />
    </div>
  );
}

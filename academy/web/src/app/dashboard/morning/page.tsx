'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getTodayCheckin, upsertTodayCheckin, getRoutineTemplates } from '@/lib/db';
import type { Task, RoutineTemplate } from '@/types';

const AFFIRMATIONS = [
  'Confine yourself to the present. — Marcus Aurelius',
  'Do not indulge in expectations — meet each moment. — Epictetus',
  'It is not the man who has too little, but the man who craves more, that is poor. — Seneca',
  'You have power over your mind, not outside events. — Marcus Aurelius',
  'Seek not the good in external things; seek it in yourself. — Epictetus',
  'He is a wise man who does not grieve for the things which he has not, but rejoices for those which he has. — Epictetus',
  'Begin at once to live, and count each separate day as a separate life. — Seneca',
];

const DEFAULT_TASKS: Task[] = [
  { id: 'default-1', title: '\u{1F3AB} Eat Breakfast', done: false },
  { id: 'default-2', title: '\u{1F33F} Meditate', done: false },
  { id: 'default-3', title: '\u{1F94A} Exercise', done: false },
];

function templateToTask(t: RoutineTemplate): Task {
  return {
    id: t.id,
    title: t.emoji ? `${t.emoji} ${t.title}` : t.title,
    done: false,
  };
}

export default function MorningPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [morningDone, setMorningDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const affirmation = AFFIRMATIONS[new Date().getDay()];
  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/login'); return; }

    try {
      const [checkin, templates] = await Promise.all([
        getTodayCheckin(),
        getRoutineTemplates('morning'),
      ]);

      if (checkin?.morning_tasks && checkin.morning_tasks.length > 0) {
        // Today's check-in exists — use it directly (syncs mobile completions)
        setTasks(checkin.morning_tasks);
        setMorningDone(checkin.morning_done ?? false);
      } else if (templates.length > 0) {
        setTasks(templates.map(templateToTask));
        setMorningDone(false);
      } else {
        setTasks(DEFAULT_TASKS);
        setMorningDone(false);
      }
    } catch (e) {
      console.error('MorningPage loadData error:', e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Load on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Re-fetch when tab regains focus (mirrors useFocusEffect on mobile)
  useEffect(() => {
    const handleFocus = () => { loadData(); };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadData]);

  const toggleTask = async (id: string) => {
    const prev = tasks;
    const prevDone = morningDone;

    const updated = tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    const allDone = updated.length > 0 && updated.every((t) => t.done);

    // Optimistic update
    setTasks(updated);
    setMorningDone(allDone);
    setSavingId(id);

    try {
      await upsertTodayCheckin({ morning_tasks: updated, morning_done: allDone });
    } catch (e) {
      console.error('toggleTask error:', e);
      // Revert on failure
      setTasks(prev);
      setMorningDone(prevDone);
    } finally {
      setSavingId(null);
    }
  };

  const completedCount = tasks.filter((t) => t.done).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="font-serif text-academy-muted italic text-sm">
          Preparing your morning...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">

      {/* Header */}
      <div className="mb-8">
        <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-1">
          {dateLabel}
        </p>
        <h1 className="font-serif text-3xl text-academy-text">Morning Disciplines</h1>
        <p className="text-academy-muted text-sm italic mt-2 leading-relaxed">{affirmation}</p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-academy-muted text-xs uppercase tracking-wider">Progress</span>
          <span
            className={`text-xs font-semibold ${
              morningDone ? 'text-academy-gold' : 'text-academy-muted'
            }`}
          >
            {completedCount} / {tasks.length}
          </span>
        </div>
        <div className="h-1.5 bg-academy-border rounded-full overflow-hidden">
          <div
            className="h-full bg-academy-gold rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-3 mb-8">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => toggleTask(task.id)}
            disabled={savingId === task.id}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border transition-all text-left ${
              task.done
                ? 'bg-academy-gold/10 border-academy-gold/30'
                : 'bg-academy-card border-academy-border hover:border-academy-gold/40'
            }`}
          >
            {/* Checkbox */}
            <span
              className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                task.done
                  ? 'bg-academy-gold border-academy-gold'
                  : 'border-academy-border'
              }`}
            >
              {task.done && (
                <svg
                  className="w-3 h-3 text-navy"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </span>

            {/* Label */}
            <span
              className={`flex-1 text-sm transition-all ${
                task.done
                  ? 'line-through text-academy-muted/60'
                  : 'text-academy-text'
              }`}
            >
              {task.title}
            </span>

            {savingId === task.id && (
              <span className="text-academy-muted text-xs flex-shrink-0">saving...</span>
            )}
          </button>
        ))}
      </div>

      {/* Completion banner */}
      {morningDone && (
        <div className="bg-academy-card border border-academy-gold/30 rounded-xl p-6 text-center">
          <p className="text-academy-gold text-2xl mb-2">&#10022;</p>
          <p className="font-serif text-academy-text text-lg">Morning complete.</p>
          <p className="text-academy-muted text-sm italic mt-1 leading-relaxed">
            The disciplines are done. Turn your attention to what matters.
          </p>
        </div>
      )}
    </div>
  );
}

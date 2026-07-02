'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getUserSettings,
  getTodayCheckin,
  upsertTodayCheckin,
  incrementStreak,
  getRoutineTemplates,
  addRoutineTemplate,
  deleteRoutineTemplate,
} from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { sendCheckInToCabinet } from '@/lib/claudeService';
import { REFLECTION_PROMPTS, STOIC_PROMPTS, getDailyItem } from '@/lib/quotes';
import GlassCard from '@/components/GlassCard';
import ChapterRule from '@/components/ChapterRule';

interface Task {
  id: string;
  title: string;
  done: boolean;
}

const DEFAULT_TASKS: Task[] = [
  { id: 'default-1', title: 'Plan Tomorrow',     done: false },
  { id: 'default-2', title: 'Reflect on the Day', done: false },
];

const DONE_STORAGE_KEY = 'arete_evening_done_ids';

// Counselor prompts built from existing reflection/stoic data
interface EveningPrompt {
  counselor: 'reflection' | 'stoic';
  counselorName: string;
  initials: string;
  question: string;
  response: string;
  save: (val: string) => void;
}

export default function EveningPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [usingDefaults, setUsingDefaults] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  const [reflectionAnswer, setReflectionAnswer] = useState('');
  const [stoicAnswer, setStoicAnswer] = useState('');
  const [checkInResponse, setCheckInResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkInDone, setCheckInDone] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const reflectionPrompt = getDailyItem(REFLECTION_PROMPTS);
  const stoicPrompt      = getDailyItem(STOIC_PROMPTS);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const settings = await getUserSettings();
      if (!settings?.user_name) { router.replace('/setup'); return; }

      const [templates, checkin] = await Promise.all([
        getRoutineTemplates('evening'),
        getTodayCheckin(),
      ]);

      // Task state: prefer Supabase row, fall back to templates/defaults
      const dbTasks = checkin?.evening_tasks as Task[] | null;
      if (dbTasks && dbTasks.length > 0) {
        setTasks(dbTasks);
        setUsingDefaults(false);
      } else if (templates.length > 0) {
        setTasks(templates.map(t => ({
          id: t.id,
          title: t.emoji ? `${t.title} ${t.emoji}` : t.title,
          done: false,
        })));
        setUsingDefaults(false);
      } else {
        const fallback =
          settings.evening_tasks?.length > 0
            ? (settings.evening_tasks as Task[]).map(t => ({ ...t, done: false }))
            : DEFAULT_TASKS;
        setTasks(fallback);
        setUsingDefaults(true);
      }

      if (typeof window !== 'undefined') {
        const storedReflection = localStorage.getItem('arete_reflection_answer');
        if (storedReflection) setReflectionAnswer(storedReflection);
        const storedStoic = localStorage.getItem('arete_stoic_answer');
        if (storedStoic) setStoicAnswer(storedStoic);
      }

      if (checkin?.evening_done) setCheckInDone(true);
      if (checkin?.cabinet_evening_response)
        setCheckInResponse(checkin.cabinet_evening_response as string);

      setLoaded(true);
    }
    load();
  }, [router]);

  const persistDone = (updatedTasks: Task[]) => {
    if (typeof window !== 'undefined') {
      const doneIds = updatedTasks.filter(t => t.done).map(t => t.id);
      localStorage.setItem(DONE_STORAGE_KEY, JSON.stringify(doneIds));
    }
  };

  const saveReflection = (value: string) => {
    setReflectionAnswer(value);
    if (typeof window !== 'undefined') localStorage.setItem('arete_reflection_answer', value);
  };

  const saveStoic = (value: string) => {
    setStoicAnswer(value);
    if (typeof window !== 'undefined') localStorage.setItem('arete_stoic_answer', value);
  };

  const saveResponse = (counselor: 'reflection' | 'stoic', value: string) => {
    if (counselor === 'reflection') saveReflection(value);
    else saveStoic(value);
  };

  const toggleTask = async (id: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTasks(updated);
    persistDone(updated);
    const allDone = updated.length > 0 && updated.every(t => t.done);
    await upsertTodayCheckin({ evening_tasks: updated, evening_done: allDone });
    if (allDone) await incrementStreak();
  };

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    const title = newTaskTitle.trim();
    setNewTaskTitle('');
    setShowAddInput(false);

    if (usingDefaults) {
      const newTask: Task = { id: Date.now().toString(), title, done: false };
      setTasks(prev => [...prev, newTask]);
      return;
    }

    const template = await addRoutineTemplate('evening', title, undefined, tasks.length);
    if (template) {
      setTasks(prev => [...prev, { id: template.id, title: template.title, done: false }]);
    }
  };

  const removeTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (!usingDefaults) {
      await deleteRoutineTemplate(id);
    }
  };

  const handleCheckIn = async () => {
    setIsLoading(true);
    try {
      const response = await sendCheckInToCabinet('evening');
      await upsertTodayCheckin({ cabinet_evening_response: response, evening_done: true });
      await incrementStreak();
      setCheckInResponse(response);
      setCheckInDone(true);
    } catch {
      setCheckInResponse('The Cabinet will speak when you return.');
    } finally {
      setIsLoading(false);
    }
  };

  const doneCount  = tasks.filter(t => t.done).length;
  const totalCount = tasks.length;
  const pct = totalCount > 0 ? doneCount / totalCount : 0;

  const eveningPrompts: EveningPrompt[] = [
    {
      counselor: 'reflection',
      counselorName: 'Marcus Aurelius',
      initials: 'MA',
      question: reflectionPrompt,
      response: reflectionAnswer,
      save: saveReflection,
    },
    {
      counselor: 'stoic',
      counselorName: 'Seneca',
      initials: 'SN',
      question: stoicPrompt,
      response: stoicAnswer,
      save: saveStoic,
    },
  ];

  if (!loaded) return null;

  return (
    <div className="min-h-screen pb-8">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div
        className="px-5 pt-3 pb-5"
        style={{ background: 'linear-gradient(180deg, #0a0a1e 0%, #07050f 100%)' }}
      >
        <div
          className="text-[10px] tracking-[1.8px] uppercase mb-1"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
        >
          Chapter II · Vesper
        </div>
        <h1
          className="text-[32px] font-medium leading-none tracking-tight"
          style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
        >
          The day,<br />
          <em style={{ color: '#c9a84c' }}>examined.</em>
        </h1>
        <p
          className="italic text-[13px] mt-3 opacity-70 leading-snug"
          style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}
        >
          &ldquo;Let us prepare our minds as if we had come to the very end of life.&rdquo;
          <span
            className="not-italic block mt-1 text-[9px] tracking-[1.3px] uppercase"
            style={{ fontFamily: 'var(--font-mono, monospace)', color: 'rgba(201,168,76,0.6)', fontStyle: 'normal' }}
          >
            Seneca
          </span>
        </p>
      </div>

      {/* ── Progress Strip ────────────────────────────────────────── */}
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
          {tasks.map(task => (
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

      {/* ── Task List ─────────────────────────────────────────────── */}
      <div className="px-4 flex flex-col gap-2 pb-2">
        {tasks.map(task => (
          <div
            key={task.id}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-200 cursor-pointer group"
            style={{
              background: task.done ? 'rgba(201,168,76,0.04)' : 'rgba(20,27,52,0.5)',
              borderColor: task.done ? 'rgba(201,168,76,0.2)' : 'rgba(201,168,76,0.1)',
              opacity: task.done ? 0.65 : 1,
            }}
            onClick={() => toggleTask(task.id)}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border transition-all"
              style={{
                borderColor: task.done ? '#c9a84c' : '#4a5070',
                background: task.done ? 'rgba(201,168,76,0.2)' : 'transparent',
              }}
            >
              {task.done && (
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: '#c9a84c', boxShadow: '0 0 8px #c9a84c' }}
                />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div
                className="text-[17px] font-medium"
                style={{
                  fontFamily: 'var(--font-serif, Georgia, serif)',
                  color: '#e6eef8',
                  textDecoration: task.done ? 'line-through' : 'none',
                  textDecorationColor: '#8a6f27',
                }}
              >
                {task.title}
              </div>
            </div>

            <button
              onClick={e => { e.stopPropagation(); removeTask(task.id); }}
              className="text-arete-muted hover:text-red-400 text-xs opacity-40 md:opacity-0 md:group-hover:opacity-60 transition-opacity flex-shrink-0"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* ── Add Task ──────────────────────────────────────────────── */}
      <div className="px-4 pt-2 pb-2">
        {showAddInput ? (
          <div className="flex gap-2">
            <input
              autoFocus
              className="flex-1 px-4 py-3 rounded-xl text-[15px] outline-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(201,168,76,0.25)',
                color: '#e6eef8',
                fontFamily: 'var(--font-serif, Georgia, serif)',
              }}
              placeholder="Name this discipline…"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') { setShowAddInput(false); setNewTaskTitle(''); } }}
            />
            <button
              onClick={addTask}
              className="px-4 py-3 rounded-xl font-bold text-[#0f1724]"
              style={{ background: '#c9a84c' }}
            >
              +
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddInput(true)}
            className="w-full px-4 py-3.5 rounded-xl border border-dashed flex items-center gap-2.5 transition-opacity hover:opacity-80"
            style={{
              borderColor: 'rgba(255,255,255,0.08)',
              color: '#c9a84c',
              fontFamily: 'var(--font-sans, system-ui, sans-serif)',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <span className="text-lg leading-none">+</span>
            Add a discipline
          </button>
        )}
      </div>

      <ChapterRule label="Reflection" className="mx-4" />

      {/* ── Evening Reflection Prompts ────────────────────────────── */}
      <div className="px-4 flex flex-col gap-3 pb-2">
        {eveningPrompts.map(prompt => (
          <div
            key={prompt.counselor}
            className="rounded-2xl border p-4"
            style={{
              background: 'rgba(20,27,52,0.5)',
              borderColor: 'rgba(255,255,255,0.07)',
            }}
          >
            {/* Counselor header */}
            <div className="flex gap-2.5 items-center mb-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'rgba(201,168,76,0.12)',
                  border: '1px solid rgba(201,168,76,0.3)',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: 8,
                  fontWeight: 600,
                  color: '#c9a84c',
                }}
              >
                {prompt.initials}
              </div>
              <div
                className="text-[9.5px] tracking-[1.5px] uppercase"
                style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
              >
                {prompt.counselorName} asks
              </div>
            </div>

            {/* Question */}
            <div
              className="italic text-[18px] leading-snug tracking-tight mb-3"
              style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
            >
              &ldquo;{prompt.question}&rdquo;
            </div>

            {/* Response area */}
            {checkInDone && prompt.response ? (
              <div
                className="px-3 py-2.5 rounded-lg"
                style={{
                  background: 'rgba(201,168,76,0.06)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <p
                  className="italic text-[14px] leading-relaxed"
                  style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                >
                  &ldquo;{prompt.response}&rdquo;
                </p>
              </div>
            ) : (
              <textarea
                className="w-full rounded-lg px-3 py-2.5 text-[13px] outline-none resize-none min-h-[64px]"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(201,168,76,0.08)',
                  fontFamily: 'var(--font-sans, system-ui, sans-serif)',
                  color: '#e6eef8',
                }}
                placeholder="Begin to write…"
                value={prompt.response}
                onChange={e => saveResponse(prompt.counselor, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      <ChapterRule className="mx-4 mt-2" />

      {/* ── Seal the Day CTA ──────────────────────────────────────── */}
      <div className="px-4 pb-4">
        {checkInDone ? (
          <>
            <GlassCard>
              <div className="p-4 flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(201,168,76,0.2)', border: '1px solid #c9a84c' }}
                >
                  <span style={{ color: '#c9a84c' }}>✓</span>
                </div>
                <div>
                  <div
                    className="text-[10px] tracking-[1.6px] uppercase"
                    style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
                  >
                    Evening Complete
                  </div>
                  <div
                    className="text-[14px] mt-0.5"
                    style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}
                  >
                    Well done. Come back tomorrow.
                  </div>
                </div>
              </div>
            </GlassCard>

            {checkInResponse && (
              <div className="mt-3">
                <GlassCard>
                  <div className="p-4">
                    <div
                      className="text-[10px] tracking-[1.6px] uppercase mb-3"
                      style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
                    >
                      Your Cabinet speaks
                    </div>
                    <p
                      className="text-[14px] leading-relaxed whitespace-pre-wrap"
                      style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
                    >
                      {checkInResponse}
                    </p>
                  </div>
                </GlassCard>
              </div>
            )}
          </>
        ) : (
          <button
            onClick={handleCheckIn}
            disabled={isLoading}
            className="w-full rounded-2xl px-4 py-4 flex justify-between items-center disabled:opacity-60 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #e3c77a, #8a6f27)' }}
          >
            <div>
              <div
                className="text-[9.5px] tracking-[1.6px] font-bold"
                style={{ fontFamily: 'var(--font-mono, monospace)', color: '#0f1724' }}
              >
                {isLoading ? 'SPEAKING…' : 'SEAL THE DAY'}
              </div>
              <div
                className="text-[18px] font-semibold mt-0.5"
                style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#0f1724' }}
              >
                {isLoading ? 'Your Cabinet speaks…' : 'Close with the Cabinet'}
              </div>
            </div>
            <span className="text-xl font-bold" style={{ color: '#0f1724' }}>→</span>
          </button>
        )}
      </div>

    </div>
  );
}

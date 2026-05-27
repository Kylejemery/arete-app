'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getUserSettings,
  getTodayCheckin,
  upsertTodayCheckin,
  getRoutineTemplates,
  addRoutineTemplate,
  deleteRoutineTemplate,
} from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { sendCheckInToCabinet } from '@/lib/claudeService';
import GlassCard from '@/components/GlassCard';
import ChapterRule from '@/components/ChapterRule';

interface Task {
  id: string;
  title: string;
  done: boolean;
}

const DEFAULT_TASKS: Task[] = [
  { id: 'default-1', title: 'Eat Breakfast', done: false },
  { id: 'default-2', title: 'Meditate',      done: false },
];

const DONE_STORAGE_KEY = 'arete_morning_done_ids';
const INTENTION_KEY    = 'arete_morning_intention';

export default function MorningPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [usingDefaults, setUsingDefaults] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  const [intention, setIntention] = useState('');
  const [checkInResponse, setCheckInResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkInDone, setCheckInDone] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const settings = await getUserSettings();
      if (!settings?.user_name) { router.replace('/setup'); return; }

      const [templates, checkin] = await Promise.all([
        getRoutineTemplates('morning'),
        getTodayCheckin(),
      ]);

      // Task state: prefer Supabase row (cross-platform sync), fall back to templates/defaults
      const dbTasks = checkin?.morning_tasks as Task[] | null;
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
          settings.morning_tasks?.length > 0
            ? (settings.morning_tasks as Task[]).map(t => ({ ...t, done: false }))
            : DEFAULT_TASKS;
        setTasks(fallback);
        setUsingDefaults(true);
      }

      if (checkin?.morning_done) setCheckInDone(true);
      if (checkin?.cabinet_morning_response)
        setCheckInResponse(checkin.cabinet_morning_response as string);

      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(INTENTION_KEY);
        if (saved) setIntention(saved);
      }

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

  const toggleTask = async (id: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTasks(updated);
    persistDone(updated);
    const allDone = updated.length > 0 && updated.every(t => t.done);
    await upsertTodayCheckin({ morning_tasks: updated, morning_done: allDone });
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

    const template = await addRoutineTemplate('morning', title, undefined, tasks.length);
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
      const response = await sendCheckInToCabinet('morning');
      await upsertTodayCheckin({ cabinet_morning_response: response, morning_done: true });
      setCheckInResponse(response);
      setCheckInDone(true);
    } catch {
      setCheckInResponse('The Cabinet will speak when you return.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveIntention = (value: string) => {
    setIntention(value);
    if (typeof window !== 'undefined') localStorage.setItem(INTENTION_KEY, value);
  };

  const doneCount = tasks.filter(t => t.done).length;
  const totalCount = tasks.length;
  const pct = totalCount > 0 ? doneCount / totalCount : 0;

  if (!loaded) return null;

  return (
    <div className="min-h-screen pb-8">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="px-5 pt-3 pb-5">
        <div
          className="text-[10px] tracking-[1.8px] uppercase mb-1"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
        >
          Chapter I · Aurora
        </div>
        <h1
          className="text-[32px] font-medium leading-none tracking-tight"
          style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
        >
          The morning<br />
          <em style={{ color: '#c9a84c' }}>before you.</em>
        </h1>
      </div>

      {/* ── Marcus Quote ──────────────────────────────────────────── */}
      <div className="px-5 pb-4">
        <div className="border-l border-arete-gold pl-4 py-1">
          <p
            className="italic text-[15px] opacity-90 leading-relaxed"
            style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
          >
            &ldquo;When you arise in the morning, think of what a privilege it is to be alive — to think, to enjoy, to love.&rdquo;
          </p>
          <div
            className="text-[9.5px] tracking-[1.4px] uppercase mt-2"
            style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
          >
            Marcus Aurelius
          </div>
        </div>
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
        {/* Segmented track */}
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
            {/* Check circle */}
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

            {/* Remove — visible on hover (md+) or always on mobile */}
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

      <ChapterRule className="mx-5" />

      {/* ── Intention Card ────────────────────────────────────────── */}
      <div className="px-4 pt-1 pb-4">
        <GlassCard accent>
          <div className="p-4">
            <div className="flex items-center gap-2.5 mb-2.5">
              <span style={{ color: '#c9a84c', fontSize: 18 }}>✦</span>
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
              value={intention}
              onChange={e => saveIntention(e.target.value)}
              rows={2}
            />
          </div>
        </GlassCard>
      </div>

      <ChapterRule className="mx-5" />

      {/* ── Cabinet Check-in ──────────────────────────────────────── */}
      <div className="px-4 pb-4">
        {checkInDone ? (
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
                  Morning Complete
                </div>
                <div
                  className="text-[14px] mt-0.5"
                  style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}
                >
                  Your Cabinet has spoken. Come back tomorrow.
                </div>
              </div>
            </div>
          </GlassCard>
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
                {isLoading ? 'SPEAKING…' : 'SEND TO CABINET'}
              </div>
              <div
                className="text-[18px] font-semibold mt-0.5"
                style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#0f1724' }}
              >
                {isLoading ? 'Your Cabinet speaks…' : 'Begin with the Cabinet ☀️'}
              </div>
            </div>
            <span className="text-xl font-bold" style={{ color: '#0f1724' }}>→</span>
          </button>
        )}
      </div>

      {/* ── Cabinet Response ──────────────────────────────────────── */}
      {checkInResponse && (
        <div className="px-4 pb-4">
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

    </div>
  );
}

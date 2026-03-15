'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserSettings, getTodayCheckin, upsertTodayCheckin } from '@/lib/db';
import { sendCheckInToCabinet } from '@/lib/claudeService';
import { REFLECTION_PROMPTS, STOIC_PROMPTS, getDailyItem } from '@/lib/quotes';
import PageHeader from '@/components/PageHeader';

interface Task {
  id: string;
  title: string;
  done: boolean;
}

const DEFAULT_TASKS: Task[] = [
  { id: '1', title: 'Plan Tomorrow 📜', done: false },
  { id: '2', title: 'Reflect on Your Day 👁️', done: false },
];

export default function EveningPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [reflectionAnswer, setReflectionAnswer] = useState('');
  const [stoicAnswer, setStoicAnswer] = useState('');
  const [checkInResponse, setCheckInResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkInDone, setCheckInDone] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const reflectionPrompt = getDailyItem(REFLECTION_PROMPTS);
  const stoicPrompt = getDailyItem(STOIC_PROMPTS);

  useEffect(() => {
    async function load() {
      const [settings, checkin] = await Promise.all([getUserSettings(), getTodayCheckin()]);
      if (!settings?.user_name) { router.replace('/login'); return; }

      if (checkin?.evening_tasks && checkin.evening_tasks.length > 0) {
        setTasks(checkin.evening_tasks as Task[]);
      } else if (settings.evening_tasks && settings.evening_tasks.length > 0) {
        setTasks((settings.evening_tasks as Task[]).map(t => ({ ...t, done: false })));
      }

      setReflectionAnswer(checkin?.reflection_answer || '');
      setStoicAnswer(checkin?.stoic_answer || '');
      setCheckInDone(checkin?.evening_done === true);
      setLoaded(true);
    }
    load();
  }, [router]);

  const saveTasks = async (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    await upsertTodayCheckin({ evening_tasks: updatedTasks });
  };

  const toggleTask = (id: string) => {
    saveTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: Task = { id: Date.now().toString(), title: newTaskTitle.trim(), done: false };
    saveTasks([...tasks, newTask]);
    setNewTaskTitle('');
  };

  const removeTask = (id: string) => {
    saveTasks(tasks.filter(t => t.id !== id));
  };

  const handleCheckIn = async () => {
    await upsertTodayCheckin({ reflection_answer: reflectionAnswer, stoic_answer: stoicAnswer });
    setIsLoading(true);
    try {
      const response = await sendCheckInToCabinet('evening');
      setCheckInResponse(response);
      await upsertTodayCheckin({ evening_done: true });
      setCheckInDone(true);
    } catch {
      setCheckInResponse('The Cabinet will speak when you return.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!loaded) return null;

  const inputClass = "bg-arete-bg border border-arete-border rounded-lg px-3 py-2 text-arete-text focus:border-arete-gold focus:outline-none w-full";

  return (
    <div className="min-h-screen bg-arete-bg p-6 md:p-8">
      <PageHeader title="Evening Debrief" subtitle="Close the day with reflection" />

      {/* Reflection Prompt */}
      <div className="bg-arete-surface rounded-lg border border-arete-border p-5 mb-4">
        <p className="text-arete-gold font-semibold text-sm mb-2">Evening Reflection</p>
        <p className="text-arete-text text-sm mb-3 italic">{reflectionPrompt}</p>
        <textarea
          className={`${inputClass} resize-none`}
          rows={4}
          placeholder="Your answer..."
          value={reflectionAnswer}
          onChange={e => setReflectionAnswer(e.target.value)}
          onBlur={() => upsertTodayCheckin({ reflection_answer: reflectionAnswer })}
        />
      </div>

      {/* Stoic Prompt */}
      <div className="bg-arete-surface rounded-lg border border-arete-border p-5 mb-6">
        <p className="text-arete-gold font-semibold text-sm mb-2">Stoic Journal</p>
        <p className="text-arete-text text-sm mb-3 italic">{stoicPrompt}</p>
        <textarea
          className={`${inputClass} resize-none`}
          rows={4}
          placeholder="Your answer..."
          value={stoicAnswer}
          onChange={e => setStoicAnswer(e.target.value)}
          onBlur={() => upsertTodayCheckin({ stoic_answer: stoicAnswer })}
        />
      </div>

      {/* Tasks */}
      <div className="bg-arete-surface rounded-lg border border-arete-border p-4 mb-6">
        <h3 className="text-arete-gold font-semibold mb-3">Evening Tasks</h3>
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center gap-3 group">
              <button
                onClick={() => toggleTask(task.id)}
                className={`w-6 h-6 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${task.done ? 'bg-arete-gold border-arete-gold' : 'border-arete-border hover:border-arete-gold'}`}
              >
                {task.done && <span className="text-arete-bg text-xs font-bold">✓</span>}
              </button>
              <span className={`flex-1 text-sm ${task.done ? 'line-through text-arete-muted' : 'text-arete-text'}`}>{task.title}</span>
              <button onClick={() => removeTask(task.id)} className="text-arete-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm">✕</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <input
            className="bg-arete-bg border border-arete-border rounded-lg px-3 py-2 text-arete-text focus:border-arete-gold focus:outline-none flex-1 text-sm"
            placeholder="Add a task..."
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
          />
          <button onClick={addTask} className="bg-arete-gold text-arete-bg font-semibold rounded-lg px-3 py-2 hover:opacity-90 text-sm">+</button>
        </div>
      </div>

      {/* Check-in */}
      {checkInDone ? (
        <div className="bg-arete-surface rounded-lg border border-arete-gold p-4 mb-6">
          <p className="text-arete-gold font-semibold mb-1">✓ Evening Check-in Complete</p>
          <p className="text-arete-muted text-sm">Well done. Come back tomorrow.</p>
        </div>
      ) : (
        <button
          onClick={handleCheckIn}
          disabled={isLoading}
          className="w-full bg-arete-gold text-arete-bg font-semibold rounded-lg px-4 py-3 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity mb-6"
        >
          {isLoading ? 'Your Cabinet is speaking...' : 'Send Evening Check-in to Cabinet 🌙'}
        </button>
      )}

      {/* Cabinet Response */}
      {checkInResponse && (
        <div className="bg-arete-surface rounded-lg border border-arete-border p-5">
          <p className="text-arete-gold font-semibold text-sm mb-3">Your Cabinet speaks:</p>
          <p className="text-arete-text text-sm leading-relaxed whitespace-pre-wrap">{checkInResponse}</p>
        </div>
      )}
    </div>
  );
}

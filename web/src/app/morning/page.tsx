'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserSettings, getLatestCheckIn, createCheckIn, getRoutineTemplates, addRoutineTemplate, deleteRoutineTemplate } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { sendCheckInToCabinet } from '@/lib/claudeService';
import { AFFIRMATIONS, getDailyItem } from '@/lib/quotes';
import PageHeader from '@/components/PageHeader';

interface Task {
  id: string;
  title: string;
  done: boolean;
}

const DEFAULT_TASKS: Task[] = [
  { id: 'default-1', title: 'Eat Breakfast 🫙', done: false },
  { id: 'default-2', title: 'Meditate 🌿', done: false },
];

const DONE_STORAGE_KEY = 'arete_morning_done_ids';

export default function MorningPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [usingDefaults, setUsingDefaults] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [checkInResponse, setCheckInResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkInDone, setCheckInDone] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const affirmation = getDailyItem(AFFIRMATIONS);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const settings = await getUserSettings();
      if (!settings?.user_name) { router.replace('/setup'); return; }

      const templates = await getRoutineTemplates('morning');
      const storedDoneIds: string[] = JSON.parse(
        typeof window !== 'undefined' ? localStorage.getItem(DONE_STORAGE_KEY) || '[]' : '[]'
      );

      if (templates.length > 0) {
        setTasks(templates.map(t => ({
          id: t.id,
          title: t.emoji ? `${t.title} ${t.emoji}` : t.title,
          done: storedDoneIds.includes(t.id),
        })));
        setUsingDefaults(false);
      } else {
        // Fall back to settings or hardcoded defaults — not synced, just local
        const fallback = settings.morning_tasks?.length > 0
          ? (settings.morning_tasks as Task[]).map(t => ({ ...t, done: false }))
          : DEFAULT_TASKS;
        setTasks(fallback);
        setUsingDefaults(true);
      }

      const latestCheckIn = await getLatestCheckIn('morning');
      if (latestCheckIn) {
        setCheckInDone(true);
        setCheckInResponse(latestCheckIn.cabinet_response);
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

  const toggleTask = (id: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTasks(updated);
    persistDone(updated);
  };

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    setNewTaskTitle('');

    if (usingDefaults) {
      // No templates in DB yet — add locally
      const newTask: Task = { id: Date.now().toString(), title: newTaskTitle.trim(), done: false };
      setTasks(prev => [...prev, newTask]);
      return;
    }

    const template = await addRoutineTemplate('morning', newTaskTitle.trim(), undefined, tasks.length);
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
      const taskSummary = tasks.map(t => `${t.title} ${t.done ? '✓' : '✗'}`).join(', ');
      const userInput = `Morning tasks: ${taskSummary}`;
      const response = await sendCheckInToCabinet('morning');
      await createCheckIn('morning', userInput, response);
      setCheckInResponse(response);
      setCheckInDone(true);
    } catch {
      setCheckInResponse('The Cabinet will speak when you return.');
    } finally {
      setIsLoading(false);
    }
  };

  const completedCount = tasks.filter(t => t.done).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  if (!loaded) return null;

  return (
    <div className="min-h-screen bg-arete-bg p-6 md:p-8">
      <PageHeader title="Morning Routine" subtitle="Begin the day with intention" />

      <div className="bg-arete-surface rounded-lg border-l-4 border-arete-gold p-5 mb-6">
        <p className="text-arete-gold text-sm italic leading-relaxed">&ldquo;{affirmation}&rdquo;</p>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-arete-muted text-sm">{completedCount}/{tasks.length} tasks complete</span>
          <span className="text-arete-gold text-sm font-semibold">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-arete-border rounded-full overflow-hidden">
          <div className="h-full bg-arete-gold transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="bg-arete-surface rounded-lg border border-arete-border p-4 mb-6">
        <h3 className="text-arete-gold font-semibold mb-3">Morning Tasks</h3>
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center gap-3 group">
              <button
                onClick={() => toggleTask(task.id)}
                className={`w-6 h-6 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${task.done ? 'bg-arete-gold border-arete-gold' : 'border-arete-border hover:border-arete-gold'}`}
              >
                {task.done && <span className="text-arete-bg text-xs font-bold">✓</span>}
              </button>
              <span className={`flex-1 text-sm ${task.done ? 'line-through text-arete-muted' : 'text-arete-text'}`}>
                {task.title}
              </span>
              <button
                onClick={() => removeTask(task.id)}
                className="text-arete-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm"
              >
                ✕
              </button>
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
          <button onClick={addTask} className="bg-arete-gold text-arete-bg font-semibold rounded-lg px-3 py-2 hover:opacity-90 text-sm">
            +
          </button>
        </div>
      </div>

      {checkInDone ? (
        <div className="bg-arete-surface rounded-lg border border-arete-gold p-4 mb-6">
          <p className="text-arete-gold font-semibold mb-1">✓ Morning Check-in Complete</p>
          <p className="text-arete-muted text-sm">Your Cabinet has spoken for today. Come back tomorrow.</p>
        </div>
      ) : (
        <button
          onClick={handleCheckIn}
          disabled={isLoading}
          className="w-full bg-arete-gold text-arete-bg font-semibold rounded-lg px-4 py-3 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity mb-6"
        >
          {isLoading ? 'Your Cabinet is speaking...' : 'Send Morning Check-in to Cabinet ☀️'}
        </button>
      )}

      {checkInResponse && (
        <div className="bg-arete-surface rounded-lg border border-arete-border p-5">
          <p className="text-arete-gold font-semibold text-sm mb-3">Your Cabinet speaks:</p>
          <p className="text-arete-text text-sm leading-relaxed whitespace-pre-wrap">{checkInResponse}</p>
        </div>
      )}
    </div>
  );
}

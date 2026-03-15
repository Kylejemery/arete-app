'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserSettings, getTodayCheckin, upsertTodayCheckin } from '@/lib/db';
import { sendCheckInToCabinet } from '@/lib/claudeService';
import { AFFIRMATIONS, getDailyItem } from '@/lib/quotes';
import PageHeader from '@/components/PageHeader';

interface Task {
  id: string;
  title: string;
  done: boolean;
}

const DEFAULT_TASKS: Task[] = [
  { id: '1', title: 'Eat Breakfast 🫙', done: false },
  { id: '2', title: 'Meditate 🌿', done: false },
];

export default function MorningPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [checkInResponse, setCheckInResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkInDone, setCheckInDone] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const affirmation = getDailyItem(AFFIRMATIONS);

  useEffect(() => {
    async function load() {
      const [settings, checkin] = await Promise.all([getUserSettings(), getTodayCheckin()]);
      if (!settings?.user_name) { router.replace('/login'); return; }

      if (checkin?.morning_tasks && checkin.morning_tasks.length > 0) {
        setTasks(checkin.morning_tasks as Task[]);
      } else if (settings.morning_tasks && settings.morning_tasks.length > 0) {
        setTasks((settings.morning_tasks as Task[]).map(t => ({ ...t, done: false })));
      }

      setCheckInDone(checkin?.morning_done === true);
      setLoaded(true);
    }
    load();
  }, [router]);

  const saveTasks = async (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    await upsertTodayCheckin({ morning_tasks: updatedTasks });
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
    setIsLoading(true);
    try {
      const response = await sendCheckInToCabinet('morning');
      setCheckInResponse(response);
      await upsertTodayCheckin({ morning_done: true });
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

      {/* Affirmation */}
      <div className="bg-arete-surface rounded-lg border-l-4 border-arete-gold p-5 mb-6">
        <p className="text-arete-gold text-sm italic leading-relaxed">&ldquo;{affirmation}&rdquo;</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-arete-muted text-sm">{completedCount}/{tasks.length} tasks complete</span>
          <span className="text-arete-gold text-sm font-semibold">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-arete-border rounded-full overflow-hidden">
          <div className="h-full bg-arete-gold transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Task List */}
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

        {/* Add Task */}
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

      {/* Check-in Button */}
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

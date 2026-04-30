'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserSettings, getGoals, completeGoal, deleteGoal } from '@/lib/db';
import type { Goal } from '@/lib/types';
import PageHeader from '@/components/PageHeader';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function GoalsPage() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const settings = await getUserSettings();
      if (!settings?.user_name) { router.replace('/setup'); return; }
      const data = await getGoals(user.id);
      setGoals(data);
      setLoading(false);
    }
    load();
  }, [router]);

  const handleComplete = async (id: string) => {
    try {
      await completeGoal(id);
      setGoals(prev => prev.map(g =>
        g.id === id ? { ...g, completed: true, completed_at: new Date().toISOString() } : g
      ));
    } catch (e) {
      console.error('completeGoal error:', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this goal? This cannot be undone.')) return;
    try {
      await deleteGoal(id);
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (e) {
      console.error('deleteGoal error:', e);
    }
  };

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);
  const displayed = activeTab === 'active' ? activeGoals : completedGoals;

  if (loading) {
    return (
      <div className="min-h-screen bg-arete-bg flex items-center justify-center">
        <p className="text-arete-muted text-sm">Loading goals...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-arete-bg p-6 md:p-8">
      <PageHeader title="Goals 🎯" subtitle="Your path to excellence" />

      {/* Tab switcher */}
      <div className="flex bg-arete-card rounded-xl p-1 mb-6 max-w-xs">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'active' ? 'bg-arete-gold text-arete-bg' : 'text-arete-muted hover:text-arete-text'
          }`}
        >
          Active ({activeGoals.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'completed' ? 'bg-arete-gold text-arete-bg' : 'text-arete-muted hover:text-arete-text'
          }`}
        >
          Completed ({completedGoals.length})
        </button>
      </div>

      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-5xl mb-4" style={{ opacity: 0.15 }}>🎯</div>
          <p className="text-arete-text font-semibold mb-1">
            {activeTab === 'active' ? 'No active goals' : 'No completed goals yet'}
          </p>
          <p className="text-arete-muted text-sm mt-1">
            {activeTab === 'active'
              ? 'Add goals in Know Thyself on mobile to see them here.'
              : 'Complete a goal to see it here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-w-2xl">
          {displayed.map(goal => (
            <div
              key={goal.id}
              className={`bg-arete-surface rounded-lg border p-4 ${
                goal.completed ? 'border-arete-border opacity-75' : 'border-arete-border'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {goal.category && (
                      <span className="text-xs text-arete-muted bg-arete-bg border border-arete-border rounded-full px-2 py-0.5 capitalize">
                        {goal.category}
                      </span>
                    )}
                    {goal.source === 'onboarding' && (
                      <span className="text-xs text-arete-muted bg-arete-bg border border-arete-border rounded-full px-2 py-0.5">
                        From onboarding
                      </span>
                    )}
                    {goal.completed && (
                      <span className="text-xs text-green-400 font-semibold">✓ Done</span>
                    )}
                  </div>
                  <p className={`text-sm leading-relaxed font-medium ${goal.completed ? 'text-arete-muted line-through' : 'text-arete-text'}`}>
                    {goal.title}
                  </p>
                  {goal.description && (
                    <p className="text-arete-muted text-xs mt-1 leading-relaxed">{goal.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-arete-muted text-xs">Added {formatDate(goal.created_at)}</span>
                    {goal.target_date && (
                      <>
                        <span className="text-arete-border text-xs">·</span>
                        <span className="text-arete-muted text-xs">Target {formatDate(goal.target_date)}</span>
                      </>
                    )}
                    {goal.completed_at && (
                      <>
                        <span className="text-arete-border text-xs">·</span>
                        <span className="text-green-400 text-xs">Completed {formatDate(goal.completed_at)}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1 flex-shrink-0">
                  {!goal.completed && (
                    <button
                      onClick={() => handleComplete(goal.id)}
                      className="text-xs text-arete-gold border border-arete-gold rounded px-2 py-1 hover:bg-arete-gold hover:text-arete-bg transition-colors"
                    >
                      Complete
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="text-xs text-arete-muted border border-arete-border rounded px-2 py-1 hover:text-red-400 hover:border-red-400 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserSettings, getGoals, completeGoal, deleteGoal } from '@/lib/db';
import type { Goal } from '@/lib/types';
import GlassCard from '@/components/GlassCard';
import ChapterRule from '@/components/ChapterRule';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getMilestonePct(goal: Goal): number {
  if (!goal.target_date) return 0;
  const created = new Date(goal.created_at).getTime();
  const target = new Date(goal.target_date).getTime();
  const now = Date.now();
  const range = target - created;
  if (range <= 0) return 1;
  return Math.min(1, Math.max(0, (now - created) / range));
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
      <div className="min-h-screen flex items-center justify-center">
        <span
          className="text-[11px] tracking-[2px] uppercase"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
        >
          Loading…
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-5 pt-3 pb-5">
        <div
          className="text-[10px] tracking-[1.8px] uppercase mb-1"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
        >
          Chapter V · Telos
        </div>
        <h1
          className="text-[32px] font-medium leading-none tracking-tight"
          style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
        >
          Your path to<br />
          <em style={{ color: '#c9a84c' }}>excellence.</em>
        </h1>
      </div>

      <ChapterRule className="mx-5" />

      {/* ── Tab switcher ────────────────────────────────────────── */}
      <div className="px-4 pb-5">
        <div
          className="flex gap-1 p-1 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {(['active', 'completed'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="flex-1 py-2 rounded-lg text-[11px] tracking-[1px] uppercase transition-all"
              style={
                activeTab === t
                  ? { background: '#c9a84c', color: '#0f1724', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }
                  : { color: '#9aa0a6', fontFamily: 'var(--font-mono, monospace)' }
              }
            >
              {t} ({t === 'active' ? activeGoals.length : completedGoals.length})
            </button>
          ))}
        </div>
      </div>

      {/* ── Goal list ───────────────────────────────────────────── */}
      <div className="px-4">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-[48px] mb-4" style={{ opacity: 0.12 }}>🎯</div>
            <p
              className="text-[15px] italic"
              style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}
            >
              {activeTab === 'active' ? 'No active goals.' : 'No completed goals yet.'}
            </p>
            <p
              className="text-[11px] tracking-[1px] uppercase mt-1"
              style={{ fontFamily: 'var(--font-mono, monospace)', color: 'rgba(201,168,76,0.5)' }}
            >
              {activeTab === 'active' ? 'Add goals via the mobile app.' : 'Complete a goal to see it here.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-2xl">
            {displayed.map(goal => {
              const pct = goal.completed ? 1 : getMilestonePct(goal);
              const milestones = [0.25, 0.5, 0.75, 1];

              return (
                <GlassCard key={goal.id} className={goal.completed ? 'opacity-70' : ''}>
                  <div className="p-4">
                    {/* Tags row */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {goal.category && (
                        <span
                          className="text-[10px] tracking-[1px] uppercase px-2 py-0.5 rounded-md"
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            background: 'rgba(201,168,76,0.1)',
                            border: '1px solid rgba(201,168,76,0.2)',
                            color: '#c9a84c',
                          }}
                        >
                          {goal.category}
                        </span>
                      )}
                      {goal.source === 'onboarding' && (
                        <span
                          className="text-[10px] tracking-[1px] uppercase px-2 py-0.5 rounded-md"
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#9aa0a6',
                          }}
                        >
                          Onboarding
                        </span>
                      )}
                      {goal.completed && (
                        <span
                          className="text-[10px] tracking-[1px] uppercase px-2 py-0.5 rounded-md"
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            background: 'rgba(74,222,128,0.1)',
                            border: '1px solid rgba(74,222,128,0.25)',
                            color: '#4ade80',
                          }}
                        >
                          ✓ Done
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <p
                      className="text-[17px] font-medium leading-snug mb-1"
                      style={{
                        fontFamily: 'var(--font-serif, Georgia, serif)',
                        color: goal.completed ? '#9aa0a6' : '#e6eef8',
                        textDecoration: goal.completed ? 'line-through' : 'none',
                        textDecorationColor: '#8a6f27',
                      }}
                    >
                      {goal.title}
                    </p>

                    {goal.description && (
                      <p
                        className="text-[13px] leading-relaxed mb-2"
                        style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#9aa0a6' }}
                      >
                        {goal.description}
                      </p>
                    )}

                    {/* Progress track + milestones */}
                    {goal.target_date && !goal.completed && (
                      <div className="mb-3">
                        <div
                          className="relative h-[3px] rounded-sm mb-2"
                          style={{ background: 'rgba(201,168,76,0.12)' }}
                        >
                          <div
                            className="absolute left-0 top-0 h-full rounded-sm transition-all duration-500"
                            style={{
                              width: `${pct * 100}%`,
                              background: 'linear-gradient(90deg, #8a6f27, #e3c77a)',
                              boxShadow: pct > 0 ? '0 0 6px rgba(201,168,76,0.4)' : 'none',
                            }}
                          />
                          {milestones.map(m => (
                            <div
                              key={m}
                              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                              style={{
                                left: `calc(${m * 100}% - 4px)`,
                                background: pct >= m ? '#c9a84c' : 'rgba(201,168,76,0.2)',
                                border: `1px solid ${pct >= m ? '#c9a84c' : 'rgba(201,168,76,0.15)'}`,
                                boxShadow: pct >= m ? '0 0 6px rgba(201,168,76,0.5)' : 'none',
                              }}
                            />
                          ))}
                        </div>
                        <div className="flex justify-between items-center">
                          <span
                            className="text-[10px]"
                            style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                          >
                            Started {formatDate(goal.created_at)}
                          </span>
                          <span
                            className="text-[10px]"
                            style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                          >
                            Target {formatDate(goal.target_date)}
                          </span>
                        </div>
                      </div>
                    )}

                    {!goal.target_date && (
                      <div
                        className="text-[10px] mb-2"
                        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#9aa0a6' }}
                      >
                        Added {formatDate(goal.created_at)}
                      </div>
                    )}

                    {goal.completed_at && (
                      <div
                        className="text-[10px] mb-2"
                        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#4ade80' }}
                      >
                        Completed {formatDate(goal.completed_at)}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-3">
                      {!goal.completed && (
                        <button
                          onClick={() => handleComplete(goal.id)}
                          className="text-[10px] tracking-[1px] uppercase px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            background: 'rgba(201,168,76,0.12)',
                            border: '1px solid rgba(201,168,76,0.3)',
                            color: '#c9a84c',
                          }}
                        >
                          Mark Complete
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="text-[10px] tracking-[1px] uppercase px-3 py-1.5 rounded-lg transition-all hover:text-red-400"
                        style={{
                          fontFamily: 'var(--font-mono, monospace)',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: '#9aa0a6',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

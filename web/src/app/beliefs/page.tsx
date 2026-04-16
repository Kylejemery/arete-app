'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getBeliefs, createBelief, encodeBelief, deleteBelief } from '@/lib/db';
import type { Belief } from '@/lib/types';
import PageHeader from '@/components/PageHeader';

const CATEGORIES = ['philosophy', 'identity', 'principle', 'goal', 'habit'] as const;
type Category = typeof CATEGORIES[number];

export default function BeliefsPage() {
  const router = useRouter();
  const [beliefs, setBeliefs] = useState<Belief[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('philosophy');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const data = await getBeliefs(user.id);
      setBeliefs(data);
      setLoading(false);
    }
    load();
  }, [router]);

  const refreshBeliefs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const data = await getBeliefs(user.id);
    setBeliefs(data);
  };

  const handleAdd = async () => {
    if (!newContent.trim() || saving) return;
    setSaving(true);
    try {
      await createBelief(newContent.trim(), newCategory);
      setNewContent('');
      setNewCategory('philosophy');
      setShowAdd(false);
      await refreshBeliefs();
    } catch (e) {
      console.error('createBelief error:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleEncode = async (id: string) => {
    try {
      await encodeBelief(id);
      await refreshBeliefs();
    } catch (e) {
      console.error('encodeBelief error:', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this belief? This cannot be undone.')) return;
    try {
      await deleteBelief(id);
      await refreshBeliefs();
    } catch (e) {
      console.error('deleteBelief error:', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-arete-bg flex items-center justify-center">
        <p className="text-arete-muted text-sm">Loading beliefs...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-arete-bg p-6 md:p-8">
      <div className="flex items-start justify-between mb-6">
        <PageHeader title="Beliefs" subtitle="Your encoded convictions" />
        <button
          onClick={() => setShowAdd(s => !s)}
          className="bg-arete-gold text-arete-bg font-semibold rounded-lg px-4 py-2 text-sm hover:opacity-90 flex-shrink-0"
        >
          {showAdd ? 'Cancel' : '+ Add Belief'}
        </button>
      </div>

      {/* Add Belief panel */}
      {showAdd && (
        <div className="bg-arete-surface border border-arete-border rounded-lg p-4 mb-6 space-y-3">
          <textarea
            className="w-full bg-arete-bg border border-arete-border rounded-lg px-3 py-2 text-arete-text focus:border-arete-gold focus:outline-none text-sm resize-none"
            rows={3}
            placeholder="State your belief..."
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setNewCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize border transition-colors ${
                  newCategory === cat
                    ? 'bg-arete-gold text-arete-bg border-arete-gold'
                    : 'bg-arete-bg text-arete-muted border-arete-border hover:border-arete-gold hover:text-arete-text'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newContent.trim() || saving}
              className="bg-arete-gold text-arete-bg font-semibold rounded-lg px-4 py-2 text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewContent(''); setNewCategory('philosophy'); }}
              className="text-arete-muted hover:text-arete-text text-sm px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {beliefs.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">📜</p>
          <p className="text-arete-text font-semibold mb-1">No beliefs yet</p>
          <p className="text-arete-muted text-sm">Add your first encoded conviction above.</p>
        </div>
      )}

      {/* Belief list */}
      <div className="space-y-3">
        {beliefs.map(belief => (
          <div
            key={belief.id}
            className={`rounded-lg p-4 border ${
              belief.encoded
                ? 'bg-arete-surface border-arete-gold'
                : 'bg-arete-surface border-arete-border'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs text-arete-muted bg-arete-bg border border-arete-border rounded-full px-2 py-0.5 capitalize">
                    {belief.category}
                  </span>
                  {belief.encoded && (
                    <span className="text-xs text-arete-gold font-semibold bg-arete-bg border border-arete-gold rounded-full px-2 py-0.5">
                      Encoded
                    </span>
                  )}
                </div>
                <p className={`text-sm leading-relaxed ${belief.encoded ? 'text-arete-gold' : 'text-arete-text'}`}>
                  {belief.content}
                </p>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                {!belief.encoded && (
                  <button
                    onClick={() => handleEncode(belief.id)}
                    className="text-xs text-arete-gold border border-arete-gold rounded px-2 py-1 hover:bg-arete-gold hover:text-arete-bg transition-colors"
                  >
                    Encode
                  </button>
                )}
                <button
                  onClick={() => handleDelete(belief.id)}
                  className="text-xs text-arete-muted border border-arete-border rounded px-2 py-1 hover:text-red-400 hover:border-red-400 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

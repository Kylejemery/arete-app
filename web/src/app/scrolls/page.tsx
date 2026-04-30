'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserSettings, getScrolls } from '@/lib/db';
import type { Scroll } from '@/lib/types';
import PageHeader from '@/components/PageHeader';

const COUNSELOR_LABELS: Record<string, string> = {
  marcus: 'Marcus Aurelius',
  epictetus: 'Epictetus',
  seneca: 'Seneca',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ScrollsPage() {
  const router = useRouter();
  const [scrolls, setScrolls] = useState<Scroll[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const settings = await getUserSettings();
      if (!settings?.user_name) { router.replace('/setup'); return; }
      const data = await getScrolls(user.id);
      setScrolls(data);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-arete-bg flex items-center justify-center">
        <p className="text-arete-muted text-sm">Loading scrolls...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-arete-bg p-6 md:p-8">
      <PageHeader title="Scrolls 📜" subtitle="Wisdom generated for your goals" />

      {scrolls.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-5xl mb-4" style={{ opacity: 0.15 }}>📜</div>
          <p className="text-arete-text font-semibold mb-1">No scrolls yet</p>
          <p className="text-arete-muted text-sm mt-1">
            Scrolls are generated from your goals. Complete Know Thyself to receive your first scroll.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {scrolls.map(scroll => {
            const isExpanded = expandedId === scroll.id;
            return (
              <div
                key={scroll.id}
                className="bg-arete-surface rounded-lg border border-arete-border overflow-hidden"
              >
                {/* Header */}
                <button
                  className="w-full text-left p-5 flex items-start justify-between gap-3 hover:bg-arete-bg transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : scroll.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-arete-gold font-semibold text-sm mb-1">
                      {scroll.title}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-arete-muted text-xs">
                        {COUNSELOR_LABELS[scroll.counselor] ?? scroll.counselor}
                      </span>
                      <span className="text-arete-border text-xs">·</span>
                      <span className="text-arete-muted text-xs">{formatDate(scroll.created_at)}</span>
                      {scroll.read_count ? (
                        <>
                          <span className="text-arete-border text-xs">·</span>
                          <span className="text-arete-muted text-xs">Read {scroll.read_count}×</span>
                        </>
                      ) : null}
                    </div>
                    {scroll.goal_source && (
                      <p className="text-arete-muted text-xs mt-1 italic truncate">
                        Goal: {scroll.goal_source}
                      </p>
                    )}
                  </div>
                  <span className="text-arete-muted text-sm flex-shrink-0 mt-0.5">
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </button>

                {/* Body */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-arete-border">
                    <p className="text-arete-text text-sm leading-relaxed whitespace-pre-wrap pt-4">
                      {scroll.body}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

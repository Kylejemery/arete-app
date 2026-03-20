'use client';

import { useEffect, useState } from 'react';
import { getCounselors } from '@/lib/db';
import type { Counselor } from '@/lib/types';
import CounselorCard from '@/components/CounselorCard';

type Category = 'all' | 'stoics' | 'warriors' | 'athletes' | 'builders' | 'writers' | 'spiritual';

const CATEGORIES: Category[] = ['all', 'stoics', 'warriors', 'athletes', 'builders', 'writers', 'spiritual'];

interface CounselorLibraryProps {
  selectedSlugs: string[];
  onToggle: (slug: string) => void;
  maxSelections?: number;
}

export default function CounselorLibrary({ selectedSlugs, onToggle, maxSelections = 5 }: CounselorLibraryProps) {
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>('all');

  useEffect(() => {
    getCounselors()
      .then(data => setCounselors(data ?? []))
      .catch(() => setError('Failed to load counselors. Please refresh.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-arete-muted">Loading counselors...</div>;
  }

  if (error) {
    return <div className="text-red-400 text-sm">{error}</div>;
  }

  const filtered = activeCategory === 'all'
    ? counselors
    : counselors.filter(c => c.category === activeCategory);

  return (
    <div>
      {/* Category filter bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 text-sm px-3 py-1.5 rounded-full capitalize transition-colors ${
              activeCategory === cat
                ? 'bg-arete-gold text-arete-bg font-medium'
                : 'bg-arete-surface border border-arete-border text-arete-muted hover:border-arete-gold'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Selection counter */}
      <p className="text-arete-muted text-sm mb-4">
        {selectedSlugs.length} of {maxSelections} selected
      </p>

      {/* Counselor grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(counselor => (
          <CounselorCard
            key={counselor.slug}
            counselor={counselor}
            isSelected={selectedSlugs.includes(counselor.slug)}
            isDisabled={selectedSlugs.length >= maxSelections && !selectedSlugs.includes(counselor.slug)}
            onToggle={onToggle}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-arete-muted text-sm text-center py-8">No counselors in this category yet.</p>
      )}
    </div>
  );
}

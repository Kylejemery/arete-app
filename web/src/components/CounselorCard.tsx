'use client';

import type { Counselor } from '@/lib/types';

interface CounselorCardProps {
  counselor: Counselor;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: (slug: string) => void;
}

const categoryBadgeClass: Record<string, string> = {
  stoics: 'bg-arete-gold/20 text-arete-gold',
  warriors: 'bg-red-900/40 text-red-300',
  athletes: 'bg-blue-900/40 text-blue-300',
  builders: 'bg-green-900/40 text-green-300',
  writers: 'bg-purple-900/40 text-purple-300',
  spiritual: 'bg-indigo-900/40 text-indigo-300',
};

const challengeBadgeClass: Record<string, string> = {
  direct: 'bg-red-900/30 text-red-400',
  firm: 'bg-yellow-900/30 text-yellow-400',
  gentle: 'bg-green-900/30 text-green-400',
};

export default function CounselorCard({ counselor, isSelected, isDisabled, onToggle }: CounselorCardProps) {
  const handleClick = () => {
    if (!isDisabled) {
      onToggle(counselor.slug);
    }
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
      aria-pressed={isSelected}
      aria-disabled={isDisabled}
      className={`
        relative p-4 rounded-lg transition-all
        ${isSelected
          ? 'bg-arete-surface border-2 border-arete-gold ring-1 ring-arete-gold/30'
          : 'bg-arete-surface border border-arete-border'}
        ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:border-arete-gold/60'}
      `}
    >
      {/* Badges row */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${categoryBadgeClass[counselor.category] ?? 'bg-arete-border text-arete-muted'}`}>
          {counselor.category}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${challengeBadgeClass[counselor.challenge_level] ?? 'bg-arete-border text-arete-muted'}`}>
          {counselor.challenge_level}
        </span>
      </div>

      {/* Name */}
      <p className="text-arete-text font-bold text-sm leading-snug">{counselor.name}</p>

      {/* Dates */}
      {counselor.dates && (
        <p className="text-arete-muted text-xs mt-0.5">{counselor.dates}</p>
      )}

      {/* Description */}
      <p className="text-arete-muted text-sm mt-2 line-clamp-2">{counselor.description}</p>

      {/* Selected checkmark */}
      {isSelected && (
        <span className="absolute bottom-3 right-3 text-arete-gold font-bold text-base leading-none">✓</span>
      )}
    </div>
  );
}

'use client';

import type { Agent, AgentId, Tier } from '@/types';
import { getAgentsForTier } from '@/lib/agents';

interface AgentSelectorProps {
  selectedId: AgentId;
  tier: Tier;
  onChange: (id: AgentId) => void;
}

export function AgentSelector({ selectedId, tier, onChange }: AgentSelectorProps) {
  const available = getAgentsForTier(tier);

  return (
    <div className="flex flex-wrap gap-2">
      {available.map(agent => (
        <AgentChip
          key={agent.id}
          agent={agent}
          selected={agent.id === selectedId}
          onClick={() => onChange(agent.id)}
        />
      ))}
    </div>
  );
}

function AgentChip({
  agent,
  selected,
  onClick,
}: {
  agent: Agent;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        selected
          ? 'bg-academy-gold text-academy-bg'
          : 'border border-academy-border text-academy-muted hover:border-academy-gold hover:text-academy-text'
      }`}
    >
      <span>{agent.emoji}</span>
      <span>{agent.name}</span>
    </button>
  );
}

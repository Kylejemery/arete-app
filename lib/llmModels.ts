// LLM options users can assign per counselor. Must stay in sync with
// ALLOWED_COUNSELOR_MODELS in server/index.js — anything else the server
// silently falls back to the default.
export interface CounselorModelOption {
  id: string;
  label: string;
  provider: 'Anthropic' | 'OpenAI' | 'Google' | 'xAI';
}

// The server clamps whatever the client sends to the subscription tier
// (free → Haiku, premium → Sonnet/Haiku, pro → everything), so this list is
// presentation only — never enforcement.
export const COUNSELOR_MODEL_OPTIONS: CounselorModelOption[] = [
  { id: 'claude-opus-4-6', label: 'Claude Opus', provider: 'Anthropic' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet', provider: 'Anthropic' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku', provider: 'Anthropic' },
  { id: 'gpt-5.1', label: 'GPT-5.1', provider: 'OpenAI' },
  { id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro', provider: 'Google' },
  { id: 'grok-4-fast-non-reasoning', label: 'Grok 4', provider: 'xAI' },
];

export const DEFAULT_COUNSELOR_MODEL = 'claude-opus-4-6';

/** Thread/short ids ('futureSelf') → server counselor ids ('future-self'). */
export function counselorModelKey(counselorId: string): string {
  return counselorId === 'futureSelf' ? 'future-self' : counselorId;
}

export function modelForCounselor(
  counselorModels: Record<string, string> | null | undefined,
  counselorId: string
): string {
  const chosen = counselorModels?.[counselorModelKey(counselorId)];
  return COUNSELOR_MODEL_OPTIONS.some(o => o.id === chosen) ? (chosen as string) : DEFAULT_COUNSELOR_MODEL;
}

// ─── What each tier may choose (retention plan R12 g) ────────────────────
// Mirrors resolveModelForTier in server/index.js, so the picker only offers
// what the server will actually run: free runs Haiku with no choice, premium
// runs Sonnet with Haiku selectable, pro gets every model. The web copy in
// web/src/lib/llmModels.ts carries the same two functions.
export type ModelTier = 'free' | 'premium' | 'pro';

const PREMIUM_MODEL_IDS = ['claude-sonnet-4-6', 'claude-haiku-4-5'];

export function modelOptionsForTier(tier: ModelTier | string): CounselorModelOption[] {
  if (tier === 'pro') return COUNSELOR_MODEL_OPTIONS;
  if (tier === 'premium') return COUNSELOR_MODEL_OPTIONS.filter(o => PREMIUM_MODEL_IDS.includes(o.id));
  return [];
}

export function defaultModelForTier(tier: ModelTier | string): string {
  if (tier === 'pro') return DEFAULT_COUNSELOR_MODEL;
  if (tier === 'premium') return 'claude-sonnet-4-6';
  return 'claude-haiku-4-5';
}

// The model a counselor will really run on for this tier: the stored choice
// when the tier may use it, otherwise the tier default.
export function effectiveModelForTier(tier: ModelTier | string, stored: string | null | undefined): string {
  const allowed = modelOptionsForTier(tier);
  return stored && allowed.some(o => o.id === stored) ? stored : defaultModelForTier(tier);
}

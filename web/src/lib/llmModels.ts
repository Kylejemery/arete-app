// LLM options users can assign per counselor. Must stay in sync with
// ALLOWED_COUNSELOR_MODELS in server/index.js and lib/llmModels.ts (mobile)
// — anything else the server silently falls back to the default.
export interface CounselorModelOption {
  id: string;
  label: string;
  provider: 'Anthropic' | 'OpenAI' | 'Google' | 'xAI';
}

export const COUNSELOR_MODEL_OPTIONS: CounselorModelOption[] = [
  { id: 'claude-opus-4-6', label: 'Claude Opus', provider: 'Anthropic' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet', provider: 'Anthropic' },
  // Premium may pick Haiku for faster replies (server resolveModelForTier);
  // the web list was missing it, so a premium web member had one real option.
  { id: 'claude-haiku-4-5', label: 'Claude Haiku', provider: 'Anthropic' },
  { id: 'gpt-5.1', label: 'GPT-5.1', provider: 'OpenAI' },
  { id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro', provider: 'Google' },
  { id: 'grok-4-fast-non-reasoning', label: 'Grok 4', provider: 'xAI' },
];

export const DEFAULT_COUNSELOR_MODEL = 'claude-opus-4-6';

// Web cabinet slugs → server counselor ids. These ids are the keys used in
// the counselor_models setting and by the parallel roster in server/index.js
// (SLUG_TO_COUNSELOR_ID). Slugs not listed here pass through unchanged.
const SLUG_TO_SERVER_ID: Record<string, string> = {
  'marcus-aurelius': 'marcus',
  'david-goggins': 'goggins',
  'theodore-roosevelt': 'roosevelt',
  'future-self': 'future-self',
  futureSelf: 'future-self',
};

export function counselorModelKey(slug: string): string {
  return SLUG_TO_SERVER_ID[slug] ?? slug;
}

export function modelForCounselor(
  counselorModels: Record<string, string> | null | undefined,
  slug: string
): string {
  const chosen = counselorModels?.[counselorModelKey(slug)];
  return COUNSELOR_MODEL_OPTIONS.some(o => o.id === chosen) ? (chosen as string) : DEFAULT_COUNSELOR_MODEL;
}

// ─── What each tier may choose (retention plan R12 g) ────────────────────
// Mirrors resolveModelForTier in server/index.js, so the picker only offers
// what the server will actually run: free runs Haiku with no choice, premium
// runs Sonnet with Haiku selectable, pro gets every model. The mobile copy in
// lib/llmModels.ts carries the same two functions.
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

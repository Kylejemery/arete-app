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

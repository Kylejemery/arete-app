// LLM options users can assign per counselor. Must stay in sync with
// ALLOWED_COUNSELOR_MODELS in server/index.js — anything else the server
// silently falls back to the default.
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

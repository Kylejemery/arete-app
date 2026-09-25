// Pronouns for system-generated text about the person (activation run B,
// Part B4). they/them/their unless the person chose he/him or she/her in
// Settings. Mirrored in web/src/lib/pronouns.ts and lib/pronouns.ts.
export type PronounSetting = 'he/him' | 'she/her' | 'they/them' | 'prefer_not_to_say';

export const PRONOUN_OPTIONS: { value: PronounSetting; label: string }[] = [
  { value: 'he/him', label: 'he/him' },
  { value: 'she/her', label: 'she/her' },
  { value: 'they/them', label: 'they/them' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export interface Pronouns {
  subject: string;    // they
  object: string;     // them
  possessive: string; // their
}

export function pronounsFor(setting: string | null | undefined): Pronouns {
  if (setting === 'he/him') return { subject: 'he', object: 'him', possessive: 'his' };
  if (setting === 'she/her') return { subject: 'she', object: 'her', possessive: 'her' };
  return { subject: 'they', object: 'them', possessive: 'their' };
}

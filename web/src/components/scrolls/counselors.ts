/** Scroll authors, as stored in `scrolls.counselor`. */
export const COUNSELOR_LABELS: Record<string, string> = {
  marcus: 'Marcus Aurelius',
  epictetus: 'Epictetus',
  seneca: 'Seneca',
};

export function counselorLabel(slug: string): string {
  return COUNSELOR_LABELS[slug] ?? slug;
}

/** `Mar 3, 2026` — the format both scroll screens use on mobile. */
export function formatScrollDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

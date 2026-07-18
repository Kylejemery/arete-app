// The standing attribution note for essays developed in Scribe chat mode.
// A feature, not a disclaimer: Kyle's byline, developed with Arete, disclosed.
// Single source of truth — edit the wording here and nowhere else. Appended
// on export only; nothing in Scribe posts or publishes anywhere.

export const DEVELOPED_WITH_ARETE = '*Developed with Arete.*'

export function withAttribution(draftMarkdown: string): string {
  return `${draftMarkdown.trimEnd()}\n\n---\n\n${DEVELOPED_WITH_ARETE}\n`
}

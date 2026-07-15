import type { ScribeAuthor } from './types'

// citation_key generation: first author's family name + year ('hadot1995'),
// falling back to a title slug when authors are missing. Uniqueness against
// existing keys is resolved with letter suffixes ('hadot1995b') — the same
// convention BibTeX users expect.

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

export function baseCitationKey(
  authors: ScribeAuthor[],
  year: string | null,
  title: string
): string {
  const family = authors[0]?.family ? slugify(authors[0].family) : ''
  const yr = (year ?? '').replace(/[^0-9]/g, '')
  if (family) return `${family}${yr || 'nd'}`
  const titleSlug = slugify(title).slice(0, 20)
  return `${titleSlug || 'source'}${yr}`
}

export function dedupeCitationKey(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base
  for (let i = 0; i < 26; i++) {
    const candidate = `${base}${String.fromCharCode(98 + i)}` // b, c, d…
    if (!existing.has(candidate)) return candidate
  }
  // Pathological collision count — fall back to a numeric suffix.
  let n = 2
  while (existing.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

// Parse 'Detected: Last, First; Last2, First2' or plain 'First Last and First Last'
// into structured authors. Best-effort — the UI lets the user correct it.
export function parseAuthors(raw: string | null | undefined): ScribeAuthor[] {
  if (!raw) return []
  const parts = raw
    .split(/;|\band\b|&/i)
    .map(p => p.trim())
    .filter(Boolean)
  return parts.map(p => {
    if (p.includes(',')) {
      const [family, given] = p.split(',').map(s => s.trim())
      return { family, given: given || undefined }
    }
    const words = p.split(/\s+/)
    if (words.length === 1) return { family: words[0] }
    return { family: words[words.length - 1], given: words.slice(0, -1).join(' ') }
  })
}

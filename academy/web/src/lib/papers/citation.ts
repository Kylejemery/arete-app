// Citation hygiene for paper submissions. author and work become the
// rag_corpus identity of the summary and the citation every counselor shows,
// and they arrive as typed by hand or copied off a PDF header: "IAN HENSLEy",
// "THE STOICS ON FATE AND FREEDOM", "…Basic Corporeal Change*". The review
// card shows the normalised form and the ingest route writes it, so what the
// reviewer sees is what retrieval attributes.
//
// Deliberately conservative: a name or title that is already mixed case is
// left exactly as typed, including intentional capitals (Stoic, Epictetus,
// De Fato). Only all-caps or broken-case tokens are touched.

// English small words only. Latin and French particles (De Fato, La Rochefoucauld)
// are capitalised in English-language titles and stay out of this list.
const SMALL_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'nor', 'but', 'for', 'of', 'on', 'in', 'to',
  'at', 'by', 'with', 'from', 'as', 'vs', 'via',
])

const NAME_PARTICLES = new Set(['de', 'da', 'del', 'della', 'di', 'van', 'von', 'der', 'den', 'le', 'la', 'du', 'des', 'y'])

function letters(s: string): string {
  return s.replace(/[^\p{L}]/gu, '')
}

// True when the string has no lowercase letters at all (an all-caps header).
function isAllCaps(s: string): boolean {
  const l = letters(s)
  return l.length > 0 && l === l.toLocaleUpperCase()
}

// True for tokens like "HENSLEy" or "mCDOWELL": upper case after the first
// letter mixed with lower case, which no real name has.
function isBrokenCase(token: string): boolean {
  const l = letters(token)
  if (l.length < 3) return false
  const tail = l.slice(1)
  return /\p{Lu}/u.test(tail) && /\p{Ll}/u.test(tail) && !/^Mc|^Mac|^O'|^D'/.test(l)
}

// A short run of I V X L C is a roman numeral (BOOK II, XII*-Chrysippus);
// anything longer is a word (CIVIC).
function isRomanNumeral(part: string): boolean {
  const l = letters(part)
  return l.length > 0 && l.length <= 4 && /^[IVXLC]+$/.test(l.toLocaleUpperCase())
}

// Capitalise one token, preserving hyphenated and apostrophe parts
// ("Sebastián", "O'Keefe", "Jean-Pierre") and roman-numeral parts.
function capToken(token: string): string {
  return token
    .split(/(?=[-'’])|(?<=[-'’])/)
    .map(part => {
      if (/^[-'’]$/.test(part)) return part
      if (isRomanNumeral(part)) return part.toLocaleUpperCase()
      return part.toLocaleLowerCase().replace(/^(\P{L}*)(\p{L})/u, (_m, pre: string, ch: string) => pre + ch.toLocaleUpperCase())
    })
    .join('')
}

export function normalizeAuthor(author: string): string {
  const trimmed = author
    .replace(/\s+/g, ' ')
    // Affiliation superscripts copied with the byline ("Pertiwi1, Marhayati2").
    .replace(/(\p{L}{2,})\d{1,2}(?=[,;&\s]|$)/gu, '$1')
    .trim()
  if (!trimmed) return trimmed
  const tokens = trimmed.split(' ')
  // One broken-case token ("HENSLEy") means the whole name was typed in caps
  // with a slip, so its all-caps neighbours ("IAN") are normalised too.
  const needsFix = isAllCaps(trimmed) || tokens.some(isBrokenCase)
  return tokens
    .map((t, i) => {
      if (needsFix && (isAllCaps(t) || isBrokenCase(t))) {
        const lower = t.toLocaleLowerCase()
        // Initials ("J.", "M.") stay upper; particles stay lower mid-name.
        if (/^\p{L}\.$/u.test(t)) return t.toLocaleUpperCase()
        if (i > 0 && NAME_PARTICLES.has(lower.replace(/,$/, ''))) return lower
        return capToken(t)
      }
      return t
    })
    .join(' ')
}

export function normalizeTitle(work: string): string {
  let t = work.replace(/\s+/g, ' ').trim()
  // Footnote markers copied from a PDF header: trailing * † ‡ or digits
  // attached to the last word ("Change*", "Stoicism1").
  t = t.replace(/[\s*†‡]+$/u, '').replace(/(\p{L})[*†‡]+$/u, '$1').replace(/(\p{L}{3,})\d$/u, '$1')
  if (!isAllCaps(t)) return t
  const tokens = t.split(' ')
  return tokens
    .map((tok, i) => {
      const lower = tok.toLocaleLowerCase()
      const bare = lower.replace(/[^\p{L}]/gu, '')
      const afterColon = i > 0 && /[:—–-]$/.test(tokens[i - 1])
      if (i > 0 && !afterColon && SMALL_WORDS.has(bare)) return lower
      return capToken(tok)
    })
    .join(' ')
}

export function normalizeCitation(c: { author: string; work: string }): { author: string; work: string } {
  return { author: normalizeAuthor(c.author), work: normalizeTitle(c.work) }
}

// Four-digit year out of whatever the submission's free-text year holds
// ("2021", "2021a", "c. 2016", "2014, repr. 2020" → the first plausible one).
export function parseEditionYear(year: string | null | undefined): number | null {
  if (!year) return null
  const m = String(year).match(/\b(1[5-9]\d\d|20\d\d)\b/)
  return m ? Number(m[1]) : null
}

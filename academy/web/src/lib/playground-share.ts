/**
 * Private share links for unreleased Playground pieces.
 *
 * A released piece (RELEASED_PLAYGROUND in middleware.ts) is public. Every
 * other piece 404s, except for the owner and for anyone holding a share link
 * the owner made for that one piece: /playground/<piece>?share=<token>.
 *
 * The token is `<expiry>.<signature>`: the expiry in unix seconds and an
 * HMAC-SHA256 over the piece's path and that expiry, keyed by
 * PLAYGROUND_SHARE_SECRET. It opens exactly the path it was signed for — not
 * the index, not a sibling, not a sub-page — until it expires. Rotating the
 * secret revokes every link at once. Nothing is stored; there is no table.
 *
 * Web Crypto only, so the same code runs in the edge middleware (which checks
 * links) and in the admin API route (which makes them). With the secret unset,
 * no link is made and none is accepted.
 */

/**
 * Pieces open to everyone, no link needed. middleware.ts gates on this list;
 * releasing a piece is adding its slug here, and nothing else.
 */
export const RELEASED_PLAYGROUND = [
  'happiness-scale',
  'zenos-hand',
  'chrysippus-cylinder',
  'the-impression',
  'stoic-logic',
  'stoic-qca',
  // The gate matches the whole path, so the essay, its formal statement and
  // the walkthrough are each released by name.
  'the-long-filter',
  'the-long-filter/formalism',
  'the-long-filter/walkthrough',
  'view-from-above',
]

/**
 * Every piece. The admin page offers the ones not yet released; any valid
 * piece path (a perspectives essay, say) can still be signed by hand.
 */
export const PLAYGROUND_PIECES = [
  'chrysippus-cylinder',
  'happiness-scale',
  'kosmopolis',
  'situations',
  'stoic-logic',
  'stoic-qca',
  'the-impression',
  'the-long-filter',
  'the-long-filter/formalism',
  'the-passage',
  'themata',
  'themata-machine',
  'view-from-above',
  'zenos-hand',
]

export const SHARE_PARAM = 'share'
export const DEFAULT_SHARE_DAYS = 30
export const MAX_SHARE_DAYS = 365

const PIECE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/

/** A piece is a path below /playground/, never the index itself. */
export function isPiecePath(piece: string): boolean {
  return PIECE_RE.test(piece)
}

/**
 * The cookie that remembers a link after the first visit, so the token can
 * leave the address bar. One per piece, scoped to that piece's path.
 */
export function shareCookieName(piece: string): string {
  return `pg_share_${piece.replace(/\//g, '__')}`
}

function base64url(bytes: ArrayBuffer): string {
  let s = ''
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64url(s: string): Uint8Array<ArrayBuffer> | null {
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  } catch {
    return null
  }
}

async function key(secret: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage],
  )
}

function payload(piece: string, expires: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new TextEncoder().encode(`playground-share:v1:${piece}:${expires}`))
}

/** Sign a link for one piece. Returns null when the secret is unset. */
export async function signShareToken(
  piece: string,
  expires: number,
  secret = process.env.PLAYGROUND_SHARE_SECRET,
): Promise<string | null> {
  if (!secret || !isPiecePath(piece)) return null
  const sig = await crypto.subtle.sign('HMAC', await key(secret, 'sign'), payload(piece, expires))
  return `${expires}.${base64url(sig)}`
}

/**
 * Does this token open this piece right now? Returns the expiry (unix seconds)
 * when it does, null otherwise. The comparison is crypto.subtle.verify's, so it
 * is constant-time.
 */
export async function verifyShareToken(
  piece: string,
  token: string | undefined | null,
  secret = process.env.PLAYGROUND_SHARE_SECRET,
): Promise<number | null> {
  if (!secret || !token || !isPiecePath(piece)) return null
  const m = /^(\d{1,12})\.([A-Za-z0-9_-]{43})$/.exec(token)
  if (!m) return null
  const expires = Number(m[1])
  if (expires * 1000 <= Date.now()) return null
  const sig = fromBase64url(m[2])
  if (!sig) return null
  try {
    const ok = await crypto.subtle.verify('HMAC', await key(secret, 'verify'), sig, payload(piece, expires))
    return ok ? expires : null
  } catch {
    return null
  }
}

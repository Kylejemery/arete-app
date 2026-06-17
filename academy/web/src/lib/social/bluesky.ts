type Facet = {
  index: { byteStart: number; byteEnd: number }
  features: Array<{ $type: string; uri: string }>
}

// Bluesky renders URLs as plain text unless you attach link "facets" with the
// UTF-8 byte range of each URL. Detect http(s) links and build those facets.
// Byte offsets (not JS string indices) are required by the AT Protocol.
function detectLinkFacets(text: string): Facet[] {
  const facets: Facet[] = []
  const encoder = new TextEncoder()
  const re = /https?:\/\/[^\s]+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    let url = m[0]
    // Trailing punctuation usually isn't part of the link.
    const trail = url.match(/[.,;:!?)\]]+$/)
    if (trail) url = url.slice(0, url.length - trail[0].length)
    const byteStart = encoder.encode(text.slice(0, m.index)).length
    const byteEnd = byteStart + encoder.encode(url).length
    facets.push({
      index: { byteStart, byteEnd },
      features: [{ $type: 'app.bsky.richtext.facet#link', uri: url }],
    })
  }
  return facets
}

// Posts to Bluesky via the AT Protocol. Auth is a simple identifier + app
// password (create one at Settings → App Passwords) — no OAuth flow.
export async function postBluesky(text: string): Promise<void> {
  // Strip a leading '@' and whitespace — a bare handle, not an "@handle"
  // (which Bluesky misreads as an email and rejects).
  const identifier = process.env.BLUESKY_HANDLE?.trim().replace(/^@+/, '')
  const password = process.env.BLUESKY_APP_PASSWORD?.trim()
  if (!identifier) throw new Error('BLUESKY_HANDLE not configured')
  if (!password) throw new Error('BLUESKY_APP_PASSWORD not configured')
  const service = process.env.BLUESKY_SERVICE || 'https://bsky.social'

  const facets = detectLinkFacets(text)

  // 1. Open a session to get an access JWT + the account DID.
  const sessRes = await fetch(`${service}/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  })
  if (!sessRes.ok) {
    throw new Error(`Bluesky auth ${sessRes.status}: ${await sessRes.text()}`)
  }
  const sess = await sessRes.json()

  // 2. Create the post record.
  const postRes = await fetch(`${service}/xrpc/com.atproto.repo.createRecord`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sess.accessJwt}`,
    },
    body: JSON.stringify({
      repo: sess.did,
      collection: 'app.bsky.feed.post',
      record: {
        $type: 'app.bsky.feed.post',
        text,
        createdAt: new Date().toISOString(),
        ...(facets.length ? { facets } : {}),
      },
    }),
  })
  if (!postRes.ok) {
    throw new Error(`Bluesky post ${postRes.status}: ${await postRes.text()}`)
  }
}

// Posts to Bluesky via the AT Protocol. Auth is a simple identifier + app
// password (create one at Settings → App Passwords) — no OAuth flow.
export async function postBluesky(text: string): Promise<void> {
  const identifier = process.env.BLUESKY_HANDLE
  const password = process.env.BLUESKY_APP_PASSWORD
  if (!identifier) throw new Error('BLUESKY_HANDLE not configured')
  if (!password) throw new Error('BLUESKY_APP_PASSWORD not configured')
  const service = process.env.BLUESKY_SERVICE || 'https://bsky.social'

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
      },
    }),
  })
  if (!postRes.ok) {
    throw new Error(`Bluesky post ${postRes.status}: ${await postRes.text()}`)
  }
}

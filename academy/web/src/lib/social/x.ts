import crypto from 'node:crypto'

// Posts to X / Twitter via API v2 (POST /2/tweets) using OAuth 1.0a user-context
// auth. You generate the four credentials in the X developer portal (consumer
// key/secret for the app, access token/secret for your own account) — these
// don't expire, so no callback/refresh flow is needed.

function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(
    /[!*()']/g,
    c => '%' + c.charCodeAt(0).toString(16).toUpperCase()
  )
}

function buildOAuthHeader(method: string, url: string): string {
  const consumerKey = process.env.X_API_KEY!.trim()
  const consumerSecret = process.env.X_API_SECRET!.trim()
  const token = process.env.X_ACCESS_TOKEN!.trim()
  const tokenSecret = process.env.X_ACCESS_SECRET!.trim()

  const params: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: token,
    oauth_version: '1.0',
  }

  // The JSON body is not part of the v2 OAuth1 signature — only the oauth params.
  const paramString = Object.keys(params)
    .sort()
    .map(k => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join('&')

  const baseString = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`
  params.oauth_signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64')

  return (
    'OAuth ' +
    Object.keys(params)
      .sort()
      .map(k => `${percentEncode(k)}="${percentEncode(params[k])}"`)
      .join(', ')
  )
}

export async function postX(text: string): Promise<void> {
  for (const key of ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_SECRET']) {
    if (!process.env[key]) throw new Error(`${key} not configured`)
  }

  const url = 'https://api.twitter.com/2/tweets'
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: buildOAuthHeader('POST', url),
    },
    body: JSON.stringify({ text }),
  })

  if (!res.ok) {
    throw new Error(`X API ${res.status}: ${await res.text()}`)
  }
}

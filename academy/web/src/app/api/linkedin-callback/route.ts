import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return new NextResponse(`
      <html><body style="font-family:sans-serif;padding:2rem;">
        <h2 style="color:red">LinkedIn OAuth Error</h2>
        <p>${searchParams.get('error_description')}</p>
      </body></html>
    `, { headers: { 'Content-Type': 'text/html' } })
  }

  if (!code) {
    return new NextResponse('No code received', { status: 400 })
  }

  try {
    const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/linkedin-callback`,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return new NextResponse(`
        <html><body style="font-family:sans-serif;padding:2rem;">
          <h2 style="color:red">Token exchange failed</h2>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        </body></html>
      `, { headers: { 'Content-Type': 'text/html' } })
    }

    // Also fetch the member's person URN — required as the "author" when posting.
    // Needs the openid scope; if it's missing this stays empty and we tell the user.
    let authorUrn = ''
    try {
      const meRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      if (meRes.ok) {
        const me = await meRes.json()
        if (me.sub) authorUrn = `urn:li:person:${me.sub}`
      }
    } catch {
      // ignore — handled by the empty-authorUrn branch below
    }

    const urnBlock = authorUrn
      ? `<p style="margin-top:1.5rem;">And add this as <code>LINKEDIN_AUTHOR_URN</code>:</p>
         <textarea rows="2"
           style="width:100%;font-family:monospace;font-size:12px;padding:8px;border:1px solid #ccc;border-radius:4px;"
           onclick="this.select()">${authorUrn}</textarea>`
      : `<p style="margin-top:1.5rem;color:#b45309;">
           Could not fetch your person URN — your token is missing the <code>openid</code> scope.
           Enable the "Sign In with LinkedIn using OpenID Connect" product on your app, then run the flow again
           with <code>scope=openid profile email w_member_social</code>.
         </p>`

    // Show the token (and URN) on screen so you can copy them to Vercel
    return new NextResponse(`
      <html><body style="font-family:sans-serif;padding:2rem;max-width:600px;">
        <h2 style="color:green">✓ LinkedIn Connected</h2>
        <p>Add this to Vercel as <code>LINKEDIN_ACCESS_TOKEN</code>:</p>
        <textarea
          rows="4"
          style="width:100%;font-family:monospace;font-size:12px;padding:8px;border:1px solid #ccc;border-radius:4px;"
          onclick="this.select()"
        >${data.access_token}</textarea>
        ${urnBlock}
        <p style="color:#888;font-size:13px;margin-top:1rem;">
          This token expires in ${Math.round(data.expires_in / 86400)} days.<br/>
          Do not share it with anyone.
        </p>
        <p style="color:#888;font-size:13px;">
          After adding both to Vercel, you can delete this route from your codebase.
        </p>
      </body></html>
    `, { headers: { 'Content-Type': 'text/html' } })

  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return new NextResponse(`Error: ${message}`, { status: 500 })
  }
}

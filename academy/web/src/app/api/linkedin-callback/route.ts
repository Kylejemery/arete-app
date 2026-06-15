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

    // Show the token on screen so you can copy it to Vercel
    return new NextResponse(`
      <html><body style="font-family:sans-serif;padding:2rem;max-width:600px;">
        <h2 style="color:green">✓ LinkedIn Connected</h2>
        <p>Copy the access token below and add it to Vercel as <code>LINKEDIN_ACCESS_TOKEN</code>:</p>
        <textarea
          rows="4"
          style="width:100%;font-family:monospace;font-size:12px;padding:8px;border:1px solid #ccc;border-radius:4px;"
          onclick="this.select()"
        >${data.access_token}</textarea>
        <p style="color:#888;font-size:13px;margin-top:1rem;">
          This token expires in ${Math.round(data.expires_in / 86400)} days.<br/>
          Do not share it with anyone.
        </p>
        <p style="color:#888;font-size:13px;">
          After adding to Vercel, you can delete this route from your codebase.
        </p>
      </body></html>
    `, { headers: { 'Content-Type': 'text/html' } })

  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return new NextResponse(`Error: ${message}`, { status: 500 })
  }
}

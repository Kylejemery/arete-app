// Posts immediately to the member's LinkedIn feed via the UGC Posts API.
// LinkedIn's API has no Buffer-style scheduling, so posts publish right away.
export async function postLinkedIn(text: string): Promise<void> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN
  const author = process.env.LINKEDIN_AUTHOR_URN
  if (!token) throw new Error('LINKEDIN_ACCESS_TOKEN not configured')
  if (!author) throw new Error('LINKEDIN_AUTHOR_URN not configured')

  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }),
  })

  if (!res.ok) {
    throw new Error(`LinkedIn API ${res.status}: ${await res.text()}`)
  }
}

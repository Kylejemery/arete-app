import { postLinkedIn } from './linkedin'
import { postBluesky } from './bluesky'
import { postX } from './x'

// Platforms we post to directly (immediately), bypassing Buffer.
export const DIRECT_PLATFORMS = ['linkedin', 'bluesky', 'x'] as const

export function isDirectPlatform(platform: string): boolean {
  return (DIRECT_PLATFORMS as readonly string[]).includes(platform)
}

// Dispatch a post to the right platform poster. Each throws on failure with a
// platform-prefixed message the caller surfaces to the UI.
export async function postDirect(platform: string, text: string): Promise<void> {
  switch (platform) {
    case 'linkedin':
      return postLinkedIn(text)
    case 'bluesky':
      return postBluesky(text)
    case 'x':
      return postX(text)
    default:
      throw new Error(`No direct poster for "${platform}"`)
  }
}

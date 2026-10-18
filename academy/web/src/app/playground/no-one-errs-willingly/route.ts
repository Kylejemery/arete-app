import html from '@/content/playground/no-one-errs-willingly'

// A self-contained essay page (its own fonts, styles and script), so it is
// served as written rather than rendered inside the Playground layout.
// Released through RELEASED_PLAYGROUND like any other piece.
export const dynamic = 'force-static'

export function GET() {
  return new Response(html.trimStart(), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

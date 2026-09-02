// Pure helpers shared by the admin Email tab (client preview) and the send
// route (server). No Node-only imports here — this file is bundled into the
// browser for the live preview.

export type TierKey = 'free' | 'premium' | 'pro'

export const TIER_LABEL: Record<TierKey, string> = {
  free: 'Free',
  premium: 'Premium',
  pro: 'Pro',
}

// profiles.tier is the source of truth (see the 2026-08-25 tier consolidation
// migration). Legacy values still exist on a few rows: 'arete' was the old
// name for premium and 'scholar' for pro. is_premium is the fallback for any
// row whose tier column is null or unrecognised.
export function normalizeTier(tier: string | null | undefined, isPremium: boolean | null | undefined): TierKey {
  const t = (tier ?? '').toLowerCase()
  if (t === 'pro' || t === 'scholar') return 'pro'
  if (t === 'premium' || t === 'arete') return 'premium'
  if (t === 'free') return 'free'
  return isPremium ? 'premium' : 'free'
}

export type TemplateVars = { name: string; email: string }

// {{name}} and {{email}} are the only merge fields. Unknown fields are left
// untouched so a stray "{{" in the copy doesn't vanish silently.
export function substitute(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{\s*(name|email)\s*\}\}/gi, (_, key: string) => {
    const k = key.toLowerCase() as keyof TemplateVars
    return vars[k] ?? ''
  })
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Turns bare http(s) URLs in already-escaped text into anchors. Trailing
// punctuation is left outside the link so "see https://x.com." stays clean.
function linkify(escaped: string): string {
  return escaped.replace(/(https?:\/\/[^\s<]+?)([.,;:!?)]*)(?=\s|$)/g, (_, url: string, tail: string) =>
    `<a href="${url}" style="color:#3C3489;">${url}</a>${tail}`
  )
}

// Plain text → HTML: blank lines split paragraphs, single newlines become <br>.
export function textToHtml(text: string): string {
  const paragraphs = text.replace(/\r\n/g, '\n').trim().split(/\n{2,}/)
  return paragraphs
    .map(p => `<p style="margin:0 0 16px;">${linkify(escapeHtml(p)).replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}

// Crude but adequate text alternative for HTML-authored emails.
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export type EmailFormat = 'text' | 'html'

export type RenderInput = {
  body: string
  format: EmailFormat
  footer?: string
}

// Produces the html + text bodies for one recipient. The body should already
// have merge fields substituted. The footer is always plain text.
export function renderEmail({ body, format, footer }: RenderInput): { html: string; text: string } {
  const inner = format === 'html' ? body : textToHtml(body)
  const footerTrimmed = (footer ?? '').trim()
  const footerHtml = footerTrimmed
    ? `<p style="margin:32px 0 0;padding-top:12px;border-top:1px solid #eee;font-size:12px;line-height:1.5;color:#888;">${linkify(escapeHtml(footerTrimmed)).replace(/\n/g, '<br>')}</p>`
    : ''
  const html = [
    '<!doctype html><html><body style="margin:0;padding:0;background:#ffffff;">',
    '<div style="font-family:-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1a1a1a;max-width:600px;margin:0 auto;padding:28px 24px;">',
    inner,
    footerHtml,
    '</div></body></html>',
  ].join('\n')

  const textBody = format === 'html' ? htmlToText(body) : body.replace(/\r\n/g, '\n').trim()
  const text = footerTrimmed ? `${textBody}\n\n--\n${footerTrimmed}` : textBody
  return { html, text }
}

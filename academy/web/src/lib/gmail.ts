import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

// Server-only. Sends through the owner's Gmail account over SMTP using a
// Google App Password (Google Account → Security → 2-Step Verification →
// App passwords). OAuth is deliberately not used: an app password is one env
// var and never expires unless revoked.
//
// Gmail's own sending limits apply: roughly 500 messages/day for a personal
// account, 2,000/day for Google Workspace. The send route sends one message
// per recipient (no BCC) so members never see each other's addresses.

export type GmailConfig = {
  configured: boolean
  user?: string
  fromName: string
  replyTo?: string
}

export function gmailConfig(): GmailConfig {
  const user = process.env.GMAIL_USER?.trim() || undefined
  // Google displays app passwords in groups of four ("abcd efgh ijkl mnop");
  // tolerate the spaces if they were pasted verbatim.
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '') || undefined
  return {
    configured: !!(user && pass),
    user,
    fromName: process.env.GMAIL_FROM_NAME?.trim() || 'Arete',
    replyTo: process.env.GMAIL_REPLY_TO?.trim() || undefined,
  }
}

export function fromHeader(cfg: GmailConfig): string {
  // Quote the display name so a comma or period in it can't break the header.
  return `"${cfg.fromName.replace(/"/g, '')}" <${cfg.user}>`
}

export function createGmailTransport(): Transporter {
  const cfg = gmailConfig()
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '')
  if (!cfg.configured || !cfg.user || !pass) {
    throw new Error('Gmail is not configured — set GMAIL_USER and GMAIL_APP_PASSWORD')
  }
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: cfg.user, pass },
    // A pooled connection is reused across the chunk instead of a fresh TLS
    // handshake per recipient. Three parallel connections is comfortably
    // inside Gmail's concurrency tolerance.
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  })
}

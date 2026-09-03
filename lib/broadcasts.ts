// lib/broadcasts.ts
//
// Counselor broadcasts: a message written by hand and sent from a counselor to
// the membership. It arrives as a push notification and, always, as a post in
// the Cabinet chat.
//
// The push is only the nudge — most members never grant notification
// permission, and one who swipes a push away must still find the message
// waiting. So the thread, not the notification, is the delivery: the app asks
// the server what it is still owed on every foreground and seeds each line
// into the Cabinet thread (see lib/counselorLines.ts), then acknowledges.
// Anything unacknowledged is served again, which is what makes a dropped
// push, a cleared tray, and a failed acknowledgement all recoverable.

import { supabase } from './supabase';
import { API_BASE_URL } from '../services/claudeService';

export interface PendingBroadcast {
  id: string;
  title: string;
  message: string;
  counselorName: string;
  at: number; // when it should read as having arrived (Unix ms)
}

async function accessToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

/** Broadcasts this member is owed and whose send hour has passed. */
export async function fetchPendingBroadcasts(): Promise<PendingBroadcast[]> {
  const token = await accessToken();
  if (!token) return [];
  try {
    const res = await fetch(`${API_BASE_URL}/api/broadcasts/pending`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.broadcasts)) return [];
    return data.broadcasts
      .filter((b: any) => b && typeof b.id === 'string' && typeof b.message === 'string' && b.message.trim())
      .map((b: any) => ({
        id: b.id,
        title: typeof b.title === 'string' ? b.title : '',
        message: b.message,
        counselorName: typeof b.counselorName === 'string' && b.counselorName ? b.counselorName : 'The Cabinet',
        at: Number.isFinite(b.at) ? Number(b.at) : Date.now(),
      }));
  } catch {
    return []; // offline: the sweep runs again on the next foreground
  }
}

/**
 * Tell the server these broadcasts are in the thread. Safe to call for a line
 * that was already seeded from a tapped notification — that is how a push
 * delivery gets closed out server-side.
 */
export async function acknowledgeBroadcasts(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const token = await accessToken();
  if (!token) return;
  try {
    await fetch(`${API_BASE_URL}/api/broadcasts/seen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids }),
    });
  } catch {
    // Best effort. The server keeps owing these until an acknowledgement
    // lands; the local dedupe key stops the member seeing the line twice.
  }
}

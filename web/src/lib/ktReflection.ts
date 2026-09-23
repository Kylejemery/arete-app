// "What your Cabinet now sees" (retention plan R6), web side. Mirror of
// lib/ktReflection.ts in the mobile app.
import { supabase } from './supabase';
import { appendMessages } from './threadService';
import { logEvent } from './events';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export interface KtReflection {
  reflection: string;
  counselorId: string;
  counselorName: string;
  generatedAt: string;
}

// One model call, made right after a save that completed the profile. The
// server reads the profile itself and stores the result on user_settings; a
// failure comes back as null and the modal says so.
export async function requestKtReflection(): Promise<KtReflection | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return null;
    const res = await fetch(`${API_BASE_URL}/api/kt-reflection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: '{}',
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data?.reflection !== 'string' || !data.reflection.trim()) return null;
    return data as KtReflection;
  } catch (e) {
    console.warn('[ktReflection] request failed:', (e as Error)?.message);
    return null;
  }
}

// "Answer in the Cabinet": the reflection becomes the newest counselor
// message in the Cabinet thread (once), so the reply lands under it.
export async function seedReflectionIntoCabinet(r: KtReflection): Promise<void> {
  logEvent('kt_reflection_answered', { counselor: r.counselorId });
  try {
    await appendMessages('cabinet', [
      { role: 'assistant', content: r.reflection, timestamp: Date.now(), counselorId: r.counselorId, counselorName: r.counselorName },
    ]);
  } catch (e) {
    console.warn('[ktReflection] seed failed:', (e as Error)?.message);
  }
}

// Streaming Cabinet replies (retention plan R13), client side. Mirror of
// web/src/lib/cabinetStream.ts in the web app; there is no package shared by both
// builds, so change both files together. The server protocol is documented
// in server/lib/cabinet-stream.js.
//
// A caller that passes onStream to the Cabinet send functions asks the server
// for stream: true. readCabinetResponse then reads the Server-Sent Events,
// hands every preview event to onStream, and resolves with the `done`
// payload, which is exactly the JSON the non-streaming route returns, so the
// code after it is unchanged. A server that answers with plain JSON (an older
// deploy, or a refusal before the reply started) is read as JSON.

export interface StreamVoiceRef {
  counselorId: string | null;
  counselorName: string | null;
}

export type CabinetStreamEvent =
  | { type: 'meta'; mode: 'parallel' | 'single'; voices: StreamVoiceRef[] }
  | ({ type: 'voice_start'; index: number } & StreamVoiceRef)
  | { type: 'delta'; counselorId: string | null; text: string }
  | ({ type: 'voice_done'; response: string; error: boolean } & StreamVoiceRef);

export interface LiveVoice extends StreamVoiceRef {
  text: string;
  done: boolean;
}

export class CabinetStreamError extends Error {
  status: number | null;
  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = 'CabinetStreamError';
    this.status = status;
  }
}

// Fold one event into the list of voices shown while the reply is written.
// Voices appear in speaking order; a delta for an unknown voice starts one.
export function applyStreamEvent(voices: LiveVoice[], ev: CabinetStreamEvent): LiveVoice[] {
  const same = (v: LiveVoice) => v.counselorId === ('counselorId' in ev ? ev.counselorId : undefined);
  switch (ev.type) {
    case 'meta':
      return voices;
    case 'voice_start':
      if (voices.some(same)) return voices;
      return [...voices, { counselorId: ev.counselorId, counselorName: ev.counselorName, text: '', done: false }];
    case 'delta': {
      if (!voices.some(same)) {
        return [...voices, { counselorId: ev.counselorId, counselorName: null, text: ev.text, done: false }];
      }
      return voices.map(v => (same(v) ? { ...v, text: v.text + ev.text } : v));
    }
    case 'voice_done': {
      const finished = { counselorId: ev.counselorId, counselorName: ev.counselorName, text: ev.response || '', done: true };
      if (!voices.some(same)) return [...voices, finished];
      return voices.map(v => (same(v) ? { ...v, ...finished, counselorName: ev.counselorName ?? v.counselorName } : v));
    }
    default:
      return voices;
  }
}

interface StreamableResponse {
  headers: { get(name: string): string | null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json(): Promise<any>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readCabinetResponse(response: StreamableResponse, onStream?: (ev: CabinetStreamEvent) => void): Promise<any> {
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/event-stream') || !response.body || typeof response.body.getReader !== 'function') {
    return response.json();
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: !done });
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      let event = 'message';
      const dataLines: string[] = [];
      for (const line of frame.split('\n')) {
        if (line.startsWith(':')) continue; // keep-alive comment
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      if (dataLines.length === 0) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any;
      try { data = JSON.parse(dataLines.join('\n')); } catch { continue; }
      if (event === 'done') {
        try { reader.cancel?.(); } catch { /* already closed */ }
        return data;
      }
      if (event === 'error') {
        throw new CabinetStreamError(typeof data?.error === 'string' ? data.error : 'The Cabinet failed to answer', data?.status ?? null);
      }
      if (onStream && (event === 'meta' || event === 'voice_start' || event === 'delta' || event === 'voice_done')) {
        try { onStream({ type: event, ...data } as CabinetStreamEvent); } catch { /* a render error never breaks the reply */ }
      }
    }
    if (done) break;
  }
  throw new CabinetStreamError('The Cabinet stopped partway through its reply. Try again.');
}

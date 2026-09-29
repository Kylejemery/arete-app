// Streaming Cabinet replies (retention plan R13).
//
// Three small pieces the chat handler uses when a client asks for
// `stream: true`:
//
//   createSseReply(res)      a Server-Sent Events writer for the response.
//                            Headers go out on the first event; a comment
//                            line every 15 seconds keeps proxies from
//                            closing an idle connection while a voice is
//                            searching the web.
//   createMarkerGuard(emit)  per-voice filter for the live text. The server
//                            strips offer markers ([[GOAL|..]], [[TASK|..]],
//                            [[ADJUST|..]], [[REQUEST|..]]) after a reply is
//                            finished; while streaming, everything from the
//                            first "[[" on is held back so a marker can never
//                            reach the screen. The cleaned full text arrives
//                            in the voice_done event and replaces the preview.
//   streamAnthropicMessage   calls the Messages API with stream: true, hands
//                            each text delta to onTextDelta, and returns the
//                            same message shape the non-streaming call gives,
//                            so the code after it does not change.
//
// Event protocol (text/event-stream), in order:
//   meta        { mode, request_id, voices: [{ counselorId, counselorName }] }
//   voice_start { counselorId, counselorName, index }
//   delta       { counselorId, text }            visible text only
//   voice_done  { counselorId, counselorName, response, error }
//   done        the exact JSON body the non-streaming route returns
//   error       { status, error }                then the stream ends
// Clients treat `done` as the reply; everything before it is a preview.

const PING_MS = 15000;

function createSseReply(res) {
  let started = false;
  let ended = false;
  let ping = null;

  function start() {
    if (started) return;
    started = true;
    res.status(200);
    res.set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    if (typeof res.flushHeaders === 'function') res.flushHeaders();
    ping = setInterval(() => {
      if (!ended && !res.writableEnded) res.write(': ping\n\n');
    }, PING_MS);
    res.on('close', () => {
      ended = true;
      clearInterval(ping);
    });
  }

  function send(event, data) {
    if (!started) start();
    if (ended || res.writableEnded) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  function end() {
    if (ping) clearInterval(ping);
    if (ended) return;
    ended = true;
    if (!res.writableEnded) res.end();
  }

  return {
    send,
    end,
    // The final reply, then close.
    done(payload) { send('done', payload); end(); },
    // A failure after streaming began: the client shows its error banner.
    fail(status, error) { send('error', { status, error }); end(); },
    get started() { return started; },
  };
}

// Visible prefix of a partial reply: nothing from the first "[[" on, and a
// trailing single "[" held until the next character shows what it starts.
function visiblePrefix(raw) {
  const marker = raw.indexOf('[[');
  let visible = marker === -1 ? raw : raw.slice(0, marker);
  if (marker === -1 && visible.endsWith('[')) visible = visible.slice(0, -1);
  return visible;
}

function createMarkerGuard(emit) {
  let raw = '';
  let sent = 0;
  return {
    push(delta) {
      if (!delta) return;
      raw += delta;
      const visible = visiblePrefix(raw);
      if (visible.length > sent) {
        emit(visible.slice(sent));
        sent = visible.length;
      }
    },
    get raw() { return raw; },
  };
}

// Parse an Anthropic streaming response body into events.
async function* anthropicEvents(body) {
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });
    let sep;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const dataLines = frame.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim());
      if (dataLines.length === 0) continue;
      try {
        yield JSON.parse(dataLines.join('\n'));
      } catch { /* a malformed frame is skipped, not fatal */ }
    }
  }
}

// Rebuild the non-streaming message shape from the stream. Text blocks carry
// their full text; tool blocks keep what content_block_start gave them (the
// callers only ever read the text blocks).
async function streamAnthropicMessage({ apiKey, headers = {}, body, onTextDelta }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      ...headers,
    },
    body: JSON.stringify({ ...body, stream: true }),
  });
  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(`Claude API ${res.status}: ${errText}`);
    err.status = res.status;
    err.body = errText;
    throw err;
  }

  const message = { type: 'message', role: 'assistant', content: [], stop_reason: null, usage: {} };
  const blocks = [];
  for await (const ev of anthropicEvents(res.body)) {
    switch (ev.type) {
      case 'message_start':
        Object.assign(message, { id: ev.message?.id, model: ev.message?.model, usage: ev.message?.usage || {} });
        break;
      case 'content_block_start':
        blocks[ev.index] = ev.content_block?.type === 'text'
          ? { type: 'text', text: ev.content_block.text || '' }
          : { ...ev.content_block };
        break;
      case 'content_block_delta':
        if (ev.delta?.type === 'text_delta' && blocks[ev.index]?.type === 'text') {
          blocks[ev.index].text += ev.delta.text;
          if (onTextDelta) {
            try { onTextDelta(ev.delta.text); } catch { /* a slow client never breaks the reply */ }
          }
        }
        break;
      case 'message_delta':
        if (ev.delta?.stop_reason) message.stop_reason = ev.delta.stop_reason;
        if (ev.usage) message.usage = { ...message.usage, ...ev.usage };
        break;
      case 'error': {
        const err = new Error(`Claude API stream error: ${ev.error?.message || 'unknown'}`);
        err.status = 502;
        throw err;
      }
      default:
        break;
    }
  }
  message.content = blocks.filter(Boolean);
  return message;
}

module.exports = { createSseReply, createMarkerGuard, visiblePrefix, streamAnthropicMessage, anthropicEvents };

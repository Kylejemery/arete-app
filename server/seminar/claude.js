// server/seminar/claude.js
//
// The Seminar Track's model call. Streamed, because the Syllabus agent reads
// the whole of a source book in one request and every seminar agent thinks
// before it answers: on the current models thinking is always on and counts
// against max_tokens, so a long think over a long input needs a large output
// budget, and a large budget needs streaming to stay under HTTP timeouts.
//
// Returns the same shape as synthesis/shared.js callClaude (content blocks,
// stop_reason, usage), so textOf() and the agents' parsing are unchanged.
// readReply() turns a reply that stopped for the wrong reason into an error
// that says why: out of output budget, or declined by the model.

const API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * @param {object} args
 * @param {string} args.model
 * @param {string} args.system
 * @param {string} args.userPrompt
 * @param {number} args.maxTokens
 * @param {string} [args.effort]  low | medium | high | xhigh | max
 */
async function callClaudeStream({ model, system, userPrompt, maxTokens, effort }) {
  if (!process.env.CLAUDE_API_KEY) throw new Error('CLAUDE_API_KEY not set');
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      stream: true,
      system,
      messages: [{ role: 'user', content: userPrompt }],
      ...(effort ? { output_config: { effort } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);

  const blocks = [];
  let stopReason = null;
  let stopDetails = null;
  const usage = {};
  const decoder = new TextDecoder();
  let buffer = '';

  const handle = event => {
    switch (event.type) {
      case 'message_start':
        Object.assign(usage, event.message?.usage || {});
        break;
      case 'content_block_start':
        blocks[event.index] = { type: event.content_block?.type, text: '' };
        break;
      case 'content_block_delta':
        if (event.delta?.type === 'text_delta' && blocks[event.index]) blocks[event.index].text += event.delta.text;
        break;
      case 'message_delta':
        stopReason = event.delta?.stop_reason ?? stopReason;
        stopDetails = event.delta?.stop_details ?? stopDetails;
        Object.assign(usage, event.usage || {});
        break;
      case 'error':
        throw new Error(`Claude API stream error: ${event.error?.type || ''} ${event.error?.message || ''}`.trim());
      default:
        break;
    }
  };

  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let cut;
    while ((cut = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      const data = raw.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('');
      if (data) handle(JSON.parse(data));
    }
  }

  return {
    content: blocks.filter(b => b && b.type === 'text').map(b => ({ type: 'text', text: b.text })),
    stop_reason: stopReason,
    stop_details: stopDetails,
    usage,
  };
}

// The reply's text, or an error naming why the model stopped short. A reply
// with no stop_reason (the tests' scripted replies) is taken as finished.
function readReply(data, what) {
  const text = (data?.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  if (data?.stop_reason === 'max_tokens') {
    throw new Error(`${what} ran out of output budget (${data.usage?.output_tokens ?? '?'} output tokens, thinking included) before finishing`);
  }
  if (data?.stop_reason === 'refusal') {
    const d = data.stop_details || {};
    throw new Error(`${what}: the model declined (${d.category || 'no category'}${d.explanation ? `: ${d.explanation}` : ''})`);
  }
  return text;
}

// The opening of an unparseable reply, for an error message.
const glimpse = text => {
  const t = String(text || '').trim();
  return t ? ` It wrote: "${t.slice(0, 240)}${t.length > 240 ? '...' : ''}"` : ' It returned no text.';
};

module.exports = { callClaudeStream, readReply, glimpse };

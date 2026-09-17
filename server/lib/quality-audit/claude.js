// server/lib/quality-audit/claude.js
//
// Raw fetch to the Anthropic API, matching the rest of the fleet (no SDK).
// callClaudeJSON asks for JSON and parses it; a model that answers with prose
// is a failed call, not a silent empty result, because a judgment pass that
// quietly returns nothing looks exactly like a clean corpus.

const DEFAULT_MODEL = 'claude-sonnet-4-6';

async function callClaude({ apiKey, model, system, message, maxTokens = 4000 }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: message }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const block = (json.content || []).find(b => b.type === 'text');
  return block ? block.text : '';
}

async function callClaudeJSON(opts) {
  const raw = await callClaude(opts);
  const cleaned = raw.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Claude returned unparseable JSON: ${cleaned.slice(0, 200)}`);
  }
}

module.exports = { callClaude, callClaudeJSON, DEFAULT_MODEL };

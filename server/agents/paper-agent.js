// server/agents/paper-agent.js
//
// Paper Agent — reads queued scholarly PDFs and writes the summary that is
// the ONLY text ever ingested for them. Kyle queues an open-access paper
// (URL or uploaded PDF in the private 'papers' bucket); this agent sends the
// PDF itself to Claude (native document support — no local PDF parsing, and
// two-column academic layouts survive), stores a structured scholarly
// summary on the paper_submissions row, and leaves it at pending_review.
// Ingestion happens later, in the admin API, only after Kyle approves.
//
// The paper's verbatim text never touches rag_corpus: open-access is not
// public-domain, and the corpus stays honest when modern scholarship enters
// clearly labeled as summary. Same accountability posture as every agent:
// nothing this writes reaches readers or retrieval without a human yes.
//
// Mirrors the other agents: raw fetch to Anthropic, no SDKs.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLAUDE_API_KEY.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const FETCH_TIMEOUT_MS = 60000;

async function getAgentConfig() {
  const { data } = await supabase
    .from('agent_config')
    .select('config')
    .eq('agent_name', 'paper-agent')
    .maybeSingle();
  return data?.config || {
    enabled: true,
    model: DEFAULT_MODEL,
    summary_min_words: 500,
    summary_max_words: 900,
    max_pdf_mb: 20,
    batch_size: 2,
  };
}

// ── PDF acquisition ─────────────────────────────────────────────────────────

// Fetch a PDF by URL. Guards: size cap (the Claude API refuses >32MB requests
// anyway) and a %PDF magic-number sniff so an HTML landing page fails loudly
// instead of being "summarized".
async function fetchPdfFromUrl(url, maxBytes) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'AretePaperAgent/1.0' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`fetch returned ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > maxBytes) {
    throw new Error(`PDF is ${(buf.length / 1048576).toFixed(1)}MB (cap ${(maxBytes / 1048576).toFixed(0)}MB)`);
  }
  if (buf.slice(0, 5).toString('latin1') !== '%PDF-') {
    throw new Error('URL did not return a PDF (no %PDF header) — link the PDF itself, not the landing page');
  }
  return buf;
}

async function fetchPdfFromStorage(path, maxBytes) {
  const { data, error } = await supabase.storage.from('papers').download(path);
  if (error) throw new Error(`storage download failed: ${error.message}`);
  const buf = Buffer.from(await data.arrayBuffer());
  if (buf.length > maxBytes) {
    throw new Error(`PDF is ${(buf.length / 1048576).toFixed(1)}MB (cap ${(maxBytes / 1048576).toFixed(0)}MB)`);
  }
  if (buf.slice(0, 5).toString('latin1') !== '%PDF-') {
    throw new Error('uploaded file is not a PDF (no %PDF header)');
  }
  return buf;
}

// ── Summarization ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Paper Agent of the Arete corpus — a living library of Stoic and wider philosophical tradition. You read modern scholarly papers and write the summary that will represent the paper inside the corpus, retrievable alongside primary sources by counselors answering real questions.

Rules you never break:
- The summary must stand alone: a reader who will never see the paper must come away knowing its thesis, how it argues, and why it matters.
- Attribute every claim to the paper's author(s) by name — the summary enters a corpus of many voices and must never read as the corpus's own position or as a primary text.
- Report the argument faithfully, including what the author concedes or leaves open. No embellishment, no verdicts of your own.
- Quote at most two short phrases (under 15 words each) where the author's exact wording is load-bearing; otherwise paraphrase.
- Where the paper touches thinkers or concepts the corpus holds (Stoics, Socratics, the wider classical tradition), name them explicitly — those names are how retrieval will find this summary.`;

function buildUserPrompt(sub, cfg) {
  return `Read the attached scholarly paper and return ONLY a JSON object (no markdown fences) with these fields:

{
  "detected_title": "the paper's actual title as printed",
  "detected_authors": "author name(s) as printed",
  "year": "publication year if visible, else null",
  "summary": "the scholarly summary, ${cfg.summary_min_words}-${cfg.summary_max_words} words, structured as flowing prose paragraphs covering: the thesis; the structure of the argument and its key moves; how it engages the philosophical tradition (name the thinkers and concepts); and its significance or what it leaves open",
  "key_concepts": ["3-6 short concept labels this paper works through, e.g. \\"dichotomy of control\\""]
}

The submitter recorded this paper as: ${sub.author} — "${sub.work}"${sub.year ? ` (${sub.year})` : ''}. If the PDF is clearly a different paper, still summarize what is actually in the PDF — the detected_* fields are how the mismatch gets caught in review.`;
}

async function summarizePdf(pdfBuffer, sub, cfg) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: cfg.model || DEFAULT_MODEL,
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: pdfBuffer.toString('base64') },
          },
          { type: 'text', text: buildUserPrompt(sub, cfg) },
        ],
      }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const block = (json.content || []).find(b => b.type === 'text');
  const cleaned = (block ? block.text : '').replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

// ── Main run ─────────────────────────────────────────────────────────────────

async function processPaperSubmissions() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  if (!CLAUDE_API_KEY) throw new Error('CLAUDE_API_KEY must be set');

  const cfg = await getAgentConfig();
  if (cfg.enabled === false) {
    console.log('[paper-agent] disabled via agent_config — skipping');
    return { processed: 0, succeeded: 0, failed: 0 };
  }
  const maxBytes = (cfg.max_pdf_mb || 20) * 1048576;

  const { data: queued, error } = await supabase
    .from('paper_submissions')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(cfg.batch_size || 2);
  if (error) throw new Error(`queue read failed: ${error.message}`);

  let succeeded = 0, failed = 0;
  for (const sub of queued || []) {
    console.log(`[paper-agent] --- ${sub.author} / ${sub.work} ---`);
    try {
      await supabase.from('paper_submissions')
        .update({ status: 'summarizing', error_message: null, updated_at: new Date().toISOString() })
        .eq('id', sub.id);

      const pdf = sub.storage_path
        ? await fetchPdfFromStorage(sub.storage_path, maxBytes)
        : await fetchPdfFromUrl(sub.source_url, maxBytes);

      const out = await summarizePdf(pdf, sub, cfg);
      if (!out.summary || out.summary.trim().length < 400) {
        throw new Error('agent returned no usable summary');
      }

      await supabase.from('paper_submissions')
        .update({
          summary_text: out.summary.trim(),
          detected_title: out.detected_title || null,
          detected_authors: out.detected_authors || null,
          year: sub.year || out.year || null,
          key_concepts: Array.isArray(out.key_concepts) ? out.key_concepts.slice(0, 6) : null,
          model_used: cfg.model || DEFAULT_MODEL,
          status: 'pending_review',
          updated_at: new Date().toISOString(),
        })
        .eq('id', sub.id);
      succeeded++;
      console.log('[paper-agent]   ✓ summary ready for review');
    } catch (err) {
      failed++;
      const msg = err.message || String(err);
      console.error(`[paper-agent]   ✗ ${msg}`);
      await supabase.from('paper_submissions')
        .update({ status: 'failed', error_message: msg, updated_at: new Date().toISOString() })
        .eq('id', sub.id);
    }
  }

  console.log(`[paper-agent] run complete — processed ${(queued || []).length} | succeeded ${succeeded} | failed ${failed}`);
  return { processed: (queued || []).length, succeeded, failed };
}

module.exports = { processPaperSubmissions };

if (require.main === module) {
  processPaperSubmissions().catch(err => {
    console.error('Fatal error:', err.message || err);
    process.exit(1);
  });
}

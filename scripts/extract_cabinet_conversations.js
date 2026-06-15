#!/usr/bin/env node
// One-time extraction: pulls all cabinet_conversations for Kyle, runs each
// through Claude, and appends structured output to cabinet_conversations_extracted.md
//
// Install deps (run once from this directory):
//   npm install @supabase/supabase-js @anthropic-ai/sdk dotenv
//
// Run:
//   node extract_cabinet_conversations.js
//   node extract_cabinet_conversations.js --user-id <uuid>

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const fs      = require('fs');
const path    = require('path');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

// ── config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL            = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY       = process.env.ANTHROPIC_API_KEY;
const KYLE_EMAIL              = 'kemery9585@gmail.com';
const OUTPUT_FILE             = path.join(__dirname, 'cabinet_conversations_extracted.md');
const MODEL                   = 'claude-sonnet-4-5';
const MAX_TOKENS              = 2000;
const RATE_LIMIT_MS           = 1000;

// ── arg parsing ───────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const idx  = args.indexOf('--user-id');
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

// ── validate env ──────────────────────────────────────────────────────────────

function assertEnv() {
  const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY']
    .filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    console.error('Add them to .env at the repo root.');
    process.exit(1);
  }
}

// ── supabase helpers ──────────────────────────────────────────────────────────

async function resolveUserId(supabase, cliUserId) {
  if (cliUserId) {
    console.log(`Using user_id from CLI arg: ${cliUserId}`);
    return cliUserId;
  }

  console.log(`Looking up user_id for ${KYLE_EMAIL}...`);
  const { data, error } = await supabase
    .from('auth.users')          // service role can query auth schema via rpc or direct
    .select('id')
    .eq('email', KYLE_EMAIL)
    .single();

  if (error || !data) {
    // Fallback: query via admin API
    const { data: { users }, error: adminErr } =
      await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (adminErr) throw new Error(`Cannot look up user: ${adminErr.message}`);
    const match = users.find(u => u.email === KYLE_EMAIL);
    if (!match) throw new Error(`No user found with email ${KYLE_EMAIL}`);
    console.log(`Resolved user_id: ${match.id}`);
    return match.id;
  }

  console.log(`Resolved user_id: ${data.id}`);
  return data.id;
}

async function fetchConversations(supabase, userId) {
  const { data, error } = await supabase
    .from('cabinet_conversations')
    .select('id, created_at, updated_at, counselor_slugs, messages')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Query failed: ${error.message}`);
  return data || [];
}

// ── formatting ────────────────────────────────────────────────────────────────

function formatConversation(row) {
  const date      = new Date(row.created_at).toISOString().split('T')[0];
  const counselors = Array.isArray(row.counselor_slugs)
    ? row.counselor_slugs.join(', ')
    : (row.counselor_slugs || 'unknown');

  const messages = Array.isArray(row.messages) ? row.messages : [];
  const dialogue = messages.map(msg => {
    const role    = (msg.role || 'unknown').charAt(0).toUpperCase() +
                    (msg.role || 'unknown').slice(1);
    const content = typeof msg.content === 'string'
      ? msg.content
      : JSON.stringify(msg.content);
    return `${role}: ${content}`;
  }).join('\n\n');

  return {
    date,
    counselors,
    text: `[CONVERSATION — ${date} — Counselors: ${counselors}]\n\n${dialogue}`,
  };
}

// ── extraction prompt ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are extracting structured data from a real cabinet of invisible counselors conversation. The user is Kyle Emery, age 40, public health researcher, Stoic practitioner, builder of the Arete app. Extract only what is actually present. If a category has nothing, write "Nothing in this conversation."

Extract these categories:

KEY DECISIONS — decisions Kyle made or committed to
PIVOTS — direction changes or reframes
HARD LEARNINGS — things that failed, surprised, or cost something
PHILOSOPHICAL IDEAS — original formulations or named concepts that crystallized
RECURRING TENSIONS — unresolved problems or conflicts that feel ongoing
MILESTONE MOMENTS — threshold crossings, completions, significant events
COMMITMENTS MADE — explicit stated intentions with accountability weight
ESSAY / WRITING SEEDS — raw material that could become Substack essays
FUTURE KYLE SIGNALS — what Future Kyle at 50 would want to know, in second person
OPEN QUESTIONS — questions raised but not resolved

Use Kyle's own language. Preserve raw texture. Do not smooth or editorialize.`;

async function extractConversation(anthropic, conversationText) {
  const message = await anthropic.messages.create({
    model:      MODEL,
    max_tokens: MAX_TOKENS,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: conversationText }],
  });
  return message.content[0].type === 'text' ? message.content[0].text : '';
}

// ── output ────────────────────────────────────────────────────────────────────

function appendToOutput(date, counselors, extraction) {
  const block = `## Conversation — ${date} — ${counselors}\n\n${extraction}\n\n---\n\n`;
  fs.appendFileSync(OUTPUT_FILE, block, 'utf8');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  assertEnv();

  const cliUserId = parseArgs();
  const supabase  = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const userId       = await resolveUserId(supabase, cliUserId);
  const conversations = await fetchConversations(supabase, userId);
  console.log(`Found ${conversations.length} conversations.`);

  if (conversations.length === 0) {
    console.log('Nothing to extract.');
    return;
  }

  // Inspect first row structure so we can verify the messages format
  console.log('\n--- First row messages structure (sample) ---');
  const sample = conversations[0].messages;
  console.log('Type:', typeof sample);
  if (Array.isArray(sample) && sample.length > 0) {
    console.log('First element keys:', Object.keys(sample[0]));
    console.log('First element (truncated):', JSON.stringify(sample[0]).slice(0, 300));
  } else {
    console.log('Raw:', JSON.stringify(sample).slice(0, 500));
  }
  console.log('---------------------------------------------\n');

  // Clear / initialise output file with a header
  if (!fs.existsSync(OUTPUT_FILE)) {
    fs.writeFileSync(
      OUTPUT_FILE,
      `# Cabinet Conversations — Extracted\n\nGenerated: ${new Date().toISOString()}\n\n---\n\n`,
      'utf8',
    );
  }

  for (let i = 0; i < conversations.length; i++) {
    const row = conversations[i];
    console.log(`Processing conversation ${i + 1} of ${conversations.length} (${row.id})...`);

    const { date, counselors, text } = formatConversation(row);

    try {
      const extraction = await extractConversation(anthropic, text);
      appendToOutput(date, counselors, extraction);
      console.log(`  ✓ Written.`);
    } catch (err) {
      console.error(`  ✗ API error on conversation ${row.id}: ${err.message}`);
      appendToOutput(date, counselors, `[EXTRACTION FAILED: ${err.message}]`);
    }

    if (i < conversations.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  console.log(`\nDone. Output written to: ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

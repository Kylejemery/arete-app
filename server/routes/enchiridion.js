// server/routes/enchiridion.js
//
// The Enchiridion endpoints: the member's offer and request (app, Bearer
// JWT) and the admin roster, generation trigger, document preview, request
// queue and pricing (admin tab, Bearer JWT + profiles.is_admin). The
// manuscript itself is built in ../enchiridion-agent.js. Kept in its own
// module, like agora.js, so index.js only gains a require, an app.use and an
// init call.

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const {
  generateEnchiridion,
  getAgentConfig,
  getOffer,
  documentToMarkdown,
} = require('../enchiridion-agent');

const router = express.Router();
router.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Wired by index.js after its helpers exist: { getAuthenticatedUserId,
// isAdmin, resend, fromEmail, adminEmail, webAppUrl }.
let deps = null;
function init(d) {
  deps = d;
}

// One manuscript per member at a time. A second trigger while one is
// running returns the running document instead of starting another.
const running = new Map(); // userId → documentId

const REQUEST_STATUSES = ['requested', 'generating', 'proofing', 'awaiting_payment', 'paid', 'printing', 'shipped', 'delivered', 'cancelled'];

async function requireUser(req, res) {
  if (!deps) {
    res.status(500).json({ error: 'The enchiridion routes are not wired up.' });
    return null;
  }
  const userId = await deps.getAuthenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return userId;
}

async function requireAdmin(req, res) {
  const userId = await requireUser(req, res);
  if (!userId) return null;
  if (!(await deps.isAdmin(userId))) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return userId;
}

function startGeneration({ userId, triggeredBy, force, requestId }) {
  if (running.has(userId)) return Promise.resolve({ started: false, document_id: running.get(userId) });
  // The agent inserts the row before its first model call and reports the id
  // through onCreated, so the caller gets an id to poll within a second while
  // the chapters run on in the background.
  return new Promise((resolve) => {
    let resolved = false;
    const settle = (id) => { if (!resolved) { resolved = true; resolve({ started: true, document_id: id }); } };
    running.set(userId, null);
    generateEnchiridion({
      userId, triggeredBy, force, requestId,
      onCreated: (id) => { running.set(userId, id); settle(id); },
    })
      .then(result => {
        console.log(`[enchiridion] finished for ${userId.slice(0, 8)}: ${JSON.stringify(result)}`);
        settle(result.id);
      })
      .catch(err => {
        console.error(`[enchiridion] failed for ${userId.slice(0, 8)}: ${err.message}`);
        settle(null);
      })
      .finally(() => running.delete(userId));
  });
}

// ---------------------------------------------------------------------------
// Member endpoints (the app)
// ---------------------------------------------------------------------------

// GET /api/enchiridion/offer — price, formats, eligibility, and where this
// member stands: their latest request and latest manuscript, if any.
router.get('/api/enchiridion/offer', async (req, res) => {
  const userId = await requireUser(req, res);
  if (!userId) return;
  try {
    const [offer, { data: request }, { data: document }] = await Promise.all([
      getOffer(userId),
      supabase
        .from('enchiridion_requests')
        .select('id, format, price_cents, currency, status, created_at, updated_at, document_id')
        .eq('user_id', userId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('enchiridion_documents')
        .select('id, title, subtitle, status, word_count, generated_at, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    return res.json({
      ...offer,
      request: request || null,
      document: document || null,
      checkout_path: request ? `/enchiridion?request=${request.id}` : null,
    });
  } catch (err) {
    console.error('[/api/enchiridion/offer] error:', err.message);
    return res.status(500).json({ error: 'Could not load the offer' });
  }
});

// POST /api/enchiridion/request { format, notes } — the member asks for a
// printed copy. The price is quoted here from agent_config, never taken
// from the client. Creates the request, starts the manuscript if there is
// no fresh one, and tells the owner. Returns the request and the web path
// where payment is taken.
router.post('/api/enchiridion/request', async (req, res) => {
  const userId = await requireUser(req, res);
  if (!userId) return;
  try {
    const config = await getAgentConfig();
    if (config.enabled === false) return res.status(503).json({ error: 'The Enchiridion is not available at the moment.' });

    const format = typeof req.body?.format === 'string' && config.formats[req.body.format] ? req.body.format : 'hardcover';
    const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim().slice(0, 2000) : null;
    const price = config.formats[format]?.price_cents ?? config.price_cents;

    const offer = await getOffer(userId);
    if (!offer.eligible) {
      return res.status(400).json({ error: `Write a little more first: ${offer.written} of ${offer.min_entries} entries.` });
    }

    // One open request at a time.
    const { data: open } = await supabase
      .from('enchiridion_requests')
      .select('id, status, format, price_cents, currency, created_at')
      .eq('user_id', userId)
      .not('status', 'in', '(cancelled,delivered)')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (open) {
      return res.json({ request: open, checkout_path: `/enchiridion?request=${open.id}`, existing: true });
    }

    const { data: request, error } = await supabase
      .from('enchiridion_requests')
      .insert({ user_id: userId, format, notes, price_cents: price, currency: config.currency || 'usd', status: 'requested' })
      .select('id, format, price_cents, currency, status, created_at')
      .single();
    if (error) throw new Error(error.message);

    // Reuse a manuscript finished in the last 30 days; otherwise start one.
    const { data: recent } = await supabase
      .from('enchiridion_documents')
      .select('id, generated_at')
      .eq('user_id', userId)
      .eq('status', 'ready')
      .gte('generated_at', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString())
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent) {
      await supabase.from('enchiridion_requests').update({ document_id: recent.id, status: 'proofing' }).eq('id', request.id);
    } else if (process.env.CLAUDE_API_KEY) {
      startGeneration({ userId, triggeredBy: null, force: false, requestId: request.id });
    }

    // Tell the owner. Failure here is not the member's problem.
    if (deps.resend) {
      try {
        const { data: profile } = await supabase.from('profiles').select('email').eq('id', userId).maybeSingle();
        await deps.resend.emails.send({
          from: deps.fromEmail,
          to: deps.adminEmail,
          subject: `[Arete] Enchiridion requested: ${config.formats[format]?.label || format}`,
          text: [
            `A member has requested a printed Enchiridion.`,
            ``,
            `Member: ${profile?.email || userId}`,
            `Format: ${config.formats[format]?.label || format}`,
            `Price quoted: ${(price / 100).toFixed(2)} ${(config.currency || 'usd').toUpperCase()}`,
            `Request: ${request.id}`,
            notes ? `Notes: ${notes}` : null,
            ``,
            `Manuscript: ${recent ? 'reusing a recent one' : 'generating now'}. Review it on the admin Enchiridion tab.`,
          ].filter(l => l !== null).join('\n'),
        });
      } catch (err) {
        console.error('[/api/enchiridion/request] admin email failed:', err.message);
      }
    }

    return res.status(201).json({ request, checkout_path: `/enchiridion?request=${request.id}`, existing: false });
  } catch (err) {
    console.error('[/api/enchiridion/request] error:', err.message);
    return res.status(500).json({ error: 'Could not place the request' });
  }
});

// ---------------------------------------------------------------------------
// Admin endpoints (the admin Enchiridion tab, via the Next.js proxy)
// ---------------------------------------------------------------------------

// GET /api/admin/enchiridion — the roster: every member with how much they
// have written, their latest manuscript, and their open request; plus the
// open request queue and the pricing config.
router.get('/api/admin/enchiridion', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const [
      { data: profiles },
      { data: settings },
      { data: journal },
      { data: convos },
      { data: goals },
      { data: scrolls },
      { data: docs },
      { data: requests },
      config,
    ] = await Promise.all([
      supabase.from('profiles').select('id, email, tier, created_at').order('created_at', { ascending: false }),
      supabase.from('user_settings').select('user_id, user_name'),
      supabase.from('journal_entries').select('user_id'),
      supabase.from('cabinet_conversations').select('user_id'),
      supabase.from('goals').select('user_id'),
      supabase.from('scrolls').select('user_id'),
      supabase.from('enchiridion_documents').select('id, user_id, title, status, word_count, chapter_count, generated_at, created_at, error').order('created_at', { ascending: false }),
      supabase.from('enchiridion_requests').select('id, user_id, document_id, format, price_cents, currency, status, notes, shipping_name, shipping_address, payment_ref, admin_notes, created_at, updated_at').order('created_at', { ascending: false }),
      getAgentConfig(),
    ]);

    const tally = (rows) => {
      const m = {};
      for (const r of rows || []) m[r.user_id] = (m[r.user_id] || 0) + 1;
      return m;
    };
    const jc = tally(journal), cc = tally(convos), gc = tally(goals), sc = tally(scrolls);
    const names = {};
    for (const s of settings || []) names[s.user_id] = s.user_name;
    const latestDoc = {};
    for (const d of docs || []) if (!latestDoc[d.user_id]) latestDoc[d.user_id] = d;
    const openRequest = {};
    for (const r of requests || []) {
      if (!openRequest[r.user_id] && !['cancelled', 'delivered'].includes(r.status)) openRequest[r.user_id] = r;
    }

    const roster = (profiles || []).map(p => {
      const d = latestDoc[p.id];
      return {
        id: p.id,
        email: p.email,
        name: names[p.id] || null,
        tier: p.tier || 'free',
        joined: p.created_at,
        journal: jc[p.id] || 0,
        cabinet: cc[p.id] || 0,
        goals: gc[p.id] || 0,
        scrolls: sc[p.id] || 0,
        written: (jc[p.id] || 0) + (cc[p.id] || 0),
        document: d ? { id: d.id, title: d.title, status: d.status, word_count: d.word_count, chapters: d.chapter_count || 0, generated_at: d.generated_at, created_at: d.created_at, error: d.error } : null,
        request: openRequest[p.id] || null,
        generating: running.has(p.id),
      };
    }).sort((a, b) => b.written - a.written);

    const emailOf = {};
    for (const p of profiles || []) emailOf[p.id] = p.email;
    const requestRows = (requests || []).map(r => ({
      ...r,
      email: emailOf[r.user_id] || null,
      name: names[r.user_id] || null,
      document: r.document_id ? (docs || []).find(d => d.id === r.document_id) || null : null,
    })).map(r => r.document ? { ...r, document: { id: r.document.id, title: r.document.title, status: r.document.status, word_count: r.document.word_count } } : r);

    return res.json({
      roster,
      requests: requestRows,
      documents: (docs || []).slice(0, 100).map(d => ({ ...d, chapters: d.chapter_count || 0, email: emailOf[d.user_id] || null, name: names[d.user_id] || null })),
      config,
      statuses: REQUEST_STATUSES,
      generating: [...running.keys()],
    });
  } catch (err) {
    console.error('[/api/admin/enchiridion] error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to load' });
  }
});

// POST /api/admin/enchiridion/generate { user_id, force, request_id } — build
// a manuscript now. 202 with the document id; the tab polls the document.
router.post('/api/admin/enchiridion/generate', async (req, res) => {
  const adminId = await requireAdmin(req, res);
  if (!adminId) return;
  const missing = [
    ['SUPABASE_URL', process.env.SUPABASE_URL],
    ['SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY],
    ['CLAUDE_API_KEY', process.env.CLAUDE_API_KEY],
  ].filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) return res.status(500).json({ error: `Server not configured for the enchiridion agent: missing ${missing.join(', ')}` });

  const userId = typeof req.body?.user_id === 'string' ? req.body.user_id : null;
  if (!userId) return res.status(400).json({ error: 'user_id is required' });
  if (running.has(userId)) return res.status(409).json({ error: 'A manuscript is already being generated for this member', document_id: running.get(userId) });

  try {
    const result = await startGeneration({
      userId,
      triggeredBy: adminId,
      force: req.body?.force === true,
      requestId: typeof req.body?.request_id === 'string' ? req.body.request_id : null,
    });
    return res.status(202).json({ ok: true, ...result });
  } catch (err) {
    console.error('[/api/admin/enchiridion/generate] error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to start generation' });
  }
});

// GET /api/admin/enchiridion/documents/:id — the whole manuscript, chapters
// included, plus a flattened markdown for download.
router.get('/api/admin/enchiridion/documents/:id', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const { data: doc, error } = await supabase
      .from('enchiridion_documents')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    const { data: profile } = await supabase.from('profiles').select('email').eq('id', doc.user_id).maybeSingle();
    return res.json({ document: doc, email: profile?.email || null, markdown: documentToMarkdown(doc), generating: running.get(doc.user_id) === doc.id });
  } catch (err) {
    console.error('[/api/admin/enchiridion/documents/:id] error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to load the document' });
  }
});

// PATCH /api/admin/enchiridion/requests/:id — move an order along by hand.
router.patch('/api/admin/enchiridion/requests/:id', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const patch = {};
    if (typeof req.body?.status === 'string') {
      if (!REQUEST_STATUSES.includes(req.body.status)) return res.status(400).json({ error: 'Unknown status' });
      patch.status = req.body.status;
    }
    if (typeof req.body?.admin_notes === 'string') patch.admin_notes = req.body.admin_notes.slice(0, 4000);
    if (typeof req.body?.payment_ref === 'string') patch.payment_ref = req.body.payment_ref.slice(0, 200);
    if (typeof req.body?.document_id === 'string') patch.document_id = req.body.document_id;
    if (!Object.keys(patch).length) return res.status(400).json({ error: 'Nothing to update' });
    const { data, error } = await supabase
      .from('enchiridion_requests')
      .update(patch)
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return res.json({ request: data });
  } catch (err) {
    console.error('[/api/admin/enchiridion/requests/:id] error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to update the request' });
  }
});

// PATCH /api/admin/enchiridion/config — pricing and generation settings.
router.patch('/api/admin/enchiridion/config', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const current = await getAgentConfig();
    const next = { ...current };
    const b = req.body || {};
    if (typeof b.enabled === 'boolean') next.enabled = b.enabled;
    if (typeof b.model === 'string' && b.model.trim()) next.model = b.model.trim();
    if (Number.isInteger(b.price_cents) && b.price_cents >= 0) next.price_cents = b.price_cents;
    if (b.formats && typeof b.formats === 'object') {
      const formats = {};
      for (const key of ['hardcover', 'softcover', 'journal']) {
        const f = b.formats[key];
        const cur = current.formats?.[key] || {};
        if (f === null) continue; // removed
        if (f && typeof f === 'object') {
          formats[key] = {
            label: typeof f.label === 'string' && f.label.trim() ? f.label.trim() : (cur.label || key),
            price_cents: Number.isInteger(f.price_cents) && f.price_cents >= 0 ? f.price_cents : (cur.price_cents ?? next.price_cents),
          };
        } else if (cur.label) {
          formats[key] = cur;
        }
      }
      if (Object.keys(formats).length) next.formats = formats;
    }
    for (const key of ['min_journal_entries', 'max_journal_entries', 'max_cabinet_messages', 'max_scrolls', 'corpus_passages_per_chapter', 'target_words_per_chapter']) {
      if (Number.isInteger(b[key]) && b[key] >= 0) next[key] = b[key];
    }
    const { error } = await supabase
      .from('agent_config')
      .upsert({ agent_name: 'enchiridion-agent', config: next, updated_at: new Date().toISOString() }, { onConflict: 'agent_name' });
    if (error) throw new Error(error.message);
    return res.json({ config: next });
  } catch (err) {
    console.error('[/api/admin/enchiridion/config] error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to save the config' });
  }
});

module.exports = { router, init };

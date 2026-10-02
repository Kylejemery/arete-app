// server/synthesis/topic-proposer.js
//
// Keeps the Stoic Life backlog stocked. When fewer than min_approved_topics
// approved topics are waiting, it proposes new ones, up to the shortfall and
// never more than max_pending_proposals unreviewed at once, from these
// sources in priority order:
//
//   1. corpus_gap     Cabinet questions whose retrieval came back thin
//                     (retrieval_log: no passage at or above
//                     gap_similarity_threshold). Clustered by meaning; a
//                     cluster counts only with gap_min_members different
//                     members, internal accounts excluded, and turns under
//                     gap_min_words words dropped (low scores are mostly
//                     small talk). Haiku names the shared theme or declines;
//                     a name that repeats five words of any question is
//                     refused, and no question text is stored.
//                     Since 2026-09-30 the parallel Cabinet branch drops rows
//                     under its 0.4 floor before logging, so a turn with
//                     nothing above the floor leaves no row; this source sees
//                     the single-counselor path and older Cabinet turns.
//   2. primary_text   Passages from Epictetus, Seneca's Letters and Marcus
//                     that sit farthest from every topic and document title
//                     so far. Coverage is judged against titles, never
//                     against synthesis text.
//   3. follow_on      Follow-on topics from drafts Kyle approved.
//   4. journal_theme  journal_analysis themes, counted across members, kept
//                     only with journal_min_members of them, internal
//                     accounts excluded. Aggregated labels only; no entry is
//                     read.
//   (5) The latest approved world observation is noted on each proposal as
//       context. It is never a source of topics.
//
// Every proposal records its source and a one or two sentence rationale,
// and waits for Kyle (status 'proposed'). Near-duplicates of any existing
// topic or document title are skipped.

const { getSupabase, embed, embedMany, cosineSim, parseVector, callClaude, textOf, extractJson, DAY } = require('./shared');

// ── Pure helpers (tested) ───────────────────────────────────────────────────

function normWords(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9\s']/g, ' ').split(/\s+/).filter(Boolean);
}

// True when `candidate` contains any run of n consecutive words that also
// appears in one of `sources`. Guards a theme name against quoting a member.
function sharesRun(candidate, sources, n = 5) {
  const words = normWords(candidate);
  if (words.length < n) return false;
  const grams = new Set();
  for (const s of sources) {
    const w = normWords(s);
    for (let i = 0; i + n <= w.length; i++) grams.add(w.slice(i, i + n).join(' '));
  }
  for (let i = 0; i + n <= words.length; i++) if (grams.has(words.slice(i, i + n).join(' '))) return true;
  return false;
}

// Leader clustering: each item joins the first cluster whose leader it
// resembles at `threshold`, else starts one. Items without a vector are
// dropped. Returns clusters as arrays of items.
function clusterByLeader(items, threshold) {
  const clusters = [];
  for (const it of items) {
    if (!it.vector) continue;
    const home = clusters.find(c => cosineSim(c[0].vector, it.vector) >= threshold);
    if (home) home.push(it); else clusters.push([it]);
  }
  return clusters;
}

function median(nums) {
  const a = [...nums].sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

// Counts distinct members per journal theme. rows: {user_id, themes, dominant_theme}.
function countThemesByMember(rows, allowedUserIds) {
  const members = new Map();
  for (const r of rows || []) {
    if (!allowedUserIds.has(r.user_id)) continue;
    const labels = new Set();
    for (const t of Array.isArray(r.themes) ? r.themes : []) {
      const label = String((t && t.theme) || '').toLowerCase().trim();
      if (label) labels.add(label);
    }
    if (r.dominant_theme) labels.add(String(r.dominant_theme).toLowerCase().trim());
    for (const l of labels) {
      if (!members.has(l)) members.set(l, new Set());
      members.get(l).add(r.user_id);
    }
  }
  return [...members.entries()].map(([theme, ids]) => ({ theme, members: ids.size }))
    .sort((a, b) => b.members - a.members);
}

// ── Backlog state ───────────────────────────────────────────────────────────

async function backlogCounts() {
  const supabase = getSupabase();
  const count = async status => {
    const { count: n, error } = await supabase.from('synthesis_topics')
      .select('id', { count: 'exact', head: true }).eq('mode', 'stoic_life').eq('status', status);
    if (error) throw new Error(`counting ${status} topics: ${error.message}`);
    return n || 0;
  };
  return { approved: await count('approved'), proposed: await count('proposed') };
}

// Every title a new proposal must not duplicate: all topics (rejected
// included, so a rejection sticks) and every synthesis document title.
// Titles only; no synthesis text is read.
async function knownTitles() {
  const supabase = getSupabase();
  const [topics, docs, drafts] = await Promise.all([
    supabase.from('synthesis_topics').select('id, title, title_embedding').eq('mode', 'stoic_life'),
    supabase.from('corpus_synthesis_documents').select('title').eq('active', true),
    supabase.from('synthesis_drafts').select('title').neq('status', 'rejected'),
  ]);
  for (const r of [topics, docs, drafts]) if (r.error) throw new Error(`reading titles: ${r.error.message}`);
  const known = [];
  for (const t of topics.data || []) known.push({ title: t.title, vector: parseVector(t.title_embedding) });
  const others = [...new Set([...(docs.data || []), ...(drafts.data || [])].map(r => r.title))];
  const vectors = await embedMany(others);
  others.forEach((title, i) => known.push({ title, vector: vectors[i] }));
  // Topics stored before embeddings were available get one now (not saved).
  for (const k of known) if (!k.vector) k.vector = await embed(k.title);
  return known;
}

async function worldNote(config) {
  const { data } = await getSupabase()
    .from('world_observations')
    .select('observation_week, dominant_signal')
    .eq('status', 'approved')
    .order('observation_week', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const age = (Date.now() - new Date(`${data.observation_week}T00:00:00Z`)) / DAY;
  if (age > config.world_observation_max_age_days) return null;
  return `Approved world observation, week of ${data.observation_week}: ${String(data.dominant_signal || '').slice(0, 400)}`;
}

// ── Naming (Haiku) ──────────────────────────────────────────────────────────

// Turns clusters of thin-retrieval questions, or journal theme labels, into
// topic titles. The model sees the material; only its abstract title comes
// back, and the caller refuses a title that repeats a member's words.
async function nameTopics(groups, { kind, model }) {
  if (!groups.length) return [];
  const system = `You name topics for a series of essays on how to live a Stoic life. You are given ${kind === 'gap'
    ? 'groups of questions members asked the platform\'s Stoic counselors, where the corpus had little to offer'
    : 'theme labels that recur across many members\' private journals'}. For each group, name the shared underlying question as a short essay topic about how a Stoic lives (a phrase or a question, at most twelve words). Name it abstractly: never quote or paraphrase any single question or label, never include names, places, or personal details. If a group has no coherent shared question, return an empty title for it.${kind === 'gap'
    ? ' Many low-scoring turns are not philosophical at all (greetings, thanks, scheduling, logistics, app questions, single words): a group made of those gets an empty title.'
    : ''}

Return only JSON: {"topics": [{"group": <number>, "title": "<title or empty>"}]}`;
  const userPrompt = groups.map((g, i) => `[Group ${i}]\n${g.material.map(m => `- ${m}`).join('\n')}`).join('\n\n');
  const data = await callClaude({ model, system, userPrompt, maxTokens: 1500 });
  const parsed = extractJson(textOf(data));
  const out = new Array(groups.length).fill('');
  for (const t of (parsed && Array.isArray(parsed.topics)) ? parsed.topics : []) {
    if (Number.isInteger(t.group) && t.group >= 0 && t.group < groups.length) out[t.group] = String(t.title || '').trim();
  }
  return out;
}

// ── Sources ─────────────────────────────────────────────────────────────────

async function corpusGapCandidates(config, want) {
  const supabase = getSupabase();
  const since = new Date(Date.now() - config.gap_window_days * DAY).toISOString();
  const { data: rows, error } = await supabase.rpc('thin_cabinet_questions', {
    p_since: since,
    p_threshold: config.gap_similarity_threshold,
    p_limit: config.gap_max_questions,
  });
  if (error) throw new Error(`reading thin Cabinet questions: ${error.message}`);
  // Short turns are conversation ("thanks", "ok, by 1pm"), not questions the
  // corpus failed to answer.
  const questions = (rows || []).filter(r => r.student_id && normWords(r.query_text).length >= config.gap_min_words);
  if (!questions.length) return [];

  const vectors = await embedMany(questions.map(q => q.query_text));
  const clusters = clusterByLeader(questions.map((q, i) => ({ ...q, vector: vectors[i] })), config.gap_cluster_similarity)
    .map(c => ({ items: c, members: new Set(c.map(q => q.student_id)).size }))
    .filter(c => c.members >= config.gap_min_members)
    .sort((a, b) => b.members - a.members || b.items.length - a.items.length)
    .slice(0, Math.max(want * 2, 3));
  if (!clusters.length) return [];

  const titles = await nameTopics(
    clusters.map(c => ({ material: c.items.slice(0, 12).map(q => q.query_text.slice(0, 300)) })),
    { kind: 'gap', model: config.check_model },
  );
  const out = [];
  clusters.forEach((c, i) => {
    const title = titles[i];
    if (!title) return;
    if (sharesRun(title, c.items.map(q => q.query_text))) return;   // repeats a member's words
    const med = median(c.items.map(q => Number(q.top_similarity)));
    out.push({
      title,
      source: 'corpus_gap',
      rationale: `${c.items.length} Cabinet questions from ${c.members} members in the last ${config.gap_window_days} days found no corpus passage above ${config.gap_similarity_threshold} (median best match ${med.toFixed(2)}). The theme was named from the questions; none is kept.`,
      evidence: {
        questions: c.items.length,
        members: c.members,
        median_top_similarity: Number(med.toFixed(3)),
        threshold: config.gap_similarity_threshold,
        window_days: config.gap_window_days,
      },
    });
  });
  return out;
}

async function primaryTextCandidates(config, want, known) {
  const { data: rows, error } = await getSupabase().rpc('sample_primary_passages', {
    p_works: config.primary_works,
    p_n: config.primary_sample_size,
  });
  if (error) throw new Error(`sampling primary passages: ${error.message}`);
  const passages = (rows || []).map(r => ({ ...r, vector: parseVector(r.embedding) })).filter(r => r.vector);
  if (!passages.length) return [];

  // Least covered first: the lowest best-similarity to any known title.
  const withVec = known.filter(k => k.vector);
  for (const p of passages) {
    p.coverage = withVec.length ? Math.max(...withVec.map(k => cosineSim(p.vector, k.vector))) : 0;
  }
  const chosen = passages.sort((a, b) => a.coverage - b.coverage).slice(0, 6).map((p, i) => ({ ...p, n: i + 1 }));

  const system = `You propose topics for a series of essays on how to live a Stoic life, each grounded in the primary texts. Given passages from Epictetus, Seneca and Marcus Aurelius, propose up to ${want} topics that these passages raise and that the existing topics do not already cover. A topic is a practical question about how to live (a phrase or a question, at most twelve words). For each, give a one or two sentence rationale naming the passage that raises it.

Return only JSON: {"topics": [{"title": "<title>", "rationale": "<one or two sentences>", "sources": [<passage numbers>]}]}`;
  const userPrompt = `EXISTING TOPICS AND DOCUMENTS (do not repeat these):
${known.map(k => `- ${k.title}`).join('\n') || '(none)'}

PASSAGES:
${chosen.map(p => `[Passage ${p.n}] ${p.author}, ${p.work}${p.section_label ? `, ${p.section_label}` : ''}\n"${p.chunk_text}"`).join('\n\n')}`;
  const data = await callClaude({ model: config.model, system, userPrompt, maxTokens: 1500 });
  const parsed = extractJson(textOf(data));
  return ((parsed && Array.isArray(parsed.topics)) ? parsed.topics : [])
    .map(t => {
      const used = chosen.filter(p => (Array.isArray(t.sources) ? t.sources : []).includes(p.n));
      return {
        title: String(t.title || '').trim(),
        source: 'primary_text',
        rationale: String(t.rationale || '').trim(),
        evidence: {
          passage_ids: used.map(p => p.id),
          works: [...new Set(used.map(p => `${p.author} | ${p.work}`))],
          coverage: used.map(p => Number(p.coverage.toFixed(3))),
        },
      };
    })
    .filter(t => t.title && t.rationale);
}

async function followOnCandidates() {
  const { data, error } = await getSupabase()
    .from('synthesis_drafts')
    .select('id, title, follow_ons, reviewed_at')
    .eq('mode', 'stoic_life')
    .in('status', ['approved', 'exported', 'ingested'])
    .order('reviewed_at', { ascending: false })
    .limit(20);
  if (error) throw new Error(`reading approved drafts: ${error.message}`);
  const out = [];
  for (const d of data || []) {
    for (const f of Array.isArray(d.follow_ons) ? d.follow_ons : []) {
      if (!f || !f.title) continue;
      out.push({
        title: String(f.title).trim(),
        source: 'follow_on',
        rationale: `${String(f.rationale || '').trim()} Proposed by the approved piece "${d.title}".`.trim(),
        evidence: { draft_id: d.id },
        proposed_by_draft_id: d.id,
      });
    }
  }
  return out;
}

async function journalThemeCandidates(config, want) {
  const supabase = getSupabase();
  const since = new Date(Date.now() - config.journal_window_days * DAY).toISOString();
  const { data: rows, error } = await supabase
    .from('journal_analysis')
    .select('user_id, themes, dominant_theme')
    .gte('created_at', since);
  if (error) throw new Error(`reading journal themes: ${error.message}`);
  const userIds = [...new Set((rows || []).map(r => r.user_id).filter(Boolean))];
  if (!userIds.length) return [];

  // Measurement rule (CLAUDE.md): internal and admin accounts never count.
  const allowed = new Set();
  for (let i = 0; i < userIds.length; i += 200) {
    const { data: profiles, error: pErr } = await supabase
      .from('measured_profiles')
      .select('id, is_internal, is_admin')
      .in('id', userIds.slice(i, i + 200));
    if (pErr) throw new Error(`reading measured profiles: ${pErr.message}`);
    for (const p of profiles || []) if (!p.is_internal && !p.is_admin) allowed.add(p.id);
  }

  const themes = countThemesByMember(rows, allowed)
    .filter(t => t.members >= config.journal_min_members)
    .slice(0, Math.max(want * 2, 3));
  if (!themes.length) return [];
  const titles = await nameTopics(themes.map(t => ({ material: [t.theme] })), { kind: 'journal', model: config.check_model });
  return themes.map((t, i) => ({
    title: titles[i],
    source: 'journal_theme',
    rationale: `A theme that recurred in the journal analyses of ${t.members} members over the last ${config.journal_window_days} days. Counted across members from aggregated theme labels; no entry was read.`,
    evidence: { members: t.members, window_days: config.journal_window_days },
  })).filter(t => t.title);
}

// ── The pass ────────────────────────────────────────────────────────────────

async function proposeTopics(config, { log = console.log } = {}) {
  const { approved, proposed } = await backlogCounts();
  const needed = config.min_approved_topics - approved;
  const room = config.max_pending_proposals - proposed;
  const want = Math.min(needed, room);
  if (needed <= 0) { log(`Backlog: ${approved} approved topics waiting; no proposals needed.`); return { added: [], approved, proposed }; }
  if (want <= 0) { log(`Backlog: ${proposed} proposals already wait for review; proposing nothing more.`); return { added: [], approved, proposed }; }
  log(`Backlog: ${approved} approved, ${proposed} proposed; proposing up to ${want}.`);

  const supabase = getSupabase();
  const known = await knownTitles();
  const note = await worldNote(config);
  const added = [];

  async function tryAdd(c) {
    if (added.length >= want) return;
    const title = c.title.replace(/\s+/g, ' ').trim().slice(0, 160);
    if (!title) return;
    const lower = title.toLowerCase();
    if (known.some(k => k.title.toLowerCase() === lower)) return;
    const vector = await embed(title);
    if (vector && known.some(k => k.vector && cosineSim(vector, k.vector) >= config.topic_dedup_similarity)) return;
    const { error } = await supabase.from('synthesis_topics').insert({
      mode: 'stoic_life',
      title,
      status: 'proposed',
      source: c.source,
      rationale: c.rationale.slice(0, 600),
      evidence: c.evidence || {},
      world_context: note,
      title_embedding: vector,
      proposed_by_draft_id: c.proposed_by_draft_id || null,
    });
    if (error) {
      // 23505: the same title already exists (a concurrent pass); anything
      // else is reported and skipped.
      if (error.code !== '23505') log(`  ! could not store "${title}": ${error.message}`);
      return;
    }
    known.push({ title, vector });
    added.push({ title, source: c.source });
    log(`  + [${c.source}] ${title}`);
  }

  const sources = [
    ['corpus_gap', () => corpusGapCandidates(config, want - added.length)],
    ['primary_text', () => primaryTextCandidates(config, want - added.length, known)],
    ['follow_on', () => followOnCandidates()],
    ['journal_theme', () => journalThemeCandidates(config, want - added.length)],
  ];
  const errors = {};
  for (const [name, get] of sources) {
    if (added.length >= want) break;
    try {
      for (const c of await get()) await tryAdd(c);
    } catch (err) {
      errors[name] = err.message;
      log(`  ✗ ${name}: ${err.message}`);
    }
  }
  return { added, approved, proposed, ...(Object.keys(errors).length ? { errors } : {}) };
}

module.exports = {
  proposeTopics,
  sharesRun,
  clusterByLeader,
  countThemesByMember,
  median,
  nameTopics,
};

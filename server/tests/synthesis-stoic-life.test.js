// The Stoic Life mode's rules that can be checked without a database or a
// model: what it may retrieve, how statuses are assigned, how a draft is
// validated, and the proposer's privacy guards.
//
//   cd server && node --test tests/synthesis-stoic-life.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

// world-agent.js (the Stoic author list) builds a Supabase client at load.
process.env.SUPABASE_URL ||= 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test';

const life = require('../synthesis/modes/stoic-life');
const proposer = require('../synthesis/topic-proposer');
const { splitMarkdownSections, statusForCheck } = require('../synthesis-agent');
const { renderSynthesisMarkdown } = require('../lib/synthesis-markdown');
const { RESEARCH_EXCLUDED_TEXT_TYPES } = require('../lib/corpus-fence');

let parseSynthesis = null;
try {
  ({ parseSynthesis } = require(path.join(__dirname, '../../academy/corpus-ingestion/ingest-synthesis')));
} catch { /* round trip skipped below */ }

// ── Sources ────────────────────────────────────────────────────────────────

test('retrieval excludes every layer but primary, synthesis included', () => {
  const ex = life.primaryOnlyExcludes();
  for (const t of ['synthesis', 'scholarship', 'paper_summary', 'concordance', 'modern_primary', 'modern_summary']) {
    assert.ok(ex.includes(t), `${t} must be excluded`);
  }
  assert.ok(!ex.includes('primary'));
  for (const t of RESEARCH_EXCLUDED_TEXT_TYPES) assert.ok(ex.includes(t), 'at least as strict as the research fence');
});

test('the post-filter drops anything but the asked author\'s primary rows, and synthesis authors', () => {
  const cfg = life.defaultConfig();
  const rows = [
    { id: '1', author: 'Seneca', work: 'Letters', text_type: 'primary' },
    { id: '2', author: 'Seneca', work: 'Letters', text_type: 'synthesis' },
    { id: '3', author: 'Arete (AI-assisted)', work: 'The Virtues of Socrates', text_type: 'primary' },
    { id: '4', author: 'Epictetus', work: 'Discourses', text_type: 'primary' },
    { id: '5', author: 'Seneca', work: 'Letters', text_type: 'scholarship' },
    null,
  ];
  assert.deepEqual(life.filterPassages(rows, 'Seneca', cfg).map(r => r.id), ['1']);
});

test('Diogenes Laertius is read from Book VII only', () => {
  const cfg = life.defaultConfig();
  const rows = [
    { id: 'a', author: 'Diogenes Laërtius', work: 'Lives of Eminent Philosophers, Book VII', text_type: 'primary' },
    { id: 'b', author: 'Diogenes Laërtius', work: 'Lives of Eminent Philosophers', text_type: 'primary' },
  ];
  assert.deepEqual(life.filterPassages(rows, 'Diogenes Laërtius', cfg).map(r => r.id), ['a']);
});

test('the default authors are the four Roman Stoics and Diogenes Laertius, and not Cicero', () => {
  const { authors } = life.defaultConfig();
  assert.deepEqual(authors, ['Seneca', 'Epictetus', 'Marcus Aurelius', 'Musonius Rufus', 'Diogenes Laërtius']);
});

test('passages are interleaved so no one author fills the prompt', () => {
  const out = life.interleave([['s1', 's2', 's3'], ['e1'], ['m1', 'm2']], 5);
  assert.deepEqual(out, ['s1', 'e1', 'm1', 's2', 'm2']);
});

// ── Drafts ─────────────────────────────────────────────────────────────────

const rawDraft = () => ({
  title: 'Courage Without Spectators',
  introduction: 'Intro.',
  sections: [
    { heading: 'Socrates at his trial', kind: 'ancient', body: 'Text (Plato).', cites: [1, 2, 99] },
    { heading: 'What Seneca adds', kind: 'ancient', body: 'Text (Seneca, Letters).', cites: [3] },
    { heading: 'Courage at work', kind: 'present', body: 'Apply it.', cites: [] },
    { heading: 'Practices', kind: 'present', body: '- one\n- two', cites: [] },
  ],
  follow_ons: [{ title: 'A', rationale: 'a' }, { title: 'B', rationale: 'b' }, { title: 'C', rationale: 'c' }, { title: 'D', rationale: 'd' }],
});

test('a draft needs both kinds of section; out-of-range citations and a fourth follow-on are dropped', () => {
  const d = life.validateDraft(rawDraft(), 5);
  assert.deepEqual(d.sections[0].cites, [1, 2]);
  assert.equal(d.follow_ons.length, 3);
  const noPresent = rawDraft();
  noPresent.sections = noPresent.sections.filter(s => s.kind === 'ancient');
  assert.throws(() => life.validateDraft(noPresent, 5), /no "present" section/);
  const odd = rawDraft();
  odd.sections[0].kind = 'history';
  assert.throws(() => life.validateDraft(odd, 5), /kind other than/);
  assert.throws(() => life.validateDraft(null, 5), /no JSON draft/);
});

test('statuses: supported ancient → corpus_verified, failed → unverified, present → interpretive', () => {
  const d = life.validateDraft(rawDraft(), 5);
  const statuses = life.sectionStatuses(d, [{ supported: true, sources: [1] }, { supported: false, sources: [] }]);
  assert.deepEqual(statuses, [['corpus_verified'], ['unverified'], ['interpretive'], ['interpretive']]);
  // A missing verdict fails closed.
  assert.deepEqual(life.sectionStatuses(d, [])[0], ['unverified']);
});

test('sources_used lists only the works the ancient sections rely on', () => {
  const d = life.validateDraft(rawDraft(), 4);
  const passages = [
    { n: 1, author: 'Seneca', work: 'Letters' },
    { n: 2, author: 'Seneca', work: 'Letters' },
    { n: 3, author: 'Epictetus', work: 'Discourses' },
    { n: 4, author: 'Marcus Aurelius', work: 'Meditations' },
  ];
  assert.deepEqual(life.sourcesUsed(d, [{ sources: [] }, { sources: [] }], passages), ['Seneca | Letters', 'Epictetus | Discourses']);
});

test('review_by is months later, clamped to the month\'s end', () => {
  assert.equal(life.addMonths('2026-10-02', 12), '2027-10-02');
  assert.equal(life.addMonths('2026-01-31', 1), '2026-02-28');
});

test('a full Stoic Life draft renders to a file the sync accepts', { skip: !parseSynthesis && 'parser dependencies not installed' }, () => {
  const d = life.validateDraft(rawDraft(), 5);
  const statuses = life.sectionStatuses(d, [{ supported: true }, { supported: true }]);
  const md = renderSynthesisMarkdown({
    doc_key: 'stoic-life-courage', version: 1, title: d.title, created_at: '2026-10-02',
    generated_with: 'claude-sonnet-4-6, Arete Synthesis Agent (Stoic Life mode)',
    review_by: life.addMonths('2026-10-02', 12),
    sources_used: ['Seneca | Letters'],
    regenerate_when: ['World observation of 2026-09-28 superseded'],
    introduction: { body: d.introduction, status: ['interpretive'] },
    sections: d.sections.map((s, i) => ({ heading: s.heading, body: s.body, status: statuses[i] })),
  });
  const { doc, chunks } = parseSynthesis(md, 'stoic-life-courage.v1.md');
  assert.equal(doc.review_by, '2027-10-02');
  const byLabel = Object.fromEntries(chunks.map(c => [c.section_label, c.verification_status.join()]));
  assert.equal(byLabel['Socrates at his trial'], 'corpus_verified');
  assert.equal(byLabel['Practices'], 'interpretive');
  assert.equal(byLabel['Introduction'], 'interpretive');
});

test('the prompt carries the political rule and has no room for unapproved context', () => {
  const sys = life.buildSystemPrompt(life.defaultConfig());
  assert.match(sys, /Do not name any living politician/);
  const user = life.buildUserPrompt({ title: 'T', rationale: 'R' }, [{ n: 1, author: 'Seneca', work: 'Letters', chunk_text: 'x' }], null, []);
  assert.match(user, /\(none: write about the present in general terms only\)/);
  const retry = life.buildUserPrompt({ title: 'T', rationale: 'R' }, [], 'ctx', ['Candidate X']);
  assert.match(retry, /Leave every one of them out:\n- Candidate X/);
});

test('world context text names the week and the tension', () => {
  assert.equal(life.worldContextText(null), null);
  const t = life.worldContextText({ observation_week: '2026-09-28', dispatch_context: 'This week, floods.', world_corpus_tension: 'Fate and aid.' });
  assert.match(t, /Week of 2026-09-28\.\nThis week, floods\.\nWhere the world and the Stoa pull against each other: Fate and aid\./);
});

// ── Proposer ───────────────────────────────────────────────────────────────

test('a theme name that repeats five words of a member\'s question is refused', () => {
  const qs = ['How do I stop worrying about what my boss thinks of me every day?'];
  assert.ok(proposer.sharesRun('Worrying about what my boss thinks of me', qs));
  assert.ok(!proposer.sharesRun('Approval at work and the Stoic indifferents', qs));
  assert.ok(!proposer.sharesRun('Boss thinks', qs), 'fewer than five words cannot match');
});

test('leader clustering groups near vectors and drops items without one', () => {
  const items = [
    { id: 1, vector: [1, 0] }, { id: 2, vector: [0.99, 0.05] }, { id: 3, vector: [0, 1] }, { id: 4, vector: null },
  ];
  const clusters = proposer.clusterByLeader(items, 0.9);
  assert.deepEqual(clusters.map(c => c.map(i => i.id)), [[1, 2], [3]]);
});

test('journal themes count members, not mentions, and skip internal accounts', () => {
  const rows = [
    { user_id: 'a', themes: [{ theme: 'Grief', count: 9 }], dominant_theme: 'grief' },
    { user_id: 'a', themes: [{ theme: 'grief' }] },
    { user_id: 'b', themes: [{ theme: 'grief' }, { theme: 'work' }] },
    { user_id: 'internal', themes: [{ theme: 'grief' }] },
  ];
  const out = proposer.countThemesByMember(rows, new Set(['a', 'b']));
  assert.deepEqual(out, [{ theme: 'grief', members: 2 }, { theme: 'work', members: 1 }]);
});

test('median', () => {
  assert.equal(proposer.median([0.3, 0.1, 0.2]), 0.2);
  assert.equal(proposer.median([0.1, 0.2]), 0.15000000000000002);
  assert.equal(proposer.median([]), null);
});

// ── Journal-demand --markdown ──────────────────────────────────────────────

test('journal-demand output splits into an introduction and its ## sections', () => {
  const out = splitMarkdownSections('Title Line\n\nIntro para.\n\n## One\nA.\n\n## Two\nB.\n## Empty\n');
  assert.equal(out.introduction, 'Intro para.');
  assert.deepEqual(out.sections, [{ heading: 'One', body: 'A.' }, { heading: 'Two', body: 'B.' }]);
});

test('a supported section citing a paper summary is via_summary', () => {
  const passages = [{ id: 'p1' }, { id: 'p2' }];
  const types = new Map([['p1', 'primary'], ['p2', 'paper_summary']]);
  assert.deepEqual(statusForCheck({ supported: true, sources: [1] }, passages, types), ['corpus_verified']);
  assert.deepEqual(statusForCheck({ supported: true, sources: [1, 2] }, passages, types), ['via_summary']);
  assert.deepEqual(statusForCheck({ supported: false, sources: [1] }, passages, types), ['unverified']);
});

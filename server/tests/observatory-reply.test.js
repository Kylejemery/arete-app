const test = require('node:test');
const assert = require('node:assert');
const { pieceText, retrievalQuery, buildReplyPrompt, cleanReply, CORPUS_HANDLE } = require('../lib/observatory-reply');

const tension = {
  title: 'The greatness that shrinks you',
  statement: 'Epictetus and Seneca agree that ambition corrodes.',
  positions: [{ author: 'Epictetus', summary: 'Want nothing outside you.' }, { author: 'Seneca', summary: 'Use office well.' }],
  livedStakes: 'Whether to take the promotion.',
};

test('the corpus writes as The Corpus', () => {
  assert.strictEqual(CORPUS_HANDLE, 'The Corpus');
});

test('a tension is read with both of its positions', () => {
  const { title, text } = pieceText('tension', tension);
  assert.strictEqual(title, 'The greatness that shrinks you');
  assert.match(text, /Epictetus: Want nothing/);
  assert.match(text, /Seneca: Use office well/);
  assert.match(text, /promotion/);
});

test('each kind supplies a title', () => {
  assert.strictEqual(pieceText('inquiry', { question: 'Can wisdom be shared?', pursuit: 'p' }).title, 'Can wisdom be shared?');
  assert.strictEqual(pieceText('dream', { content: 'x' }).title, 'A thought from the corpus');
  assert.strictEqual(pieceText('world', { dominantSignal: 'A flood.', response: 'r' }).title, 'A flood.');
  assert.deepStrictEqual(pieceText('tension', null), { title: '', text: '' });
});

test('retrieval runs on the comment, anchored by the piece title', () => {
  const q = retrievalQuery('tension', tension, 'But Marcus ruled an empire.');
  assert.ok(q.startsWith('But Marcus ruled an empire.'));
  assert.match(q, /greatness that shrinks you/);
});

test('the prompt carries the piece, the passages, the reader and the rules', () => {
  const { system, user } = buildReplyPrompt({
    kind: 'tension', piece: tension, commentBody: 'Ambition built the Stoa.', handle: 'reader_1',
    passages: [{ author: 'Seneca', title: 'Letters', chunk_text: 'Hasten slowly.' }],
  });
  assert.match(system, /The greatness that shrinks you/);
  assert.match(system, /\[1\] Seneca, Letters\nHasten slowly\./);
  assert.match(system, /do not invent quotations or citations/);
  assert.match(system, /never as a historical thinker/);
  assert.match(user, /^reader_1 wrote:/);
  assert.match(user, /Ambition built the Stoa\./);
});

test('with no passages the corpus is told to say so', () => {
  const { system } = buildReplyPrompt({ kind: 'dream', piece: { content: 'c' }, commentBody: 'x', passages: [] });
  assert.match(system, /shelves offered no close companion/);
});

test('replies are plain prose without dashes or markdown', () => {
  assert.strictEqual(cleanReply('**Yes** — and *no*.'), 'Yes, and no.');
  assert.strictEqual(cleanReply('## Heading\nText'), 'Heading\nText');
  assert.strictEqual(cleanReply(undefined), '');
});

// ── The reader never sees the passages ─────────────────────────────────────

const R = require('../lib/observatory-reply');

test('the reply prompt forbids talk of the passages it was given', () => {
  const { system } = buildReplyPrompt({ kind: 'dream', piece: { content: 'x' }, commentBody: 'y', passages: [] });
  assert.doesNotMatch(system, /voices from the passages provided|grounded in the passages given/);
  assert.match(system, /The reader never sees the passages/);
});

test('replies that mention the passages are caught', () => {
  for (const s of [
    'The passages provided suggest Seneca would push back.',
    'As passage 2 puts it, the body is not ours.',
    'Epictetus is blunt here [1].',
    'None of the texts above settle it.',
  ]) assert.ok(R.promptReferences(s).length, s);
  assert.deepEqual(R.promptReferences('Epictetus, in the Discourses, would say the body is not yours. Seneca agrees.'), []);
});

test('the last resort drops only the offending sentences', () => {
  const body = 'You are right about grief. The passages provided do not address it directly. Seneca, in the Letters, comes closest. Does that help?';
  assert.strictEqual(R.dropPromptReferences(body), 'You are right about grief. Seneca, in the Letters, comes closest. Does that help?');
  assert.strictEqual(R.dropPromptReferences('Nothing to drop here.'), 'Nothing to drop here.');
});

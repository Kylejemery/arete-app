// server/lib/quality-audit/probes-material.js
//
// The judgment pass: the part of quality no query can see.
//
// A chunk can carry every field Part 5 requires and still be a publisher's
// advertisement, an index of proper names, a translator's preface filed under
// the philosopher's own name, or OCR wreckage that no reader could parse. It
// will embed, it will retrieve, and it will be quoted to a user in a counselor's
// voice. The only way to catch it is to read it, so this probe reads a bounded
// random sample each night and reports what it finds by category.
//
// Deliberately conservative: it flags what is plainly wrong on the face of the
// text, and it is told that a chunk starting mid-sentence is normal (the
// pipeline chunks at 400 words with a 50-word overlap). A judgment probe that
// cries wolf costs more than it saves, because the report stops being read.

const { finding } = require('./framework');
const { callClaudeJSON } = require('./claude');

const DOMAIN = 'material';
const BATCH_SIZE = 10;

const SYSTEM_PROMPT = `You are auditing the Arete corpus — a RAG corpus of philosophical primary texts, public-domain scholarship, editorial concordances, and Mode 2 summaries of modern work. Passages from it are quoted to users in the voice of the philosopher who wrote them, so a passage that is not what it claims to be becomes a misattribution in someone's mouth.

You are given chunks with their claimed metadata. For each, decide whether the text is what the metadata says it is, and whether it is usable as a retrieved passage.

Flag a chunk ONLY for these, and only when it is plain on the face of the text:

- "boilerplate": not the work at all — a title page, copyright or licence notice, table of contents, index, list of subscribers, publisher's advertisement, running heads, or page-number debris.
- "apparatus": the editor's or translator's own voice filed under the author's name — a preface, introduction, editorial footnote, or critical apparatus. The philosopher's text is what belongs under the philosopher's name.
- "ocr_damage": so garbled by scanning that a reader could not follow it — run-together words, dropped characters, interleaved columns. Archaic spelling and long s are NOT damage.
- "mislabeled": the section_label or locator names something the text plainly is not about.
- "empty": no substantive content — a heading alone, a few stray words, whitespace.

Do NOT flag:
- A chunk that begins or ends mid-sentence. The pipeline chunks at 400 words with a 50-word overlap; this is expected and normal.
- Archaic, Victorian, or stilted translation. These are pre-1930 public-domain translations by design.
- Content you merely find uninteresting, repetitive, or philosophically weak.
- A concordance entry that reads as editorial: the concordance layer IS editorial apparatus and is fenced accordingly.

Be conservative. A false flag costs more than a miss, because a report full of false flags stops being read.`;

function buildMessage(batch) {
  const rendered = batch.map((c, i) => [
    `--- CHUNK ${i + 1} ---`,
    `id: ${c.id}`,
    `claims: ${c.author} / ${c.work}${c.section_label ? ` / ${c.section_label}` : ''}${c.locator ? ` (${c.locator})` : ''}`,
    `text_type: ${c.text_type}; translator: ${c.translator || 'none recorded'}; edition_year: ${c.edition_year ?? 'none recorded'}`,
    `text: ${(c.chunk_text || '').slice(0, 2400)}`,
  ].join('\n')).join('\n\n');

  return `${rendered}

For each chunk, return a verdict. Respond ONLY with valid JSON:

{
  "verdicts": [
    {
      "id": "the chunk id",
      "issue": "boilerplate" | "apparatus" | "ocr_damage" | "mislabeled" | "empty" | "ok",
      "note": "one sentence, only when issue is not ok — what the text actually is",
      "confidence": "high" | "medium" | "low"
    }
  ]
}

Return exactly one verdict per chunk, in order.`;
}

const ISSUE_COPY = {
  boilerplate: {
    severity: 'critical',
    title: 'front matter or publisher boilerplate in the corpus',
    detail:
      'A title page, licence notice, index or advertisement ingested as if it were the work. It ' +
      'embeds, it retrieves, and it can be quoted to a user as the philosopher speaking. The ' +
      'Gutenberg stripper and the body markers on the queue row exist to prevent exactly this.',
    action:
      'Deprecate the chunks, then fix the intake: set body_start_marker / body_end_marker on the ' +
      'queue row for that source and re-ingest.',
  },
  apparatus: {
    severity: 'critical',
    title: 'editorial apparatus filed under the author\'s name',
    detail:
      'A translator\'s preface or an editor\'s footnote stored under the philosopher\'s name. The ' +
      'counselor surfaces attribute what they say, so this becomes a 19th-century editor\'s opinion ' +
      'delivered as Seneca\'s.',
    action:
      'Deprecate, or re-ingest under the editor\'s own identity with text_type = scholarship if the ' +
      'material is worth holding.',
  },
  ocr_damage: {
    severity: 'warning',
    title: 'text too garbled to read',
    detail:
      'Scanning damage that survived the cleaning step. A retrieval that lands here returns something ' +
      'a user cannot read, and an embedding built from noise pulls the work toward nothing.',
    action: 'Deprecate the affected chunks and re-fetch the source from a cleaner edition.',
  },
  mislabeled: {
    severity: 'warning',
    title: 'section_label or locator does not match the text',
    detail:
      'The label is what a citation is built from — a passage should be citable as Discourses 1.14 ' +
      'without going back to the source. A wrong label makes a confident, wrong citation.',
    action: 'Correct the label, or re-ingest the work with the right chunk strategy for its divisions.',
  },
  empty: {
    severity: 'warning',
    title: 'chunks with no substantive content',
    detail: 'A heading or a few stray words occupying a chunk slot, embedded and retrievable.',
    action: 'Deprecate them and check the chunker\'s handling of that source\'s structure.',
  },
};

const probes = [
  {
    id: 'material.sampled_chunks',
    domain: DOMAIN,
    title: 'A read sample of the live corpus',
    needs: ['db', 'claude'],
    async run(ctx) {
      const sampleSize = ctx.config.material_sample_size ?? 40;
      if (sampleSize <= 0) return [];

      const { data: sample, error } = await ctx.supabase.rpc('quality_audit_sample_chunks', {
        sample_size: sampleSize,
        recent_since: ctx.config.standards_since,
        recent_share: 0.7,
      });
      if (error) throw new Error(`quality_audit_sample_chunks failed: ${error.message}`);
      if (!sample || !sample.length) return [];

      const byId = new Map(sample.map(c => [c.id, c]));
      const verdicts = [];

      for (let i = 0; i < sample.length; i += BATCH_SIZE) {
        const batch = sample.slice(i, i + BATCH_SIZE);
        const result = await callClaudeJSON({
          apiKey: ctx.claudeKey,
          model: ctx.config.model,
          system: SYSTEM_PROMPT,
          message: buildMessage(batch),
          maxTokens: 2000,
        });
        verdicts.push(...(result.verdicts || []));
        ctx.log(`    read ${Math.min(i + BATCH_SIZE, sample.length)}/${sample.length} chunks`);
      }

      // Low confidence is not a finding; it is the model saying it is unsure,
      // and an unsure flag on a 400-word fragment is usually the overlap.
      const flagged = verdicts.filter(v => v.issue && v.issue !== 'ok' && v.confidence !== 'low');
      const out = [];

      for (const [issue, copy] of Object.entries(ISSUE_COPY)) {
        const hits = flagged.filter(v => v.issue === issue);
        if (!hits.length) continue;

        out.push(finding({
          probe: 'material.sampled_chunks',
          domain: DOMAIN,
          severity: copy.severity,
          key: issue,
          title: `${hits.length} of ${sample.length} sampled chunks: ${copy.title}`,
          detail:
            `${copy.detail} Found by reading a random ${sample.length}-chunk sample weighted toward ` +
            `ingests since ${ctx.config.standards_since}. These are the rows the sample happened to ` +
            'land on, not the full extent of the problem.',
          count: hits.length,
          evidence: hits.map(v => {
            const c = byId.get(v.id);
            const where = c ? `${c.author} / ${c.work} #${c.chunk_index}` : v.id;
            return `${where} — ${v.note || 'no note'} [${v.id}]`;
          }),
          action: copy.action,
        }));
      }

      // A clean sample is worth recording: it is the evidence that the rate is
      // low, and it makes a later regression visible in the run history.
      if (!out.length) {
        ctx.log(`    ${sample.length} chunks read, nothing flagged`);
      }
      return out;
    },
  },
];

module.exports = { probes };

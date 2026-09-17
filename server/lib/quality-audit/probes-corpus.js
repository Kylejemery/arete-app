// server/lib/quality-audit/probes-corpus.js
//
// Corpus integrity probes. The corpus is the thing that compounds, and a bad
// ingest is hard to notice by hand, so these check the standing rules rather
// than taste: the Part 5 metadata contract, the copyright rule, the text_type
// fence, the two failure modes this pipeline has actually hit before (one work
// under two identities, and writes landing in a table retrieval does not read),
// and whether the fences still hold end to end when a real query goes through.
//
// Everything except the two live-retrieval probes comes from one RPC call —
// quality_audit_corpus_stats() — because a client-side select() on rag_corpus
// is capped at 1000 rows by PostgREST and would quietly undercount.

const { finding } = require('./framework');
const {
  COUNSELOR_EXCLUDED_TEXT_TYPES,
  counselorRetrievalParams,
} = require('../corpus-fence');

const DOMAIN = 'corpus';

// Every text_type the fence file knows about. A value in rag_corpus that is not
// here is a layer nobody has decided the visibility of.
const KNOWN_TEXT_TYPES = [
  'primary', 'scholarship', 'paper_summary', 'synthesis',
  'concordance', 'modern_primary', 'modern_summary',
];

// Short, deliberately ordinary queries for the live fence checks. They are
// phrased the way a user writes, so they exercise the same retrieval path the
// counselor surfaces use rather than a synthetic one.
const FENCE_PROBE_QUERIES = [
  'I keep replaying an argument I lost and I cannot let it go',
  'what is the mind and how does it relate to the body',
  'I am afraid of dying and it keeps me awake',
];

async function stats(ctx) {
  if (!ctx._corpusStats) {
    const { data, error } = await ctx.supabase.rpc('quality_audit_corpus_stats', {
      standards_since: ctx.config.standards_since,
    });
    if (error) throw new Error(`quality_audit_corpus_stats failed: ${error.message}`);
    ctx._corpusStats = data;
  }
  return ctx._corpusStats;
}

async function embed(ctx, text) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ctx.openaiKey}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  if (!res.ok) throw new Error(`embedding failed (${res.status})`);
  return (await res.json()).data[0].embedding;
}

const probes = [
  // --- Part 5 metadata ------------------------------------------------------
  {
    id: 'corpus.metadata_required',
    domain: DOMAIN,
    title: 'Required ingest metadata',
    needs: ['db'],
    async run(ctx) {
      const s = await stats(ctx);
      const out = [];
      const fields = [
        ['translator', s.missing_translator_recent, s.missing_translator, 'no_translator'],
        ['source_url', s.missing_source_url_recent, s.missing_source_url, 'no_source_url'],
        ['edition_year', s.missing_edition_year_recent, s.missing_edition_year, 'no_edition_year'],
      ];

      for (const [field, recent, total, offenderKey] of fields) {
        if (!recent) continue;
        const offenders = (s.metadata_offenders || [])
          .filter(o => o[offenderKey] > 0)
          .map(o => `${o.author} / ${o.work} — ${o[offenderKey]} of ${o.chunks} chunks (last ingest ${o.last_ingest})`);

        out.push(finding({
          probe: 'corpus.metadata_required',
          domain: DOMAIN,
          severity: 'warning',
          key: field,
          title: `${recent} chunk(s) ingested since ${s.standards_since} carry no ${field}`,
          detail:
            `Part 5 of the acquisition plan makes ${field} required at the write path. ` +
            `${recent} post-standard chunks are missing it (${total} across the whole live corpus, ` +
            `most of that the legacy backlog the plan puts out of scope).`,
          count: recent,
          evidence: offenders,
          action:
            `Backfill ${field} on the works listed, then close the hole at the write path so the ` +
            `next ingest cannot repeat it — the queue row carries translator and edition_year, so a ` +
            `null here means the queue row was incomplete when the Corpus Agent drained it.`,
        }));
      }
      return out;
    },
  },

  // --- Copyright ------------------------------------------------------------
  {
    id: 'corpus.copyright_fence',
    domain: DOMAIN,
    title: 'Verbatim text is public domain',
    needs: ['db'],
    async run(ctx) {
      const s = await stats(ctx);
      const offenders = s.verbatim_post_1930 || [];
      if (!offenders.length) return [];

      return [finding({
        probe: 'corpus.copyright_fence',
        domain: DOMAIN,
        severity: 'critical',
        title: `${offenders.length} verbatim work(s) carry an edition_year after 1930`,
        detail:
          'The standing copyright rule admits verbatim text only for public domain sources — a ' +
          'translation published 1930 or earlier, or a confirmed open licence. Anything later ' +
          'belongs in the corpus as a Mode 2 summary, with the original never stored.',
        count: offenders.reduce((n, o) => n + Number(o.chunks), 0),
        evidence: offenders.map(o =>
          `${o.author} / ${o.work} (tr. ${o.translator || 'unknown'}, ${o.edition_year}, ${o.text_type}) — ${o.chunks} chunks`),
        action:
          'Confirm the edition date. If it is genuinely post-1930 and not openly licensed, deprecate ' +
          'the chunks and re-enter the work as a Mode 2 summary through the admin corpus page.',
      })];
    },
  },

  // --- Mode 2 ---------------------------------------------------------------
  {
    id: 'corpus.mode2_length',
    domain: DOMAIN,
    title: 'Mode 2 summaries are summaries',
    needs: ['db'],
    async run(ctx) {
      const maxWords = ctx.config.mode2_max_words ?? 1800;
      const { data, error } = await ctx.supabase.rpc('quality_audit_mode2_lengths');
      if (error) throw new Error(`quality_audit_mode2_lengths failed: ${error.message}`);

      const oversized = (data || []).filter(w => Number(w.total_words) > maxWords);
      if (!oversized.length) return [];

      return [finding({
        probe: 'corpus.mode2_length',
        domain: DOMAIN,
        severity: 'critical',
        title: `${oversized.length} Mode 2 summary work(s) are far longer than a summary`,
        detail:
          'Modern copyrighted material enters only as a Mode 2 summary — the agent reads and rewrites ' +
          'in its own words, and the original is never stored. The Paper Agent writes 500 to 900 ' +
          `words. A work carrying more than ${maxWords} words under paper_summary or modern_summary ` +
          'is either a verbatim ingest wearing the summary label, which is the copyright failure the ' +
          'rule exists to prevent, or a summariser that stopped summarising. No check constraint can ' +
          'tell those apart, and neither can the text_type field.',
        count: oversized.length,
        evidence: oversized.map(w =>
          `${w.author} / ${w.work} (${w.text_type}) — ${w.total_words} words in ${w.chunks} chunks, first ingested ${w.first_ingest}`),
        action:
          'Read a chunk from each. If it is the author\'s own prose rather than a rewrite, deprecate ' +
          'the work and re-enter it as a real Mode 2 summary through the admin corpus page. Then find ' +
          'the path that admitted it, because the layer label was not what stopped it.',
      })];
    },
  },

  // --- The fence vocabulary -------------------------------------------------
  {
    id: 'corpus.text_type_fence',
    domain: DOMAIN,
    title: 'Every live text_type has a fence entry',
    needs: ['db'],
    async run(ctx) {
      const s = await stats(ctx);
      const unknown = (s.text_type_counts || []).filter(t => !KNOWN_TEXT_TYPES.includes(t.text_type));
      if (!unknown.length) return [];

      return [finding({
        probe: 'corpus.text_type_fence',
        domain: DOMAIN,
        severity: 'critical',
        title: `${unknown.length} text_type value(s) in rag_corpus that no fence knows about`,
        detail:
          'text_type is the layer field and the only fence. A value the fence file does not list is ' +
          'a layer whose visibility nobody has decided, and the counselor and modern fences in ' +
          'server/lib/corpus-fence.js exclude by name — so an unlisted layer is visible everywhere.',
        count: unknown.reduce((n, t) => n + Number(t.chunks), 0),
        evidence: unknown.map(t => `${t.text_type} — ${t.chunks} chunks across ${t.works} work(s)`),
        action:
          'A new layer is a migration (the check constraint) plus a fence entry, never an ad hoc ' +
          'value. Either add it to both, or re-label the chunks to an existing layer.',
      })];
    },
  },

  // --- Known past failure modes --------------------------------------------
  {
    id: 'corpus.identity_collisions',
    domain: DOMAIN,
    title: 'One work, one identity',
    needs: ['db'],
    async run(ctx) {
      const s = await stats(ctx);
      const collisions = s.identity_collisions || [];
      if (!collisions.length) return [];

      return [finding({
        probe: 'corpus.identity_collisions',
        domain: DOMAIN,
        severity: 'warning',
        title: `${collisions.length} work(s) live under more than one author string`,
        detail:
          'The filename parser (Author_Title_Section_Language.txt) splits multi-word titles, which ' +
          'has produced duplicate ingests under two identities before. A split identity halves the ' +
          'coverage counts the Gap Agent measures and lets retrieval cite the same work two ways.',
        count: collisions.length,
        evidence: collisions.map(c =>
          `"${(c.works || []).join('" / "')}" under ${(c.authors || []).map(a => `"${a}"`).join(' and ')}`),
        action:
          'Pick the canonical (author, work) pair, re-label the strays, and prefer explicit metadata ' +
          'over filename derivation for anything that is not a plain single-word title.',
      })];
    },
  },

  {
    id: 'corpus.write_target_drift',
    domain: DOMAIN,
    title: 'Ingests land where retrieval reads',
    needs: ['db'],
    async run(ctx) {
      const s = await stats(ctx);
      const rag = s.newest_rag_corpus_row ? new Date(s.newest_rag_corpus_row) : null;
      const legacy = s.newest_source_text_chunk_row ? new Date(s.newest_source_text_chunk_row) : null;
      if (!legacy || !rag || legacy <= rag) return [];

      return [finding({
        probe: 'corpus.write_target_drift',
        domain: DOMAIN,
        severity: 'critical',
        title: 'source_text_chunks has newer rows than rag_corpus',
        detail:
          'The pipeline once wrote to source_text_chunks while retrieval read rag_corpus, so months ' +
          'of ingests were never retrievable. Newer rows in the legacy table mean some write path ' +
          'has drifted back onto it.',
        evidence: [
          `newest rag_corpus row: ${rag.toISOString()}`,
          `newest source_text_chunks row: ${legacy.toISOString()}`,
        ],
        action: 'Find the writer and point it at rag_corpus. Verify the write target against the read target.',
      })];
    },
  },

  // --- Retrievability -------------------------------------------------------
  {
    id: 'corpus.embedding_missing',
    domain: DOMAIN,
    title: 'Every live chunk is embedded',
    needs: ['db'],
    async run(ctx) {
      const s = await stats(ctx);
      if (!s.embedding_missing) return [];
      return [finding({
        probe: 'corpus.embedding_missing',
        domain: DOMAIN,
        severity: 'critical',
        title: `${s.embedding_missing} live chunk(s) have no embedding`,
        detail:
          'A chunk with a null embedding is in the corpus but invisible to every vector search. It ' +
          'counts toward coverage and answers nothing.',
        count: s.embedding_missing,
        action: 'Re-embed the affected rows, or deprecate them if the ingest that produced them was abandoned.',
      })];
    },
  },

  {
    id: 'corpus.sequence_gaps',
    domain: DOMAIN,
    title: 'No work stops short',
    needs: ['db'],
    async run(ctx) {
      const s = await stats(ctx);
      // `absent` is an index with no row at all — an ingest that stopped. An
      // index whose row exists but is deprecated is an editorial decision and
      // is not a finding.
      const truncated = (s.sequence_gaps || []).filter(g => Number(g.absent) > 0);
      if (!truncated.length) return [];

      return [finding({
        probe: 'corpus.sequence_gaps',
        domain: DOMAIN,
        severity: 'warning',
        title: `${truncated.length} work(s) have chunk indexes that were never ingested`,
        detail:
          'A chunk_index inside a work\'s range with no row at any deprecation state means the ' +
          'ingest stopped short or a chunk failed to embed and was dropped. Deprecated apparatus is ' +
          'excluded from this count.',
        count: truncated.reduce((n, g) => n + Number(g.absent), 0),
        evidence: truncated.map(g =>
          `${g.author} / ${g.work} — ${g.absent} absent index(es) in ${g.min_idx}..${g.max_idx}`),
        action: 'Re-ingest the affected works, or confirm the source itself is missing those sections.',
      })];
    },
  },

  {
    id: 'corpus.duplicate_text',
    domain: DOMAIN,
    title: 'No duplicated passages',
    needs: ['db'],
    async run(ctx) {
      const s = await stats(ctx);
      const dup = s.duplicate_text || {};
      if (!Number(dup.redundant_rows)) return [];

      return [finding({
        probe: 'corpus.duplicate_text',
        domain: DOMAIN,
        severity: 'warning',
        title: `${dup.redundant_rows} live chunk(s) duplicate the text of another chunk`,
        detail:
          `${dup.groups} group(s) of live chunks share identical text. Each duplicate is a wasted ` +
          'embedding and, worse, a passage that can come back twice in one retrieval and read as ' +
          'two independent witnesses to the same claim.',
        count: Number(dup.redundant_rows),
        action: 'Deprecate the later copy in each group and check whether one source was ingested twice.',
      })];
    },
  },

  // --- Part 5 rule 4 --------------------------------------------------------
  {
    id: 'corpus.question_map',
    domain: DOMAIN,
    title: 'New works are registered on the question map',
    needs: ['db'],
    async run(ctx) {
      const s = await stats(ctx);
      const unregistered = s.unregistered_works || [];
      if (!unregistered.length) return [];

      return [finding({
        probe: 'corpus.question_map',
        domain: DOMAIN,
        severity: 'warning',
        title: `${unregistered.length} work(s) ingested since ${s.standards_since} are not on the question map`,
        detail:
          'Part 5 rule 4: every new work is registered against the question map with at least one ' +
          'position and role. A work that bears on no question either belongs to a question the map ' +
          'is missing, or does not belong in the corpus. ' +
          `(${s.unregistered_works_total} works are unregistered in total, most of them pre-dating the rule.)`,
        count: unregistered.length,
        evidence: unregistered.map(w => `${w.author} / ${w.work} — ${w.chunks} chunks, last ingest ${w.last_ingest}`),
        action:
          'Register each work in corpus_question_registrations with its position and role, or add the ' +
          'question the map is missing.',
      })];
    },
  },

  // --- Queue health ---------------------------------------------------------
  {
    id: 'corpus.queue_health',
    domain: DOMAIN,
    title: 'The ingestion queue is draining',
    needs: ['db'],
    async run(ctx) {
      const staleDays = ctx.config.queue_stale_days ?? 7;
      const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await ctx.supabase
        .from('corpus_ingestion_queue')
        .select('id, author, work, status, error_message, created_at')
        .in('status', ['failed', 'pending']);
      if (error) throw new Error(`queue read failed: ${error.message}`);

      const failed = (data || []).filter(r => r.status === 'failed');
      const stale = (data || []).filter(r => r.status === 'pending' && r.created_at < cutoff);
      const out = [];

      if (failed.length) {
        out.push(finding({
          probe: 'corpus.queue_health',
          domain: DOMAIN,
          severity: 'warning',
          key: 'failed',
          title: `${failed.length} source(s) sitting in corpus_ingestion_queue as failed`,
          detail:
            'A failed queue row is a source someone decided the corpus should hold and that it does ' +
            'not hold. Nothing retries it; it stays failed until a human looks.',
          count: failed.length,
          evidence: failed.map(r => `${r.author} / ${r.work} — ${(r.error_message || 'no error recorded').slice(0, 140)}`),
          action: 'Fix the fetch or the markers and requeue, or drop the row with a note on why the source was abandoned.',
        }));
      }

      if (stale.length) {
        out.push(finding({
          probe: 'corpus.queue_health',
          domain: DOMAIN,
          severity: 'info',
          key: 'stale-pending',
          title: `${stale.length} queue row(s) have been pending for over ${staleDays} days`,
          detail:
            'The Corpus Agent drains a capped batch each night. A pending row older than the batch ' +
            'cadence means either the agent is not running or the batch size is below the inflow.',
          count: stale.length,
          evidence: stale.map(r => `${r.author} / ${r.work} — queued ${r.created_at.slice(0, 10)}`),
          action: 'Check the nightly Corpus Agent ran, and whether CORPUS_AGENT_BATCH_SIZE is keeping up.',
        }));
      }

      return out;
    },
  },

  // --- The fences, end to end ----------------------------------------------
  {
    id: 'corpus.retrieval_fences',
    domain: DOMAIN,
    title: 'Deprecation and the counselor fence hold in live retrieval',
    needs: ['db', 'openai'],
    async run(ctx) {
      const leaked = { deprecated: [], fenced: [] };

      for (const query of FENCE_PROBE_QUERIES) {
        const embedding = await embed(ctx, query);
        const { data, error } = await ctx.supabase.rpc('match_rag_corpus', {
          query_embedding: embedding,
          match_count: 20,
          filter_author: null,
          filter_language: 'english',
          ...counselorRetrievalParams(),
        });
        if (error) throw new Error(`match_rag_corpus failed: ${error.message}`);

        for (const row of data || []) {
          if (row.text_type && COUNSELOR_EXCLUDED_TEXT_TYPES.includes(row.text_type)) {
            leaked.fenced.push(`"${query}" returned ${row.author} / ${row.work} (${row.text_type})`);
          }
        }

        // Deprecation is filtered inside the RPC, so confirm it by reading the
        // flag back off the rows it actually returned.
        const ids = (data || []).map(r => r.id).filter(Boolean);
        if (ids.length) {
          const { data: rows, error: rowErr } = await ctx.supabase
            .from('rag_corpus').select('id, author, work, deprecated').in('id', ids).eq('deprecated', true);
          if (rowErr) throw new Error(`deprecation read-back failed: ${rowErr.message}`);
          for (const row of rows || []) {
            leaked.deprecated.push(`"${query}" returned deprecated ${row.author} / ${row.work}`);
          }
        }
      }

      const out = [];
      if (leaked.deprecated.length) {
        out.push(finding({
          probe: 'corpus.retrieval_fences',
          domain: DOMAIN,
          severity: 'critical',
          key: 'deprecated',
          title: 'Retrieval returned deprecated chunks',
          detail:
            'Deprecate-never-delete only works if retrieval filters on the flag. A deprecated chunk ' +
            'coming back means every superseded ingest is still live in answers.',
          count: leaked.deprecated.length,
          evidence: leaked.deprecated,
          action: 'Restore the `deprecated = false` predicate in match_rag_corpus and its siblings.',
        }));
      }
      if (leaked.fenced.length) {
        out.push(finding({
          probe: 'corpus.retrieval_fences',
          domain: DOMAIN,
          severity: 'critical',
          key: 'counselor',
          title: 'The counselor fence let an excluded layer through',
          detail:
            `A call carrying counselorRetrievalParams() returned a text_type on the exclusion list ` +
            `(${COUNSELOR_EXCLUDED_TEXT_TYPES.join(', ')}). The Cabinet and Oracle speak as the ` +
            'tradition, and editorial apparatus or the modern layer in their mouths is a ' +
            'misattribution, not a ranking problem.',
          count: leaked.fenced.length,
          evidence: leaked.fenced,
          action: 'Check exclude_text_types is still honoured in match_rag_corpus and at the call sites.',
        }));
      }
      return out;
    },
  },
];

module.exports = { probes, KNOWN_TEXT_TYPES };

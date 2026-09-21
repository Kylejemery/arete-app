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

// Locator granularity thresholds, calibrated against the live corpus rather
// than guessed. Twelve works carry locators and eleven have a median of one
// chunk per locator; the twelfth, Yonge's Diogenes Laertius, has three and is
// the only genuine defect. A work under this many located chunks is too short
// for the median to mean anything.
const DEFAULT_LOCATOR_COARSE_MEDIAN = 2;
const DEFAULT_LOCATOR_MIN_CHUNKS = 30;

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
    title: 'Mode 2 summaries are summaries, not the original',
    needs: ['db'],
    async run(ctx) {
      const maxWords = ctx.config.mode2_max_words ?? 1800;
      const minAttribution = ctx.config.mode2_min_attribution ?? 0.5;

      const { data, error } = await ctx.supabase.rpc('quality_audit_mode2_lengths');
      if (error) throw new Error(`quality_audit_mode2_lengths failed: ${error.message}`);

      const oversized = (data || []).filter(w => Number(w.total_words) > maxWords);
      if (!oversized.length) return [];

      // Length alone says nothing about copyright. A Mode 2 summary talks about
      // its author in the third person — "Holiday argues", "Mates notes" —
      // because the agent wrote it; verbatim text by that author almost never
      // names them. So voice is the copyright signal and length is only an
      // observation about how much of the corpus one modern work occupies.
      const unattributed = oversized.filter(w => Number(w.attribution_rate) < minAttribution);
      const longForm = oversized.filter(w => Number(w.attribution_rate) >= minAttribution);
      const out = [];

      if (unattributed.length) {
        out.push(finding({
          probe: 'corpus.mode2_length',
          domain: DOMAIN,
          severity: 'critical',
          key: 'unattributed',
          title: `${unattributed.length} long Mode 2 work(s) do not read as rewrites`,
          detail:
            'Modern copyrighted material enters only as a Mode 2 summary — the agent reads and ' +
            'rewrites in its own words, and the original is never stored. These works are long AND ' +
            'rarely name their own author in the text, which is what a verbatim ingest wearing the ' +
            'summary label looks like. No check constraint can catch that, because text_type is ' +
            'whatever the ingest path set it to.',
          count: unattributed.length,
          evidence: unattributed.map(w =>
            `${w.author} / ${w.work} (${w.text_type}) — ${w.total_words} words, ` +
            `only ${Math.round(Number(w.attribution_rate) * 100)}% of chunks name the author, first ingested ${w.first_ingest}`),
          action:
            'Read a chunk. If it is the author\'s own prose rather than a rewrite, deprecate the work ' +
            'and re-enter it as a real Mode 2 summary through the admin corpus page — then find the ' +
            'path that admitted it, because the layer label was not what stopped it.',
        }));
      }

      if (longForm.length) {
        const words = longForm.reduce((n, w) => n + Number(w.total_words), 0);
        out.push(finding({
          probe: 'corpus.mode2_length',
          domain: DOMAIN,
          severity: 'info',
          key: 'long-form',
          title: `${longForm.length} Mode 2 work(s) run to book length (${words.toLocaleString()} words)`,
          detail:
            'These read as genuine rewrites — they name their author throughout — so this is not a ' +
            'copyright finding. It is a weighting one. A twenty-thousand-word summary of one modern ' +
            'book carries roughly the retrieval mass of a primary text, while a paper summary carries ' +
            'three chunks, so the modern layer can outweigh the ancient one on any theme it covers ' +
            'without anyone deciding that it should.',
          count: longForm.length,
          evidence: longForm.map(w =>
            `${w.author} / ${w.work} — ${w.total_words} words in ${w.chunks} chunks ` +
            `(${Math.round(Number(w.attribution_rate) * 100)}% attributed)`),
          action:
            'Worth a decision rather than a fix: either this is the intended depth for book-length ' +
            'Mode 2 work, in which case mute this, or the summaries want condensing toward the Paper ' +
            'Agent\'s budget.',
        }));
      }

      return out;
    },
  },

  // --- Can a retrieved passage be cited? -------------------------------------
  {
    id: 'corpus.locator_quality',
    domain: DOMAIN,
    title: 'Locators identify the passage they label',
    needs: ['db'],
    async run(ctx) {
      const { data, error } = await ctx.supabase.rpc('quality_audit_locator_quality');
      if (error) throw new Error(`quality_audit_locator_quality failed: ${error.message}`);

      const coarseMedian = ctx.config.locator_coarse_median || DEFAULT_LOCATOR_COARSE_MEDIAN;
      const minChunks = ctx.config.locator_min_chunks || DEFAULT_LOCATOR_MIN_CHUNKS;
      // The agent always supplies this; duplicating the date here would be a
      // second place for it to drift. Absent, the probe throws rather than
      // treating every work as pre-standard, which would pass silently.
      const since = ctx.config.standards_since;
      if (!since) throw new Error('standards_since is not configured');

      const rows = data || [];
      const out = [];

      // A scheme pitched at the wrong level. The median matters and the worst
      // locator does not: `Discourses 4.1` really is the longest chapter in the
      // Discourses, and Augustine's 636 locators over 1006 chunks are a correct
      // parse with one long chapter in it. A median above one means that for
      // most of the work a citation cannot say which passage it means.
      const coarse = rows.filter(r =>
        r.located >= minChunks && r.median_chunks_per_locator >= coarseMedian);

      if (coarse.length) {
        out.push(finding({
          probe: 'corpus.locator_quality',
          domain: DOMAIN,
          severity: 'warning',
          key: 'coarse',
          title: `${coarse.length} work(s) carry locators too coarse to cite a passage`,
          detail:
            'Part 5 rule 3 asks for a locator that lets a retrieved passage be cited without going ' +
            'back to the source. In these works the typical locator covers several chunks, so it ' +
            'names a region rather than a passage. That is worse than an absent locator rather than ' +
            'better: an absent one makes a passage uncitable, a coarse one makes it falsely citable, ' +
            'and nothing downstream can tell the difference. Yonge\'s Diogenes Laertius is the case ' +
            'that prompted this check — its `book.life` ordinals put the whole of Book 10, the Letter ' +
            'to Menoeceus and the Principal Doctrines included, under `10.1`.',
          count: coarse.length,
          evidence: coarse.map(r =>
            `${r.author} / ${r.work} — median ${r.median_chunks_per_locator} chunks per locator, ` +
            `${r.distinct_locators} locators over ${r.located} chunks; worst is ` +
            `"${r.worst_locator}" covering ${r.worst_locator_chunks}`),
          action:
            'Parse the text\'s own divisions into `locator`. Where a second translation carrying the ' +
            'canonical numbering is already held, prefer it and deprecate the coarse one; where it is ' +
            'the only holding, it wants a parser rather than a deprecation, because deprecating it ' +
            'removes the position from the corpus.',
        }));
      }

      // Ingested under the standard with no locator at all. Older works are the
      // backfill the acquisition plan puts out of scope, counted in the detail
      // rather than re-litigated every night.
      const absent = rows.filter(r => r.located === 0 && r.chunks >= minChunks &&
                                      r.first_ingest && r.first_ingest >= since);
      const legacyAbsent = rows.filter(r => r.located === 0 &&
                                            !(r.first_ingest && r.first_ingest >= since));

      if (absent.length) {
        out.push(finding({
          probe: 'corpus.locator_quality',
          domain: DOMAIN,
          severity: 'warning',
          key: 'absent',
          title: `${absent.length} work(s) ingested since ${since} carry no locator at all`,
          detail:
            'Part 5 rule 3 applies to every ingest from the standard onward, and these carry nothing ' +
            'in `locator`, so every passage in them retrieves as a chunk rather than as a citation. ' +
            `(${legacyAbsent.length} older works are also unlocated; those are the backfill the plan ` +
            'puts out of scope and are not counted here.)',
          count: absent.length,
          evidence: absent.map(r =>
            `${r.author} / ${r.work} — ${r.chunks} chunks, ingested ${r.first_ingest}`),
          action:
            'Parse the divisions the text itself provides into `locator` — Stephanus numbers for ' +
            'Plato, book and chapter elsewhere. Where a text genuinely has no canonical divisions, ' +
            '`locator` is null by design and `section_label` carries the heading; mute this for that work.',
        }));
      }

      return out;
    },
  },

  // --- Editorial apparatus, found by shape -----------------------------------
  {
    id: 'corpus.apparatus',
    domain: DOMAIN,
    title: 'The verbatim layers hold only the author\'s text',
    needs: ['db'],
    async run(ctx) {
      const { data, error } = await ctx.supabase.rpc('quality_audit_apparatus_candidates');
      if (error) throw new Error(`quality_audit_apparatus_candidates failed: ${error.message}`);

      const rows = data || [];
      if (!rows.length) return [];

      const label = {
        gutenberg: 'Project Gutenberg or proofreading boilerplate',
        producer_note: "a producer's or transcriber's note",
        yaml_front_matter: 'a YAML front-matter block',
        table_of_contents: 'a table of contents',
        footnote_run: "a run of the editor's numbered citations",
        footnote_candidate: 'possible citation runs',
        source_site_furniture: "the source site's running page furniture",
      };

      const high = rows.filter(r => r.confidence === 'high');
      const candidates = rows.filter(r => r.confidence === 'candidate');
      const furniture = rows.filter(r => r.confidence === 'furniture');
      const out = [];

      if (high.length) {
        const bySignal = {};
        for (const r of high) (bySignal[r.signal] = bySignal[r.signal] || []).push(r);
        const breakdown = Object.entries(bySignal)
          .map(([sig, rs]) => `${rs.length} × ${label[sig] || sig}`)
          .join(', ');

        out.push(finding({
          probe: 'corpus.apparatus',
          domain: DOMAIN,
          severity: 'critical',
          key: 'confirmed',
          title: `${high.length} chunk(s) in the verbatim layers are not the author's text`,
          detail:
            `Found by shape, not by reading: ${breakdown}. These sit under the philosopher's own name ` +
            'in a layer that claims to hold their words, so retrieval can hand a Gutenberg header or a ' +
            "translator's footnote run to a counselor and it will be attributed as the philosopher " +
            'speaking. This is the same class the read pass rates critical when it happens to sample ' +
            'one; the difference is that a query finds all of them every night rather than the few a ' +
            '40-chunk sample lands on.',
          count: high.length,
          evidence: high.slice(0, 10).map(r =>
            `${r.author} / ${r.work} #${r.chunk_index} (${r.signal}) — ${r.opening.slice(0, 90)}… [${r.id}]`),
          action:
            'Deprecate them — never delete — in one migration, then fix the intake that admitted them: ' +
            'body_start_marker / body_end_marker on the queue row cut front matter at ingest, and a ' +
            'chunk that is nothing but citations means the source needs its notes stripped before chunking.',
        }));
      }

      if (candidates.length) {
        out.push(finding({
          probe: 'corpus.apparatus',
          domain: DOMAIN,
          severity: 'info',
          key: 'candidates',
          title: `${candidates.length} chunk(s) may be citation runs rather than text`,
          detail:
            'These carry citation markers densely and early, but not densely enough to be certain — ' +
            'heavily annotated prose looks similar, and Zeller\'s scholarship in particular cites as ' +
            'thickly in running argument as Plutarch\'s endnote pages do. Listed for a human eye ' +
            'rather than asserted.',
          count: candidates.length,
          evidence: candidates.slice(0, 10).map(r =>
            `${r.author} / ${r.work} #${r.chunk_index} — ${r.opening.slice(0, 90)}… [${r.id}]`),
          action:
            'Read a few. If they are citation runs, fold them into the same deprecation migration; if ' +
            'they are annotated body text, mute this fingerprint with that as the reason.',
        }));
      }

      if (furniture.length) {
        const byWork = {};
        for (const r of furniture) {
          const k = `${r.author} / ${r.work}`;
          byWork[k] = (byWork[k] || 0) + 1;
        }
        const worst = Object.entries(byWork).sort((a, b) => b[1] - a[1]);

        out.push(finding({
          probe: 'corpus.apparatus',
          domain: DOMAIN,
          severity: 'critical',
          key: 'source_site_furniture',
          title: `${furniture.length} chunk(s) carry the source site's page furniture in the reading text`,
          detail:
            'A web address inside a verbatim layer. Ancient texts do not cite URLs, so a domain here is ' +
            "the digital edition talking over the author — typically a running footer (site name, page " +
            'number, address) that was never cut before chunking, and so sits mid-sentence in the text a ' +
            'reader sees and a counselor is handed. Affected: ' +
            worst.map(([w, n]) => `${w} (${n})`).join(', ') + '.',
          count: furniture.length,
          evidence: furniture.slice(0, 10).map(r =>
            `${r.author} / ${r.work} #${r.chunk_index} — ${r.opening.slice(0, 90)}… [${r.id}]`),
          action:
            'Strip it, do not deprecate: unlike the confirmed findings above, these chunks are the ' +
            "author's own text with someone else's footer threaded through it, so deprecating throws the " +
            'passage away. Write one migration per work that regexp_replaces the footer out of chunk_text, ' +
            'and match a fragment at either chunk edge as well as a whole footer in the middle — the ' +
            'overlap window splits them (see 20260921142402_on_anger_provenance_and_furniture.sql). ' +
            'Embeddings were computed over the text WITH the furniture, so re-embed the work afterwards. ' +
            'Then fix the intake: body_start_marker / body_end_marker on the queue row cut front and back ' +
            'matter, but a footer repeating through the body has to be stripped by the chunker.',
        }));
      }

      return out;
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

  // --- Retrieval latency ----------------------------------------------------
  //
  // match_rag_corpus is the one function every counselor depends on, and today
  // it is an exact scan: the SET on the function blocks inlining, so Postgres
  // reads every vector on every call (~101k buffers). That is correct and it
  // is cheap enough at 14k chunks — 187ms warm — but it scales linearly with
  // the corpus, and PostgREST kills any statement at 8s. The decision to move
  // to an approximate index (HNSW measured at 99.7% recall, ~1% of the cost)
  // should be made on a number, not a feeling, so this times the real path
  // nightly and says when the number has moved.
  //
  // It runs before the fences probe on purpose. The first call to
  // match_rag_corpus in a run is the cold one, and on 2026-09-18 that call hit
  // the 8s cancel while the fences probe was making it: the fences probe
  // errored and this probe measured a half-warmed cache. Whichever probe
  // calls first takes the cold read, and the cold read is the number.
  //
  // Query vectors are the canonical concept embeddings in a fixed order:
  // out-of-corpus, so they behave like a user's question rather than a chunk
  // finding itself, and deterministic, so one night is comparable to the next.
  // The call goes through the same PostgREST hop the API server uses, so the
  // timing includes what a user would actually wait for.
  {
    id: 'corpus.retrieval_latency',
    domain: DOMAIN,
    title: 'match_rag_corpus answers in time',
    needs: ['db'],
    async run(ctx) {
      const warnMs = ctx.config.retrieval_warn_ms ?? 500;
      const criticalMs = ctx.config.retrieval_critical_ms ?? 4000;
      const samples = ctx.config.retrieval_latency_samples ?? 5;

      const { data: concepts, error } = await ctx.supabase
        .from('canonical_concepts')
        .select('id, name, embedding')
        .not('embedding', 'is', null)
        .order('id')
        .limit(samples);
      if (error) throw new Error(`canonical_concepts read failed: ${error.message}`);
      if (!concepts || !concepts.length) return [];

      const timings = [];
      for (const c of concepts) {
        // PostgREST returns a vector as its text form, "[0.1,0.2,...]", which
        // is valid JSON; the fence probe passes a plain array and that path is
        // proven, so normalise to it.
        const vec = typeof c.embedding === 'string' ? JSON.parse(c.embedding) : c.embedding;
        const t0 = Date.now();
        const { error: rpcErr } = await ctx.supabase.rpc('match_rag_corpus', {
          query_embedding: vec,
          match_count: 20,
          filter_author: null,
          filter_language: 'english',
          ...counselorRetrievalParams(),
        });
        timings.push({ name: c.name, ms: Date.now() - t0, error: rpcErr ? rpcErr.message : null });
      }

      const s = await stats(ctx);
      const live = s.live_chunks;
      const summary = timings.map(t => `${t.name} — ${t.error ? `FAILED: ${t.error}` : `${t.ms}ms`}`);
      ctx.log(`    retrieval latency at ${live} live chunks: ${timings.map(t => t.error ? 'ERR' : t.ms + 'ms').join(', ')}`);

      const failed = timings.filter(t => t.error);
      const ok = timings.filter(t => !t.error).map(t => t.ms);
      // The first call is the cold sample; the rest are what a warm server sees.
      const warm = ok.slice(1).length ? ok.slice(1) : ok;
      const median = [...warm].sort((a, b) => a - b)[Math.floor((warm.length - 1) / 2)];
      const worst = Math.max(...ok, 0);
      const out = [];

      const hnswAction =
        'The measured fix is an HNSW index in place of the ivfflat one, with the SET removed from ' +
        'match_rag_corpus so it can inline and hnsw.ef_search = 100 set on the role: 99.7% recall ' +
        'against the exact scan on out-of-corpus queries, ~1% of the buffer cost. Run scripts/eval ' +
        'once before and once after for a before/after on real queries, then ship it.';

      if (failed.length) {
        out.push(finding({
          probe: 'corpus.retrieval_latency',
          domain: DOMAIN,
          severity: 'critical',
          key: 'timeout',
          title: `${failed.length} of ${timings.length} retrieval call(s) failed`,
          detail:
            `match_rag_corpus did not return for ${failed.length} of ${timings.length} sampled ` +
            `queries at ${live} live chunks. PostgREST cancels any statement past 8 seconds, and ` +
            'the exact scan grows with the corpus, so a failure here is what a user hits as a ' +
            'counselor that says nothing.',
          count: failed.length,
          evidence: summary,
          action: hnswAction,
        }));
      }

      if (ok.length && median > warnMs) {
        out.push(finding({
          probe: 'corpus.retrieval_latency',
          domain: DOMAIN,
          severity: 'warning',
          key: 'warm',
          title: `Warm retrieval is ${median}ms at ${live} live chunks`,
          detail:
            `The median of ${warm.length} warm call(s) to match_rag_corpus is ${median}ms, over the ` +
            `${warnMs}ms line. This is the exact scan scaling with the corpus, as expected — the ` +
            'number was 187ms at 13.7k chunks when the line was drawn. It has moved enough that ' +
            'the approximate index is now worth its small recall cost.',
          count: median,
          evidence: summary,
          action: hnswAction,
        }));
      }

      if (ok.length && worst > criticalMs) {
        out.push(finding({
          probe: 'corpus.retrieval_latency',
          domain: DOMAIN,
          severity: 'warning',
          key: 'cold',
          title: `Slowest retrieval was ${worst}ms at ${live} live chunks`,
          detail:
            `One call to match_rag_corpus took ${worst}ms, over the ${criticalMs}ms line and within ` +
            'sight of the 8-second cancel. Cold-cache calls are the first to cross it; a user whose ' +
            'question lands after a quiet hour is the one who pays.',
          count: worst,
          evidence: summary,
          action: hnswAction,
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

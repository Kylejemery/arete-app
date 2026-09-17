// server/lib/quality-audit/probes-library.js
//
// The Library and the Garden — the reading rooms and the exhibits — are where
// the corpus is presented rather than retrieved, and their failures are the
// quiet kind: a shelf entry pointing at a work that was deprecated out from
// under it, an exhibit citing a thinker the corpus cannot show a passage for,
// a work still displayed under the raw filename fragment it was ingested as.
//
// None of this breaks a request. It just looks careless to the one person
// reading that page, which for a library is the whole failure.

const { finding } = require('./framework');
const { spine, era, workTitle } = require('../../library');

const DOMAIN = 'library';

// spine() and era() fall back rather than throw, so a missing entry is only
// visible by comparing against what the fallback produces.
const DEFAULT_SPINE = spine('__arete_quality_audit_no_such_author__');

// Which fields an exhibit needs depends on how it renders and how far along it
// is. A workshop piece is allowed to be incomplete; a gallery piece is not.
function exhibitProblems(ex) {
  const missing = [];
  if (ex.kind === 'web_embed' && !ex.embed_url) missing.push('embed_url');
  if (ex.kind === 'component' && !ex.component_key) missing.push('component_key');
  if (!ex.title) missing.push('title');
  if (ex.status === 'gallery') {
    if (!ex.source_passage) missing.push('source_passage');
    if (!ex.source_citation) missing.push('source_citation');
    if (!ex.agora_prompt) missing.push('agora_prompt');
    if (!(ex.thinkers || []).length) missing.push('thinkers');
    if (!(ex.concepts || []).length) missing.push('concepts');
  }
  return missing;
}

// Distinct live (author, work) pairs, via the RPC — a select() would be capped.
async function liveWorks(ctx) {
  if (!ctx._liveWorks) {
    const { data, error } = await ctx.supabase.rpc('corpus_work_counts');
    if (error) throw new Error(`corpus_work_counts failed: ${error.message}`);
    ctx._liveWorks = data || [];
  }
  return ctx._liveWorks;
}

const probes = [
  {
    id: 'library.exhibit_integrity',
    domain: DOMAIN,
    title: 'Exhibits carry what their status promises',
    needs: ['db'],
    async run(ctx) {
      const { data, error } = await ctx.supabase
        .from('exhibits')
        .select('slug, title, kind, status, component_key, embed_url, source_passage, source_citation, agora_prompt, thinkers, concepts');
      if (error) throw new Error(`exhibits read failed: ${error.message}`);

      const broken = (data || [])
        .map(ex => ({ ex, missing: exhibitProblems(ex) }))
        .filter(x => x.missing.length);
      if (!broken.length) return [];

      return [finding({
        probe: 'library.exhibit_integrity',
        domain: DOMAIN,
        severity: 'warning',
        title: `${broken.length} exhibit(s) are missing fields their status requires`,
        detail:
          'A gallery exhibit is public, so it needs the passage it is built on, the citation for it, ' +
          'and the prompt that sends a reader to the Agora. A workshop exhibit may be incomplete; a ' +
          'gallery one that is incomplete ships a dead end.',
        count: broken.length,
        evidence: broken.map(b => `${b.ex.slug} (${b.ex.status}, ${b.ex.kind}) — missing ${b.missing.join(', ')}`),
        action: 'Fill the missing fields, or move the exhibit back to workshop until it is ready.',
      })];
    },
  },

  {
    id: 'library.exhibit_thinkers',
    domain: DOMAIN,
    title: 'Exhibit thinkers are readable in the corpus',
    needs: ['db'],
    async run(ctx) {
      const [{ data: exhibits, error }, works] = await Promise.all([
        ctx.supabase.from('exhibits').select('slug, status, thinkers'),
        liveWorks(ctx),
      ]);
      if (error) throw new Error(`exhibits read failed: ${error.message}`);

      const authors = new Set(works.map(w => w.author));
      const dangling = [];
      for (const ex of exhibits || []) {
        if (ex.status !== 'gallery') continue;
        for (const thinker of ex.thinkers || []) {
          if (!authors.has(thinker)) dangling.push(`${ex.slug} cites ${thinker}`);
        }
      }
      if (!dangling.length) return [];

      return [finding({
        probe: 'library.exhibit_thinkers',
        domain: DOMAIN,
        severity: 'info',
        title: `${dangling.length} exhibit thinker reference(s) have no live corpus text`,
        detail:
          'An exhibit names the thinkers it stands on so a reader can go from the exhibit to the text. ' +
          'Where the corpus holds nothing under that author, the path stops at the exhibit. Some of ' +
          'these are legitimately fragmentary figures whose words survive only in others; those are ' +
          'worth a mute rather than a fix.',
        count: dangling.length,
        evidence: dangling,
        action:
          'Either register the thinker\'s surviving text (often inside a doxographer already in the ' +
          'corpus) or mute this fingerprint with the reason.',
      })];
    },
  },

  {
    id: 'library.shelf_orphans',
    domain: DOMAIN,
    title: 'Shelf overrides point at live works',
    needs: ['db'],
    async run(ctx) {
      const [{ data: overrides, error }, works] = await Promise.all([
        ctx.supabase.from('library_overrides').select('author, work, title, hidden'),
        liveWorks(ctx),
      ]);
      if (error) throw new Error(`library_overrides read failed: ${error.message}`);

      const live = new Set(works.map(w => `${w.author}|||${w.work}`));
      const orphans = (overrides || []).filter(o => !live.has(`${o.author}|||${o.work}`));
      if (!orphans.length) return [];

      return [finding({
        probe: 'library.shelf_orphans',
        domain: DOMAIN,
        severity: 'info',
        title: `${orphans.length} library override(s) name a work with no live chunks`,
        detail:
          'An override carries the display title, tradition and era for a work on the shelf. When the ' +
          'work behind it is deprecated or re-labelled, the override is left describing nothing — and ' +
          'a hidden override that no longer matches is a work quietly back on the shelf.',
        count: orphans.length,
        evidence: orphans.map(o => `${o.author} / ${o.work}${o.hidden ? ' (hidden)' : ''}`),
        action: 'Re-point the override at the current identity, or delete the row if the work is gone for good.',
      })];
    },
  },

  {
    id: 'library.presentation_gaps',
    domain: DOMAIN,
    title: 'Every shelved work presents properly',
    needs: ['db'],
    async run(ctx) {
      const works = await liveWorks(ctx);
      const out = [];

      // A work whose display title is still the raw corpus label, where that
      // label is a bare Latinate or truncated fragment ("Definibus", "Shortness").
      const terse = works
        .filter(w => workTitle(w.work) === w.work && !/\s/.test(w.work) && w.work.length > 3)
        .map(w => `${w.author} / ${w.work} — ${w.cnt} chunks`);
      if (terse.length) {
        out.push(finding({
          probe: 'library.presentation_gaps',
          domain: DOMAIN,
          severity: 'info',
          key: 'work-title',
          title: `${terse.length} work(s) are shelved under a one-word corpus label`,
          detail:
            'The WORK_TITLES map in server/library.js exists because ingest labels like "Definibus" ' +
            'and "Shortness" are filename fragments, not titles. A work not in the map is displayed ' +
            'to readers exactly as the parser left it.',
          count: terse.length,
          evidence: terse,
          action: 'Add a display title to WORK_TITLES, or re-label the work in rag_corpus if the label itself is wrong.',
        }));
      }

      const authorsWithoutSpine = [...new Set(works.map(w => w.author))]
        .filter(a => spine(a) === DEFAULT_SPINE);
      if (authorsWithoutSpine.length) {
        out.push(finding({
          probe: 'library.presentation_gaps',
          domain: DOMAIN,
          severity: 'info',
          key: 'spine',
          title: `${authorsWithoutSpine.length} shelved author(s) have no spine colour`,
          detail:
            'spine() falls back to one shared blue, so every unmapped author\'s books look like the ' +
            'same book on the shelf. This is cosmetic and cheap to fix, and it is the difference ' +
            'between a library and a list.',
          count: authorsWithoutSpine.length,
          evidence: authorsWithoutSpine.slice(0, 10),
          action: 'Add spine colours to SPINES in server/library.js, drawn from the house palette (/arete-design).',
        }));
      }

      const noEra = works.filter(w => !era(w.author, w.work));
      if (noEra.length) {
        out.push(finding({
          probe: 'library.presentation_gaps',
          domain: DOMAIN,
          severity: 'info',
          key: 'era',
          title: `${noEra.length} work(s) display no era`,
          detail:
            'era() returns an empty string for an unmapped work, so the shelf card shows a blank ' +
            'where the date belongs. A reader cannot tell a 2nd-century handbook from a 1911 study.',
          count: noEra.length,
          evidence: noEra.slice(0, 10).map(w => `${w.author} / ${w.work}`),
          action: 'Extend the ERAS map in server/library.js. edition_year on the chunks is the source for translations.',
        }));
      }

      return out;
    },
  },
];

module.exports = { probes };

// pd-ingest/sources.js — the Long 2002, ch. 2 batch.
//
// One entry per staged source (a translation and its original are two
// sources linked by citation). Decisions recorded here were made by Kyle on
// 2026-09-26 (docs/corpus/PUBLIC_DOMAIN_INGESTION_PROPOSAL.md, section 7).
//
// Fields beyond the staging columns:
//   urls         pages to fetch, in reading order. Empty = not located yet;
//                `discover` says how, and stage.js reports it pending.
//   parser       'lacuscurtius' | 'numbered' | 'ia-ocr'
//   parse        options for the parser (patterns, cite normaliser, parent).
//                A null citeId means the citation pattern has not been read
//                off a real page yet: stage.js runs --inspect and stops.
//   expect       strings the fetched source must contain: the translator
//                check the spec asks for ("verify it is Oldfather").
//   parallelOf   slug of the translation an original is aligned to.
//   supersedes   live rag_corpus rows promote.js deprecates in favour of this:
//                { author, work, translator (null matches null), locatorLike? }.
//   registrations  question-map rows promote.js writes (Part 5, rule 4).
//                Originals aligned to a translation are the same work and are
//                not registered twice.
//
// Every URL below is unverified: the session that wrote this file had no
// route to any of the hosts. A wrong URL fails as HTTP 404 and is logged as
// skipped with the reason, never guessed around.

const BATCH = 'long2002-ch2';
const PD_US = 'public_domain_us';
const SCHOLARSHIP_BATCH = 'stoic-scholarship-2026-09';
const SCHOLARSHIP_CITED_BY = ['Uploaded by Kyle, 2026-09-28'];

const LC = 'https://penelope.uchicago.edu/Thayer';
const moraliaCite = { citeId: /^\d{1,4}[A-F]$/ }; // Stephanus-style page+letter, never a bare note number

// DL Book VI lives, by Hicks's section numbers. Used only to keep a chunk
// inside one life and to label it; the citation is the section number itself.
const DL6_LIVES = [
  [1, 19, 'Antisthenes'], [20, 81, 'Diogenes'], [82, 83, 'Monimus'], [84, 84, 'Onesicritus'],
  [85, 93, 'Crates'], [94, 95, 'Metrocles'], [96, 98, 'Hipparchia'], [99, 101, 'Menippus'],
  [102, 102, 'Menedemus'], [103, 105, 'Cynic doctrines'],
];
function dl6Life(cite) {
  const n = Number(String(cite).split('.')[1]);
  const hit = DL6_LIVES.find(([a, b]) => n >= a && n <= b);
  return hit ? hit[2] : null;
}

const SOURCES = [
  // ---- Tier 1: canon, quotable ------------------------------------------
  {
    slug: 'plutarch-de-auditu-babbitt-1927',
    tier: 1, author: 'Plutarch', work: 'On Listening to Lectures',
    language: 'english', translator: 'F.C. Babbitt',
    edition: 'Loeb Classical Library 197 (Moralia I)', edition_year: 1927,
    text_type: 'primary', quotable_on_air: true, license_status: PD_US,
    urls: [`${LC}/E/Roman/Texts/Plutarch/Moralia/De_auditu*.html`],
    parser: 'lacuscurtius', parse: { patterns: moraliaCite, parentOf: () => 'De auditu' },
    expect: ['Babbitt'],
    registrations: [{
      question_id: 'Q14', role: 'defends',
      position: 'Philosophical teaching is to be judged by whether the hearer is improved, not by the pleasure or display of the lecture; the listener must turn the discourse on his own character and conduct.',
    }],
  },
  {
    slug: 'plutarch-de-liberis-educandis-babbitt-1927',
    tier: 1, author: 'Plutarch', work: 'On the Education of Children',
    language: 'english', translator: 'F.C. Babbitt',
    edition: 'Loeb Classical Library 197 (Moralia I)', edition_year: 1927,
    text_type: 'primary', quotable_on_air: true, license_status: PD_US,
    urls: [`${LC}/E/Roman/Texts/Plutarch/Moralia/De_liberis_educandis*.html`],
    parser: 'lacuscurtius', parse: { patterns: moraliaCite, parentOf: () => 'De liberis educandis' },
    expect: ['Babbitt'],
    // Kyle, 2026-09-26: credited to Plutarch. Babbitt's introduction doubts the
    // attribution; the review report carries that note.
    cleaningNote: 'Authorship doubted since antiquity and by Babbitt; credited to Plutarch by decision of 2026-09-26.',
    registrations: [{
      question_id: 'Q14', role: 'states',
      position: 'Education completes nature through instruction and habit, and philosophy stands at the head of it as the formation of character rather than a body of learning.',
    }],
  },
  {
    slug: 'epictetus-discourses-oldfather-vol1-1925',
    tier: 1, author: 'Epictetus', work: 'Discourses (tr. Oldfather)',
    language: 'english', translator: 'W.A. Oldfather',
    edition: 'Loeb Classical Library 131 (vol. I, Discourses Books I–II)', edition_year: 1925,
    text_type: 'primary', quotable_on_air: true, license_status: PD_US,
    urls: [],
    discover: 'archive.org: creator Oldfather, title Epictetus, 1925 (vol. I, LCL 131). Confirm the title page before fetching.',
    parser: 'ia-ocr', parse: { language: 'english' },
    expect: ['Oldfather'],
    pending: 'The Loeb scans print Greek and English on facing pages with section numbers in the margins; page-unit OCR is not citation chunking. Needs a facing-page splitter and a section-number reader, written against a real scan.',
    registrations: [
      { question_id: 'Q04', role: 'defends', position: 'The only good is a right moral choice (prohairesis); externals are neither good nor bad, so nothing outside the will can make a life go badly.' },
      { question_id: 'Q14', role: 'defends', position: 'Philosophy is the training of choice and assent, shown in how one lives; reading, lecturing and display without that training are not philosophy (3.21, 3.23).' },
      { question_id: 'Q15', role: 'defends', position: 'Every wrongdoer acts from a false judgment of what is good and is in contradiction with what he really wants; show him the contradiction and he will stop (1.18, 1.28, 2.26).' },
    ],
  },
  {
    slug: 'epictetus-discourses-oldfather-vol2-1928',
    tier: 1, author: 'Epictetus', work: 'Discourses (tr. Oldfather)',
    language: 'english', translator: 'W.A. Oldfather',
    edition: 'Loeb Classical Library 218 (vol. II, Discourses Books III–IV)', edition_year: 1928,
    text_type: 'primary', quotable_on_air: true, license_status: PD_US,
    urls: [],
    discover: 'archive.org: creator Oldfather, title Epictetus, 1928 (vol. II, LCL 218). Confirm the title page before fetching. Holds 3.21, 3.22, 3.23: stage first.',
    parser: 'ia-ocr', parse: { language: 'english' },
    expect: ['Oldfather'],
    pending: 'As for vol. I: needs a facing-page splitter and section-number reader written against the real scan.',
    // Registered once, with vol. I: same work.
  },
  {
    slug: 'gellius-attic-nights-rolfe-1927',
    tier: 1, author: 'Gellius', work: 'Attic Nights',
    language: 'english', translator: 'J.C. Rolfe',
    edition: 'Loeb Classical Library 195, 200, 212', edition_year: 1927,
    text_type: 'primary', quotable_on_air: true, license_status: PD_US,
    urls: Array.from({ length: 20 }, (_, i) => `${LC}/E/Roman/Texts/Gellius/${i + 1}*.html`),
    parser: 'lacuscurtius',
    // Citation form on Thayer's Gellius pages not yet read: set from --inspect.
    parse: { patterns: { citeId: null } },
    expect: ['Rolfe'],
    supersedes: { author: 'Gellius', work: 'Attic Nights', translator: null }, // the 4 rows of 19.1
    registrations: [{
      question_id: 'Q05', role: 'states',
      position: 'Reports the Stoic doctrine, from Epictetus, that the sage feels the first involuntary movements of fear but does not assent to them (19.1), and Taurus on anger and its correction (1.26).',
    }],
  },
  {
    slug: 'gellius-attic-nights-latin',
    tier: 1, author: 'Gellius', work: 'Attic Nights (Latin)',
    language: 'latin', translator: 'original',
    edition: 'Latin text as printed with Rolfe, Loeb Classical Library (1927)', edition_year: 1927,
    text_type: 'primary', quotable_on_air: true, license_status: PD_US,
    urls: Array.from({ length: 20 }, (_, i) => `${LC}/L/Roman/Texts/Gellius/${i + 1}*.html`),
    parser: 'lacuscurtius', parse: { patterns: { citeId: null } },
    parallelOf: 'gellius-attic-nights-rolfe-1927',
  },
  {
    slug: 'dl-lives-book6-hicks-1925',
    tier: 1, author: 'Diogenes Laërtius', work: 'Lives of Eminent Philosophers, Book VI',
    language: 'english', translator: 'R.D. Hicks',
    edition: 'Loeb Classical Library 185 (Lives, vol. II)', edition_year: 1925,
    text_type: 'primary', quotable_on_air: true, license_status: PD_US,
    urls: ['https://en.wikisource.org/w/index.php?title=Lives_of_the_Eminent_Philosophers/Book_VI&action=raw'],
    sourceUrl: 'https://en.wikisource.org/wiki/Lives_of_the_Eminent_Philosophers/Book_VI',
    parser: 'numbered',
    parse: { format: 'wikitext', citePrefix: '6.', parentOf: dl6Life, labelOf: (c) => (dl6Life(c) ? `Life of ${dl6Life(c)}` : null) },
    expect: ['Hicks'],
    // Kyle, 2026-09-26: deprecate Yonge's Book VI once Hicks is in, as for Book VII.
    supersedes: { author: 'Diogenes Laërtius', work: 'Lives of Eminent Philosophers', translator: 'C.D. Yonge', locatorLike: '6.%' }, // 52 live rows on 2026-09-28
    registrations: [
      { question_id: 'Q14', role: 'states', position: 'The Cynics: philosophy as a way of life lived in public, a short cut to virtue by practice and endurance rather than by doctrine.' },
      { question_id: 'Q09', role: 'states', position: 'Diogenes and Crates: virtue is self-sufficient; wealth, reputation and birth are nothing, and the wise man needs nothing he cannot supply himself.' },
    ],
  },
  {
    slug: 'cicero-academica-yonge',
    tier: 1, author: 'Cicero', work: 'Academica',
    language: 'english', translator: 'C.D. Yonge',
    edition: 'Bohn\'s Classical Library, 1875 printing of Yonge\'s 1853 translation (Gutenberg #29247)', edition_year: 1875,
    text_type: 'primary', quotable_on_air: true, license_status: PD_US,
    urls: ['https://www.gutenberg.org/cache/epub/29247/pg29247.txt'],
    // Kyle, 2026-09-26: re-chunk with locators and deprecate the current rows.
    // Yonge prints chapters, not the standard sections Long cites (1.16 is in
    // chapter IV). The locator is the section range of each chapter, read from
    // the Latin text's chapter-to-section numbering: an aligner that is not
    // written yet, because neither text could be read from this session.
    parser: 'academica-aligned',
    pending: 'Aligner not written: needs Yonge\'s chapter headings and the Latin chapter/section numbering read from the fetched files.',
    supersedes: { author: 'Cicero', work: 'Academica', translator: 'C.D. Yonge' }, // 109 live rows on 2026-09-28
  },
  {
    slug: 'cicero-academica-latin',
    tier: 1, author: 'Cicero', work: 'Academica (Latin)',
    language: 'latin', translator: 'original',
    edition: 'The Latin Library text', edition_year: null, // the Latin Library's source edition, once confirmed
    text_type: 'primary', quotable_on_air: true, license_status: PD_US,
    urls: ['https://www.thelatinlibrary.com/cicero/acad.shtml', 'https://www.thelatinlibrary.com/cicero/acad2.shtml'],
    parser: 'numbered', parse: { marker: 'bracket' },
    parallelOf: 'cicero-academica-yonge',
    pending: 'Edition behind the Latin Library text not yet confirmed; edition_year stays null and the source is not staged until it is recorded.',
  },

  // ---- Tier 2: reference, not quotable ----------------------------------
  {
    slug: 'bonhoeffer-epictet-und-die-stoa-1890',
    tier: 2, author: 'Adolf Bonhöffer', work: 'Epictet und die Stoa',
    language: 'german', translator: 'original', edition: 'Stuttgart: Enke', edition_year: 1890,
    text_type: 'scholarship', quotable_on_air: false, license_status: PD_US,
    urls: [],
    discover: 'archive.org: creator Bonhöffer, title "Epictet und die Stoa", 1890. Test one page for Fraktur before trusting the OCR.',
    parser: 'ia-ocr', parse: { language: 'german' },
    expect: ['Epictet'],
    registrations: [{ question_id: 'Q04', role: 'states', position: 'A systematic reconstruction of Epictetus\'s psychology and ethics against the Old Stoa: the good lies wholly in the right use of impressions.' }],
  },
  {
    slug: 'halbauer-de-diatribis-epicteti-1911',
    // The spec gives the initial A.; take the full name from the title page.
    tier: 2, author: 'Halbauer', work: 'De diatribis Epicteti',
    language: 'latin', translator: 'original', edition: 'Leipzig dissertation', edition_year: 1911,
    text_type: 'scholarship', quotable_on_air: false, license_status: PD_US,
    urls: [],
    discover: 'archive.org: title "De diatribis Epicteti", 1911. No scan confirmed to exist; if none, record as skipped.',
    parser: 'ia-ocr', parse: { language: 'latin' },
    registrations: [{ question_id: 'Q14', role: 'states', position: 'The Discourses as diatribe: philosophy delivered as protreptic address to a hearer, a teaching practice rather than a treatise.' }],
  },
  {
    slug: 'schenkl-dissertationes-1916-greek',
    tier: 2, author: 'Epictetus', work: 'Discourses (Greek, Schenkl 1916)',
    language: 'ancient_greek', translator: 'original',
    edition: 'H. Schenkl, Epicteti Dissertationes ab Arriano digestae, editio maior, Leipzig: Teubner', edition_year: 1916,
    // Kyle, 2026-09-26: not quotable on air.
    text_type: 'primary', quotable_on_air: false, license_status: PD_US,
    urls: [],
    discover: 'archive.org: Schenkl, Epicteti Dissertationes, Teubner 1916 (editio maior). Check whether Perseus\'s Greek Epictetus is this text; if so, prefer it to OCR.',
    parser: 'ia-ocr', parse: { language: 'ancient_greek' },
    leafRange: null, // Greek text leaves, set from --inspect; the introduction is a separate source
    cleaningNote: 'Each Greek page carries Schenkl\'s apparatus at its foot, which plain OCR does not separate; the apparatus lines inflate the garble estimate.',
  },
  {
    slug: 'schenkl-dissertationes-1916-introduction',
    tier: 2, author: 'Heinrich Schenkl', work: 'Epicteti Dissertationes, praefatio',
    language: 'latin', translator: 'original',
    edition: 'H. Schenkl, Epicteti Dissertationes ab Arriano digestae, editio maior, Leipzig: Teubner', edition_year: 1916,
    text_type: 'scholarship', quotable_on_air: false, license_status: PD_US,
    urls: [],
    discover: 'Same scan as schenkl-dissertationes-1916-greek.',
    parser: 'ia-ocr', parse: { language: 'latin' },
    leafRange: null,
    cleaningNote: 'Textual scholarship; occupies no cell in the question map (admission test 3). Staged for Kyle\'s translation work; promotion is his call.',
  },

  // ---- Stoic scholarship, 1881–1910: from PDFs Kyle uploaded -------------
  // Staged 2026-09-28 from archive.org scans pushed to the corpus-pdfs branch
  // (this container cannot reach archive.org). extract-pdf.py wrote each
  // PDF's text layer to data/raw/<slug>/; the PDF itself is kept by hash in
  // the manifest. Admission tests: docs/corpus/ADMISSIONS_2026-09-28_STOIC_SCHOLARSHIP.md.
  {
    slug: 'jackson-seneca-and-kant-1881', batch: SCHOLARSHIP_BATCH, citedBy: SCHOLARSHIP_CITED_BY,
    tier: 2, author: 'W.T. Jackson', work: 'Seneca and Kant',
    language: 'english', translator: 'original',
    edition: 'Seneca and Kant; or, an Exposition of Stoic and Rationalistic Ethics, with a Comparison of the Two Systems. Dayton, Ohio: United Brethren Publishing House',
    edition_year: 1881,
    text_type: 'scholarship', quotable_on_air: false, license_status: PD_US,
    urls: [], localFiles: ['SenecaAndKant.txt'],
    sourceUrl: 'https://archive.org/details/cu31924031229622',
    parser: 'ia-ocr',
    parse: { language: 'english', stripRunningHeads: true, pageOffset: 8, chapterBreak: /^CHAPTER [IVXL]+\.?$/, runningHead: /^(\S{1,5} )?Sen\S{0,3} (and|una) \S{1,6}( \S{1,5})?$/ },
    leafRange: [17, 111], // chapter I to the last page; preface, contents and index out
    expect: ['Seneca and Kant'],
    cleaningNote: 'Carries a Christian apologetic frame (admission test 7): the conclusion (pp. 101–103) judges Stoicism "in its inmost essence a system of selfishness" and "far below" the Gospel. Held as a critic, never as agreement.',
    registrations: [
      { question_id: 'Q04', role: 'attacks', position: 'Stoic and Kantian ethics agree that virtue is sought for itself and not for happiness, but the Stoic sage\'s self-sufficiency is pride: a system with no forgiveness, repentance or need of grace, and its licence of suicide concedes that virtue does not master every circumstance.' },
      { question_id: 'Q06', role: 'complicates', position: 'Seneca grounds duty in life according to nature; Kant grounds it in the autonomous rational will and refuses any natural end as its source. Setting the two side by side shows the Stoic ought depending on a providential nature that Kant will not grant.' },
    ],
  },
  {
    slug: 'hicks-stoic-and-epicurean-1910', batch: SCHOLARSHIP_BATCH, citedBy: SCHOLARSHIP_CITED_BY,
    tier: 2, author: 'R.D. Hicks', work: 'Stoic and Epicurean',
    language: 'english', translator: 'original',
    edition: 'The Epochs of Philosophy, ed. J.G. Hibben. New York: Charles Scribner\'s Sons',
    edition_year: 1910,
    text_type: 'scholarship', quotable_on_air: false, license_status: PD_US,
    urls: [], localFiles: ['stoicandepicurea002438mbp.txt'],
    sourceUrl: 'https://archive.org/details/stoicandepicurea002438mbp',
    parser: 'ia-ocr',
    parse: { language: 'english', stripRunningHeads: true, pageOffset: 28, chapterBreak: /^CHAPTER [IVXL]+\.?$/, runningHead: /^STOIC AND EPICUREAN$/ },
    leafRange: [31, 427], // chapter I (p. 3) to the end of the text; half-title, bibliography and index out
    expect: ['Hicks'],
    registrations: [
      { question_id: 'Q01', role: 'states', position: 'Sets Stoic pantheism and providence, a rational fiery pneuma pervading one living cosmos, against Epicurean atomism, in which the world arises from the chance swerve of atoms and the gods take no part.' },
      { question_id: 'Q03', role: 'complicates', position: 'Expounds the Stoic criterion, the apprehensive presentation, and then the Academic (Arcesilaus, Carneades) and Pyrrhonist attacks on it, so that the Stoic claim to certainty is read against its strongest ancient opponents.' },
    ],
  },
  {
    slug: 'davidson-stoic-creed-1907', batch: SCHOLARSHIP_BATCH, citedBy: SCHOLARSHIP_CITED_BY,
    tier: 2, author: 'W.L. Davidson', work: 'The Stoic Creed',
    language: 'english', translator: 'original',
    edition: 'Religion in Literature and Life. Edinburgh: T. & T. Clark',
    edition_year: 1907,
    text_type: 'scholarship', quotable_on_air: false, license_status: PD_US,
    urls: [], localFiles: ['thestoiccreed00daviuoft.txt'],
    sourceUrl: 'https://archive.org/details/thestoiccreed00daviuoft',
    parser: 'ia-ocr',
    parse: { language: 'english', stripRunningHeads: true, pageOffset: 28, chapterBreak: /^CHAPTER [IVXL]+\.?$/, runningHead: /^(\S(1, 4) )?THE STOIC CREED( \S{1,4})?$/ },
    leafRange: [29, 282], // body, pp. 1–254; the appendix on pragmatism, index and publisher's lists out
    expect: ['DAVIDSON'],
    cleaningNote: 'Published in a religious series (T. & T. Clark, "Religion in Literature and Life"); the theology chapters read Stoicism with an eye to Christian theism (admission test 7). The appendix on pragmatism and humanism (pp. 255–266) is left out as off the question map.',
    registrations: [
      { question_id: 'Q04', role: 'states', position: 'A systematic exposition of Stoic ethics, living according to nature, virtue the sole good, externals indifferent, set against the Epicurean contrast and assessed for its present-day value.' },
      { question_id: 'Q01', role: 'states', position: 'Stoic theology and religion: a providential, rational God immanent in the cosmos, with the Stoic treatment of divination, prayer and the problem of evil.' },
    ],
  },
  {
    slug: 'brehier-chrysippe-1910', batch: SCHOLARSHIP_BATCH, citedBy: SCHOLARSHIP_CITED_BY,
    tier: 2, author: 'Émile Bréhier', work: 'Chrysippe',
    language: 'french', translator: 'original',
    edition: 'Les Grands Philosophes. Paris: Félix Alcan',
    edition_year: 1910,
    text_type: 'scholarship', quotable_on_air: false, license_status: PD_US,
    urls: [], localFiles: ['chrysippe00br.txt'],
    sourceUrl: 'https://archive.org/details/chrysippe00br',
    parser: 'ia-ocr',
    parse: { language: 'french', stripRunningHeads: true, pageOffset: 14, chapterBreak: /^(CHAPITRE [IVXLA-Z]+|CONCLUSION)\.?$/ },
    leafRange: [15, 294], // introduction to conclusion; the index and table of contents out
    expect: ['CHRYSIPPE'],
    cleaningNote: 'In French and untranslated: it answers French-language retrieval only, and English queries filtered to english will not reach it. Greek quotations are OCR-garbled throughout (Latin-script renderings of Greek type).',
    registrations: [
      { question_id: 'Q03', role: 'states', position: 'Reads the comprehensive impression (phantasia kataleptike) as passive, against Brochard\'s active reading: certainty lies in the impression itself, with assent following it.' },
      { question_id: 'Q07', role: 'states', position: 'Chrysippus\'s reconciliation of fate and responsibility (De fato 12–13 read with Diogenianus): the co-fated (confatalia) and the distinction of principal from concurrent causes, so that an event is necessary only through the antecedents it implies.' },
      { question_id: 'Q05', role: 'states', position: 'For Chrysippus the passion is a judgment, but not the opinion that something is good or evil: it is the further judgment that it is fitting to be agitated by it, a weak supposition that shows the soul\'s failure to resist rather than ignorance. The soul is one reason with no irrational part, so the passion is in our power and is cured by correcting that judgment.' }, // corrected by 20260928201705
    ],
  },

  // ---- English summaries of sources English retrieval cannot reach ------
  {
    slug: 'brehier-chrysippe-1910-en-summary', batch: SCHOLARSHIP_BATCH, citedBy: SCHOLARSHIP_CITED_BY,
    tier: 2, author: 'Émile Bréhier', work: 'Chrysippe (English summary)',
    language: 'english', translator: 'original',
    edition: 'English summary, section by section, of Chrysippe (Les Grands Philosophes. Paris: Félix Alcan)',
    edition_year: 1910,
    text_type: 'paper_summary', quotable_on_air: false, license_status: PD_US,
    urls: [], repoFiles: ['docs/corpus/summaries/brehier-chrysippe-1910.md'],
    sourceUrl: 'https://archive.org/details/chrysippe00br',
    parser: 'summary-md',
    licenseEvidence: 'A summary in our own words of Émile Bréhier, Chrysippe (Paris: Félix Alcan, 1910), published abroad before 1931 and so public domain in the United States. Written from the French text staged as brehier-chrysippe-1910; no sentence of the original is translated whole.',
    cleaningNote: 'Written 2026-09-28 so that Bréhier\'s positions answer English retrieval; the French rows (brehier-chrysippe-1910) answer French retrieval only. Each ## section is one chunk and carries the page range it summarises.',
    // Same work and positions as the French source; registered under this
    // work too, since registrations key on (author, work).
    registrations: [
      { question_id: 'Q03', role: 'states', position: 'Reads the comprehensive impression (phantasia kataleptike) as a wholly passive image whose clarity is immanent in it, against the active readings of Brochard, Stein, Ganter and Hirzel: certainty lies in the impression, and assent and comprehension follow it.' },
      { question_id: 'Q05', role: 'states', position: 'For Chrysippus the passion is a judgment, but not the opinion that something is good or evil: it is the further judgment that it is fitting to be agitated by it, a weak supposition that shows the soul\'s failure to resist rather than ignorance. The soul is one reason with no irrational part, so the passion is in our power and is cured by correcting that judgment.' },
      { question_id: 'Q07', role: 'states', position: 'Chrysippus reconciles fate and responsibility through the co-fated (confatalia) and the cylinder: every event has antecedent causes, but the auxiliary cause acts only through the principal cause in the agent\'s own nature, so assent depends on the impression yet is the work of reason. Bréhier counts the principle of antecedent causes among Chrysippus\'s glories but judges his treatment of future contingents dialectical juggling.' },
      { question_id: 'Q08', role: 'complicates', position: 'Denies that the Old Stoa was pantheist: for Chrysippus the individual soul is not a fragment of the world-soul, the generated world is not itself a god, and the world stands to the individual as parent to offspring. The fragment doctrine belongs to Posidonius and Seneca.' },
      { question_id: 'Q01', role: 'states', position: 'Chrysippean providence without dualism: fate, providence, necessity and Zeus are one, so evils that come as by-products of goods are willed together with the whole, not imposed by a necessity above the divine will (a dualism Bréhier allows only for Cleanthes).' },
    ],
  },
  // ---- Musonius Rufus, Lutz's English (2026-09-29) ------------------------
  // Asked for by Kyle on 2026-09-29. Verbatim, but license_status
  // 'unverified' and never quotable: a US publication of 1947 is public
  // domain only if its copyright was not renewed, and the renewal search
  // (below) found nothing without being conclusive. Admission record:
  // docs/corpus/ADMISSIONS_2026-09-29_MUSONIUS_LUTZ.md.
  {
    slug: 'musonius-lectures-lutz-1947', batch: 'musonius-lutz-2026-09', citedBy: ['Requested by Kyle, 2026-09-29'],
    tier: 1, author: 'Musonius Rufus', work: 'Lectures',
    language: 'english', translator: 'Cora E. Lutz',
    edition: 'Yale Classical Studies 10', edition_year: 1947,
    text_type: 'primary', quotable_on_air: false, license_status: 'unverified',
    urls: [], localFiles: ['MUSONIUSRUFUSSTOICFRAGMENTS_djvu.txt'],
    sourceUrl: 'https://archive.org/details/MUSONIUSRUFUSSTOICFRAGMENTS',
    licenseEvidence: 'Cora E. Lutz, "Musonius Rufus: The Roman Socrates," Yale Classical Studies 10 (New Haven: Yale University Press, 1947). A US publication of 1947 is in the public domain only if its copyright was not renewed in its 28th year (1974 or 1975). Searched 2026-09-29 in the Copyright Office\'s Catalog of Copyright Entries, Third Series (archive.org OCR of the printed volumes): Part 1, Books and Pamphlets, Jan-Jun and Jul-Dec 1974 and 1975, index and registration sections (vols. 28-29), and Part 2, Periodicals, 1974 and 1975, for "Lutz", "Musonius", "Roman Socrates", "Socrates" and "Yale Classical". No renewal found. The only Cora Lutz entry is a new 1975 registration of her Essays on Manuscripts and Rare Books (A652121, 30 Jun 1975), not a renewal. A search of OCR text can miss an entry, and the Stanford renewal database and the Copyright Office records could not be reached from this session, so the finding is recorded as unverified rather than public domain.',
    parser: 'facing-ocr',
    // Every list below was read off the file on 2026-09-29, and the parser
    // refuses the source if any entry no longer matches.
    parse: {
      language: 'english',
      firstPage: 33,
      translationHead: /^MUSONI\w*\s+RUFUS\b/i,
      originalHead: /CORA\b|LUTZ\s*$/,
      originalOpening: /^(ΜΟΥΣΩΝΙΟΥ|MOTSONIO|MOT\s*QNIOT)/,
      maxSectionWords: 300,
      keepHyphen: ['self', 'ill'],
      // Lutz's numbering, and the English headings as the OCR has them.
      // Lecture II's heading is Lutz's own supplement ("<THAT MAN ...").
      sections: [
      { cite: 'I', title: 'That there is no need of giving many proofs for one problem', heading: /^THAT THERE IS NO NEED OF GIVING MANY PROOFS/ },
      { cite: 'II', title: 'That man is born with an inclination toward virtue', heading: /^<?THAT MAN IS BORN WITH AN INCLINATION/ },
      { cite: 'III', title: 'That women too should study philosophy', heading: /^THAT WOMEN TOO SHOULD STUDY PHILOSOPHY/ },
      { cite: 'IV', title: 'Should daughters receive the same education as sons?', heading: /^SHOULD DAUGHTERS RECEIVE THE SAME/ },
      { cite: 'V', title: 'Which is more effective, theory or practice?', heading: /^WHICH IS MORE EFFECTIVE, THEORY OR PRACTICE/ },
      { cite: 'VI', title: 'On training', heading: /^ON TRAINING$/ },
      { cite: 'VII', title: 'That one should disdain hardships', heading: /^THAT ONE SHOULD DISDAIN HARDSHIPS/ },
      { cite: 'VIII', title: 'That kings also should study philosophy', heading: /^THAT KINGS ALSO SHOULD STUDY PHILOSOPHY/ },
      { cite: 'IX', title: 'That exile is not an evil', heading: /^THAT EXILE \[8 NOT AN EVIL/ },
      { cite: 'X', title: 'Will the philosopher prosecute anyone for personal injury?', heading: /^WILL THE PHILOSOPHER PROSECUTE ANYONE/ },
      { cite: 'XI', title: 'What means of livelihood is appropriate for a philosopher?', heading: /^WHAT MEANS OF LIVELIHOOD IS APPROPRIATE FOR/ },
      { cite: 'XII', title: 'On sexual indulgence', heading: /^ON SEXUAL INDULGENCE/ },
      { cite: 'XIIIA', title: 'What is the chief end of marriage?', heading: /^WHAT IS THE CHIEF END OF MARRIAGE\?/ },
      { cite: 'XIIIB', title: 'What is the chief end of marriage?', heading: /^WHAT 15 THE CHIEF END OF MARRIAGE\?/ },
      { cite: 'XIV', title: 'Is marriage a handicap for the pursuit of philosophy?', heading: /^IS MARRIAGE A HANDICAP FOR THE PURSUIT/ },
      { cite: 'XV', title: 'Should every child that is born be raised?', heading: /^SHOULD EVERY CHILD THAT IS BORN BE RAISED/ },
      { cite: 'XVI', title: 'Must one obey one’s parents under all circumstances?', heading: /^MUST ONE OBEY ONE.S PARENTS UNDER ALL/ },
      { cite: 'XVII', title: 'What is the best viaticum for old age?', heading: /^WHAT IS THE BEST VIATICUM FOR OLD AGE/ },
      { cite: 'XVIIIA', title: 'On food', heading: /^ON FOOD$/ },
      { cite: 'XVIIIB', title: 'On food', heading: /^ON FOOD$/ },
      { cite: 'XIX', title: 'On clothing and shelter', heading: /^ON CLOTHING AND SHELTER/ },
      { cite: 'XX', title: 'On furnishings', heading: /^ON FURNISHINGS/ },
      { cite: 'XXI', title: 'On cutting the hair', heading: /^ON CUTTING THE HAIR/ },
      ],
      // Notes carried over from an earlier page open without a line number.
      noteContinuations: [
        { start: 'mere rhetoric, for Plutarch' },
        { start: 'in Ephesus. The rest of the audience' },
        { start: 'wholly consistent with the true Stoic' },
        { start: 'They are a target for the satirist' },
        { start: 'possibly from Philo' },
        { start: 'for a philosopher were may' },
        { start: 'was passed in 18 B.C.' },
        { start: 'are mad (πάντες' },
        { start: 'bears out Musonius’ estimate' },
        // The end of the note on Theognis, set into the sentence "those who
        // lead such a life" (XII, p. 87).
        { start: '16 f., 21f. Elegies 33-36.', lines: 1 },
      ],
      // Lines lost from the scan: marked "[…]", never reconstructed.
      gaps: [
        { after: 'you may understand', note: 'VIII, p. 65: the foot of the page is lost after "you may understand"' },
        { after: 'besides beneficent, helpful, and', note: 'VIII, p. 67: lines lost after "helpful, and"' },
        { after: 'better able to govern than such a man? N Ο one,', note: 'VIII, p. 67: lines lost after "No one,"' },
        { after: 'if he is skilled in horse-', note: 'VIII, p. 67: lines lost after "skilled in horse-"' },
        { after: 'told him that he was grateful for what he', note: 'VIII, p. 67: a line lost after "grateful for what he"' },
        { after: 'can nourish man well,', note: 'XVIIIA, p. 113: lines lost after "can nourish man well,"' },
        { after: 'are not unsuitable, and are all', note: 'XVIIIA, p. 113: lines lost after "and are all" (the text resumes at "clitus when he said")' },
        { after: 'clitus when he said,', note: 'XVIIIA, p. 113: the quotation of Heraclitus and what follows are lost' },
        { after: 'much worse than the un-', note: 'XVIIIA, p. 113: lines lost after "than the un-"' },
      ],
      // OCR fixes: only where one reading is possible. A word the clipped
      // margin of p. 107 took is "[…]", not a guess. Each is logged with a count.
      fixes: [
        [/that\.there/g,'that there','"that.there" → "that there" (I)'],
        [/not‘an evil/g,'not an evil','"not‘an evil" → "not an evil" (I)'],
        [/\btra(?:m|im)ing\b/g,'training','"traming", "traiming" → "training" (I, IV)'],
        [/pleasure\? \| To come/g,'pleasure? To come','stray "|" (I)'],
        [/eagle’s flight \| So all/g,'eagle’s flight / So all','verse break printed as "|" → "/" (IX)'],
        [/with Just measure/g,'with just measure','"Just measure" → "just measure" (I)'],
        [/virtue 15 inborn/g,'virtue is inborn','"15 inborn" → "is inborn" (II)'],
        [/\b15 fitting\b/g,'is fitting','"15 fitting" → "is fitting" (XIV, XVI)'],
        [/these\. Τῇ this is true/g,'these. If this is true','"Τῇ this is true" → "If this is true" (III)'],
        [/lavish im expense/g,'lavish in expense','"im expense" → "in expense" (III)'],
        [/placed im the strongest/g,'placed in the strongest','"im the strongest" → "in the strongest" (XVI)'],
        [/It\.would/g,'It would','"It.would" → "It would" (IV)'],
        [/\b1 (am|tell|used)\b/g,'I $1','"1 am", "1 tell", "1 used" → "I …" (IV, IX, XVII)'],
        [/virtues are In no respect/g,'virtues are in no respect','"In no respect" → "in no respect" (IV)'],
        [/\bJeading\b/g,'leading','"Jeading" → "leading" (V)'],
        [/avoidance οὗ pleasures/g,'avoidance of pleasures','"οὗ" → "of" (VI)'],
        [/greed\? -How could/g,'greed? How could','stray "-" (VI)'],
        [/those who seck the worse/g,'those who seek the worse','"seck" → "seek" (VII)'],
        [/shall we not be - ready/g,'shall we not be ready','stray "-" (VII)'],
        [/extravagance; αὖ trains one/g,'extravagance; it trains one','"αὖ trains one" → "it trains one", parallel to "it teaches one" before it (VIII)'],
        [/when ‘these qualities/g,'when these qualities','stray "‘" (VIII)'],
        [/how ἃ man may avoid/g,'how a man may avoid','"ἃ man" → "a man" (VIII)'],
        [/a good manpr No/g,'a good man? No','"manpr" → "man?" (VIII)'],
        [/such a man\? N Ο one,/g,'such a man? No one,','"N Ο one" → "No one" (VIII)'],
        [/deserve the hame of king/g,'deserve the name of king','"hame" → "name" (VIII)'],
        [/because one who\. masters/g,'because one who masters','"who. masters" → "who masters" (VIII)'],
        [/What if we are ‘kept/g,'What if we are kept','stray "‘" (IX)'],
        [/\b(he) Says\b/g,'$1 says','"he Says" → "he says" (IX, XI)'],
        [/courage and\. justice/g,'courage and justice','"and. justice" → "and justice" (IX)'],
        [/most hateful _thing/g,'most hateful thing','stray "_" (IX)'],
        [/You may he sure/g,'You may be sure','"may he sure" → "may be sure" (XI)'],
        [/Are ‘not sowing/g,'Are not sowing','stray "‘" (XI)'],
        [/way of life to bis nor/g,'way of life to his nor','"bis" → "his" (XI)'],
        [/the life of the 5011,/g,'the life of the soil,','"5011" → "soil" (XI)'],
        [/guilt\. ‘“ That’s/g,'guilt. “ That’s','stray "‘" (XII)'],
        [/on cither side/g,'on either side','"cither" → "either" (XIIIB)'],
        [/labor, and _ not wanting/g,'labor, and not wanting','stray "_" (XIIIB)'],
        [/which are born\. to live/g,'which are born to live','stray "." (XIV)'],
        [/does Kros more properly/g,'does Eros more properly','"Kros" → "Eros" (XIV; Eros is named two sentences before)'],
        [/whom It 1s considered/g,'whom it is considered','"It 1s" → "it is" (XV)'],
        [/the very one that 1s best/g,'the very one that is best','"1s" → "is" (XVII)'],
        [/but Iam a poor man/g,'but I am a poor man','"Iam" → "I am" (XV)'],
        [/and if J have many/g,'and if I have many','"J have" → "I have" (XV)'],
        [/larks arid blackbirds/g,'larks and blackbirds','"arid" → "and" (XV)'],
        [/friendship, SO whoever/g,'friendship, so whoever','"SO" → "so" (XV)'],
        [/find than‘a good brother/g,'find than a good brother','"than‘a" → "than a" (XV)'],
        [/choose the philosopher 5\. life/g,'choose the philosopher’s life','"philosopher 5. life" → "philosopher’s life" (XVI, p. 107, clipped right margin)'],
        [/your duty les in/g,'your duty lies in','"les" → "lies" (XVI, p. 107)'],
        [/your father will \. strain you/g,'your father will […]strain you','"will . strain" → "will […]strain": the start of the word is lost at the margin (XVI, p. 107)'],
        [/your study o philosophy/g,'your study of philosophy','"study o" → "study of" (XVI, p. 107)'],
        [/for we " a study philosophy/g,'for we […] study philosophy','"we \" a study" → "we […] study": words lost at the margin (XVI, p. 107)'],
        [/any other part o : e body/g,'any other part of the body','"part o : e body" → "part of the body" (XVI, p. 107)'],
        [/from using τ nor from/g,'from using […] nor from','"using τ" → "using […]": a word lost at the margin (XVI, p. 107)'],
        [/the good an not liking/g,'the good and not liking','"good an" → "good and" (XVI, p. 107)'],
        [/nor again-from choosing/g,'nor again from choosing','"again-from" → "again from" (XVI, p. 107)'],
        [/long hair nor in τ from/g,'long hair nor in […] from','"nor in τ from" → "nor in […] from": words lost at the margin (XVI, p. 107)'],
        [/To be sure, suc! things/g,'To be sure, such things','"suc!" → "such" (XVI, p. 107)'],
        [/but = losophy does/g,'but philosophy does','"= losophy" → "philosophy" (XVI, p. 107)'],
        [/thinking out wha is/g,'thinking out what is','"wha" → "what" (XVI, p. 107)'],
        [/these thmgs in his/g,'these things in his','"thmgs" → "things" (XVII)'],
        [/sequel even tothe best/g,'sequel even to the best','"tothe" → "to the" (XVII)'],
        [/no smal\] significance/g,'no small significance','"smal]" → "small" (XVIIIA)'],
        [/unimportant ~onsequences/g,'unimportant consequences','"~onsequences" → "consequences" (XVIIIA)'],
        [/in self-control\] in eating/g,'in self-control in eating','"self-control]" → "self-control" (XVIIIA)'],
        [/follows\. Ags one should/g,'follows. As one should','"Ags" → "As" (XVIIIA)'],
        [/is natural to US,/g,'is natural to us,','"US" → "us" (XVIIIA)'],
        [/as some People have/g,'as some people have','"People" → "people" (XVIIIA)'],
        [/when they -have them/g,'when they have them','stray "-" (XVIIIB)'],
        [/beneficial\?P And/g,'beneficial? And','stray "P" (XVIIIB)'],
        [/twice a day, since - it/g,'twice a day, since it','stray "-" (XVIIIB)'],
        [/feet by\. close fitting/g,'feet by close fitting','"by. close" → "by close" (XIX)'],
        [/this our ‘ houses/g,'this our houses','stray "‘" (XIX)'],
        [/and the wie which/g,'and the wine which','"wie" → "wine" (XX)'],
      ],
    },
    // "XVIIIA, p. 113": Lutz's lecture and the printed page.
    locatorOf: (c) => `${c.parent}, ${String(c.printed_pages).includes('–') ? 'pp.' : 'p.'} ${c.printed_pages}`,
    expect: ['CORA E. LUTZ', 'MUSONIUS RUFUS'],
    cleaningNote: 'English only, from archive.org OCR of the facing-page edition: the Greek pages, Lutz\'s notes and apparatus, running heads and margin line numbers are dropped. The file ends at Lecture XXI; the minor fragments that follow in Lutz are not in it. Lines lost from the scan are marked "[…]": VIII, pp. 65-67 (five places) and XVIIIA, p. 113 (four places; most of the page, on meat and uncooked food, is missing). The right margin of p. 107 (XVI) is clipped; words it took are "[…]". Those chunks carry their own ocr_quality (poor for lost lines, fair for the margin). The Greek of these lectures (eulogikon.org, Hense) is already held under the same author and work with language ancient_greek; its chunks are 400-word windows that cross lectures, so no English chunk is paired to one (paired_chunk_id null).',
    registrations: [
      { question_id: 'Q14', role: 'defends', position: 'Philosophy is practice, not theory: virtue is learned like medicine or music, by training the soul and body to act on what the lessons teach, and practice is the more effective of the two (Lectures V, VI); the philosopher shows his teaching in his life, even working the land beside his pupils (XI).' },
      { question_id: 'Q09', role: 'defends', position: 'Exile takes nothing that is truly good: it leaves water, earth, air and the society of men, gives leisure for virtue, and cannot remove courage, justice or self-control; the misery felt in exile comes from vice, not from exile (Lecture IX).' },
      { question_id: 'Q10', role: 'states', position: 'A king above all men must study philosophy, since to judge justly, to be self-controlled and courageous and to prevail in argument are what philosophy teaches; the good king is of necessity a philosopher and the philosopher a kingly person (Lecture VIII).' },
    ],
  },
];

module.exports = { BATCH, SOURCES, dl6Life };

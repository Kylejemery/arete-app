// Academy Library — curated, read-only reading list of open-access resources.
// Maintained as a static file (admin-edited). All URLs are verified open-access.

export interface LibraryItem {
  id: string;                     // unique slug, e.g. 'bobzien-sequent-2019'
  title: string;                  // full citation title
  author: string;                 // last name, first initial — e.g. 'Bobzien, S.'
  year: number;
  type: 'paper' | 'book' | 'reference' | 'encyclopedia';
  url: string;                    // open-access URL — required
  urlLabel: string;               // short label for the link button
  description: string;            // 1–2 sentence annotation
  courses: string[];              // course IDs this applies to, e.g. ['phil-705']
  sessions: number[];             // session numbers (empty = whole course)
  difficulty: 'introductory' | 'intermediate' | 'advanced';
  tags: string[];
}

export interface CourseLibrary {
  courseId: string;
  courseTitle: string;
  items: LibraryItem[];
}

export const LIBRARY_ITEMS: LibraryItem[] = [

  // ── PHIL 705 — Whole Course ──────────────────────────────────
  {
    id: 'sep-ancient-logic',
    title: 'Ancient Logic',
    author: 'Bobzien, S.',
    year: 2006,
    type: 'encyclopedia',
    url: 'https://plato.stanford.edu/entries/logic-ancient/',
    urlLabel: 'Stanford Encyclopedia',
    description: 'The authoritative overview of ancient logic including Stoic propositional calculus, the five indemonstrables, and the debate over conditionals. Required orientation reading for PHIL 705.',
    courses: ['phil-705'],
    sessions: [],
    difficulty: 'intermediate',
    tags: ['stoic logic', 'indemonstrables', 'conditionals', 'lekton', 'overview'],
  },
  {
    id: 'trepp-dialectic-formalism-2025',
    title: 'Between Dialectic and Formalism: A Comparative Study of Stoic and Contemporary Logics',
    author: 'Trepp, T.C.',
    year: 2025,
    type: 'paper',
    url: 'https://philarchive.org/rec/TREBDA-3',
    urlLabel: 'PhilArchive',
    description: 'Accessible survey comparing Stoic syllogistic, the Sorites and Liar paradoxes, and Stoic logic against Frege and Russell. Good preparation reading before Session 19.',
    courses: ['phil-705'],
    sessions: [19],
    difficulty: 'introductory',
    tags: ['stoic logic', 'frege', 'sorites', 'liar', 'comparison', 'survey'],
  },

  // ── PHIL 705 — Session 12 ────────────────────────────────────
  {
    id: 'bobzien-sequent-2019',
    title: 'Stoic Sequent Logic and Proof Theory',
    author: 'Bobzien, S.',
    year: 2019,
    type: 'paper',
    url: 'https://philpapers.org/rec/BOBSSL',
    urlLabel: 'PhilPapers',
    description: 'Shows that Stoic analysis (the reduction to indemonstrables via the themata) is structurally closest to backward proof search in substructural sequent logics — closer to logic programming than to Gentzen\'s natural deduction. Transforms Session 12.',
    courses: ['phil-705'],
    sessions: [12],
    difficulty: 'advanced',
    tags: ['proof theory', 'sequent logic', 'themata', 'indemonstrables', 'analysis', 'substructural'],
  },
  {
    id: 'bobzien-dyckhoff-cut-2018',
    title: 'Analyticity, Balance and Non-admissibility of Cut in Stoic Logic',
    author: 'Bobzien, S. & Dyckhoff, R.',
    year: 2018,
    type: 'paper',
    url: 'https://philpapers.org/rec/BOBABA-3',
    urlLabel: 'PhilPapers (open access)',
    description: 'Proves decidability of Stoic propositional logic and shows Cut is not admissible in the standard Stoic system. Technical companion to the sequent logic paper above.',
    courses: ['phil-705'],
    sessions: [12],
    difficulty: 'advanced',
    tags: ['proof theory', 'cut rule', 'decidability', 'stoic logic', 'sequent'],
  },

  // ── PHIL 705 — Session 19 ────────────────────────────────────
  {
    id: 'bobzien-frege-plagiarism-2020',
    title: 'Frege Plagiarized the Stoics',
    author: 'Bobzien, S.',
    year: 2020,
    type: 'paper',
    url: 'https://philarchive.org/archive/BOBFPT',
    urlLabel: 'PhilArchive (author manuscript)',
    description: 'Argues that Frege absorbed Stoic logic from Prantl\'s 1855 History of Western Logic without attribution — documenting 120+ parallels, including cases where Frege\'s errors track Prantl\'s misrepresentations of the Stoics. Central paper for Session 19.',
    courses: ['phil-705'],
    sessions: [19],
    difficulty: 'advanced',
    tags: ['frege', 'chrysippus', 'lekton', 'sinn', 'plagiarism', 'history of logic', 'prantl'],
  },

  // ── PHIL 705 — Primary Sources ───────────────────────────────
  {
    id: 'diogenes-laertius-book7',
    title: 'Lives of Eminent Philosophers, Book VII (On the Stoics)',
    author: 'Diogenes Laertius',
    year: 0,
    type: 'reference',
    url: 'https://en.wikisource.org/wiki/Lives_of_the_Eminent_Philosophers/Book_VII',
    urlLabel: 'Wikisource (free)',
    description: 'The most important continuous ancient source for Stoic logic — 40 paragraphs covering lekta, axiomata, the five indemonstrables, and the conditional. Referenced throughout PHIL 705 as D.L. VII.',
    courses: ['phil-705'],
    sessions: [],
    difficulty: 'intermediate',
    tags: ['primary source', 'chrysippus', 'lekton', 'indemonstrables', 'stoic logic'],
  },

  // ── PHIL 701 — General Stoicism ──────────────────────────────
  {
    id: 'sep-stoicism',
    title: 'Stoicism',
    author: 'Baltzly, D.',
    year: 2019,
    type: 'encyclopedia',
    url: 'https://plato.stanford.edu/entries/stoicism/',
    urlLabel: 'Stanford Encyclopedia',
    description: 'Comprehensive overview of Stoic philosophy covering physics, logic, and ethics. Essential orientation reading for the Philosophy track.',
    courses: ['phil-701', 'phil-702', 'phil-703', 'phil-704', 'phil-705'],
    sessions: [],
    difficulty: 'introductory',
    tags: ['stoicism', 'overview', 'ethics', 'logic', 'physics'],
  },
  {
    id: 'sep-epictetus',
    title: 'Epictetus',
    author: 'Seddon, K.',
    year: 2023,
    type: 'encyclopedia',
    url: 'https://plato.stanford.edu/entries/epictetus/',
    urlLabel: 'Stanford Encyclopedia',
    description: 'Overview of Epictetus\'s life and philosophy including the dichotomy of control, the three disciplines, and the relationship between the Enchiridion and Discourses.',
    courses: ['phil-701', 'phil-703'],
    sessions: [],
    difficulty: 'introductory',
    tags: ['epictetus', 'dichotomy', 'enchiridion', 'discourses'],
  },

  // ── PhilPapers Reference ─────────────────────────────────────
  {
    id: 'philpapers-stoic-logic-browse',
    title: 'Stoics: Logic — Full Bibliography',
    author: 'PhilPapers',
    year: 2026,
    type: 'reference',
    url: 'https://philpapers.org/browse/stoics-logic',
    urlLabel: 'PhilPapers',
    description: 'Continuously updated bibliography of all scholarship on Stoic logic. Use to find additional papers on any topic covered in PHIL 705.',
    courses: ['phil-705'],
    sessions: [],
    difficulty: 'intermediate',
    tags: ['bibliography', 'stoic logic', 'reference'],
  },
];

export function getLibraryForCourse(courseId: string): LibraryItem[] {
  return LIBRARY_ITEMS.filter(item => item.courses.includes(courseId));
}

export function getLibraryForSession(courseId: string, sessionNumber: number): LibraryItem[] {
  return LIBRARY_ITEMS.filter(item =>
    item.courses.includes(courseId) &&
    (item.sessions.length === 0 || item.sessions.includes(sessionNumber))
  );
}

export function getLibraryByTag(tag: string): LibraryItem[] {
  return LIBRARY_ITEMS.filter(item => item.tags.includes(tag.toLowerCase()));
}

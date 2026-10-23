// Builds the stored full text of Robert Greene, The 48 Laws of Power, and its
// law and page locator index (research_source_sections), from Kyle's 13
// scanned chapter PDFs. Seminar Track spec, Part 2.
//
// The PDFs are never committed. Extract each one first, in pdftotext's
// default (non-layout) mode, which keeps the sidebar epigraphs after the
// main text of each page:
//
//   for i in 01 02 ... 13; do pdftotext "48Laws $i.pdf" raw/48L_$i.txt; done
//   node scripts/research-sources/greene-48-laws-index.mjs raw/ <pdf dir> <out dir>
//
// Writes <out>/48laws_full.txt (store it with add.mjs, licence licensed_copy)
// and <out>/48laws_sections.json (the rows in migration
// 20261022182757_research_source_sections.sql). The text is normalized the
// way add.mjs normalizes it, so the sha256 and the 0-based offsets refer to
// the stored full_text.
//
// Printed pages: file 01 is the Preface (pp. xvii to xxiii); files 02 to 13
// start on the pages in START, checked against the OCR'd running heads and
// contiguous through p. 430. A law's chapter starts on its opener page: the
// first line is "LAW" (the numeral is a graphic), or the JUDGMENT heading is
// near the top, or the first line is the next law's number. Running heads
// ("LAW n") are used only to report disagreements, which so far are all OCR
// misreads of the numeral.
import fs from 'node:fs';
import crypto from 'node:crypto';

const [rawDir, pdfDir, outDir] = process.argv.slice(2);
const FILES = ['01','02','03','04','05','06','07','08','09','10','11','12','13'];
const START = { '02': 1, '03': 37, '04': 69, '05': 95, '06': 123, '07': 156, '08': 191, '09': 236, '10': 271, '11': 309, '12': 347, '13': 392 };
const ROMAN = ['xvii','xviii','xix','xx','xxi','xxii','xxiii'];
const TITLES = ['Never Outshine the Master','Never Put Too Much Trust in Friends, Learn How to Use Enemies','Conceal Your Intentions','Always Say Less Than Necessary','So Much Depends on Reputation: Guard It with Your Life','Court Attention at All Cost','Get Others to Do the Work for You, but Always Take the Credit','Make Other People Come to You: Use Bait If Necessary','Win Through Your Actions, Never Through Argument','Infection: Avoid the Unhappy and Unlucky','Learn to Keep People Dependent on You','Use Selective Honesty and Generosity to Disarm Your Victim','When Asking for Help, Appeal to People\'s Self-Interest, Never to Their Mercy or Gratitude','Pose as a Friend, Work as a Spy','Crush Your Enemy Totally','Use Absence to Increase Respect and Honor','Keep Others in Suspended Terror: Cultivate an Air of Unpredictability','Do Not Build Fortresses to Protect Yourself: Isolation Is Dangerous','Know Who You\'re Dealing With: Do Not Offend the Wrong Person','Do Not Commit to Anyone','Play a Sucker to Catch a Sucker: Seem Dumber Than Your Mark','Use the Surrender Tactic: Transform Weakness into Power','Concentrate Your Forces','Play the Perfect Courtier','Re-Create Yourself','Keep Your Hands Clean','Play on People\'s Need to Believe to Create a Cultlike Following','Enter Action with Boldness','Plan All the Way to the End','Make Your Accomplishments Seem Effortless','Control the Options: Get Others to Play with the Cards You Deal','Play to People\'s Fantasies','Discover Each Man\'s Thumbscrew','Be Royal in Your Own Fashion: Act Like a King to Be Treated Like One','Master the Art of Timing','Disdain Things You Cannot Have: Ignoring Them Is the Best Revenge','Create Compelling Spectacles','Think As You Like but Behave Like Others','Stir Up Waters to Catch Fish','Despise the Free Lunch','Avoid Stepping into a Great Man\'s Shoes','Strike the Shepherd and the Sheep Will Scatter','Work on the Hearts and Minds of Others','Disarm and Infuriate with the Mirror Effect','Preach the Need for Change, but Never Reform Too Much at Once','Never Appear Too Perfect','Do Not Go Past the Mark You Aimed For; In Victory, Learn When to Stop','Assume Formlessness'];
const JUDG = /[J}`_'"]?\s*U\s*D\s*G\s*M\s*E\s*N\s*T/;
const pages = [];
for (const f of FILES) {
  const ps = fs.readFileSync(`${rawDir}/48L_${f}.txt`, 'utf8').replace(/\r\n?/g, '\n').normalize('NFC').split('\f');
  if (!ps[ps.length - 1].trim()) ps.pop();
  ps.forEach((text, i) => pages.push({ file: f, idx: i, label: f === '01' ? ROMAN[i] : String(START[f] + i), num: f === '01' ? null : START[f] + i, text: text.replace(/\s+$/,'') }));
}
// Chapter openers
let law = 0;
for (const p of pages) {
  if (p.file === '01') { p.law = 0; continue; }
  const first = (p.text.split('\n').map(s => s.trim()).find(Boolean) || '');
  const head = p.text.split('\n').slice(0, 8).join('\n');
  const opener = /^LA.?W\.?$/.test(first) || JUDG.test(head) || first === String(law + 1);
  if (opener) { law++; p.opener = true; }
  p.law = law;
}
// Validate against clean running heads
const bad = [];
for (const p of pages) {
  for (const m of p.text.matchAll(/^LAW (\d{1,2})$/gm)) { const n = +m[1]; if (n !== p.law && n >= 1 && n <= 48) bad.push(`${p.label}: head LAW ${n}, assigned ${p.law}`); }
}
// Full text and offsets
let full = ''; const pageOff = {};
for (const p of pages) { pageOff[p.label] = full.length; full += `[p. ${p.label}]\n${p.text}\n\n`; }
full = full.replace(/\s+$/, '') + '\n';
const SUBS = [['judgment', JUDG], ['transgression', /TRANS\s*[GC]RESSION/], ['observance', /OBSERVANCE/], ['keys_to_power', /KEYS\s+TO\s+POWER/], ['image', /^\s*Im\s*a\s*g\s*e\s*:/m], ['authority', /^\s*A\s*u\s*t\s*h\s*o\s*r\s*i\s*t\s*y\s*:/m], ['reversal', /R\s*E\s*V\s*E\s*R\s*S\s*A\s*[LI1]/]];
const sections = [];
const groups = [[0, 'Preface', 'Preface']].concat(TITLES.map((t, i) => [i + 1, `Law ${i + 1}`, t]));
for (const [n, label, title] of groups) {
  const ps = pages.filter(p => p.law === n);
  const s = pageOff[ps[0].label]; const last = ps[ps.length - 1];
  const nextIdx = pages.indexOf(last) + 1;
  const e = nextIdx < pages.length ? pageOff[pages[nextIdx].label] : full.length;
  const body = full.slice(s, e);
  const parts = {};
  for (const [k, re] of SUBS) { const m = body.search(re); if (m >= 0) parts[k] = s + m; }
  sections.push({ key: n === 0 ? 'preface' : `law-${n}`, label, title, page_start: ps[0].label, page_end: last.label, char_start: s, char_end: e, parts });
}
const fileHashes = Object.fromEntries(FILES.map(f => [`48Laws ${f}.pdf`, crypto.createHash('sha256').update(fs.readFileSync(`${pdfDir}/48Laws ${f}.pdf`)).digest('hex')]));
fs.writeFileSync(`${outDir}/48laws_full.txt`, full);
fs.writeFileSync(`${outDir}/48laws_sections.json`, JSON.stringify({ sha256: crypto.createHash('sha256').update(full).digest('hex'), fileHashes, sections }, null, 1));
console.log('laws found', law, 'pages', pages.length, 'chars', full.length, 'words', full.split(/\s+/).length);
console.log('head mismatches', bad.length, bad.slice(0, 20));
for (const s of sections) console.log(s.key, s.page_start + '-' + s.page_end, Object.keys(s.parts).join(','));

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// The Library of Arete — a living philosophical library you can "play" in.
// Four rooms over one shell. Phase 1 wires the Reading Room (read every primary
// text in full) and the Symposium (sit with a master, or stage a debate) to the
// real corpus; the Atrium is a light landing and the Observatory is forthcoming.
// ---------------------------------------------------------------------------

const SERIF = 'var(--font-cormorant), Georgia, serif';
const SANS = 'var(--font-inter), system-ui, sans-serif';
const MONO = 'var(--font-jetbrains), monospace';

const GOLD = '#c9a84c';
const GOLD_L = '#e3c77a';
const IVORY = '#f4ead5';
const TEXT = '#e8e4d6';
const MUTED = '#8a8b8e';

type Room = 'atrium' | 'reading' | 'symposium' | 'observatory';

type LibText = {
  id: string;
  author: string;
  work: string;
  title: string;
  era: string;
  textType: 'primary' | 'synthesis';
  tradition: 'stoic' | 'wider' | 'synthesis';
  passages: number;
  translator: string | null;
  sourceUrl: string | null;
  spine: string;
  excerpt: string;
};

type Reader = {
  author: string;
  work: string;
  title: string;
  era: string;
  translator: string | null;
  sourceUrl: string | null;
  page: number;
  totalPages: number;
  totalPassages: number;
  body: string;
};

type Related = { id: string; author: string; work: string; title: string; reason: string };

type ObsConcept = {
  id: string; name: string; voices: string[]; passages: number; magnitude: number;
  synthesis: { title: string; status: string; excerpt: string; divergence: string | null } | null;
  x?: number; y?: number;
};
type ObsData = {
  concepts: ObsConcept[];
  edges: [string, string][];
  recent: { mostAsked: string[]; tensions: { title: string; concept: string }[]; newIngests: { title: string; concept: string }[]; gaps: string[] };
};

type Master = {
  id: string;
  name: string;
  voice: string;
  initial: string;
  accent: string;
  textColor: string;
  greeting: string;
  oracleAuthor: string | null;
};

const MASTERS: Master[] = [
  { id: 'corpus', name: 'The Corpus', voice: 'Many minds, one counsel', initial: '✶', accent: GOLD, textColor: '#0a1020', oracleAuthor: null,
    greeting: 'You stand inside the whole tradition at once. Ask, and many voices will answer as one.' },
  { id: 'socrates', name: 'Socrates', voice: 'Athens · asks until you know', initial: 'Σ', accent: '#1d2c4a', textColor: GOLD_L, oracleAuthor: null,
    greeting: 'I know nothing worth teaching — but I am very good at questions. Shall we find out together what you actually believe?' },
  { id: 'zeno', name: 'Zeno of Citium', voice: 'Founder of the Porch', initial: 'Z', accent: '#0f2e1a', textColor: GOLD_L, oracleAuthor: null,
    greeting: 'I lost everything in a shipwreck and called it the most prosperous voyage I ever made. Tell me — what do you think you have lost?' },
  { id: 'epictetus', name: 'Epictetus', voice: 'Unsparing, exact', initial: 'E', accent: '#0f2744', textColor: GOLD_L, oracleAuthor: 'Epictetus',
    greeting: 'Begin here: in this trouble of yours, what is actually yours to command? Name it plainly and we will start.' },
  { id: 'marcus', name: 'Marcus Aurelius', voice: 'Calm, reflective', initial: 'M', accent: '#2d1b4e', textColor: GOLD_L, oracleAuthor: 'Marcus Aurelius',
    greeting: 'I keep this journal to steady myself, not to instruct anyone. But sit — let us try to see the thing clearly together.' },
  { id: 'seneca', name: 'Seneca', voice: 'Warm, worldly', initial: 'S', accent: '#3a2415', textColor: GOLD_L, oracleAuthor: 'Seneca',
    greeting: 'Speak as you would to a friend who has time for you. What weighs on you tonight?' },
];
const masterById = (id: string) => MASTERS.find(m => m.id === id) || MASTERS[0];

const SUGGESTED = [
  'What is actually mine to control here?',
  'I keep avoiding something. Why?',
  'Is it weak to grieve?',
  'How do I quiet a restless mind?',
];

const DEBATE_QS = [
  { text: 'Should the wise person ever feel grief?', a: 'seneca', b: 'epictetus', pair: 'Seneca vs Epictetus' },
  { text: 'Is it enough to endure — or must we act?', a: 'epictetus', b: 'marcus', pair: 'Epictetus vs Marcus' },
  { text: 'Does loving fate make us passive?', a: 'marcus', b: 'seneca', pair: 'Marcus vs Seneca' },
];

const MURMURS = [
  'It is not things that disturb us, but our judgments about things. — Epictetus',
  'You have power over your mind, not outside events. — Marcus Aurelius',
  'We suffer more often in imagination than in reality. — Seneca',
  'Waste no more time arguing what a good person should be. Be one. — Marcus Aurelius',
  'No one is free who is not master of themselves. — Epictetus',
  'Every new beginning comes from some other beginning’s end. — Seneca',
];

type SitMsg =
  | { role: 'user'; text: string }
  | { role: 'master'; masterId: string; text: string; rec: { author: string; work: string; title: string } | null };

type DebateLine = { who: 'a' | 'b'; speaker: string; text: string };

export default function LibraryOfArete() {
  const [room, setRoom] = useState<Room>('atrium');

  // ---- reading ----
  const [texts, setTexts] = useState<LibText[]>([]);
  const [textsLoading, setTextsLoading] = useState(true);
  const [pendingReview, setPendingReview] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [active, setActive] = useState<{ author: string; work: string; title: string } | null>(null);
  const [reader, setReader] = useState<Reader | null>(null);
  const [readerLoading, setReaderLoading] = useState(false);
  const [related, setRelated] = useState<Related[]>([]);

  // ---- symposium ----
  const [symMode, setSymMode] = useState<'sit' | 'debate'>('sit');
  const [symMaster, setSymMaster] = useState('corpus');
  const [messages, setMessages] = useState<SitMsg[]>([]);
  const [symInput, setSymInput] = useState('');
  const [symThinking, setSymThinking] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const [debateInput, setDebateInput] = useState('');
  const [debateQ, setDebateQ] = useState('');
  const [debateNote, setDebateNote] = useState('');
  const [debateLines, setDebateLines] = useState<DebateLine[]>([]);
  const [debatePair, setDebatePair] = useState<{ a: string; b: string } | null>(null);
  const [debateLoading, setDebateLoading] = useState(false);
  const [debateRunning, setDebateRunning] = useState(false);
  const debateTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // ---- load the shelves once ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/library/texts');
        const data = await res.json();
        if (!cancelled) {
          setTexts(data.texts || []);
          setPendingReview(data.pendingReview || 0);
        }
      } catch {
        /* shelves stay empty; UI shows a quiet notice */
      } finally {
        if (!cancelled) setTextsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Detect the admin so the synthesis shelf can surface the review queue.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      if (!cancelled && data.user?.email && adminEmail && data.user.email === adminEmail) {
        setIsAdmin(true);
      }
    }).catch(() => { /* not signed in — stays non-admin */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => { debateTimers.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, symThinking]);

  const go = (r: Room) => setRoom(r);

  // ---- reading actions ----
  const openWork = useCallback(async (author: string, work: string, title: string) => {
    setRoom('reading');
    setActive({ author, work, title });
    setReader(null);
    setRelated([]);
    setReaderLoading(true);
    try {
      const [tRes, rRes] = await Promise.all([
        fetch(`/api/library/text?author=${encodeURIComponent(author)}&work=${encodeURIComponent(work)}&page=0`),
        fetch('/api/library/related', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ author, work }),
        }),
      ]);
      const tData = await tRes.json();
      if (tRes.ok) setReader(tData);
      const rData = await rRes.json().catch(() => ({ related: [] }));
      setRelated(rData.related || []);
    } catch {
      /* reader error handled by empty state */
    } finally {
      setReaderLoading(false);
    }
  }, []);

  const gotoPage = useCallback(async (page: number) => {
    if (!active) return;
    setReaderLoading(true);
    try {
      const res = await fetch(`/api/library/text?author=${encodeURIComponent(active.author)}&work=${encodeURIComponent(active.work)}&page=${page}`);
      const data = await res.json();
      if (res.ok) {
        setReader(data);
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } finally {
      setReaderLoading(false);
    }
  }, [active]);

  const closeText = () => { setActive(null); setReader(null); setRelated([]); };

  // ---- symposium: sit ----
  const sendSit = useCallback(async (raw: string) => {
    const q = raw.trim();
    if (!q || symThinking) return;
    const master = masterById(symMaster);
    const history = messages.slice(-6).map(m =>
      m.role === 'user' ? { role: 'user', content: m.text } : { role: 'assistant', content: m.text });
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setSymInput('');
    setSymThinking(true);
    try {
      const res = await fetch('/api/oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, author: master.oracleAuthor, history }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setMessages(prev => [...prev, { role: 'master', masterId: symMaster,
          text: data.message || 'You have reached the free dialogues for today. Return tomorrow.', rec: null }]);
        setRemaining(0);
        return;
      }
      if (typeof data.remaining === 'number') setRemaining(data.remaining);
      const src = (data.sources || [])[0];
      const rec = src ? { author: src.author, work: src.work, title: src.work } : null;
      setMessages(prev => [...prev, { role: 'master', masterId: symMaster, text: data.answer || 'The Oracle is silent.', rec }]);
    } catch {
      setMessages(prev => [...prev, { role: 'master', masterId: symMaster, text: 'The Oracle is unreachable. Please try again.', rec: null }]);
    } finally {
      setSymThinking(false);
    }
  }, [symMaster, messages, symThinking]);

  // ---- symposium: debate ----
  const runDebate = useCallback(async (question: string, a: string, b: string) => {
    debateTimers.current.forEach(clearTimeout);
    debateTimers.current = [];
    setSymMode('debate');
    setDebateRunning(true);
    setDebateLoading(true);
    setDebateQ(question);
    setDebateNote('');
    setDebateLines([]);
    setDebatePair({ a, b });
    try {
      const res = await fetch('/api/library/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, a, b }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDebateNote(data.error || 'The house could not convene.');
        setDebateLoading(false);
        return;
      }
      if (typeof data.remaining === 'number') setRemaining(data.remaining);
      const lines: DebateLine[] = data.lines || [];
      setDebateLoading(false);
      // reveal one line at a time for the "watch them contend" effect
      lines.forEach((ln, i) => {
        const t = setTimeout(() => {
          setDebateLines(prev => [...prev, ln]);
          if (i === lines.length - 1) {
            const nt = setTimeout(() => setDebateNote(data.note || ''), 700);
            debateTimers.current.push(nt);
          }
        }, 400 + i * 1700);
        debateTimers.current.push(t);
      });
    } catch {
      setDebateNote('The house is silent. Please try again.');
      setDebateLoading(false);
    }
  }, []);

  const resetDebate = () => {
    debateTimers.current.forEach(clearTimeout);
    debateTimers.current = [];
    setDebateRunning(false);
    setDebateLines([]);
    setDebateQ('');
    setDebateNote('');
    setDebatePair(null);
  };

  // From the Observatory: stage a debate on a concept, then jump to the Symposium.
  const debateConcept = useCallback((conceptName: string) => {
    setRoom('symposium');
    runDebate(`On "${conceptName}" — where do the thinkers diverge?`, 'seneca', 'epictetus');
  }, [runDebate]);

  // ---- derived shelves ----
  const stoicOrder = ['Marcus Aurelius', 'Epictetus', 'Seneca', 'Cleanthes', 'Cicero', 'Diogenes Laërtius', 'Arnold', 'Stock'];
  const sortStoic = (a: LibText, b: LibText) => {
    const ai = stoicOrder.indexOf(a.author), bi = stoicOrder.indexOf(b.author);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.title.localeCompare(b.title);
  };
  const stoicTexts = texts.filter(t => t.tradition === 'stoic').sort(sortStoic);
  const widerTexts = texts.filter(t => t.tradition === 'wider').sort((a, b) => a.author.localeCompare(b.author));
  const synthTexts = texts.filter(t => t.tradition === 'synthesis');

  const activeMaster = masterById(symMaster);

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', overflow: 'hidden',
      background: 'radial-gradient(ellipse 90% 55% at 50% -8%, rgba(201,168,76,0.09), transparent 60%), linear-gradient(180deg,#0a1020,#0b1124 45%,#070c1a)',
      display: 'flex', flexDirection: 'column', height: '100vh' }}>

      <style>{LIB_CSS}</style>

      {/* ambient motes */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        {MOTES.map((m, i) => (
          <span key={i} style={{ position: 'absolute', left: m.l, top: m.t, width: m.s, height: m.s, borderRadius: '50%',
            background: m.c, animation: `${m.a} ${m.d}s ease-in-out infinite ${m.delay}s` }} />
        ))}
      </div>

      {/* TOPBAR */}
      <header className="lib-topbar" style={{ position: 'relative', zIndex: 5, flexShrink: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 24, padding: '0 28px', height: 62,
        borderBottom: '1px solid rgba(201,168,76,0.18)', background: 'rgba(8,13,28,0.6)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => { closeText(); go('atrium'); }} className="lib-reset" style={{ display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: GOLD, animation: 'lib-flicker 4s ease-in-out infinite' }} />
          <span style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 600, letterSpacing: '0.32em', color: GOLD }}>ARETE</span>
          <span className="lib-logo-sub" style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: MUTED, letterSpacing: '0.04em' }}>· the Library</span>
        </button>
        <nav className="lib-nav" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {([['atrium', 'Atrium'], ['reading', 'Reading Room'], ['symposium', 'Symposium'], ['observatory', 'Observatory']] as [Room, string][]).map(([r, label]) => (
            <button key={r} onClick={() => go(r)} className="lib-nav-btn" style={{ position: 'relative', cursor: 'pointer', padding: '8px 14px',
              fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: room === r ? GOLD : TEXT }}>
              {label}
              {room === r && <span style={{ position: 'absolute', left: 14, right: 14, bottom: 1, height: 1, background: GOLD }} />}
            </button>
          ))}
        </nav>
        <div className="lib-status" style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, animation: 'lib-pulse-dot 2.6s ease-in-out infinite' }} />
          <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.16em', color: MUTED, textTransform: 'uppercase' }}>The corpus is awake</span>
        </div>
      </header>

      {/* ROOM STAGE */}
      <div style={{ position: 'relative', zIndex: 2, flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {room === 'atrium' && <Atrium texts={texts} go={go} />}

        {room === 'reading' && (
          <ReadingRoom
            stoicTexts={stoicTexts} widerTexts={widerTexts} synthTexts={synthTexts}
            textsLoading={textsLoading} active={active} reader={reader} readerLoading={readerLoading}
            related={related} openWork={openWork} gotoPage={gotoPage} closeText={closeText} goSymposium={() => go('symposium')}
            isAdmin={isAdmin} pendingReview={pendingReview}
          />
        )}

        {room === 'symposium' && (
          <Symposium
            symMode={symMode} setSymMode={setSymMode} symMaster={symMaster} setSymMaster={setSymMaster}
            activeMaster={activeMaster} messages={messages} symInput={symInput} setSymInput={setSymInput}
            symThinking={symThinking} remaining={remaining} sendSit={sendSit} openWork={openWork}
            scrollRef={scrollRef}
            debateInput={debateInput} setDebateInput={setDebateInput} debateQ={debateQ} debateNote={debateNote}
            debateLines={debateLines} debatePair={debatePair} debateLoading={debateLoading} debateRunning={debateRunning}
            runDebate={runDebate} resetDebate={resetDebate}
          />
        )}

        {room === 'observatory' && <Observatory go={go} onDebate={debateConcept} />}
      </div>
    </div>
  );
}

/* ========================= ATRIUM ========================= */
function Atrium({ texts, go }: { texts: LibText[]; go: (r: Room) => void }) {
  const primaryCount = texts.filter(t => t.textType === 'primary').length;
  const passageCount = texts.reduce((n, t) => n + t.passages, 0);
  const doorways = [
    { key: 'reading' as Room, glyph: '❧', name: 'The Reading Room', sub: 'Pull any text from the shelves and read it in full; let the corpus recommend the next.' },
    { key: 'symposium' as Room, glyph: '⟡', name: 'The Symposium', sub: 'Sit with a master, or set two of them debating a question you pose.' },
    { key: 'observatory' as Room, glyph: '✶', name: 'The Observatory', sub: 'Wander a sky of the ideas the corpus is working through, and see where voices meet.' },
  ];
  return (
    <main style={{ height: '100%', overflowY: 'auto' }}>
      <div className="lib-fade lib-atrium-pad" style={{ maxWidth: 1080, margin: '0 auto', padding: '64px 32px 30px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase', color: GOLD, marginBottom: 14 }}>The Library of Arete</div>
          <h1 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 'clamp(38px,5vw,62px)', lineHeight: 1.03, letterSpacing: '-0.01em', color: IVORY, margin: '0 auto 18px', maxWidth: 760 }}>
            A living library you can wander, read, and argue with.
          </h1>
          <p style={{ fontFamily: SERIF, fontSize: 21, fontStyle: 'italic', lineHeight: 1.55, color: MUTED, margin: '0 auto', maxWidth: 600 }}>
            Stoic at its heart, open to the wider tradition. {primaryCount > 0
              ? `${passageCount.toLocaleString()} passages across ${primaryCount} primary works — every one of them here to be read in full.`
              : 'Every primary text here to be read in full.'}
          </p>
        </div>

        <div style={{ marginTop: 40 }}>
          <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: MUTED, marginBottom: 22 }}>— Wander the halls —</div>
          <div className="lib-doorways" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
            {doorways.map(d => (
              <button key={d.key} onClick={() => go(d.key)} className="lib-doorway" style={{ position: 'relative', display: 'flex', flexDirection: 'column',
                alignItems: 'center', textAlign: 'center', background: 'linear-gradient(180deg,rgba(20,30,60,0.55),rgba(9,15,30,0.7))',
                border: '1px solid rgba(201,168,76,0.2)', borderRadius: '120px 120px 16px 16px', padding: '40px 24px 28px', cursor: 'pointer', overflow: 'hidden' }}>
                <span style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '60%', height: '60%',
                  background: 'radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.14), transparent 70%)', pointerEvents: 'none' }} />
                <span style={{ fontFamily: SERIF, fontSize: 34, color: GOLD, lineHeight: 1, marginBottom: 14, position: 'relative' }}>{d.glyph}</span>
                <span style={{ fontFamily: SERIF, fontSize: 23, color: IVORY, position: 'relative' }}>{d.name}</span>
                <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14.5, color: MUTED, marginTop: 6, position: 'relative', maxWidth: 200, lineHeight: 1.4 }}>{d.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* murmur band */}
      <div style={{ position: 'relative', marginTop: 28, padding: '14px 0', borderTop: '1px solid rgba(201,168,76,0.16)', overflow: 'hidden', background: 'rgba(7,12,24,0.4)' }}>
        <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.26em', textTransform: 'uppercase', color: MUTED, textAlign: 'center', marginBottom: 9, opacity: 0.7 }}>the corpus murmurs</div>
        <div style={{ overflow: 'hidden', WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)', maskImage: 'linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)' }}>
          <div style={{ display: 'flex', gap: 46, whiteSpace: 'nowrap', width: 'max-content', animation: 'lib-marquee 60s linear infinite' }}>
            {[...MURMURS, ...MURMURS].map((m, i) => (
              <span key={i} style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 17, color: TEXT, opacity: 0.6 }}>{m}</span>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

/* ========================= READING ROOM ========================= */
function Shelf({ items, openWork }: { items: LibText[]; openWork: (a: string, w: string, t: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 16, marginBottom: 42 }}>
      {items.map(t => (
        <button key={t.id} onClick={() => openWork(t.author, t.work, t.title)} className="lib-card" style={{ position: 'relative', textAlign: 'left',
          background: 'linear-gradient(170deg,rgba(18,27,54,0.6),rgba(10,18,36,0.6))', border: '1px solid rgba(201,168,76,0.18)',
          borderRadius: 14, padding: 0, overflow: 'hidden', cursor: 'pointer', display: 'flex', minHeight: 150 }}>
          <span style={{ width: 7, flexShrink: 0, background: t.spine }} />
          <span style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: MUTED, marginBottom: 9 }}>
              {t.textType === 'synthesis' ? 'Synthesis' : 'Primary source'}
            </span>
            <span style={{ fontFamily: SERIF, fontSize: 22, lineHeight: 1.12, color: IVORY, marginBottom: 5 }}>{t.title}</span>
            <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, color: GOLD }}>{t.author}</span>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.06em', color: MUTED, marginTop: 'auto', paddingTop: 14 }}>
              {t.era ? `${t.era} · ` : ''}{t.passages} passages
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

function ReadingRoom(props: {
  stoicTexts: LibText[]; widerTexts: LibText[]; synthTexts: LibText[]; textsLoading: boolean;
  active: { author: string; work: string; title: string } | null; reader: Reader | null; readerLoading: boolean;
  related: Related[]; openWork: (a: string, w: string, t: string) => void; gotoPage: (n: number) => void;
  closeText: () => void; goSymposium: () => void; isAdmin: boolean; pendingReview: number;
}) {
  const { stoicTexts, widerTexts, synthTexts, textsLoading, active, reader, readerLoading, related, openWork, gotoPage, closeText, goSymposium, isAdmin, pendingReview } = props;

  if (active) {
    const paras = reader ? reader.body.split(/\n\n+/).filter(Boolean) : [];
    return (
      <main style={{ height: '100%', overflowY: 'auto' }}>
        <div className="lib-fade lib-reader-grid" style={{ maxWidth: 1140, margin: '0 auto', padding: '30px 32px 60px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 38, alignItems: 'start' }}>
          <div>
            <button onClick={closeText} className="lib-back" style={{ cursor: 'pointer', fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: MUTED, marginBottom: 24 }}>← Back to the shelves</button>
            <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD, marginBottom: 12 }}>
              {reader?.era || (active.author)}
            </div>
            <h1 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 'clamp(34px,4.4vw,50px)', lineHeight: 1.04, color: IVORY, margin: '0 0 8px' }}>{active.title}</h1>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, color: GOLD, marginBottom: 6 }}>{active.author}</div>
            {reader?.translator && <div style={{ fontFamily: MONO, fontSize: 9, color: MUTED, marginBottom: 24, letterSpacing: '0.06em' }}>trans. {reader.translator}</div>}

            <div style={{ borderTop: '1px solid rgba(201,168,76,0.2)', paddingTop: 30 }}>
              {readerLoading && <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, color: MUTED }}>Pulling the text from the shelf…</p>}
              {!readerLoading && reader && paras.map((p, i) => (
                <p key={i} style={{ fontFamily: SERIF, fontSize: 20, lineHeight: 1.72, color: i === 0 ? IVORY : TEXT, opacity: i === 0 ? 1 : 0.9, margin: '0 0 20px' }}>{p}</p>
              ))}
              {!readerLoading && !reader && <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, color: MUTED }}>This text could not be opened just now.</p>}
            </div>

            {reader && reader.totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 34, paddingTop: 20, borderTop: '1px solid rgba(201,168,76,0.16)' }}>
                <button disabled={reader.page <= 0 || readerLoading} onClick={() => gotoPage(reader.page - 1)} className="lib-page-btn"
                  style={{ cursor: reader.page <= 0 ? 'default' : 'pointer', opacity: reader.page <= 0 ? 0.3 : 1, fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD, border: '1px solid rgba(201,168,76,0.3)', borderRadius: 10, padding: '9px 16px', background: 'rgba(201,168,76,0.06)' }}>← Previous</button>
                <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.12em', color: MUTED }}>Folio {reader.page + 1} of {reader.totalPages}</span>
                <button disabled={reader.page >= reader.totalPages - 1 || readerLoading} onClick={() => gotoPage(reader.page + 1)} className="lib-page-btn"
                  style={{ cursor: reader.page >= reader.totalPages - 1 ? 'default' : 'pointer', opacity: reader.page >= reader.totalPages - 1 ? 0.3 : 1, fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD, border: '1px solid rgba(201,168,76,0.3)', borderRadius: 10, padding: '9px 16px', background: 'rgba(201,168,76,0.06)' }}>Next →</button>
              </div>
            )}
            {reader?.sourceUrl && (
              <a href={reader.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 20, fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color: MUTED, textDecoration: 'underline' }}>source edition →</a>
            )}
          </div>

          <aside className="lib-reader-aside" style={{ position: 'sticky', top: 0, background: 'linear-gradient(180deg,rgba(18,27,54,0.5),rgba(10,18,36,0.5))', border: '1px solid rgba(201,168,76,0.18)', borderRadius: 16, padding: '24px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD, animation: 'lib-pulse-dot 3s ease-in-out infinite' }} />
              <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD }}>Reads itself alongside</span>
            </div>
            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: MUTED, margin: '0 0 18px', lineHeight: 1.4 }}>Because you opened this, the corpus surfaces these.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {related.length === 0 && <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: MUTED }}>Listening for echoes…</p>}
              {related.map(r => (
                <button key={r.id} onClick={() => openWork(r.author, r.work, r.title)} className="lib-related" style={{ textAlign: 'left', background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: 11, padding: '13px 15px', cursor: 'pointer' }}>
                  <div style={{ fontFamily: SERIF, fontSize: 17, color: IVORY, lineHeight: 1.15, marginBottom: 3 }}>{r.title}</div>
                  <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13.5, color: GOLD }}>{r.author}</div>
                  <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.06em', color: MUTED, marginTop: 6 }}>{r.reason}</div>
                </button>
              ))}
            </div>
            <button onClick={goSymposium} className="lib-discuss" style={{ width: '100%', marginTop: 18, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 11, padding: 11, cursor: 'pointer', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD }}>Discuss this in the Symposium →</button>
          </aside>
        </div>
      </main>
    );
  }

  return (
    <main style={{ height: '100%', overflowY: 'auto' }}>
      <div className="lib-fade lib-reading-pad" style={{ maxWidth: 1120, margin: '0 auto', padding: '44px 32px 60px' }}>
        <div style={{ marginBottom: 34 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: GOLD, marginBottom: 10 }}>The Reading Room</div>
          <h1 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 'clamp(32px,4vw,46px)', color: IVORY, margin: '0 0 10px' }}>Pull a text from the shelves</h1>
          <p style={{ fontFamily: SERIF, fontSize: 19, fontStyle: 'italic', color: MUTED, margin: 0, maxWidth: 600 }}>Every primary source is here in full — the Stoics first, and the wider tradition beside them.</p>
        </div>

        {textsLoading && <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, color: MUTED }}>Opening the doors…</p>}

        {stoicTexts.length > 0 && (
          <>
            <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.24em', textTransform: 'uppercase', color: GOLD, margin: '0 0 16px' }}>The Stoic shelf</div>
            <Shelf items={stoicTexts} openWork={openWork} />
          </>
        )}

        {widerTexts.length > 0 && (
          <>
            <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.24em', textTransform: 'uppercase', color: GOLD, margin: '0 0 7px' }}>The wider tradition</div>
            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, color: MUTED, margin: '0 0 16px', maxWidth: 600 }}>The Stoa did not think alone. These voices — from Confucius to Montaigne — are here in full to read and discuss.</p>
            <Shelf items={widerTexts} openWork={openWork} />
          </>
        )}

        {(synthTexts.length > 0 || (isAdmin && pendingReview > 0)) && (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, margin: '0 0 7px' }}>
              <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.24em', textTransform: 'uppercase', color: GOLD }}>The corpus thinking about itself</div>
              {isAdmin && pendingReview > 0 && (
                <a href="/admin/synthesis" style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD_L, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.35)', borderRadius: 999, padding: '5px 13px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  {pendingReview} awaiting your review →
                </a>
              )}
            </div>
            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, color: MUTED, margin: '0 0 16px', maxWidth: 600 }}>Synthesis documents the corpus wrote about its own sources — cross-thinker analyses no single text contains.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(310px,1fr))', gap: 16 }}>
              {synthTexts.map(t => (
                <button key={t.id} onClick={() => openWork(t.author, t.work, t.title)} className="lib-card" style={{ position: 'relative', textAlign: 'left', background: 'linear-gradient(170deg,rgba(28,24,52,0.5),rgba(12,16,34,0.6))', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 14, padding: '22px 24px', cursor: 'pointer' }}>
                  <span style={{ display: 'inline-block', fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, border: '1px solid rgba(201,168,76,0.3)', borderRadius: 999, padding: '3px 9px', marginBottom: 13 }}>Synthesis</span>
                  <div style={{ fontFamily: SERIF, fontSize: 21, lineHeight: 1.16, color: IVORY, marginBottom: 9 }}>{t.title}</div>
                  <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, lineHeight: 1.5, color: TEXT, opacity: 0.78 }}>{t.excerpt}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

/* ========================= SYMPOSIUM ========================= */
function Symposium(props: {
  symMode: 'sit' | 'debate'; setSymMode: (m: 'sit' | 'debate') => void; symMaster: string; setSymMaster: (id: string) => void;
  activeMaster: Master; messages: SitMsg[]; symInput: string; setSymInput: (s: string) => void; symThinking: boolean;
  remaining: number | null; sendSit: (s: string) => void; openWork: (a: string, w: string, t: string) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  debateInput: string; setDebateInput: (s: string) => void; debateQ: string; debateNote: string; debateLines: DebateLine[];
  debatePair: { a: string; b: string } | null; debateLoading: boolean; debateRunning: boolean;
  runDebate: (q: string, a: string, b: string) => void; resetDebate: () => void;
}) {
  const { symMode, setSymMode, symMaster, setSymMaster, activeMaster, messages, symInput, setSymInput, symThinking,
    remaining, sendSit, openWork, scrollRef, debateInput, setDebateInput, debateQ, debateNote, debateLines,
    debatePair, debateLoading, debateRunning, runDebate, resetDebate } = props;

  // The masters rail is a fixed column on desktop; on a phone it slides in as a
  // drawer so the conversation gets the full width.
  const [railOpen, setRailOpen] = useState(false);

  return (
    <main style={{ height: '100%', display: 'flex', minHeight: 0 }}>
      {railOpen && <div className="lib-drawer-scrim" onClick={() => setRailOpen(false)} />}
      {/* masters rail */}
      <aside className={`lib-masters-rail${railOpen ? ' open' : ''}`} style={{ width: 236, flexShrink: 0, borderRight: '1px solid rgba(201,168,76,0.16)', background: 'linear-gradient(180deg,rgba(12,20,40,0.7),rgba(8,14,30,0.7))', padding: '22px 14px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.26em', textTransform: 'uppercase', color: GOLD, marginBottom: 3 }}>Take a seat with</div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, color: MUTED, marginBottom: 16 }}>Pull up a chair across the table</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {MASTERS.map(m => (
            <button key={m.id} onClick={() => { setSymMaster(m.id); setRailOpen(false); }} className="lib-master" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px', borderRadius: 11,
              border: `1px solid ${symMaster === m.id ? GOLD : 'transparent'}`, background: symMaster === m.id ? 'rgba(201,168,76,0.1)' : 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
              <span style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: m.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontWeight: 600, fontSize: 16, color: m.textColor }}>{m.initial}</span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: SERIF, fontSize: 16, color: IVORY, lineHeight: 1.15 }}>{m.name}</span>
                <span style={{ display: 'block', fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.06em', color: MUTED, marginTop: 2 }}>{m.voice}</span>
              </span>
            </button>
          ))}
        </div>
        <div style={{ height: 1, background: 'rgba(201,168,76,0.16)', margin: '18px 0' }} />
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: MUTED, lineHeight: 1.7, textAlign: 'center' }}>
          {remaining === null ? '15 free dialogues a day' : `${remaining} of 15 free dialogues remaining today`}
        </div>
      </aside>

      {/* conversation column */}
      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 28px', borderBottom: '1px solid rgba(201,168,76,0.14)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
            <button onClick={() => setRailOpen(true)} className="lib-rail-toggle lib-mobile-only" aria-label="Choose a master" style={{ cursor: 'pointer', flexShrink: 0, alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.06)', color: GOLD }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
            <span style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: activeMaster.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontWeight: 600, fontSize: 15, color: activeMaster.textColor }}>{activeMaster.initial}</span>
            <span style={{ fontFamily: SERIF, fontSize: 19, color: IVORY }}>{activeMaster.name}</span>
          </div>
          <div style={{ display: 'flex', gap: 4, background: 'rgba(8,14,30,0.6)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: 999, padding: 3 }}>
            <button onClick={() => setSymMode('sit')} style={{ background: symMode === 'sit' ? GOLD : 'transparent', border: 'none', borderRadius: 999, padding: '7px 16px', cursor: 'pointer', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: symMode === 'sit' ? '#0a1020' : MUTED }}>Sit &amp; converse</button>
            <button onClick={() => setSymMode('debate')} style={{ background: symMode === 'debate' ? GOLD : 'transparent', border: 'none', borderRadius: 999, padding: '7px 16px', cursor: 'pointer', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: symMode === 'debate' ? '#0a1020' : MUTED }}>Stage a debate</button>
          </div>
        </div>

        {symMode === 'sit' && (
          <>
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
              <div style={{ maxWidth: 680, margin: '0 auto', padding: '26px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '36px 10px 6px' }}>
                    <span style={{ display: 'inline-flex', width: 70, height: 70, borderRadius: '50%', background: activeMaster.accent, alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontWeight: 600, fontSize: 32, color: activeMaster.textColor, marginBottom: 18 }}>{activeMaster.initial}</span>
                    <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 22, lineHeight: 1.5, color: IVORY, margin: '0 auto 26px', maxWidth: 480 }}>{activeMaster.greeting}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, maxWidth: 480, margin: '0 auto' }}>
                      {SUGGESTED.map(q => (
                        <button key={q} onClick={() => sendSit(q)} className="lib-suggest" style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.24)', borderRadius: 12, padding: '12px 16px', fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: TEXT, cursor: 'pointer', textAlign: 'left' }}>{q}</button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m, i) => m.role === 'user' ? (
                  <div key={i} style={{ alignSelf: 'flex-end', maxWidth: '80%', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.22)', borderRadius: '18px 18px 4px 18px', padding: '11px 16px', fontFamily: SANS, fontSize: 15, lineHeight: 1.55, color: IVORY }}>{m.text}</div>
                ) : (
                  <div key={i} style={{ alignSelf: 'flex-start', maxWidth: '92%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: masterById(m.masterId).accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontWeight: 600, fontSize: 10, color: masterById(m.masterId).textColor }}>{masterById(m.masterId).initial}</span>
                      <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD }}>{masterById(m.masterId).name}</span>
                    </div>
                    <div style={{ background: 'linear-gradient(160deg,rgba(16,24,48,0.78),rgba(10,16,32,0.78))', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '4px 18px 18px 18px', padding: '14px 18px', fontFamily: SERIF, fontSize: 18.5, lineHeight: 1.6, color: IVORY, whiteSpace: 'pre-wrap' }}>{m.text}</div>
                    {m.rec && (
                      <button onClick={() => openWork(m.rec!.author, m.rec!.work, m.rec!.title)} className="lib-readnext" style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 8, background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.22)', borderRadius: 11, padding: '10px 14px', cursor: 'pointer', textAlign: 'left' }}>
                        <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: GOLD, whiteSpace: 'nowrap' }}>Read next →</span>
                        <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, color: TEXT }}>{m.rec.author} · {m.rec.title}</span>
                      </button>
                    )}
                  </div>
                ))}
                {symThinking && (
                  <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5, background: 'linear-gradient(160deg,rgba(16,24,48,0.78),rgba(10,16,32,0.78))', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '4px 18px 18px 18px', padding: '13px 18px' }}>
                    {[0, 0.2, 0.4].map((d, i) => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, animation: `lib-dots 1.4s ease-in-out infinite ${d}s` }} />)}
                  </div>
                )}
              </div>
            </div>
            <div style={{ flexShrink: 0, padding: '12px 24px 16px', borderTop: '1px solid rgba(201,168,76,0.16)', background: 'rgba(8,14,30,0.7)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, maxWidth: 680, margin: '0 auto', background: 'rgba(16,24,48,0.8)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 16, padding: '8px 8px 8px 16px' }}>
                <input value={symInput} onChange={e => setSymInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendSit(symInput); } }}
                  placeholder={`Speak with ${activeMaster.name}…`} style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', fontFamily: SANS, fontSize: 15, color: IVORY, padding: '6px 0' }} />
                <button onClick={() => sendSit(symInput)} className="lib-sendbtn" style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: GOLD, color: '#0a1020', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                </button>
              </div>
              <div style={{ maxWidth: 680, margin: '7px auto 0', fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.1em', color: MUTED, textAlign: 'center' }}>Grounded in the corpus · every reply cites its sources · the named master colors the voice</div>
            </div>
          </>
        )}

        {symMode === 'debate' && (
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
            <div style={{ maxWidth: 720, margin: '0 auto', padding: '26px 24px' }}>
              {!debateRunning && (
                <div style={{ textAlign: 'center', padding: '22px 6px' }}>
                  <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.24em', textTransform: 'uppercase', color: GOLD, marginBottom: 12 }}>Pose a question — watch the corpus argue with itself</div>
                  <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 21, lineHeight: 1.5, color: IVORY, margin: '0 auto 28px', maxWidth: 500 }}>Two minds from the tradition take opposite chairs and contend in real time. The corpus never resolves the tension — it shows you where the fault line runs.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11, maxWidth: 540, margin: '0 auto' }}>
                    {DEBATE_QS.map(q => (
                      <button key={q.text} onClick={() => runDebate(q.text, q.a, q.b)} className="lib-debate-q" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.24)', borderRadius: 13, padding: '15px 18px', cursor: 'pointer', textAlign: 'left' }}>
                        <span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, color: IVORY }}>{q.text}</span>
                        <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: GOLD, whiteSpace: 'nowrap' }}>{q.pair}</span>
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, maxWidth: 540, margin: '20px auto 0', background: 'rgba(16,24,48,0.8)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 14, padding: '8px 8px 8px 16px' }}>
                    <input value={debateInput} onChange={e => setDebateInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && debateInput.trim()) { e.preventDefault(); runDebate(debateInput.trim(), 'seneca', 'epictetus'); } }}
                      placeholder="…or pose your own question to the house" style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', fontFamily: SANS, fontSize: 14, color: IVORY, padding: '6px 0' }} />
                    <button onClick={() => { if (debateInput.trim()) runDebate(debateInput.trim(), 'seneca', 'epictetus'); }} style={{ border: 'none', background: GOLD, color: '#0a1020', borderRadius: 9, padding: '8px 14px', cursor: 'pointer', fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Convene</button>
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.08em', color: MUTED, marginTop: 10, opacity: 0.7 }}>Custom questions are argued by Seneca and Epictetus.</div>
                </div>
              )}

              {debateRunning && (
                <>
                  <div style={{ marginBottom: 18 }}>
                    <button onClick={resetDebate} className="lib-back" style={{ cursor: 'pointer', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED, marginBottom: 14 }}>← New question</button>
                    <div style={{ textAlign: 'center', padding: '6px 0 18px', borderBottom: '1px solid rgba(201,168,76,0.14)' }}>
                      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: MUTED, marginBottom: 8 }}>The question before the house</div>
                      <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 24, color: IVORY }}>{debateQ}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {debateLines.map((ln, i) => {
                      const left = debatePair ? ln.who === 'a' : true;
                      return (
                        <div key={i} style={{ alignSelf: left ? 'flex-start' : 'flex-end', maxWidth: '80%', animation: 'lib-fade-in 0.5s ease both' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, flexDirection: left ? 'row' : 'row-reverse' }}>
                            <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD }}>{ln.speaker}</span>
                          </div>
                          <div style={{ background: left ? 'linear-gradient(160deg,rgba(16,24,48,0.8),rgba(10,16,32,0.8))' : 'linear-gradient(160deg,rgba(28,22,46,0.8),rgba(14,12,30,0.8))', border: '1px solid rgba(201,168,76,0.2)', borderRadius: left ? '4px 18px 18px 18px' : '18px 4px 18px 18px', padding: '15px 19px', fontFamily: SERIF, fontSize: 18.5, lineHeight: 1.6, color: IVORY }}>{ln.text}</div>
                        </div>
                      );
                    })}
                    {(debateLoading || (debateRunning && !debateNote && debateLines.length > 0 && debateLines.length < 6)) && (
                      <div style={{ alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 5, padding: '8px 0' }}>
                        {[0, 0.2, 0.4].map((d, i) => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, animation: `lib-dots 1.4s ease-in-out infinite ${d}s` }} />)}
                      </div>
                    )}
                  </div>
                  {debateNote && (
                    <div style={{ marginTop: 26, background: 'linear-gradient(160deg,rgba(28,24,52,0.5),rgba(12,16,34,0.6))', border: '1px solid rgba(201,168,76,0.24)', borderRadius: 14, padding: '20px 22px' }}>
                      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD, marginBottom: 9 }}>The corpus does not resolve this</div>
                      <p style={{ fontFamily: SERIF, fontSize: 17, lineHeight: 1.55, color: TEXT, opacity: 0.88, margin: 0 }}>{debateNote}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

/* ========================= OBSERVATORY ========================= */
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
function shortLabel(name: string): string {
  const head = name.split(':')[0].trim();
  return cap(head.length <= 30 ? head : head.slice(0, 28).trim() + '…');
}
const sizeFor = (m: number) => m >= 3 ? { dot: 16, glow: 22, spread: 3, label: 14 }
  : m === 2 ? { dot: 11, glow: 16, spread: 2, label: 12.5 }
  : { dot: 7, glow: 11, spread: 1, label: 11.5 };

type Node3D = { c: ObsConcept; x: number; y: number; z: number };

// Distribute concepts over a sphere (Fibonacci spiral). Weightier concepts are
// pulled toward the core so the cloud reads like a brain you can turn, not a
// hollow shell. Deterministic, so the constellation is stable between visits.
function sphere3D(concepts: ObsConcept[]): Node3D[] {
  const N = concepts.length;
  const GA = Math.PI * (3 - Math.sqrt(5));
  return concepts.map((c, i) => {
    const t = N > 1 ? i / (N - 1) : 0.5;
    const y = 1 - t * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const th = GA * i;
    const rad = (c.magnitude >= 3 ? 0.55 : c.magnitude === 2 ? 0.82 : 1.0) * (0.92 + ((i * 37) % 13) / 100);
    return { c, x: Math.cos(th) * ring * rad, y: y * rad, z: Math.sin(th) * ring * rad };
  });
}

// A rotatable / zoomable 3D star-field. The layout is projected imperatively in
// a requestAnimationFrame loop (mutating element transforms directly) so it
// stays at 60fps without re-rendering React on every frame.
function Sky3D({ concepts, edges, activeId, onPick }: {
  concepts: ObsConcept[]; edges: [string, string][]; activeId: string | null; onPick: (id: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const lineRefs = useRef<(SVGLineElement | null)[]>([]);

  const nodes = useMemo(() => sphere3D(concepts), [concepts]);
  const idx = useMemo(() => { const m = new Map<string, number>(); concepts.forEach((c, i) => m.set(c.id, i)); return m; }, [concepts]);
  const edgePairs = useMemo(() =>
    edges.map(([a, b]) => [idx.get(a), idx.get(b)] as const).filter(p => p[0] != null && p[1] != null) as [number, number][],
    [edges, idx]);

  const rot = useRef({ x: -0.12, y: 0.5 });
  const vel = useRef({ x: 0, y: 0 });
  const zoom = useRef(1);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragDist = useRef(0);
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const lastInteract = useRef(0);
  const activeRef = useRef(-1);
  const isMobile = useRef(false);

  useEffect(() => { activeRef.current = activeId ? (idx.get(activeId) ?? -1) : -1; }, [activeId, idx]);

  useEffect(() => {
    const wrap = wrapRef.current; if (!wrap) return;
    isMobile.current = window.matchMedia('(max-width: 760px)').matches;
    const proj = nodes.map(() => ({ sx: 0, sy: 0, z: 0, p: 1 }));
    let raf = 0;

    // One projection pass. Pulled out of the rAF loop so it can also run once
    // synchronously on mount — nodes are then placed correctly even before the
    // first animation frame, or in a backgrounded tab where rAF is paused.
    const project = () => {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      const cx = w / 2, cy = h / 2;
      const R = Math.min(w, h) * 0.36 * zoom.current;
      const cam = 2.6;
      const cyA = Math.cos(rot.current.y), syA = Math.sin(rot.current.y);
      const cxA = Math.cos(rot.current.x), sxA = Math.sin(rot.current.x);
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const x1 = n.x * cyA + n.z * syA;
        const z1 = -n.x * syA + n.z * cyA;
        const y1 = n.y * cxA - z1 * sxA;
        const z2 = n.y * sxA + z1 * cxA;
        const p = cam / (cam - z2);
        const sx = cx + x1 * R * p;
        const sy = cy - y1 * R * p;
        proj[i].sx = sx; proj[i].sy = sy; proj[i].z = z2; proj[i].p = p;
        const depth = (z2 + 1) / 2;
        const el = nodeRefs.current[i];
        if (el) { el.style.transform = `translate(-50%,-50%) translate(${sx}px,${sy}px)`; el.style.zIndex = String(Math.round(p * 1000)); el.style.opacity = String(0.5 + depth * 0.5); }
        const dot = dotRefs.current[i];
        if (dot) dot.style.transform = `scale(${p.toFixed(3)})`;
        const lab = labelRefs.current[i];
        if (lab) {
          const show = z2 > 0.08 && (isMobile.current ? n.c.magnitude >= 2 : true);
          lab.style.opacity = show ? String(0.25 + depth * 0.75) : '0';
        }
      }
      const aIdx = activeRef.current;
      for (let e = 0; e < edgePairs.length; e++) {
        const ln = lineRefs.current[e]; if (!ln) continue;
        const [a, b] = edgePairs[e]; const pa = proj[a], pb = proj[b];
        ln.setAttribute('x1', pa.sx.toFixed(1)); ln.setAttribute('y1', pa.sy.toFixed(1));
        ln.setAttribute('x2', pb.sx.toFixed(1)); ln.setAttribute('y2', pb.sy.toFixed(1));
        const lit = aIdx >= 0 && (a === aIdx || b === aIdx);
        const depth = ((pa.z + pb.z) / 2 + 1) / 2;
        ln.setAttribute('stroke', lit ? 'rgba(227,199,122,0.6)' : 'rgba(201,168,76,0.5)');
        ln.setAttribute('stroke-opacity', String(lit ? 0.6 : 0.08 + depth * 0.2));
        ln.setAttribute('stroke-width', lit ? '1.4' : '0.8');
      }
    };

    const frame = (ts: number) => {
      const dragging = pointers.current.size > 0;
      const idle = ts - lastInteract.current > 2400;
      if (!dragging) {
        rot.current.x += vel.current.x; rot.current.y += vel.current.y;
        vel.current.x *= 0.92; vel.current.y *= 0.92;
        if (Math.abs(vel.current.y) < 0.0005 && Math.abs(vel.current.x) < 0.0005 && idle) rot.current.y += 0.0015;
      }
      rot.current.x = Math.max(-1.15, Math.min(1.15, rot.current.x));
      project();
      raf = requestAnimationFrame(frame);
    };

    project();                              // correct first paint, rAF or not
    raf = requestAnimationFrame(frame);

    const onDown = (e: PointerEvent) => {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      dragDist.current = 0; vel.current = { x: 0, y: 0 }; lastInteract.current = performance.now();
      if (pointers.current.size === 2) {
        const [p1, p2] = [...pointers.current.values()];
        pinch.current = { dist: Math.hypot(p1.x - p2.x, p1.y - p2.y), zoom: zoom.current };
      }
    };
    const onMove = (e: PointerEvent) => {
      const prev = pointers.current.get(e.pointerId); if (!prev) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      lastInteract.current = performance.now();
      if (pointers.current.size >= 2 && pinch.current) {
        const [p1, p2] = [...pointers.current.values()];
        const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        zoom.current = Math.max(0.5, Math.min(3.4, pinch.current.zoom * d / pinch.current.dist));
        dragDist.current += 20;
        project();
        return;
      }
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y, k = 0.006;
      rot.current.y += dx * k; rot.current.x += dy * k;
      rot.current.x = Math.max(-1.15, Math.min(1.15, rot.current.x));
      vel.current = { x: dy * k, y: dx * k };
      dragDist.current += Math.abs(dx) + Math.abs(dy);
      project();
    };
    const onUp = (e: PointerEvent) => {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) pinch.current = null;
      lastInteract.current = performance.now();
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoom.current = Math.max(0.5, Math.min(3.4, zoom.current * (1 - e.deltaY * 0.0012)));
      lastInteract.current = performance.now();
      project();
    };

    wrap.addEventListener('pointerdown', onDown);
    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerup', onUp);
    wrap.addEventListener('pointercancel', onUp);
    wrap.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      cancelAnimationFrame(raf);
      wrap.removeEventListener('pointerdown', onDown);
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerup', onUp);
      wrap.removeEventListener('pointercancel', onUp);
      wrap.removeEventListener('wheel', onWheel);
    };
  }, [nodes, edgePairs]);

  return (
    <div ref={wrapRef} className="lib-sky3d" style={{ position: 'absolute', inset: 0, zIndex: 1, cursor: 'grab', touchAction: 'none' }}>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
        {edgePairs.map((_, e) => <line key={e} ref={el => { lineRefs.current[e] = el; }} stroke="rgba(201,168,76,0.16)" strokeWidth={0.8} />)}
      </svg>
      {nodes.map((n, i) => {
        const s = sizeFor(n.c.magnitude);
        const isActive = activeId === n.c.id;
        return (
          <button key={n.c.id} ref={el => { nodeRefs.current[i] = el; }}
            onClick={() => { if (dragDist.current < 6) onPick(n.c.id); }}
            className="lib-star3d"
            style={{ position: 'absolute', left: 0, top: 0, transform: 'translate(-50%,-50%)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 6, willChange: 'transform, opacity' }}>
            <span ref={el => { dotRefs.current[i] = el; }} style={{ width: s.dot, height: s.dot, borderRadius: '50%', background: isActive ? IVORY : GOLD_L, boxShadow: `0 0 ${isActive ? s.glow + 10 : s.glow}px ${s.spread}px rgba(201,168,76,0.5)`, willChange: 'transform' }} />
            <span ref={el => { labelRefs.current[i] = el; }} className="lib-star-label" style={{ fontFamily: SERIF, fontSize: s.label, color: isActive ? IVORY : GOLD, whiteSpace: 'nowrap', textShadow: '0 1px 8px rgba(0,0,0,0.85)' }}>{shortLabel(n.c.name)}</span>
          </button>
        );
      })}
    </div>
  );
}

function Observatory({ go, onDebate }: { go: (r: Room) => void; onDebate: (concept: string) => void }) {
  const [data, setData] = useState<ObsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  // On a phone the dossier rides up from the bottom as a sheet instead of
  // taking a side column; tapping a star opens it.
  const [dossierOpen, setDossierOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/library/observatory');
        const json = await res.json();
        if (!cancelled && res.ok) setData(json);
      } catch {
        /* empty sky handled below */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const concepts = data?.concepts ?? [];
  const active = concepts.find(c => c.id === activeId) || null;

  return (
    <main style={{ height: '100%', display: 'flex', minHeight: 0 }}>
      {/* sky */}
      <section style={{ flex: 1, position: 'relative', minWidth: 0, overflow: 'hidden', background: 'radial-gradient(ellipse 70% 70% at 40% 40%, rgba(20,30,62,0.5), transparent 70%)' }}>
        <div className="lib-obs-intro" style={{ position: 'absolute', top: 22, left: 28, zIndex: 3, maxWidth: 360, pointerEvents: 'none' }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: GOLD, marginBottom: 8 }}>The Observatory</div>
          <h1 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 30, lineHeight: 1.08, color: IVORY, margin: '0 0 6px' }}>A sky of what the corpus is working through</h1>
          <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, lineHeight: 1.45, color: MUTED, margin: 0 }}>Each star is a concept many thinkers touched; lines are where they share voices. Drag to turn it, scroll or pinch to zoom — then tap a star.</p>
        </div>

        {loading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, color: MUTED }}>Charting the sky…</div>}
        {!loading && concepts.length === 0 && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, color: MUTED }}>The sky is empty for now.</div>}

        {!loading && concepts.length > 0 && (
          <Sky3D concepts={concepts} edges={data?.edges ?? []} activeId={activeId} onPick={id => { setActiveId(id); setDossierOpen(true); }} />
        )}

        {/* mobile-only: surface the dossier sheet */}
        <button onClick={() => setDossierOpen(true)} className="lib-obs-toggle lib-mobile-only" style={{ position: 'absolute', left: '50%', bottom: 18, transform: 'translateX(-50%)', zIndex: 5, cursor: 'pointer', alignItems: 'center', gap: 8, background: 'rgba(12,20,40,0.92)', border: '1px solid rgba(201,168,76,0.35)', borderRadius: 999, padding: '10px 18px', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD, boxShadow: '0 6px 20px rgba(0,0,0,0.5)' }}>✶ What the corpus is thinking</button>
      </section>

      {dossierOpen && <div className="lib-drawer-scrim" onClick={() => setDossierOpen(false)} />}

      {/* dossier / recent */}
      <aside className={`lib-obs-dossier${dossierOpen ? ' open' : ''}`} style={{ width: 354, flexShrink: 0, borderLeft: '1px solid rgba(201,168,76,0.16)', background: 'linear-gradient(180deg,rgba(12,20,40,0.72),rgba(8,14,30,0.78))', overflowY: 'auto' }}>
        <button onClick={() => setDossierOpen(false)} className="lib-mobile-only" aria-label="Close" style={{ cursor: 'pointer', width: '100%', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 0 4px', fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: MUTED }}>↓ Close</button>
        {!active ? (
          <div className="lib-fade" style={{ padding: '26px 24px' }}>
            <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: GOLD, marginBottom: 4 }}>Lately, the corpus has been thinking about</div>
            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, color: MUTED, margin: '0 0 20px' }}>Updated as agents ingest, synthesize, and read the room.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {data?.recent.mostAsked.map((t, i) => <RecentCard key={`m${i}`} tag="Most-asked this week" dot={GOLD} text={cap(t)} />)}
              {data?.recent.tensions.map((t, i) => <RecentCard key={`t${i}`} tag="Open tension · awaiting review" dot="#d97a6a" text={t.title} />)}
              {data?.recent.newIngests.map((t, i) => <RecentCard key={`n${i}`} tag="New synthesis ingested" dot="#7a9a6a" text={t.title} />)}
              {data?.recent.gaps.map((t, i) => <RecentCard key={`g${i}`} tag="Coverage the corpus wants" dot="#6a8ad9" text={t} />)}
            </div>
          </div>
        ) : (
          <div className="lib-fade" style={{ padding: '26px 24px' }}>
            <button onClick={() => setActiveId(null)} className="lib-back" style={{ cursor: 'pointer', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED, marginBottom: 18 }}>← All the corpus is thinking</button>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD, marginBottom: 8 }}>A concept across the corpus</div>
            <h2 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 27, lineHeight: 1.08, color: IVORY, margin: '0 0 14px' }}>{cap(active.name)}</h2>

            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: MUTED, marginBottom: 10 }}>Voices that touch it · {active.voices.length}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 22 }}>
              {active.voices.map(v => (
                <span key={v} style={{ fontFamily: SERIF, fontSize: 15, color: IVORY, background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.24)', borderRadius: 999, padding: '5px 13px' }}>{v}</span>
              ))}
            </div>

            {active.synthesis?.divergence && (
              <div style={{ background: 'rgba(255,80,80,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 12, padding: '16px 17px', marginBottom: 16 }}>
                <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, marginBottom: 8 }}>Where the thinkers diverge</div>
                <p style={{ fontFamily: SERIF, fontSize: 16, lineHeight: 1.55, color: TEXT, margin: 0 }}>{active.synthesis.divergence}</p>
              </div>
            )}
            {active.synthesis?.excerpt ? (
              <div style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 12, padding: '16px 17px', marginBottom: 22 }}>
                <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: GOLD, marginBottom: 8 }}>From the corpus synthesis {active.synthesis.status === 'pending_review' ? '· forming' : ''}</div>
                <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 16.5, lineHeight: 1.55, color: IVORY, margin: 0 }}>{active.synthesis.excerpt}</p>
              </div>
            ) : (
              <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, lineHeight: 1.5, color: MUTED, margin: '0 0 22px' }}>The corpus has gathered passages here but has not yet written across them. Stage a debate and watch the voices contend.</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <button onClick={() => onDebate(active.name)} className="lib-discuss" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 11, padding: 12, cursor: 'pointer', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: GOLD }}>Stage a debate on this →</button>
              <button onClick={() => go('reading')} className="lib-related" style={{ background: 'none', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 11, padding: 12, cursor: 'pointer', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED }}>Read the sources →</button>
            </div>
          </div>
        )}
      </aside>
    </main>
  );
}

function RecentCard({ tag, dot, text }: { tag: string; dot: string; text: string }) {
  return (
    <div style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.16)', borderRadius: 12, padding: '16px 17px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot }} />
        <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: GOLD }}>{tag}</span>
      </div>
      <p style={{ fontFamily: SERIF, fontSize: 16, lineHeight: 1.5, color: TEXT, margin: 0 }}>{text}</p>
    </div>
  );
}

/* ========================= ambient motes + CSS ========================= */
const MOTES = [
  { l: '12%', t: '22%', s: 2, c: 'rgba(244,234,213,0.5)', a: 'lib-drift-a', d: 22, delay: 0 },
  { l: '28%', t: '64%', s: 3, c: 'rgba(201,168,76,0.45)', a: 'lib-drift-b', d: 28, delay: 0 },
  { l: '44%', t: '18%', s: 2, c: 'rgba(244,234,213,0.35)', a: 'lib-drift-c', d: 25, delay: 0 },
  { l: '62%', t: '74%', s: 2, c: 'rgba(244,234,213,0.4)', a: 'lib-drift-a', d: 30, delay: 2 },
  { l: '78%', t: '30%', s: 3, c: 'rgba(201,168,76,0.4)', a: 'lib-drift-b', d: 24, delay: 1 },
  { l: '88%', t: '58%', s: 2, c: 'rgba(244,234,213,0.3)', a: 'lib-drift-c', d: 27, delay: 3 },
  { l: '18%', t: '84%', s: 2, c: 'rgba(201,168,76,0.4)', a: 'lib-drift-a', d: 26, delay: 4 },
  { l: '54%', t: '46%', s: 2, c: 'rgba(244,234,213,0.35)', a: 'lib-drift-b', d: 32, delay: 2 },
  { l: '70%', t: '12%', s: 2, c: 'rgba(244,234,213,0.3)', a: 'lib-drift-a', d: 31, delay: 3 },
];

const LIB_CSS = `
@keyframes lib-drift-a { 0%{transform:translate(0,0)} 50%{transform:translate(26px,-34px)} 100%{transform:translate(0,0)} }
@keyframes lib-drift-b { 0%{transform:translate(0,0)} 50%{transform:translate(-30px,-20px)} 100%{transform:translate(0,0)} }
@keyframes lib-drift-c { 0%{transform:translate(0,0)} 50%{transform:translate(18px,28px)} 100%{transform:translate(0,0)} }
@keyframes lib-flicker { 0%,100%{opacity:1;box-shadow:0 0 14px 1px rgba(201,168,76,0.7)} 45%{opacity:0.78} 70%{opacity:1;box-shadow:0 0 18px 2px rgba(201,168,76,0.85)} }
@keyframes lib-marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
@keyframes lib-pulse-dot { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(201,168,76,0.5)} 50%{opacity:0.55;box-shadow:0 0 0 5px rgba(201,168,76,0)} }
@keyframes lib-star-pulse { 0%,100%{opacity:0.55;transform:scale(1)} 50%{opacity:1;transform:scale(1.18)} }
@keyframes lib-fade-in { 0%{transform:translateY(10px) scale(0.98);opacity:0} 100%{transform:translateY(0) scale(1);opacity:1} }
@keyframes lib-dots { 0%,60%,100%{opacity:0.2;transform:scale(0.8)} 30%{opacity:1;transform:scale(1)} }
@keyframes lib-surface { 0%{transform:translateY(14px);opacity:0} 100%{transform:translateY(0);opacity:1} }
.lib-fade > * { animation: lib-surface 0.6s cubic-bezier(.2,.8,.2,1) both; }
button { background: none; border: none; font: inherit; }
.lib-nav-btn:hover { color: #c9a84c !important; }
.lib-doorway:hover { border-color: #c9a84c !important; transform: translateY(-4px); transition: border-color .35s, transform .35s; }
.lib-card { transition: border-color .3s, transform .3s; }
.lib-card:hover { border-color: #c9a84c !important; transform: translateY(-3px); }
.lib-master:hover { border-color: rgba(201,168,76,0.4) !important; }
.lib-related:hover, .lib-readnext:hover { border-color: #c9a84c !important; background: rgba(201,168,76,0.1) !important; }
.lib-suggest:hover { background: rgba(201,168,76,0.13) !important; border-color: rgba(201,168,76,0.5) !important; color: #f4ead5 !important; }
.lib-debate-q:hover { background: rgba(201,168,76,0.12) !important; border-color: rgba(201,168,76,0.5) !important; }
.lib-discuss:hover { background: rgba(201,168,76,0.18) !important; }
.lib-back:hover { color: #c9a84c !important; }
.lib-sendbtn:hover { background: #e3c77a !important; }
.lib-page-btn:hover:not(:disabled) { background: rgba(201,168,76,0.16) !important; }
.lib-reset:hover span:nth-child(3) { color: #c9a84c; }

/* ---- responsive: phones & small tablets ---- */
.lib-mobile-only { display: none; }
.lib-drawer-scrim { display: none; }
@media (max-width: 760px) {
  .lib-mobile-only { display: flex !important; }

  /* topbar stacks: logo row over a centered nav row; live status hidden */
  .lib-topbar { flex-direction: column !important; height: auto !important; gap: 8px !important; padding: 10px 14px !important; align-items: stretch !important; }
  .lib-topbar .lib-reset { justify-content: center; }
  .lib-logo-sub { display: none !important; }
  .lib-nav { width: 100%; justify-content: center !important; flex-wrap: wrap; gap: 2px !important; }
  .lib-nav .lib-nav-btn { padding: 6px 9px !important; font-size: 9px !important; letter-spacing: 0.12em !important; }
  .lib-status { display: none !important; }

  /* atrium */
  .lib-atrium-pad { padding: 36px 18px 22px !important; }
  .lib-doorways { grid-template-columns: 1fr !important; gap: 14px !important; }

  /* reading room: reader stacks, related column flows below the text */
  .lib-reading-pad { padding: 30px 18px 50px !important; }
  .lib-reader-grid { grid-template-columns: 1fr !important; padding: 22px 18px 50px !important; gap: 24px !important; }
  .lib-reader-aside { position: static !important; }

  /* shared drawer backdrop */
  .lib-drawer-scrim { display: block; position: fixed; inset: 0; z-index: 39; background: rgba(4,8,18,0.62); backdrop-filter: blur(2px); }

  /* symposium: masters rail slides in from the left */
  .lib-masters-rail { position: fixed !important; top: 0; left: 0; bottom: 0; z-index: 40 !important; width: 82% !important; max-width: 290px !important; transform: translateX(-100%); transition: transform .3s ease; box-shadow: 0 0 40px rgba(0,0,0,0.6); }
  .lib-masters-rail.open { transform: translateX(0); }

  /* observatory: dossier rises from the bottom as a sheet */
  .lib-obs-intro { max-width: 78% !important; top: 14px !important; left: 16px !important; }
  .lib-obs-intro h1 { font-size: 22px !important; }
  .lib-obs-dossier { position: fixed !important; left: 0; right: 0; bottom: 0; width: auto !important; max-height: 80vh; z-index: 40 !important; border-left: none !important; border-top: 1px solid rgba(201,168,76,0.3) !important; border-radius: 18px 18px 0 0; transform: translateY(100%); transition: transform .3s ease; box-shadow: 0 -12px 44px rgba(0,0,0,0.6); }
  .lib-obs-dossier.open { transform: translateY(0); }

}
.lib-sky3d:active { cursor: grabbing; }
.lib-star3d:hover .lib-star-label { color: #f4ead5 !important; }
`;

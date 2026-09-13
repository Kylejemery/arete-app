const { EssayIndexCard, GoldRule, Kicker } = window.AreteDS;

const ESSAYS = [
  { id: 1, title: 'On being early to everything', author: 'Nadia Oyelaran', meta: 'Sep 12 · 9 min', tags: ['Habit', 'Time'], kicker: 'Essay',
    excerpt: 'I arrive twenty minutes before I need to, and I have started to suspect it is not politeness.' },
  { id: 2, title: 'What I stopped arguing about', author: 'Tomas Ruiz', meta: 'Sep 9 · 6 min', tags: ['Anger'], kicker: 'Essay',
    excerpt: 'A list of seven things, and the year I gave each of them up.' },
  { id: 3, title: 'The letter I did not send for nine days', author: 'Kyle', meta: 'Sep 6 · 4 min', tags: ['Family', 'Delay'], kicker: 'Answered by Epictetus',
    excerpt: 'I told myself I was waiting for a calmer hour. I have counted the hours since.' },
  { id: 4, title: 'Reading slowly, on purpose', author: 'Hana Sørensen', meta: 'Sep 2 · 11 min', tags: ['Reading'], kicker: 'Essay',
    excerpt: 'Forty pages a week is not a limit. It is the amount I can still argue with by Friday.' },
  { id: 5, title: 'Against the phrase work life balance', author: 'Ruth Adeyemi', meta: 'Aug 28 · 7 min', tags: ['Work'], kicker: 'From the editor',
    excerpt: 'Two nouns and a scale, and none of the three describe how a day is actually spent.' }
];

const TOPICS = ['Habit', 'Time', 'Anger', 'Family', 'Reading', 'Work', 'Death', 'Delay'];

function AgoraIndex({ onOpen, onSubmit, onTag }) {
  return (
    <div style={{ padding: '56px 48px 64px' }}>
      <div style={{ maxWidth: 640, marginBottom: 40 }}>
        <Kicker variant="eyebrow" style={{ color: 'var(--gold-70)' }}>The Agora</Kicker>
        <h1 style={{ fontFamily: 'var(--font-serif-academy)', fontSize: 46, fontWeight: 400, color: '#f5edd6', lineHeight: 1.14, margin: '10px 0 0' }}>
          Essays by readers, open to argument
        </h1>
        <GoldRule />
        <p style={{ fontSize: 16, lineHeight: 1.65, color: '#e8d9b0', margin: '0 0 22px' }}>
          Anyone who subscribes can submit. An editor reads every essay before it appears.
          Reading is free. Commenting is not.
        </p>
        <div onClick={onSubmit} style={{
          display: 'inline-block', border: '1px solid var(--gold)', color: 'var(--gold)',
          padding: '12px 28px', fontSize: 12, fontWeight: 600, letterSpacing: '0.15em',
          textTransform: 'uppercase', cursor: 'pointer'
        }}>Submit an essay</div>
      </div>

      <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {ESSAYS.map(e => <EssayIndexCard key={e.id} {...e} onClick={() => onOpen(e)} />)}
        </div>
        <div style={{ width: 200, flex: 'none' }}>
          <Kicker variant="eyebrow" style={{ color: 'var(--gold-70)', marginBottom: 16 }}>Topics</Kicker>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {TOPICS.map(t => (
              <span key={t} onClick={() => onTag(t)} style={{
                fontSize: 14, color: '#e8d9b0', cursor: 'pointer',
                borderBottom: '1px solid #1e3258', paddingBottom: 8
              }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { AgoraIndex, WEB_ESSAYS: ESSAYS, WEB_TOPICS: TOPICS });

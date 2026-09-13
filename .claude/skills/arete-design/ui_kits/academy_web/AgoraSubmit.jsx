const { AcademyButton, SubmissionNotice, GoldRule, Kicker } = window.AreteDS;

const TOPICS = ['Habit', 'Time', 'Anger', 'Family', 'Reading', 'Work', 'Death', 'Delay'];

const field = {
  width: '100%', background: '#0f1e38', border: '1px solid #1e3258', borderRadius: 2,
  padding: '14px 16px', color: '#f5edd6', fontFamily: 'var(--font-ui)', fontSize: 15, outline: 'none'
};

function AgoraSubmit({ onBack }) {
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [tags, setTags] = React.useState([]);
  const [sent, setSent] = React.useState(false);
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  return (
    <div style={{ padding: '56px 48px 72px', maxWidth: 760 }}>
      <div onClick={onBack} style={{
        fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase',
        color: 'var(--gold)', cursor: 'pointer', marginBottom: 28
      }}>&larr; The Agora</div>
      <Kicker variant="eyebrow" style={{ color: 'var(--gold-70)' }}>Submit</Kicker>
      <h1 style={{ fontFamily: 'var(--font-serif-academy)', fontSize: 40, fontWeight: 400, color: '#f5edd6', lineHeight: 1.15, margin: '10px 0 0' }}>
        Write for the Agora
      </h1>
      <GoldRule width={48} />
      <p style={{ fontSize: 16, lineHeight: 1.65, color: '#e8d9b0', maxWidth: 600, margin: '0 0 32px' }}>
        Say the true thing plainly. Essays run from eight hundred to three thousand words.
        An editor reads every submission before it appears, usually within a week.
      </p>

      <SubmissionNotice state={sent ? 'pending' : 'draft'} style={{ marginBottom: 28, maxWidth: 600, background: '#111d30', borderRadius: 2 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 600 }}>
        <div>
          <Kicker variant="eyebrow" style={{ color: 'var(--gold-70)', marginBottom: 10 }}>Title</Kicker>
          <input value={title} onChange={e => setTitle(e.target.value)} style={field} placeholder="On being early to everything" />
        </div>
        <div>
          <Kicker variant="eyebrow" style={{ color: 'var(--gold-70)', marginBottom: 10 }}>Essay</Kicker>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={12}
            style={{ ...field, resize: 'none', lineHeight: 1.7, fontSize: 16 }}
            placeholder="Begin where the thought actually started." />
          <div style={{ fontSize: 11, color: '#4a5a70', textAlign: 'right', marginTop: 6 }}>{words} words</div>
        </div>
        <div>
          <Kicker variant="eyebrow" style={{ color: 'var(--gold-70)', marginBottom: 12 }}>Topics</Kicker>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {TOPICS.map(t => {
              const on = tags.includes(t);
              return (
                <span key={t} onClick={() => setTags(s => s.includes(t) ? s.filter(x => x !== t) : [...s, t])} style={{
                  padding: '7px 14px', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase',
                  cursor: 'pointer',
                  border: '1px solid ' + (on ? 'var(--gold)' : '#1e3258'),
                  background: on ? 'var(--gold-13)' : 'transparent',
                  color: on ? 'var(--gold)' : '#7a8fa6'
                }}>{t}</span>
              );
            })}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <AcademyButton onClick={() => setSent(true)}>{sent ? 'Submitted' : 'Submit for review'}</AcademyButton>
          <AcademyButton variant="outline" onClick={onBack}>Save draft</AcademyButton>
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { AgoraSubmit });

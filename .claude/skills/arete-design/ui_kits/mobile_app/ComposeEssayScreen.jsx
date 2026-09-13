const { Kicker, Button, Input, Chip, SubmissionNotice, Icon } = window.AreteDS;

const TOPICS = ['Habit', 'Time', 'Anger', 'Family', 'Reading', 'Work', 'Death', 'Delay'];

function ComposeEssayScreen({ onBack }) {
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [tags, setTags] = React.useState(['Habit']);
  const [state, setState] = React.useState('draft');
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  return (
    <div style={{ flex: 1, padding: '52px 25px 25px', overflowY: 'auto' }}>
      <div onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gold)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 20 }}>
        <span style={{ transform: 'rotate(180deg)', display: 'flex' }}><Icon name="chevronForward" size={16} /></span>The Agora
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--gold)', marginBottom: 4 }}>Write an essay</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 22 }}>Say the true thing plainly. An editor reads it before it appears.</div>

      <SubmissionNotice state={state} style={{ marginBottom: 20 }} />

      <Kicker style={{ marginBottom: 8 }}>Title</Kicker>
      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="On being early to everything" style={{ marginBottom: 20 }} />

      <Kicker style={{ marginBottom: 8 }}>Essay</Kicker>
      <Input multiline rows={9} value={body} onChange={e => setBody(e.target.value)}
        placeholder="Begin where the thought actually started." style={{ marginBottom: 6 }} />
      <div style={{ fontSize: 11, color: 'var(--faint)', textAlign: 'right', marginBottom: 20 }}>{words} words</div>

      <Kicker style={{ marginBottom: 10 }}>Topics</Kicker>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {TOPICS.map(t => (
          <Chip key={t} active={tags.includes(t)}
            onClick={() => setTags(s => s.includes(t) ? s.filter(x => x !== t) : [...s, t])}>{t}</Chip>
        ))}
      </div>

      <Button fullWidth disabled={!title.trim() || words < 1 || state === 'pending'}
        onClick={() => setState('pending')}>
        {state === 'pending' ? 'Submitted for review' : 'Submit for review'}
      </Button>
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 14, cursor: 'pointer' }} onClick={onBack}>Save draft</div>
    </div>
  );
}
Object.assign(window, { ComposeEssayScreen });

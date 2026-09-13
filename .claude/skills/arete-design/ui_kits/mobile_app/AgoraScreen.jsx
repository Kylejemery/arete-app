const { ScreenHeader, IconButton, Icon, SearchBar, Chip, EssayRow, Kicker } = window.AreteDS;

const ESSAYS = [
  { id: 1, title: 'On being early to everything', author: 'Nadia Oyelaran', meta: 'Sep 12 · 9 min', comments: 14, tags: ['Habit', 'Time'], counselor: 'Seneca',
    excerpt: 'I arrive twenty minutes before I need to, and I have started to suspect it is not politeness.' },
  { id: 2, title: 'What I stopped arguing about', author: 'Tomas Ruiz', meta: 'Sep 9 · 6 min', comments: 3, tags: ['Anger'],
    excerpt: 'A list of seven things, and the year I gave each of them up.' },
  { id: 3, title: 'The letter I did not send for nine days', author: 'Kyle', meta: 'Sep 6 · 4 min', comments: 21, tags: ['Family', 'Delay'], counselor: 'Epictetus',
    excerpt: 'I told myself I was waiting for a calmer hour. I have counted the hours since.' },
  { id: 4, title: 'Reading slowly, on purpose', author: 'Hana Sørensen', meta: 'Sep 2 · 11 min', comments: 8, tags: ['Reading'],
    excerpt: 'Forty pages a week is not a limit. It is the amount I can still argue with by Friday.' }
];

function AgoraScreen({ onOpen, onWrite }) {
  const [filter, setFilter] = React.useState('All');
  const list = filter === 'All' ? ESSAYS
    : filter === 'Answered' ? ESSAYS.filter(e => e.counselor)
    : filter === 'Yours' ? ESSAYS.filter(e => e.author === 'Kyle')
    : ESSAYS;
  return (
    <div style={{ flex: 1, padding: '52px 16px 20px', overflowY: 'auto' }}>
      <ScreenHeader title="The Agora" subtitle="Essays by readers, open to argument"
        right={<IconButton variant="header" size={40} onClick={onWrite}><Icon name="add" /></IconButton>}
        style={{ marginBottom: 14 }} />
      <SearchBar placeholder="Search the Agora" style={{ marginBottom: 12 }} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {['All', 'Newest', 'Answered', 'Yours'].map(c =>
          <Chip key={c} active={c === filter} onClick={() => setFilter(c)}>{c}</Chip>)}
      </div>
      <Kicker dim style={{ marginBottom: 10 }}>{list.length} essays</Kicker>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.map(e => <EssayRow key={e.id} {...e} onClick={() => onOpen(e)} />)}
      </div>
      <div style={{ textAlign: 'center', fontSize: 13, fontStyle: 'italic', color: 'var(--muted)', margin: '22px 0 0' }}>
        Every essay is read by an editor before it appears.
      </div>
    </div>
  );
}
Object.assign(window, { AgoraScreen, AGORA_ESSAYS: ESSAYS });

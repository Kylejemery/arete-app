const { ScreenHeader, IconButton, Icon, UnderlineTabs, ChatBubble, TypingIndicator, Composer, CounselorCard, CounselorRow, CabinetPill } = window.AreteDS;

const COUNSELORS = [
  { name: 'Marcus Aurelius', category: 'stoics', level: 'direct', blurb: 'Emperor who wrote to himself at night about how to be a decent man by morning.' },
  { name: 'Seneca', category: 'stoics', level: 'firm', blurb: 'Rich, compromised, honest about both. Letters to a friend who was trying.' },
  { name: 'Epictetus', category: 'stoics', level: 'direct', blurb: 'Born a slave, taught freedom. Nothing softened on the way out.' },
  { name: 'Future Self', category: 'spiritual', level: 'gentle', alwaysPresent: true, blurb: 'The person you are becoming, who already knows how this turns out.' },
  { name: 'Musashi', category: 'warriors', level: 'direct', locked: true, blurb: 'No wasted motion. The way is in training.' },
  { name: 'Marie Curie', category: 'builders', level: 'firm', locked: true, blurb: 'Two Nobels, no self-pity. The work was the point.' }
];

function CabinetScreen({ messages, onSend, thinking, selected, onToggleCounselor, onNewSession }) {
  const [tab, setTab] = React.useState('Cabinet');
  const [draft, setDraft] = React.useState('');
  const send = () => { if (draft.trim()) { onSend(draft.trim()); setDraft(''); } };
  return (
    <React.Fragment>
      <div style={{ padding: '52px 20px 14px', borderBottom: '1px solid var(--gold-13)', flex: 'none' }}>
        <ScreenHeader title="The Cabinet" subtitle="Your counselors, in session"
          smallCaps={selected.join(' · ')}
          right={<IconButton variant="header" size={40} onClick={onNewSession}><Icon name="add" /></IconButton>} />
      </div>
      <UnderlineTabs items={['Cabinet', 'Counselors', 'Sessions']} value={tab} onChange={setTab} style={{ flex: 'none' }} />
      {tab === 'Cabinet' && (
        <React.Fragment>
          <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
            {messages.map((m, i) => <ChatBubble key={i} from={m.from} speaker={m.speaker}>{m.text}</ChatBubble>)}
            {thinking && <TypingIndicator speaker={thinking} />}
          </div>
          <Composer value={draft} onChange={e => setDraft(e.target.value)} onSend={send} disabled={!draft.trim()} style={{ flex: 'none' }} />
        </React.Fragment>
      )}
      {tab === 'Counselors' && (
        <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            {selected.map(n => <CabinetPill key={n} active={n === 'Future Self'}>{n}</CabinetPill>)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {COUNSELORS.map(c => (
              <CounselorCard key={c.name} {...c} style={{ width: '100%' }}
                selected={selected.includes(c.name)}
                onClick={() => onToggleCounselor(c.name)} />
            ))}
          </div>
        </div>
      )}
      {tab === 'Sessions' && (
        <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          {[['Marcus Aurelius', 'Stoic · direct'], ['Seneca', 'Stoic · firm'], ['Epictetus', 'Stoic · direct'], ['Future Self', 'Always present · gentle']]
            .map(([n, m]) => <CounselorRow key={n} name={n} meta={m} />)}
          <div style={{ textAlign: 'center', fontSize: 13, fontStyle: 'italic', color: 'var(--muted)', marginTop: 20 }}>
            Older sessions are kept in the Library.
          </div>
        </div>
      )}
    </React.Fragment>
  );
}
Object.assign(window, { CabinetScreen, COUNSELORS });

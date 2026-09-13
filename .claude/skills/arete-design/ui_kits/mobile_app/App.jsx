const { PhoneFrame, TabBar, SidePanel, MenuRow, BottomSheet, Input, Button, ScreenHeader, QuoteCard, Card, Kicker, Icon } = window.AreteDS;

const REPLIES = [
  { speaker: 'Marcus Aurelius', text: 'You call it putting off. I would call it rehearsing his reaction, which is not yours to script. Say the true thing plainly, then let him be who he is.' },
  { speaker: 'Seneca', text: 'And notice how much of the day the unsent sentence has already cost you.' },
  { speaker: 'Epictetus', text: 'Ask which part of this is up to you. The sentence is. The answer never was.' },
  { speaker: 'Future Self', text: 'I remember this week. You called on Thursday. It was shorter than you feared.' }
];

function EveningSheet({ onClose }) {
  const [text, setText] = React.useState('');
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 15, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'var(--scrim-sheet)' }}>
      <div style={{ position: 'absolute', inset: 0 }} onClick={onClose}></div>
      <BottomSheet title="Evening reflection" subtitle="What did you avoid today?" style={{ background: 'transparent', paddingTop: 0, position: 'relative' }}>
        <Input multiline rows={4} value={text} onChange={e => setText(e.target.value)} placeholder="Write plainly." />
        <Button size="md" fullWidth onClick={onClose}>Close the day</Button>
        <div onClick={onClose} style={{ textAlign: 'center', fontSize: 15, color: 'var(--muted)', cursor: 'pointer' }}>Cancel</div>
      </BottomSheet>
    </div>
  );
}

function ProgressScreen() {
  return (
    <div style={{ flex: 1, padding: '52px 20px 20px', overflowY: 'auto' }}>
      <ScreenHeader title="Progress" subtitle="The chain, and what it has made of you" style={{ marginBottom: 18 }} />
      <Card padding={24} style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 52, fontWeight: 700, color: 'var(--gold)', lineHeight: '56px' }}>14</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>day streak</div>
          <div style={{ fontSize: 12, color: 'var(--dim)', fontStyle: 'italic', marginTop: 3 }}>Keep the chain unbroken</div>
        </div>
      </Card>
      <Card border="hairline" style={{ marginBottom: 16 }}>
        <Kicker style={{ marginBottom: 10 }}>Longest run</Kicker>
        <div style={{ fontSize: 15, color: 'var(--text-body)' }}>31 days, ending in March. You stopped the week you travelled.</div>
      </Card>
      <QuoteCard glyph={false} icon={<Icon name="trophy" />}
        quote="No man is crushed by misfortune unless he has first been deceived by prosperity." />
    </div>
  );
}

function ScrollsScreen() {
  return (
    <div style={{ flex: 1, padding: '52px 20px 20px', overflowY: 'auto' }}>
      <ScreenHeader title="Scrolls" subtitle="Letters written to you" style={{ marginBottom: 18 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Card background="var(--surface-raised)" style={{ borderColor: 'var(--gold-33)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--gold)' }}>Dispatch from Seneca</span>
            <span style={{ fontSize: 11, color: 'var(--faint)' }}>Today</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: '22px', marginBottom: 4 }}>On borrowed time</div>
          <div style={{ fontSize: 14, lineHeight: '21px', color: 'var(--text-soft)' }}>You asked for patience. I will give you arithmetic instead: you have spent nine days waiting for a calmer hour.</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', textAlign: 'right', marginTop: 10 }}>Read more</div>
        </Card>
        <Card border="hairline" padding={16}>
          <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--muted)', lineHeight: '20px' }}>Nothing else this week. Request a scroll from any counselor.</div>
        </Card>
      </div>
    </div>
  );
}

function App() {
  const [tab, setTab] = React.useState('home');
  const [agora, setAgora] = React.useState(null);
  const [menu, setMenu] = React.useState(false);
  const [evening, setEvening] = React.useState(false);
  const [paywall, setPaywall] = React.useState(false);
  const [routine, setRoutine] = React.useState('evening');
  const [selected, setSelected] = React.useState(['Marcus Aurelius', 'Seneca', 'Epictetus', 'Future Self']);
  const [thinking, setThinking] = React.useState(null);
  const [messages, setMessages] = React.useState([
    { from: 'user', text: 'I keep putting off the conversation with my brother.' },
    { from: 'counselor', speaker: 'Marcus Aurelius', text: REPLIES[0].text },
    { from: 'counselor', speaker: 'Future Self', text: REPLIES[3].text }
  ]);
  const [tasks, setTasks] = React.useState([
    { id: 1, title: 'Cold shower', done: true },
    { id: 2, title: 'Ten minutes of stillness', done: true },
    { id: 3, title: 'Read 20 pages of Meditations', note: 'Book II' },
    { id: 4, title: 'Walk before the phone' }
  ]);

  const send = text => {
    setMessages(m => [...m, { from: 'user', text }]);
    const pool = REPLIES.filter(r => selected.includes(r.speaker));
    const reply = pool[Math.floor(Math.random() * pool.length)] || REPLIES[0];
    setThinking(reply.speaker);
    setTimeout(() => {
      setThinking(null);
      setMessages(m => [...m, { from: 'counselor', speaker: reply.speaker, text: reply.text }]);
    }, 1400);
  };

  const toggleCounselor = name => {
    if (name === 'Future Self') return;
    const locked = ['Musashi', 'Marie Curie'];
    if (locked.includes(name)) { setPaywall(true); return; }
    setSelected(s => s.includes(name) ? s.filter(n => n !== name) : [...s, name]);
  };

  const screens = {
    home: <HomeScreen routine={routine} setRoutine={setRoutine} onMenu={() => setMenu(true)}
      onEvening={() => setEvening(true)} onOpenPrompt={() => setEvening(true)} />,
    morning: <MorningScreen tasks={tasks}
      onToggle={id => setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t))}
      onAdd={title => setTasks(ts => [...ts, { id: Date.now(), title }])} />,
    evening: <ScrollsScreen />,
    cabinet: <CabinetScreen messages={messages} onSend={send} thinking={thinking} selected={selected}
      onToggleCounselor={toggleCounselor} onNewSession={() => setMessages([])} />,
    journal: <JournalScreen />,
    focus: <FocusScreen />,
    scrolls: <ScrollsScreen />,
    progress: <ProgressScreen />,
    agora: <AgoraScreen onOpen={e => setAgora(e)} onWrite={() => setTab('compose')} />,
    compose: <ComposeEssayScreen onBack={() => setTab('agora')} />
  };

  return (
    <PhoneFrame minHeight={780} style={{ height: 780 }}>
      {agora
        ? <EssayScreen essay={agora} onBack={() => setAgora(null)} subscriber={false} onUnlock={() => setPaywall(true)} />
        : screens[tab]}
      <TabBar value={['agora', 'compose'].includes(tab) ? 'scrolls' : tab} onChange={t => { setAgora(null); setTab(t); }} />
      {menu && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 18, display: 'flex', justifyContent: 'flex-end', background: 'var(--scrim)' }}>
          <div style={{ position: 'absolute', inset: 0 }} onClick={() => setMenu(false)}></div>
          <SidePanel footer="Build 89" onClose={() => setMenu(false)} style={{ position: 'relative', width: 280, borderRadius: 0, height: '100%' }}>
            <MenuRow icon="book" title="Know Thyself" subtitle="Your philosophical portrait" onClick={() => { setMenu(false); setTab('progress'); }} />
            <MenuRow icon="library" title="Library" subtitle="Read with the texts" onClick={() => { setMenu(false); setTab('focus'); }} />
            <MenuRow icon="mic" title="My Cabinet" subtitle="Choose your counselors" onClick={() => { setMenu(false); setTab('cabinet'); }} />
            <MenuRow icon="newspaper" title="The Agora" subtitle="Essays by readers, open to argument" onClick={() => { setMenu(false); setAgora(null); setTab('agora'); }} />
            <MenuRow icon="trophy" title="Weekly review" subtitle="Sunday, with your counselors" onClick={() => { setMenu(false); setPaywall(true); }} last />
          </SidePanel>
        </div>
      )}
      {evening && <EveningSheet onClose={() => setEvening(false)} />}
      {paywall && <PaywallScreen onClose={() => setPaywall(false)} />}
    </PhoneFrame>
  );
}
Object.assign(window, { App, EveningSheet, ProgressScreen, ScrollsScreen });

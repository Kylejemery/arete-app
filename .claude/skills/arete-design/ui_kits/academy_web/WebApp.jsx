const { GlassCard, GoldGradientText, Kicker, Icon, IconButton } = window.AreteDS;

const SESSIONS = [
  ['Tuesday', 'On the conversation you keep rehearsing'],
  ['Sunday', 'Whether the draft is finished or merely polished'],
  ['Last week', 'The calmer hour that has not arrived']
];

function WebApp() {
  const [draft, setDraft] = React.useState('');
  const [turns, setTurns] = React.useState([
    { speaker: 'Marcus Aurelius', text: 'Confine yourself to the present.' },
    { from: 'user', text: 'How, when the calendar is next week?' },
    { speaker: 'Seneca', text: 'Next week is a rumour. The sentence you owe your brother is not.' }
  ]);
  const send = () => {
    if (!draft.trim()) return;
    setTurns(t => [...t, { from: 'user', text: draft.trim() }]);
    setDraft('');
    setTimeout(() => setTurns(t => [...t, { speaker: 'Epictetus', text: 'Which part of that was ever up to you? Begin there and the rest becomes weather.' }]), 900);
  };
  return (
    <div style={{ display: 'flex', minHeight: 700 }}>
      <div style={{ width: 260, borderRight: '1px solid rgba(255,255,255,0.08)', padding: '32px 24px', flex: 'none' }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '3px', color: 'var(--gold)', marginBottom: 28 }}>ARETE</div>
        <Kicker dim style={{ marginBottom: 12 }}>Sessions</Kicker>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {SESSIONS.map(([when, title], i) => (
            <div key={title} style={{ cursor: 'pointer', paddingLeft: 10, borderLeft: '2px solid ' + (i === 0 ? 'var(--gold)' : 'transparent') }}>
              <div style={{ fontSize: 11, color: '#9aa0a6', letterSpacing: '0.5px' }}>{when}</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: '#e6eef8', lineHeight: 1.35 }}>{title}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, padding: '32px 40px', maxWidth: 720 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, color: '#e6eef8', lineHeight: 1.1, marginBottom: 6 }}>
          The Cabinet, <GoldGradientText>replayed</GoldGradientText>
        </div>
        <div style={{ fontSize: 13, color: '#9aa0a6', marginBottom: 24 }}>Your sessions, on the web.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {turns.map((t, i) => t.from === 'user' ? (
            <GlassCard key={i} tint="gold" style={{ marginLeft: 'auto', maxWidth: '78%' }}>
              <div style={{ fontSize: 14, lineHeight: 1.5, color: '#e6eef8' }}>{t.text}</div>
            </GlassCard>
          ) : (
            <GlassCard key={i} style={{ maxWidth: '85%' }}>
              <Kicker style={{ letterSpacing: '0.5px', marginBottom: 6 }}>{t.speaker}</Kicker>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: 1.5, color: '#e6eef8' }}>{t.text}</div>
            </GlassCard>
          ))}
        </div>
        <div style={{
          display: 'flex', gap: 10, alignItems: 'center',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 'var(--r-panel)', padding: 10, backdropFilter: 'blur(12px)'
        }}>
          <input value={draft} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send(); }}
            placeholder="Speak to your cabinet" style={{
              flex: 1, background: 'none', border: 'none', outline: 'none', padding: '4px 8px',
              fontFamily: 'var(--font-ui)', fontSize: 15, color: '#e6eef8'
            }} />
          <IconButton variant="gold" onClick={send} disabled={!draft.trim()}><Icon name="send" /></IconButton>
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { WebApp });

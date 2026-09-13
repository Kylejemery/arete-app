const { ScreenHeader, SegmentedTabs, Card, IconButton, Icon, Kicker } = window.AreteDS;

function FocusScreen() {
  const [tab, setTab] = React.useState('Read');
  const [running, setRunning] = React.useState(false);
  const [left, setLeft] = React.useState(25 * 60);
  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setLeft(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [running]);
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return (
    <div style={{ flex: 1, padding: '52px 20px 20px', overflowY: 'auto' }}>
      <ScreenHeader title="Focus" style={{ marginBottom: 16 }} />
      <SegmentedTabs items={['Read', 'Books', 'History']} value={tab} onChange={setTab} style={{ marginBottom: 20 }} />
      <Card border="hairline" padding={14} radius="var(--r-card)"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Today</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold)' }}>1h 12m</span>
      </Card>
      <Card border="selected" radius="var(--r-panel)" padding="28px 20px"
        style={{ borderWidth: 1, textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 72, fontWeight: 700, color: 'var(--gold)', letterSpacing: 4, lineHeight: 1 }}>{mm}:{ss}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10 }}>Meditations · Marcus Aurelius</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 22 }}>
          <div onClick={() => setRunning(r => !r)} style={{
            background: 'var(--gold)', color: 'var(--bg)', borderRadius: 50, padding: '14px 28px',
            fontSize: 13, fontWeight: 700, letterSpacing: '0.5px', cursor: 'pointer'
          }}>{running ? 'PAUSE' : 'START'}</div>
        </div>
      </Card>
      <Card border="hairline" radius="var(--r-panel)" padding={20}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold)' }}>Your books</span>
          <IconButton variant="gold" size={32}><Icon name="add" size={16} /></IconButton>
        </div>
        <div style={{ border: '1px solid var(--gold)', background: 'var(--gold-07)', borderRadius: 10, padding: 12, marginBottom: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Meditations</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Marcus Aurelius · p. 84</div>
        </div>
        <div style={{ border: '1px solid var(--border-dim)', borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Letters from a Stoic</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Seneca · p. 12</div>
        </div>
      </Card>
    </div>
  );
}
Object.assign(window, { FocusScreen });

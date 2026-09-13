const { QuoteCard, PromptCard, StreakCard, Button, Icon, IconButton, RoutineToggle } = window.AreteDS;

function HomeScreen({ name = 'Kyle', streak = 14, onMenu, onOpenPrompt, onEvening, routine, setRoutine }) {
  return (
    <div style={{ flex: 1, padding: '56px 25px 25px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 }}>
        <div>
          <div style={{ fontSize: 20, color: 'var(--muted)' }}>Good evening,</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{name}</div>
        </div>
        <IconButton variant="header" onClick={onMenu} style={{ marginTop: 5 }}><Icon name="library" /></IconButton>
      </div>
      <QuoteCard style={{ marginBottom: 20 }}
        quote="Begin at once to live, and count each separate day as a separate life."
        attribution="Seneca" />
      <RoutineToggle value={routine} onChange={setRoutine} style={{ marginBottom: 20 }} />
      <Button fullWidth icon={<Icon name="moon" />} onClick={onEvening} style={{ marginBottom: 20 }}>Evening reflection</Button>
      <StreakCard count={streak} />
      <div style={{ marginTop: 16 }}>
        <PromptCard question="What did you avoid today?" attribution="Epictetus" onClick={onOpenPrompt} />
      </div>
    </div>
  );
}
Object.assign(window, { HomeScreen });

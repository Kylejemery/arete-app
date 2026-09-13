const { ScreenHeader, StreakPill, QuoteCard, ProgressBar, TaskRow, Button, EditCard, Icon } = window.AreteDS;

function MorningScreen({ tasks, onToggle, onAdd, streak = 14 }) {
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const done = tasks.filter(t => t.done).length;
  return (
    <div style={{ flex: 1, padding: '52px 25px 25px', overflowY: 'auto' }}>
      <ScreenHeader title="Morning" right={<StreakPill count={streak} />} style={{ marginBottom: 20, alignItems: 'center' }} />
      <QuoteCard style={{ marginBottom: 22 }} icon={<Icon name="sunny" />}
        quote="At dawn, when you have trouble getting out of bed, tell yourself: I have to go to work, as a human being." />
      <ProgressBar style={{ marginBottom: 22 }} value={Math.round(done / tasks.length * 100)}
        label={done + ' of ' + tasks.length + ' complete'} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {tasks.map(t => <TaskRow key={t.id} title={t.title} note={t.note} done={t.done} onToggle={() => onToggle(t.id)} />)}
      </div>
      {adding ? (
        <EditCard value={draft} placeholder="Walk before checking the phone"
          onChange={e => setDraft(e.target.value)}
          onCancel={() => { setAdding(false); setDraft(''); }}
          onConfirm={() => { if (draft.trim()) onAdd(draft.trim()); setAdding(false); setDraft(''); }} />
      ) : (
        <Button variant="dashed" icon={<Icon name="add" />} onClick={() => setAdding(true)}>Add a task</Button>
      )}
    </div>
  );
}
Object.assign(window, { MorningScreen });

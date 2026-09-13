const { ScreenHeader, SearchBar, Chip, ReflectionCard, InsightCard, DispatchCard, StatTile, WeekStrip } = window.AreteDS;

const ENTRIES = [
  { label: 'Reflection', date: 'Sep 12', prompt: 'What would your future self thank you for?', body: 'Finishing the draft instead of rereading it. I keep polishing the first page as a way of not writing the last one.' },
  { label: 'Reflection', date: 'Sep 11', prompt: 'What did you avoid today?', body: 'The call. I told myself I was waiting for a calmer hour, which has not arrived in nine days.' }
];

function JournalScreen() {
  const [filter, setFilter] = React.useState('All');
  return (
    <div style={{ flex: 1, padding: '52px 16px 20px', overflowY: 'auto' }}>
      <ScreenHeader title="Journal" subtitle="Your own hand, kept" style={{ marginBottom: 14 }} />
      <SearchBar style={{ marginBottom: 12 }} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {['All', 'Reflections', 'Quotes', 'Goals', 'Dispatches'].map(c =>
          <Chip key={c} active={c === filter} onClick={() => setFilter(c)}>{c}</Chip>)}
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <StatTile value="32" label="Reflections" />
        <StatTile value="6" label="Books read" />
        <StatTile value="4h" label="Focus" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <InsightCard label="Pattern: avoidance" body="Three entries this week circle the same unsent message." />
        {ENTRIES.map(e => <ReflectionCard key={e.date} {...e} />)}
        <DispatchCard from="Dispatch from Epictetus" time="Today" title="On the things not up to us"
          body="You wrote that the meeting went badly. Which part of that was yours to command?" />
        <WeekStrip days={[
          { letter: 'M', date: 8, morning: true, evening: true },
          { letter: 'T', date: 9, morning: true, evening: true },
          { letter: 'W', date: 10, morning: true, evening: true },
          { letter: 'T', date: 11, morning: true, evening: true },
          { letter: 'F', date: 12, morning: true },
          { letter: 'S', date: 13, morning: true, today: true },
          { letter: 'S', date: 14 }
        ]} />
      </div>
    </div>
  );
}
Object.assign(window, { JournalScreen });

function Shell() {
  const [view, setView] = React.useState('academy');
  const [essay, setEssay] = React.useState(null);
  const [topic, setTopic] = React.useState(null);
  const scope = view === 'web' ? 'web' : 'academy';
  const bg = view === 'web' ? '#0f1724' : '#0a1628';
  const NAV = [['academy', 'Academy'], ['agora', 'Agora'], ['course', 'Course'], ['web', 'Web app'], ['library', 'Library']];
  const go = k => { setEssay(null); setTopic(null); setView(k); };
  return (
    <div className={scope} style={{ background: bg, minHeight: '100vh', fontFamily: 'var(--font-ui)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 28,
        padding: '18px 48px', borderBottom: '1px solid ' + (view === 'web' ? 'rgba(255,255,255,0.08)' : '#1e3258')
      }}>
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '3px', color: 'var(--gold)' }}>ARETE</span>
        <div style={{ display: 'flex', gap: 22, marginLeft: 'auto' }}>
          {NAV.map(([k, label]) => (
            <span key={k} onClick={() => go(k)} style={{
              fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer',
              paddingBottom: 4,
              color: view === k ? 'var(--gold)' : (view === 'web' ? '#9aa0a6' : '#7a8fa6'),
              borderBottom: '2px solid ' + (view === k ? 'var(--gold)' : 'transparent')
            }}>{label}</span>
          ))}
        </div>
      </div>
      {view === 'academy' && <AcademyHome onOpenCourse={() => setView('course')} />}
      {view === 'agora' && essay && <AgoraEssay essay={essay} onBack={() => setEssay(null)} subscriber={false} onUnlock={() => setView('course')} />}
      {view === 'agora' && !essay && topic && <AgoraTopic topic={topic} onBack={() => setTopic(null)} onOpen={setEssay} />}
      {view === 'agora' && !essay && !topic && <AgoraIndex onOpen={setEssay} onTag={setTopic} onSubmit={() => setView('submit')} />}
      {view === 'submit' && <AgoraSubmit onBack={() => go('agora')} />}
      {view === 'course' && <CoursePage onBack={() => setView('academy')} />}
      {view === 'web' && <WebApp />}
      {view === 'library' && <LibraryReader />}
      <div style={{
        padding: '28px 48px', borderTop: '1px solid ' + (view === 'web' ? 'rgba(255,255,255,0.08)' : '#1e3258'),
        display: 'flex', justifyContent: 'space-between', fontSize: 11, color: view === 'web' ? '#9aa0a6' : '#7a8fa6'
      }}>
        <span>Arete · pursuearete.com</span>
        <span style={{ fontStyle: 'italic' }}>Counsel from the ancients, for the life you are living</span>
      </div>
    </div>
  );
}
Object.assign(window, { Shell });

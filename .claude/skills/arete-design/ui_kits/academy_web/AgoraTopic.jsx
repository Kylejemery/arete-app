const { EssayIndexCard, GoldRule, Kicker } = window.AreteDS;

function AgoraTopic({ topic, onBack, onOpen }) {
  const list = (window.WEB_ESSAYS || []).filter(e => (e.tags || []).includes(topic));
  return (
    <div style={{ padding: '56px 48px 64px', maxWidth: 900 }}>
      <div onClick={onBack} style={{
        fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase',
        color: 'var(--gold)', cursor: 'pointer', marginBottom: 28
      }}>&larr; The Agora</div>
      <Kicker variant="eyebrow" style={{ color: 'var(--gold-70)' }}>Topic</Kicker>
      <h1 style={{ fontFamily: 'var(--font-serif-academy)', fontSize: 40, fontWeight: 400, color: '#f5edd6', lineHeight: 1.15, margin: '10px 0 0' }}>{topic}</h1>
      <GoldRule width={48} />
      <p style={{ fontSize: 15, lineHeight: 1.65, color: '#e8d9b0', maxWidth: 560, margin: '0 0 32px' }}>
        {list.length === 1 ? 'One essay' : list.length + ' essays'} filed under {topic.toLowerCase()}.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {list.length
          ? list.map(e => <EssayIndexCard key={e.id} {...e} onClick={() => onOpen(e)} />)
          : <div style={{ fontSize: 15, fontStyle: 'italic', color: '#7a8fa6' }}>Nothing here yet. Submit the first one.</div>}
      </div>
    </div>
  );
}
Object.assign(window, { AgoraTopic });

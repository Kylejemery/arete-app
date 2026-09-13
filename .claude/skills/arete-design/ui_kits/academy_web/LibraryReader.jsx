const { Kicker, GoldRule } = window.AreteDS;

function LibraryReader() {
  const [note, setNote] = React.useState(null);
  return (
    <div className="library" style={{ display: 'flex', minHeight: 700 }}>
      <div style={{ flex: 1, padding: '56px 56px 64px', maxWidth: 700 }}>
        <Kicker variant="eyebrow" style={{ color: 'var(--gold-70)' }}>Meditations · Book II</Kicker>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 500, color: '#f4ead5', lineHeight: 1.2, margin: '10px 0 0' }}>
          On beginning the day
        </h1>
        <GoldRule width={48} />
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 21, lineHeight: 1.7, color: '#e8e4d6' }}>
          <p style={{ margin: '0 0 20px' }}>
            Begin the morning by saying to thyself, I shall meet with the busybody, the ungrateful,
            arrogant, deceitful, envious, unsocial.
          </p>
          <p style={{ margin: '0 0 20px' }}>
            All these things happen to them by reason of their ignorance of what is good and evil.
            <span onClick={() => setNote('marginalia')} style={{
              borderBottom: '1px solid var(--gold-53)', cursor: 'pointer', paddingBottom: 1
            }}> But I who have seen the nature of the good that it is beautiful</span>, and of the bad
            that it is ugly, and the nature of him who does wrong, cannot be injured by any of them.
          </p>
          <p style={{ margin: 0 }}>
            For no one can fix on me what is ugly, nor can I be angry with my kinsman, nor hate him.
          </p>
        </div>
      </div>
      <div style={{ width: 300, borderLeft: '1px solid #1e3258', padding: '56px 28px', flex: 'none' }}>
        <Kicker dim style={{ marginBottom: 14 }}>Marginalia</Kicker>
        {note ? (
          <div style={{ borderLeft: '3px solid var(--gold)', paddingLeft: 14 }}>
            <div style={{ fontSize: 13, fontStyle: 'italic', color: '#8a8b8e', lineHeight: '20px', marginBottom: 8 }}>
              "But I who have seen the nature of the good"
            </div>
            <div style={{ fontSize: 14, lineHeight: '22px', color: '#e8e4d6' }}>
              He is not claiming to be better. He is claiming to have seen something, which is a
              different and more demanding thing to keep hold of by nine in the morning.
            </div>
            <div style={{ fontSize: 11, color: '#8a8b8e', marginTop: 10 }}>Your note, Sep 12</div>
          </div>
        ) : (
          <div style={{ fontSize: 13, fontStyle: 'italic', color: '#8a8b8e', lineHeight: '20px' }}>
            Underlined passages keep their notes here. Click one in the text.
          </div>
        )}
      </div>
    </div>
  );
}
Object.assign(window, { LibraryReader });

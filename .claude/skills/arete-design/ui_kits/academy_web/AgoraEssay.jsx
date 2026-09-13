const { Comment, CommentComposer, GoldRule, Kicker } = window.AreteDS;

const BODY = [
  'I arrive twenty minutes before I need to, and I have started to suspect it is not politeness.',
  'The arithmetic is unkind. Twenty minutes, four appointments a day, is roughly a working week a year spent standing outside buildings. I have told myself this is respect for other people, and there is some of that in it. But respect does not usually require a margin this wide.',
  'What it actually buys is the absence of one specific feeling: the small hot panic of being the last one through the door. I have paid a working week a year to never feel that. Put that way the price is obvious, and I am not sure I would agree to it again.',
  'There is a version of this essay that ends by recommending lateness, and I do not want to write it. The point is not that the margin is wrong. The point is that I never priced it, and a thing you never price will quietly take whatever it wants.',
  'So the question is not whether earliness is a virtue. It is what I am buying, and whether I would pay the same in coin.'
];

function AgoraEssay({ essay, onBack, subscriber, onUnlock }) {
  const [draft, setDraft] = React.useState('');
  const [comments, setComments] = React.useState([
    { author: 'Tomas Ruiz', time: '2h', text: 'The arithmetic is the part I keep avoiding. Twenty minutes, four times a day, is a working week a year.' },
    { author: 'Hana Sørensen', time: '1h', text: 'I read this as being about control, not courtesy. The margin is where you keep the feeling out.' },
    { author: 'Seneca', time: '40m', counselor: true, text: 'You asked whether earliness is a virtue. Ask instead what it buys you, and whether you would pay the same price in coin.' },
    { author: 'Ruth Adeyemi', time: '20m', text: 'The paragraph you did not write is the one I would have read twice.' }
  ]);
  const post = () => {
    if (!draft.trim()) return;
    setComments(c => [...c, { author: 'You', time: 'now', text: draft.trim() }]);
    setDraft('');
  };
  return (
    <div style={{ padding: '56px 48px 72px', maxWidth: 760 }}>
      <div onClick={onBack} style={{
        fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase',
        color: 'var(--gold)', cursor: 'pointer', marginBottom: 28
      }}>&larr; The Agora</div>

      <Kicker variant="eyebrow" style={{ color: 'var(--gold-70)' }}>{(essay.tags || []).join(' · ')}</Kicker>
      <h1 style={{ fontFamily: 'var(--font-serif-academy)', fontSize: 42, fontWeight: 400, color: '#f5edd6', lineHeight: 1.15, margin: '10px 0 0' }}>
        {essay.title}
      </h1>
      <div style={{ fontSize: 13, color: 'var(--gold)', letterSpacing: '0.3px', marginTop: 14 }}>
        {essay.author}<span style={{ color: '#7a8fa6' }}> · {essay.meta}</span>
      </div>
      <GoldRule width={48} />

      <div style={{ fontSize: 18, lineHeight: 1.8, color: '#e8d9b0', maxWidth: 640 }}>
        {BODY.map((p, i) => <p key={i} style={{ margin: '0 0 22px' }}>{p}</p>)}
      </div>

      {essay.kicker && essay.kicker.indexOf('Answered') === 0 && (
        <div style={{ borderLeft: '3px solid var(--gold)', paddingLeft: 20, margin: '32px 0 0', maxWidth: 640 }}>
          <Kicker>{essay.kicker.replace('Answered by ', '') + ' was invited to answer'}</Kicker>
          <div style={{ fontFamily: 'var(--font-serif-academy)', fontSize: 20, fontStyle: 'italic', lineHeight: 1.55, color: '#f5edd6', marginTop: 10 }}>
            You have priced the panic and found it expensive. Good. Now notice that you did the same
            arithmetic on the letter to your brother and came out the other way.
          </div>
        </div>
      )}

      <div style={{ height: 1, background: '#1e3258', margin: '44px 0 28px', maxWidth: 640 }}></div>

      <Kicker variant="eyebrow" style={{ color: 'var(--gold-70)', marginBottom: 22 }}>{comments.length} comments</Kicker>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 32, maxWidth: 600 }}>
        {comments.map((c, i) => <Comment key={i} author={c.author} time={c.time} counselor={c.counselor}>{c.text}</Comment>)}
      </div>
      <div style={{ maxWidth: 600 }}>
        <CommentComposer locked={!subscriber} onUnlock={onUnlock}
          value={draft} onChange={e => setDraft(e.target.value)} onSubmit={post} />
      </div>
    </div>
  );
}
Object.assign(window, { AgoraEssay });

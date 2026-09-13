const { Kicker, Comment, CommentComposer, Icon, Card } = window.AreteDS;

const BODY = [
  'I arrive twenty minutes before I need to, and I have started to suspect it is not politeness.',
  'The arithmetic is unkind. Twenty minutes, four appointments a day, is roughly a working week a year spent standing outside buildings. I have told myself this is respect for other people, and there is some of that in it. But respect does not usually require a margin this wide.',
  'What it actually buys is the absence of one specific feeling: the small hot panic of being the last one through the door. I have paid a working week a year to never feel that. Put that way, the price is obvious, and I am not sure I would agree to it again.',
  'So the question is not whether earliness is a virtue. It is what I am buying, and whether I would pay the same in coin.'
];

function EssayScreen({ essay, onBack, subscriber, onUnlock }) {
  const [draft, setDraft] = React.useState('');
  const [comments, setComments] = React.useState([
    { author: 'Tomas Ruiz', time: '2h', text: 'The arithmetic is the part I keep avoiding. Twenty minutes, four times a day, is a working week a year.' },
    { author: 'Hana Sørensen', time: '1h', text: 'I read this as being about control, not courtesy. The margin is where you keep the feeling out.' },
    { author: 'Seneca', time: '40m', counselor: true, text: 'You asked whether earliness is a virtue. Ask instead what it buys you, and whether you would pay the same price in coin.' }
  ]);
  const post = () => {
    if (!draft.trim()) return;
    setComments(c => [...c, { author: 'Kyle', time: 'now', text: draft.trim() }]);
    setDraft('');
  };
  return (
    <div style={{ flex: 1, padding: '52px 25px 25px', overflowY: 'auto' }}>
      <div onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gold)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 20 }}>
        <span style={{ transform: 'rotate(180deg)', display: 'flex' }}><Icon name="chevronForward" size={16} /></span>The Agora
      </div>
      <Kicker dim>{(essay.tags || []).join(' · ')}</Kicker>
      <h1 style={{ fontSize: 26, fontWeight: 700, lineHeight: '32px', margin: '8px 0 6px' }}>{essay.title}</h1>
      <div style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 600, marginBottom: 22 }}>
        {essay.author}<span style={{ color: 'var(--muted)', fontWeight: 400 }}> · {essay.meta}</span>
      </div>
      <div style={{ marginBottom: 28 }}>
        {BODY.map((p, i) => (
          <p key={i} style={{ fontSize: 16, lineHeight: '26px', color: 'var(--text-body)', margin: i ? '0 0 18px' : '0 0 18px' }}>{p}</p>
        ))}
      </div>
      {essay.counselor && (
        <Card border="hairline" accentRule padding={18} style={{ marginBottom: 28 }}>
          <Kicker>{essay.counselor} was invited to answer</Kicker>
          <div style={{ fontSize: 14, fontStyle: 'italic', lineHeight: '22px', color: 'var(--text-quote)', marginTop: 8 }}>
            You have priced the panic and found it expensive. Good. Now notice that you did the same
            arithmetic on the letter to your brother and came out the other way.
          </div>
        </Card>
      )}
      <div style={{ height: 1, background: 'var(--gold-13)', marginBottom: 20 }}></div>
      <Kicker style={{ marginBottom: 16 }}>{comments.length} comments</Kicker>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 22 }}>
        {comments.map((c, i) => (
          <Comment key={i} author={c.author} time={c.time} counselor={c.counselor}>{c.text}</Comment>
        ))}
      </div>
      <CommentComposer locked={!subscriber} onUnlock={onUnlock}
        value={draft} onChange={e => setDraft(e.target.value)} onSubmit={post} />
    </div>
  );
}
Object.assign(window, { EssayScreen });

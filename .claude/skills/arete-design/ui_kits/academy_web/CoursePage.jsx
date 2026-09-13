const { AcademyCard, AcademyButton, GoldRule, Kicker } = window.AreteDS;

const UNITS = [
  ['Seminar I', 'What the good is, and why happiness is not a feeling'],
  ['Seminar II', 'Function, excellence, and the argument from the flute player'],
  ['Seminar III', 'Whether a life can be judged before it ends'],
  ['Seminar IV', 'Fortune, and how much of a life it is allowed to spoil'],
  ['Seminar V', 'Habituation: becoming just by doing just things'],
  ['Seminar VI', 'The mean, and why courage is not a quantity']
];

function CoursePage({ onBack }) {
  const [open, setOpen] = React.useState(0);
  return (
    <div style={{ padding: '56px 48px 64px', maxWidth: 880 }}>
      <div onClick={onBack} style={{
        fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase',
        color: 'var(--gold)', cursor: 'pointer', marginBottom: 24
      }}>&larr; The Academy</div>
      <Kicker variant="eyebrow" style={{ color: 'var(--gold-70)' }}>Course · Aristotle</Kicker>
      <h1 style={{
        fontFamily: 'var(--font-serif-academy)', fontSize: 40, fontWeight: 400,
        color: '#f5edd6', lineHeight: 1.15, margin: '10px 0 0'
      }}>Nicomachean Ethics, Book I</h1>
      <GoldRule />
      <p style={{ fontSize: 16, lineHeight: 1.65, color: '#e8d9b0', maxWidth: 620, margin: '0 0 28px' }}>
        Six seminars on the opening book: the good, the function argument, and the claim that a life is judged whole.
        Read forty pages a week. Come with one objection.
      </p>
      <div style={{ display: 'flex', gap: 10, marginBottom: 40 }}>
        <AcademyButton>Enroll, $180</AcademyButton>
        <AcademyButton variant="outline">Audit free</AcademyButton>
      </div>
      <Kicker variant="eyebrow" style={{ color: 'var(--gold-70)', marginBottom: 16 }}>Syllabus</Kicker>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {UNITS.map(([n, t], i) => (
          <AcademyCard key={n} onClick={() => setOpen(i)} kicker={n} title={t}
            style={{ cursor: 'pointer', borderColor: open === i ? 'var(--gold-33)' : '#1e3258' }}>
            {open === i && (
              <div style={{ fontSize: 14, lineHeight: 1.7, color: '#e8d9b0', marginTop: 12, borderTop: '1px solid #1e3258', paddingTop: 12 }}>
                Reading: 1094a to 1097b. The interlocutor will press you on whether the good can be
                something other than an activity, and will not accept "it depends".
              </div>
            )}
          </AcademyCard>
        ))}
      </div>
    </div>
  );
}
Object.assign(window, { CoursePage });

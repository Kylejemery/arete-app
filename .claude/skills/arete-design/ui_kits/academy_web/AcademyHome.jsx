const { AcademyCard, AcademyButton, GoldRule, Kicker } = window.AreteDS;

const COURSES = [
  { kicker: 'Course', title: 'Nicomachean Ethics, Book I', meta: 'Aristotle · 6 seminars' },
  { kicker: 'Course', title: 'Letters from a Stoic, I to XXX', meta: 'Seneca · 8 seminars' },
  { kicker: 'Course', title: 'The Enchiridion, whole', meta: 'Epictetus · 4 seminars' },
  { kicker: 'Reading group', title: 'Meditations, Books II and III', meta: 'Marcus Aurelius · ongoing' }
];

function AcademyHome({ onOpenCourse }) {
  return (
    <div>
      <div style={{ padding: '64px 48px 48px', maxWidth: 820 }}>
        <Kicker variant="eyebrow" style={{ color: 'var(--gold-70)' }}>The Academy</Kicker>
        <h1 style={{
          fontFamily: 'var(--font-serif-academy)', fontSize: 52, fontWeight: 400,
          color: '#f5edd6', lineHeight: 1.12, margin: '10px 0 0'
        }}>Read the way the Greeks argued</h1>
        <GoldRule />
        <p style={{ fontSize: 16, lineHeight: 1.65, color: '#e8d9b0', maxWidth: 560, margin: '0 0 26px' }}>
          Seminar-style courses on the texts, with an interlocutor who has read everything in the room.
          You bring the reading. It brings the objections.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <AcademyButton onClick={onOpenCourse}>Enroll</AcademyButton>
          <AcademyButton variant="outline" onClick={onOpenCourse}>Syllabus</AcademyButton>
        </div>
      </div>
      <div style={{ padding: '0 48px 48px' }}>
        <Kicker variant="eyebrow" style={{ color: 'var(--gold-70)', marginBottom: 18 }}>Now in session</Kicker>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
          {COURSES.map(c => (
            <AcademyCard key={c.title} kicker={c.kicker} title={c.title} style={{ cursor: 'pointer' }}>
              <div style={{ fontSize: 12, color: '#7a8fa6', marginTop: 10, letterSpacing: '0.3px' }}>{c.meta}</div>
            </AcademyCard>
          ))}
        </div>
      </div>
      <div style={{ padding: '0 48px 64px', maxWidth: 700 }}>
        <div style={{ borderLeft: '3px solid var(--gold)', paddingLeft: 20 }}>
          <div style={{
            fontFamily: 'var(--font-serif-academy)', fontSize: 24, fontStyle: 'italic',
            color: '#f5edd6', lineHeight: 1.45
          }}>We are what we repeatedly do. Excellence, then, is not an act but a habit.</div>
          <div style={{
            fontSize: 12, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase',
            color: 'var(--gold)', marginTop: 12
          }}>Aristotle</div>
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { AcademyHome, COURSES });

// Arete app phone mockups — three screens matching the real app's styling.
// Uses IOSDevice (dark) and recreates the Home / Morning / Cabinet screens.

const A_BG = '#1a1a2e';
const A_CARD = '#16213e';
const A_GOLD = '#c9a84c';
const A_GOLD_DIM = '#c9a84c33';
const A_GOLD_SOFT = '#c9a84c22';
const A_TEXT = '#ffffff';
const A_MUTED = '#888';

function AreteBottomTabs({ active = 'home' }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 10l9-7 9 7v11a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1z"/></svg> },
    { id: 'morning', label: 'Morning', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></svg> },
    { id: 'cabinet', label: 'Cabinet', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="9" cy="10" r="3"/><circle cx="17" cy="11" r="2.4"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M13 20c.6-2.5 2.3-4 4-4 2 0 3.5 1.5 4 4"/></svg> },
    { id: 'evening', label: 'Evening', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/></svg> },
    { id: 'journal', label: 'Journal', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 4h12a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 012-2z"/><path d="M9 9h6M9 13h6"/></svg> },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: '#0e1530', borderTop: `1px solid ${A_GOLD_DIM}`,
      padding: '8px 8px 28px',
      display: 'flex', justifyContent: 'space-around',
    }}>
      {tabs.map(t => (
        <div key={t.id} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          color: active === t.id ? A_GOLD : '#555',
          fontSize: 10, fontWeight: 600,
        }}>
          {t.icon}
          <span>{t.label}</span>
        </div>
      ))}
    </div>
  );
}

function AreteHome() {
  return (
    <div style={{
      width: '100%', height: '100%', background: A_BG,
      color: A_TEXT, fontFamily: '-apple-system, system-ui',
      paddingTop: 54, paddingBottom: 80, overflow: 'hidden',
    }}>
      <div style={{ padding: '10px 22px 0' }}>
        {/* greeting */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <div style={{ color: A_MUTED, fontSize: 17 }}>Good morning,</div>
            <div style={{ color: A_GOLD, fontSize: 12, fontStyle: 'italic', marginTop: 2 }}>Rise and pursue virtue</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>Kyle ⚔️</div>
          </div>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: A_CARD,
            border: `1px solid ${A_GOLD_DIM}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={A_GOLD} strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8L7 17M17 7l2.8-2.8"/></svg>
          </div>
        </div>

        {/* quote */}
        <div style={{
          background: A_CARD, borderRadius: 12, padding: '14px 14px 14px 18px',
          borderLeft: `3px solid ${A_GOLD}`, marginBottom: 18,
          display: 'flex', gap: 8,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={A_GOLD} strokeWidth="1.8" style={{ flexShrink: 0, marginTop: 2 }}><path d="M12 2c1.5 3 4 5 4 9 0 3.3-2.7 6-6 6-2 0-4-1.2-5-3 0 0 3 .5 4-2 .5-1.5 0-3.5 1-5 1-1.5 2-3 2-5z"/></svg>
          <div>
            <div style={{ color: A_GOLD, fontSize: 12.5, fontStyle: 'italic', lineHeight: 1.5 }}>
              "The impediment to action advances action. What stands in the way becomes the way."
            </div>
            <div style={{ color: A_MUTED, fontSize: 11, fontStyle: 'italic', marginTop: 5 }}>— Marcus Aurelius</div>
          </div>
        </div>

        {/* streak */}
        <div style={{
          background: A_CARD, borderRadius: 12, padding: 16,
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={A_GOLD} strokeWidth="1.6"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM7 4H4a2 2 0 01-2-2M17 4h3a2 2 0 002-2"/></svg>
          <div style={{ color: A_GOLD, fontSize: 30, fontWeight: 700 }}>47</div>
          <div style={{ fontSize: 14 }}>Days of Discipline 🕯️</div>
        </div>

        {/* section */}
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Today's Disciplines</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            background: A_GOLD, color: A_BG,
            borderRadius: 12, padding: 14,
            display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={A_BG} strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></svg>
            <span style={{ flex: 1, fontSize: 14 }}>Morning Routine</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={A_BG}><circle cx="12" cy="12" r="11"/><path d="M7 12l3.5 3.5L17 9" stroke={A_GOLD} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div style={{
            background: A_CARD, color: A_TEXT,
            borderRadius: 12, padding: 14, border: `1px solid ${A_GOLD_DIM}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={A_GOLD} strokeWidth="1.8"><path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/></svg>
            <span style={{ flex: 1, fontSize: 14 }}>Evening Routine</span>
          </div>
        </div>
      </div>
      <AreteBottomTabs active="home"/>
    </div>
  );
}

function AreteMorning() {
  const tasks = [
    { t: 'Meditate 🌿', done: true },
    { t: 'Cold Shower 🧊', done: true },
    { t: 'Read 20 pages 📖', done: true },
    { t: 'Write intention ✍️', done: false },
    { t: 'Boxing — 6 rounds 🥊', done: false },
  ];
  const donePct = Math.round(tasks.filter(x => x.done).length / tasks.length * 100);
  return (
    <div style={{
      width: '100%', height: '100%', background: A_BG,
      color: A_TEXT, fontFamily: '-apple-system, system-ui',
      paddingTop: 54, paddingBottom: 80, overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 22px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ color: A_GOLD, fontSize: 22, fontWeight: 700 }}>Morning Routine ☀️</div>
          <div style={{
            background: A_GOLD_SOFT, color: A_GOLD,
            border: `1px solid ${A_GOLD}55`,
            padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
          }}>3/5</div>
        </div>

        <div style={{
          background: A_CARD, borderRadius: 14, padding: '14px 14px 14px 16px',
          borderLeft: `3px solid ${A_GOLD}`, marginBottom: 16,
        }}>
          <div style={{ color: A_GOLD, fontSize: 12.5, fontStyle: 'italic', lineHeight: 1.5 }}>
            "Confine yourself to the present."
          </div>
          <div style={{ color: A_MUTED, fontSize: 11, marginTop: 4 }}>— Marcus Aurelius</div>
        </div>

        {/* progress */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Today's Progress</span>
            <span style={{ color: A_GOLD, fontSize: 13, fontWeight: 700 }}>{donePct}%</span>
          </div>
          <div style={{ height: 10, background: '#0d1526', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ width: `${donePct}%`, height: '100%', background: A_GOLD }}/>
          </div>
        </div>

        {/* tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tasks.map((task, i) => (
            <div key={i} style={{
              background: task.done ? A_GOLD : A_CARD,
              borderRadius: 14, padding: 14,
              border: task.done ? 'none' : `1px solid ${A_GOLD_DIM}`,
              display: 'flex', alignItems: 'center', gap: 12,
              color: task.done ? A_BG : A_TEXT,
              fontWeight: task.done ? 700 : 400,
              fontSize: 14,
              textDecoration: task.done ? 'line-through' : 'none',
            }}>
              {task.done ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill={A_BG}><circle cx="12" cy="12" r="11"/><path d="M7 12l3.5 3.5L17 9" stroke={A_GOLD} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              ) : (
                <div style={{ width: 22, height: 22, borderRadius: 11, border: `2px solid ${A_GOLD}` }}/>
              )}
              <span>{task.t}</span>
            </div>
          ))}
        </div>
      </div>
      <AreteBottomTabs active="morning"/>
    </div>
  );
}

function AreteCabinet() {
  return (
    <div style={{
      width: '100%', height: '100%', background: A_BG,
      color: A_TEXT, fontFamily: '-apple-system, system-ui',
      paddingTop: 54, paddingBottom: 80, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* header */}
      <div style={{
        padding: '12px 20px 14px', borderBottom: `1px solid ${A_GOLD_DIM}`,
      }}>
        <div style={{ color: A_GOLD, fontSize: 22, fontWeight: 700 }}>The Cabinet</div>
        <div style={{ color: A_MUTED, fontSize: 11, marginTop: 2 }}>Your Council of Invisible Counselors</div>
      </div>

      {/* tab bar */}
      <div style={{ display: 'flex', background: A_CARD, borderBottom: `1px solid ${A_GOLD_DIM}` }}>
        <div style={{
          flex: 1, padding: '11px 0', textAlign: 'center',
          color: A_GOLD, fontSize: 13, fontWeight: 600,
          borderBottom: `2px solid ${A_GOLD}`,
        }}>Cabinet</div>
        <div style={{ flex: 1, padding: '11px 0', textAlign: 'center', color: A_MUTED, fontSize: 13, fontWeight: 600 }}>Counselors</div>
      </div>

      {/* chat */}
      <div style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
        {/* user */}
        <div style={{ alignSelf: 'flex-end', maxWidth: '78%',
          background: 'rgba(201,168,76,0.15)', border: `1px solid ${A_GOLD}`,
          padding: 11, borderRadius: 14, borderBottomRightRadius: 4, fontSize: 13, lineHeight: 1.5,
        }}>
          I skipped training again. Work ran late and I told myself tomorrow.
        </div>
        {/* cabinet */}
        <div style={{ maxWidth: '86%',
          background: A_CARD, border: `1px solid ${A_GOLD_DIM}`,
          padding: 12, borderRadius: 14, borderBottomLeftRadius: 4,
        }}>
          <div style={{ color: A_GOLD, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>The Cabinet</div>
          <div style={{ color: '#e0e0e0', fontSize: 13, lineHeight: 1.55 }}>
            <span style={{ color: A_GOLD, fontWeight: 600 }}>Epictetus:</span> Tomorrow is not a day that belongs to you. You have only today — and you gave it away.
            <br/><br/>
            <span style={{ color: A_GOLD, fontWeight: 600 }}>Marcus:</span> Ask yourself: was the work truly urgent, or was it cover? Name the real thing honestly. Then decide what the rest of the week asks of you.
          </div>
        </div>
      </div>

      {/* input */}
      <div style={{
        padding: '10px 12px 16px', background: A_CARD,
        borderTop: `1px solid ${A_GOLD_DIM}`, display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <div style={{
          flex: 1, background: A_BG, borderRadius: 18, padding: '8px 14px',
          color: '#555', fontSize: 13, border: `1px solid ${A_GOLD_DIM}`,
        }}>Speak to the Cabinet...</div>
        <div style={{ width: 36, height: 36, background: A_GOLD, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={A_BG}><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
        </div>
      </div>
      <AreteBottomTabs active="cabinet"/>
    </div>
  );
}

Object.assign(window, { AreteHome, AreteMorning, AreteCabinet });

const { Kicker, PlanCard, Icon } = window.AreteDS;

const ROWS = [
  ['Counselors', '3', 'All'],
  ['Dispatches', 'Weekly', 'Daily'],
  ['Library', 'Reading', 'Marginalia'],
  ['Portrait', '·', 'Weekly']
];

function PaywallScreen({ onClose }) {
  const [plan, setPlan] = React.useState('annual');
  return (
    <div className="academy" style={{
      position: 'absolute', inset: 0, background: '#0a1628', zIndex: 20,
      padding: '60px 20px 20px', overflowY: 'auto'
    }}>
      <div onClick={onClose} style={{
        position: 'absolute', top: 56, right: 20, width: 36, height: 36, borderRadius: 18,
        background: '#0f1e38', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#8a9bb0', cursor: 'pointer'
      }}><Icon name="close" /></div>
      <div style={{ textAlign: 'center', margin: '12px 0 28px' }}>
        <Kicker variant="eyebrow" style={{ marginBottom: 8 }}>Arete Premium</Kicker>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#e8edf5', letterSpacing: '0.3px', marginBottom: 10 }}>The full Cabinet</div>
        <div style={{ fontSize: 14, lineHeight: '21px', color: '#8a9bb0' }}>Every counselor, daily dispatches, the Library, and your longitudinal portrait.</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', marginTop: 10 }}>7 days free, then your plan</div>
      </div>
      <div style={{ border: '1px solid #1e3050', borderRadius: 12, overflow: 'hidden', marginBottom: 24, fontSize: 12 }}>
        <div style={{ display: 'flex', background: '#0f1e38', padding: '10px 12px', fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#8a9bb0' }}>
          <span style={{ flex: 1.4 }}></span>
          <span style={{ flex: 1, textAlign: 'center' }}>Free</span>
          <span style={{ flex: 1, textAlign: 'center', color: 'var(--gold)' }}>Arete</span>
        </div>
        {ROWS.map(([k, a, b], i) => (
          <div key={k} style={{ display: 'flex', padding: '10px 12px', background: i % 2 ? '#0d1a30' : 'transparent' }}>
            <span style={{ flex: 1.4, color: '#8a9bb0' }}>{k}</span>
            <span style={{ flex: 1, textAlign: 'center', color: '#e8edf5' }}>{a}</span>
            <span style={{ flex: 1, textAlign: 'center', color: '#e8edf5' }}>{b}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <PlanCard badge="Best value" name="Annual" note="Two months free" price="$59.99" period="per year"
          selected={plan === 'annual'} onClick={() => setPlan('annual')} />
        <PlanCard name="Monthly" note="Cancel any time" price="$7.99" period="per month"
          selected={plan === 'monthly'} onClick={() => setPlan('monthly')} />
      </div>
      <div style={{
        background: 'var(--gold)', color: '#0a1628', borderRadius: 14, padding: 16, textAlign: 'center',
        fontSize: 16, fontWeight: 700, letterSpacing: '0.3px', marginBottom: 14, cursor: 'pointer'
      }}>Start free trial</div>
      <div style={{ fontSize: 11, lineHeight: '16px', color: '#4a5a70', textAlign: 'center' }}>
        Billed through the App Store. Restore purchases · Terms · Privacy
      </div>
    </div>
  );
}
Object.assign(window, { PaywallScreen });

// Main page: Arete marketing site
function AreteSite() {
  const [heroVariant, setHeroVariant] = React.useState(0); // 0 | 1
  const [bustVariant, setBustVariant] = React.useState('plate'); // plate|engraving|relief
  const [showTweaks, setShowTweaks] = React.useState(false);

  // Tweaks protocol
  React.useEffect(() => {
    const handler = (e) => {
      const d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === '__activate_edit_mode') setShowTweaks(true);
      if (d.type === '__deactivate_edit_mode') setShowTweaks(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  // Scroll reveal
  React.useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -80px 0px' });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="arete-site">
      {showTweaks && <TweaksPanel heroVariant={heroVariant} setHeroVariant={setHeroVariant} bustVariant={bustVariant} setBustVariant={setBustVariant}/>}
      <TopBar/>
      {heroVariant === 0 ? <HeroEditorial/> : <HeroMonumental/>}
      <CabinetSection bustVariant={bustVariant}/>
      <DayInArete/>
      <FeaturesSection/>
      <ScrollsSection/>
      <PrinciplesSection/>
      <PricingSection/>
      <FAQSection/>
      <FooterSection/>
    </div>
  );
}

function TweaksPanel({ heroVariant, setHeroVariant, bustVariant, setBustVariant }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
      background: '#0c1326', border: '1px solid #c9a84c66', borderRadius: 14,
      padding: 18, width: 260, color: '#f4ead5',
      fontFamily: 'Inter, system-ui', fontSize: 13,
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: '#c9a84c', marginBottom: 12, fontWeight: 600 }}>Tweaks</div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 10, color: '#888', marginBottom: 6 }}>Hero variation</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['Editorial', 'Monumental'].map((l, i) => (
            <button key={i} onClick={() => setHeroVariant(i)} style={{
              flex: 1, padding: '7px 0', background: heroVariant === i ? '#c9a84c' : 'transparent',
              color: heroVariant === i ? '#0f1629' : '#c9a84c',
              border: '1px solid #c9a84c77', borderRadius: 7, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
            }}>{l}</button>
          ))}
        </div>
      </div>
      <div>
        <div style={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 10, color: '#888', marginBottom: 6 }}>Counselor portraits</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['plate','Plate'], ['engraving','Engraving'], ['relief','Relief']].map(([v, l]) => (
            <button key={v} onClick={() => setBustVariant(v)} style={{
              flex: 1, padding: '7px 0', background: bustVariant === v ? '#c9a84c' : 'transparent',
              color: bustVariant === v ? '#0f1629' : '#c9a84c',
              border: '1px solid #c9a84c77', borderRadius: 7, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
            }}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TopBar() {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className={`topbar ${scrolled ? 'topbar-scrolled' : ''}`}>
      <div className="topbar-inner">
        <div className="topbar-brand">
          <Monogram size={32}/>
          <span className="topbar-name">ARETE</span>
        </div>
        <div className="topbar-nav">
          <a href="#cabinet">The Cabinet</a>
          <a href="#day">A Day</a>
          <a href="#features">Features</a>
          <a href="#scrolls">Scrolls</a>
          <a href="#pricing">Pricing</a>
        </div>
        <a href="#download" className="topbar-cta">Join the Beta →</a>
      </div>
    </div>
  );
}

// ============ HERO 1: Editorial ============
function HeroEditorial() {
  const [mouse, setMouse] = React.useState({ x: 0, y: 0 });
  React.useEffect(() => {
    const h = (e) => setMouse({ x: (e.clientX / window.innerWidth - 0.5) * 2, y: (e.clientY / window.innerHeight - 0.5) * 2 });
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);
  return (
    <section className="hero-ed" data-screen-label="Hero · Editorial">
      <div className="hero-ed-stars"/>
      <div className="hero-ed-vignette"/>
      <div className="hero-ed-pediment">
        <Pediment width={1600} height={60}/>
      </div>

      <div className="hero-ed-inner">
        <div className="hero-ed-left">
          <div className="hero-ed-kicker">
            <span className="kicker-dot"/>
            <span>Arete — Ἀρετή — Excellence</span>
          </div>
          <h1 className="hero-ed-title">
            Be who you<br/>
            <em>want</em> to be.
          </h1>
          <p className="hero-ed-sub">
            An AI-powered coach built on Stoic philosophy and the <span className="gold-italic">Cabinet of Invisible Counselors</span>. Marcus Aurelius holds the chair. Epictetus will not let you lie to yourself. Your future self remembers how this ends.
          </p>
          <div className="hero-ed-cta">
            <a href="#download" className="btn-primary">
              <svg width="18" height="20" viewBox="0 0 24 28" fill="currentColor"><path d="M17.5 14.8c0-3 2.5-4.5 2.6-4.6-1.4-2.1-3.6-2.4-4.4-2.4-1.9-.2-3.6 1.1-4.6 1.1s-2.4-1.1-4-1c-2 0-3.9 1.2-4.9 3-2.1 3.7-.5 9.1 1.5 12.1 1 1.5 2.2 3.1 3.8 3 1.5-.1 2.1-1 4-1s2.4 1 4 .9c1.7 0 2.7-1.5 3.7-3 1.2-1.7 1.7-3.4 1.7-3.5-.1 0-3.3-1.3-3.4-5zM14.7 5.8c.8-1 1.4-2.4 1.3-3.8-1.2.1-2.7.8-3.6 1.8-.8.9-1.5 2.3-1.3 3.7 1.4.1 2.8-.7 3.6-1.7z"/></svg>
              Join the TestFlight beta
            </a>
            <a href="#cabinet" className="btn-ghost">Meet the Cabinet →</a>
          </div>
          <div className="hero-ed-trust">
            <span>TestFlight · iOS</span>
            <span className="dot">•</span>
            <span>Android soon</span>
            <span className="dot">•</span>
            <span>Built with Claude</span>
          </div>
        </div>

        <div className="hero-ed-right">
          <div className="hero-ed-phone-wrap" style={{
            transform: `translate(${mouse.x * -6}px, ${mouse.y * -6}px)`,
          }}>
            <div className="hero-ed-halo"/>
            <IOSDevice width={320} height={648} dark>
              <AreteHome/>
            </IOSDevice>
          </div>
          <div className="hero-ed-phone-back" style={{
            transform: `translate(${mouse.x * 3}px, ${mouse.y * 3}px)`,
          }}>
            <IOSDevice width={280} height={560} dark>
              <AreteCabinet/>
            </IOSDevice>
          </div>
          <div className="hero-ed-quote-card reveal">
            <div className="hero-ed-quote-mark">"</div>
            <div className="hero-ed-quote-text">Are you becoming who you want to be?</div>
            <div className="hero-ed-quote-attr">— The daily question</div>
          </div>
        </div>
      </div>

      <div className="hero-ed-marquee">
        <RotatingCounselorStrip/>
      </div>
    </section>
  );
}

function RotatingCounselorStrip() {
  const names = ['Marcus Aurelius', 'Epictetus', 'David Goggins', 'Theodore Roosevelt', 'Future Self', 'Siddhartha', 'Winston Churchill', 'Abraham Lincoln', 'Nelson Mandela', 'Rumi'];
  return (
    <div className="marquee">
      <div className="marquee-track">
        {[...names, ...names].map((n, i) => (
          <React.Fragment key={i}>
            <span className="marquee-name">{n}</span>
            <span className="marquee-dot">✦</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ============ HERO 2: Monumental ============
function HeroMonumental() {
  const [quoteIdx, setQuoteIdx] = React.useState(0);
  const hoistedQuotes = [
    { text: "What stands in the way becomes the way.", by: "Marcus Aurelius" },
    { text: "You have used 40% of your capacity.", by: "David Goggins" },
    { text: "The wound is where the light enters.", by: "Rumi" },
    { text: "Is what you're doing now something I would recognize?", by: "Future Self" },
  ];
  React.useEffect(() => {
    const t = setInterval(() => setQuoteIdx(i => (i + 1) % hoistedQuotes.length), 4200);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="hero-mon" data-screen-label="Hero · Monumental">
      <div className="hero-mon-bg"/>
      <div className="hero-mon-columns">
        <Column height={640}/>
        <Column height={640}/>
        <Column height={640}/>
        <Column height={640}/>
      </div>

      <div className="hero-mon-inner">
        <div className="hero-mon-kicker">— Ἀρετή —</div>
        <h1 className="hero-mon-title">
          Be who<br/>you want<br/>to be.
        </h1>
        <div className="hero-mon-rotator">
          {hoistedQuotes.map((q, i) => (
            <div key={i} className={`hero-mon-quote ${i === quoteIdx ? 'active' : ''}`}>
              <div className="hero-mon-q-text">"{q.text}"</div>
              <div className="hero-mon-q-by">— {q.by}</div>
            </div>
          ))}
        </div>
        <div className="hero-mon-cta">
          <a href="#download" className="btn-primary">Join the TestFlight beta →</a>
        </div>
      </div>

      <div className="hero-mon-marquee">
        <RotatingCounselorStrip/>
      </div>
    </section>
  );
}

// ============ CABINET SECTION ============
function CabinetSection({ bustVariant }) {
  const [selectedIdx, setSelectedIdx] = React.useState(0);
  const selected = COUNSELORS[selectedIdx];
  return (
    <section id="cabinet" className="cabinet-section" data-screen-label="Cabinet">
      <div className="section-head reveal">
        <div className="section-kicker">I · The Cabinet</div>
        <h2 className="section-title">A council you <em>build</em>.</h2>
        <div className="section-rule"><GoldRule variant="diamond" width={240}/></div>
        <p className="section-lede">
          Napoleon Hill called it the Cabinet of Invisible Counselors — a circle of admired figures whose imagined voices guide your hardest decisions. Arete makes them <em>respond</em>. Ten voices come pre-assembled; your full roster is yours to compose.
        </p>
      </div>

      <div className="cabinet-layout">
        <div className="cabinet-grid reveal">
          {COUNSELORS.map((c, i) => (
            <button
              key={c.slug}
              onClick={() => setSelectedIdx(i)}
              className={`cab-card ${i === selectedIdx ? 'active' : ''}`}
            >
              <div className="cab-bust"><MarbleBust slug={c.slug} size={130} variant={bustVariant}/></div>
              <div className="cab-name">{c.name}</div>
              <div className="cab-era">{c.era}</div>
              <div className="cab-tag">{c.tag}</div>
            </button>
          ))}
        </div>

        <aside className="cabinet-detail reveal">
          <div className="cab-detail-bust">
            <MarbleBust slug={selected.slug} size={200} variant={bustVariant}/>
          </div>
          <div className="cab-detail-role">{selected.role}</div>
          <div className="cab-detail-name">{selected.name}</div>
          <div className="cab-detail-cat">{selected.category}  ·  {selected.era}</div>
          <blockquote className="cab-detail-quote">
            "{selected.quote}"
          </blockquote>
          <p className="cab-detail-bio">{selected.bio}</p>
          <div className="cab-detail-voice">
            <span className="voice-label">Voice</span>
            {selected.voice}
          </div>
        </aside>
      </div>
    </section>
  );
}

// ============ A DAY IN ARETE ============
function DayInArete() {
  return (
    <section id="day" className="day-section" data-screen-label="A Day in Arete">
      <div className="section-head reveal">
        <div className="section-kicker">II · A Day in Arete</div>
        <h2 className="section-title">Morning asks.<br/>Evening answers.</h2>
        <div className="section-rule"><GoldRule variant="flourish" width={260}/></div>
        <p className="section-lede">
          The structure is simple. At dawn the Cabinet asks how you will use the day. At dusk it asks what you did with it. The space between belongs to you — logged, examined, honest.
        </p>
      </div>

      <div className="day-timeline">
        <DayStep time="07:00" icon="sun" title="Morning Check-In" desc="Push notification arrives. Open the app, mark your disciplines, write an intention. Marcus frames the day in terms of what is within your control.">
          <IOSDevice width={280} height={560} dark><AreteMorning/></IOSDevice>
        </DayStep>
        <DayStep time="12:30" icon="arena" title="The Arena" desc="Log work blocks, meals, training, reading. Optional mid-day check-in when a decision needs a second voice. The Cabinet does not flatter — it clarifies.">
          <IOSDevice width={280} height={560} dark><AreteHome/></IOSDevice>
        </DayStep>
        <DayStep time="21:00" icon="moon" title="Evening Debrief" desc="Reflect on the day you actually lived. The Cabinet responds honestly — celebrating what earned it, naming what fell short, extracting the lesson.">
          <IOSDevice width={280} height={560} dark><AreteCabinet/></IOSDevice>
        </DayStep>
      </div>
    </section>
  );
}

function DayStep({ time, title, desc, icon, children }) {
  return (
    <div className="day-step reveal">
      <div className="day-step-phone">{children}</div>
      <div className="day-step-text">
        <div className="day-step-time">{time}</div>
        <h3 className="day-step-title">{title}</h3>
        <p className="day-step-desc">{desc}</p>
      </div>
    </div>
  );
}

window.AreteSite = AreteSite;
window.TopBar = TopBar;
window.HeroEditorial = HeroEditorial;
window.HeroMonumental = HeroMonumental;
window.CabinetSection = CabinetSection;
window.DayInArete = DayInArete;

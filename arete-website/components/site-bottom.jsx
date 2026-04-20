// Remaining sections: Features, Scrolls, Principles, Pricing, FAQ, Footer

function FeaturesSection() {
  const features = [
    { title: 'Morning Check-in', desc: "Disciplines, intention, affirmation. The day starts on your terms.", iconPath: 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4L7.7 16.3M16.3 7.7l2.1-2.1 M12 8a4 4 0 100 8 4 4 0 000-8z' },
    { title: 'Cabinet Chat', desc: 'Talk to the whole council or one counselor at a time. They can disagree.', iconPath: 'M7 8h10M7 12h7M5 20l2-3h13V4H3v16z' },
    { title: 'Belief Journal', desc: 'Surface a half-formed belief. Examine it with a counselor until it stands or falls.', iconPath: 'M9 2h6l3 3v15l-3-2-3 2-3-2-3 2V5l3-3z M9 9h6M9 13h4' },
    { title: 'Habits & Disciplines', desc: 'Log what you actually did. Streaks measured in days of discipline.', iconPath: 'M6 6h12v12H6z M6 10h12 M10 6v12' },
    { title: 'Training Logs', desc: 'Boxing, running, strength — Goggins is watching and keeping count.', iconPath: 'M6 18l3-3 4 4 5-5 m-8 -2a3 3 0 100-6 3 3 0 000 6z' },
    { title: 'Evening Debrief', desc: 'Reflect on the day you lived. The Cabinet names wins and shortfalls.', iconPath: 'M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z' },
    { title: 'Scrolls', desc: 'Essays your cabinet drafts for you — motivation and direction in long form.', iconPath: 'M4 4h14a2 2 0 012 2v12a2 2 0 01-2 2H4V4z M4 4a2 2 0 012-2h14M8 8h8M8 12h8M8 16h5' },
    { title: 'Weekly Review', desc: 'Zoom out. What was true this week? Patterns surface. The long view returns.', iconPath: 'M3 3v18h18 M7 15l4-6 4 3 5-7' },
  ];
  return (
    <section id="features" className="features-section" data-screen-label="Features">
      <div className="section-head reveal">
        <div className="section-kicker">III · Features</div>
        <h2 className="section-title">More than a tracker.<br/>A <em>practice</em>.</h2>
        <div className="section-rule"><GoldRule variant="diamond" width={240}/></div>
      </div>
      <div className="features-grid reveal">
        {features.map((f, i) => (
          <div key={i} className="feat-card" style={{'--i': i}}>
            <div className="feat-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={f.iconPath}/>
              </svg>
            </div>
            <div className="feat-title">{f.title}</div>
            <div className="feat-desc">{f.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScrollsSection() {
  const scrolls = [
    { title: "On Beginning Before You Are Ready", author: 'Drafted by Theodore Roosevelt', mins: 7, kicker: 'ACTION', excerpt: "The arena admits the untrained. It is kinder to them than the stands ever are." },
    { title: "The Forty Percent Rule, Reconsidered", author: 'Drafted by David Goggins × Epictetus', mins: 9, kicker: 'DISCIPLINE', excerpt: "Two voices argue whether the number matters. The work does not care either way — it still has to be done." },
    { title: "What Your Future Self Remembers of This Week", author: 'Drafted by Future Self', mins: 5, kicker: 'PERSPECTIVE', excerpt: "Ten years from now you will not remember the meeting. You will remember whether you trained." },
  ];
  return (
    <section id="scrolls" className="scrolls-section" data-screen-label="Scrolls">
      <div className="section-head reveal">
        <div className="section-kicker">IV · Scrolls</div>
        <h2 className="section-title">Essays, drafted for you.</h2>
        <div className="section-rule"><GoldRule variant="flourish" width={260}/></div>
        <p className="section-lede">
          Ask the Cabinet to draft a long read on what you are working on — a new habit, a stalled goal, a belief you are examining. Kept in your library. Re-read when the wind shifts.
        </p>
      </div>
      <div className="scrolls-grid reveal">
        {scrolls.map((s, i) => (
          <article key={i} className="scroll-card">
            <div className="scroll-kicker">{s.kicker} · {s.mins} min</div>
            <h3 className="scroll-title">{s.title}</h3>
            <div className="scroll-author">{s.author}</div>
            <p className="scroll-excerpt">"{s.excerpt}"</p>
            <div className="scroll-footer">Read scroll →</div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PrinciplesSection() {
  const principles = [
    { n: 'I', title: 'No sycophancy', desc: 'The AI challenges. It does not flatter. Compliments are earned, not given.' },
    { n: 'II', title: 'Stoic foundation', desc: 'Every response grounded in the question: what is within your control?' },
    { n: 'III', title: 'Personal and deep', desc: 'The Cabinet knows your goals, your history, your pattern of excuses. Because you told it.' },
    { n: 'IV', title: 'Simple and focused', desc: 'Midnight and gold. No dopamine loops, no streak-bait, no clutter.' },
    { n: 'V', title: 'Honest and firm', desc: 'The Cabinet tells the truth. Always. Even when — especially when — you do not want to hear it.' },
    { n: 'VI', title: 'Built for the long game', desc: 'Daily use. Compounding returns. The goal is never stopping.' },
  ];
  return (
    <section id="principles" className="principles-section" data-screen-label="Principles">
      <div className="section-head reveal">
        <div className="section-kicker">V · Design Principles</div>
        <h2 className="section-title">Six rules that refuse<br/>to be broken.</h2>
        <div className="section-rule"><GoldRule variant="diamond" width={240}/></div>
      </div>
      <div className="principles-list reveal">
        {principles.map((p, i) => (
          <div key={i} className="principle-row">
            <div className="principle-numeral">{p.n}</div>
            <div className="principle-title">{p.title}</div>
            <div className="principle-desc">{p.desc}</div>
          </div>
        ))}
      </div>
      <div className="principles-seal reveal">
        <Ornament variant="laurel" size={48}/>
        <div className="seal-motto">The goal is never perfection. The goal is never stopping.</div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="pricing-section" data-screen-label="Pricing">
      <div className="section-head reveal">
        <div className="section-kicker">VI · Pricing</div>
        <h2 className="section-title">Free during beta.</h2>
        <div className="section-rule"><GoldRule variant="diamond" width={240}/></div>
      </div>
      <div className="pricing-cards reveal">
        <div className="price-card">
          <div className="price-tier">Beta</div>
          <div className="price-amount"><span className="price-currency">$</span>0</div>
          <div className="price-period">While we're on TestFlight</div>
          <ul className="price-list">
            <li>Full Cabinet access</li>
            <li>Morning & Evening routines</li>
            <li>Belief Journal</li>
            <li>Unlimited chats</li>
          </ul>
          <a href="#download" className="btn-primary full">Join the beta</a>
        </div>
        <div className="price-card featured">
          <div className="price-badge">At launch</div>
          <div className="price-tier">Arete</div>
          <div className="price-amount"><span className="price-currency">$</span>12<span className="price-per">/ mo</span></div>
          <div className="price-period">or $99 / year</div>
          <ul className="price-list">
            <li>Everything in Beta</li>
            <li>Custom Cabinet — build your own roster</li>
            <li>Weekly reviews & analytics</li>
            <li>Scrolls library (essays drafted for you)</li>
            <li>Training & nutrition trackers</li>
            <li>Accountability partner (shared progress)</li>
          </ul>
          <a href="#download" className="btn-primary full">Reserve pricing</a>
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const [open, setOpen] = React.useState(0);
  const faqs = [
    { q: "Is Arete a chatbot?", a: "No. A chatbot responds to what you type. The Cabinet responds to who you are — because it has your goals, your history, your Know Thyself profile, and a specific philosophical posture. Each counselor is a distinct voice with its own way of pushing back." },
    { q: "Do the counselors actually know me?", a: "They know what you tell them. Arete starts with Know Thyself — a short profile of your values, work, struggles, and who you're trying to become. That context threads through every response. The more you use it, the sharper the coaching." },
    { q: "Why Stoicism?", a: "Because it was built for difficult lives. Marcus wrote while governing an empire through plague. Epictetus taught as a freed slave. Stoicism is not aesthetic — it is a usable operating system for anyone trying to live well under pressure." },
    { q: "Can I build my own cabinet?", a: "At launch, yes. Assemble any combination of historical figures, fictional characters, mentors you admire, or imagined future selves. Upload references. The Cabinet learns the voice." },
    { q: "What does it cost?", a: "Free during the TestFlight beta. At launch: $12/month or $99/year. Beta users lock in founding pricing." },
    { q: "When is Android coming?", a: "After the iOS beta stabilizes — likely summer 2026. Web is phase three." },
    { q: "Is my data private?", a: "Your journal, goals, and conversations are yours. We use Supabase for storage, Claude for generation, and we do not train models on your content. Full privacy policy at launch." },
  ];
  return (
    <section id="faq" className="faq-section" data-screen-label="FAQ">
      <div className="section-head reveal">
        <div className="section-kicker">VII · Questions</div>
        <h2 className="section-title">The useful ones.</h2>
        <div className="section-rule"><GoldRule variant="diamond" width={240}/></div>
      </div>
      <div className="faq-list reveal">
        {faqs.map((f, i) => (
          <div key={i} className={`faq-item ${open === i ? 'open' : ''}`} onClick={() => setOpen(open === i ? -1 : i)}>
            <div className="faq-q">
              <span>{f.q}</span>
              <span className="faq-plus">{open === i ? '−' : '+'}</span>
            </div>
            <div className="faq-a-wrap">
              <div className="faq-a">{f.a}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <section id="download" className="footer-section" data-screen-label="Footer / CTA">
      <div className="footer-cta reveal">
        <Ornament variant="laurel" size={64}/>
        <h2 className="footer-title">Are you becoming who<br/>you want to be?</h2>
        <p className="footer-sub">The beta is open. Marcus is waiting.</p>
        <div className="footer-buttons">
          <a href="#" className="btn-primary big">
            <svg width="20" height="22" viewBox="0 0 24 28" fill="currentColor"><path d="M17.5 14.8c0-3 2.5-4.5 2.6-4.6-1.4-2.1-3.6-2.4-4.4-2.4-1.9-.2-3.6 1.1-4.6 1.1s-2.4-1.1-4-1c-2 0-3.9 1.2-4.9 3-2.1 3.7-.5 9.1 1.5 12.1 1 1.5 2.2 3.1 3.8 3 1.5-.1 2.1-1 4-1s2.4 1 4 .9c1.7 0 2.7-1.5 3.7-3 1.2-1.7 1.7-3.4 1.7-3.5-.1 0-3.3-1.3-3.4-5z"/></svg>
            TestFlight (iOS)
          </a>
          <a href="#" className="btn-ghost big">Android waitlist</a>
        </div>
      </div>
      <div className="footer-base">
        <div className="footer-brand">
          <Monogram size={36}/>
          <div>
            <div className="footer-brand-name">ARETE</div>
            <div className="footer-brand-motto">Ἀρετή · Excellence</div>
          </div>
        </div>
        <div className="footer-cols">
          <div>
            <div className="footer-col-title">Product</div>
            <a href="#cabinet">The Cabinet</a>
            <a href="#day">A Day</a>
            <a href="#features">Features</a>
            <a href="#scrolls">Scrolls</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div>
            <div className="footer-col-title">Philosophy</div>
            <a href="#principles">Principles</a>
            <a href="#">Manifesto</a>
            <a href="#">The Tagline</a>
          </div>
          <div>
            <div className="footer-col-title">Company</div>
            <a href="#">About</a>
            <a href="#">Contact</a>
            <a href="#">Privacy</a>
          </div>
        </div>
      </div>
      <div className="footer-copy">© 2026 Arete · The goal is never stopping.</div>
    </section>
  );
}

Object.assign(window, { FeaturesSection, ScrollsSection, PrinciplesSection, PricingSection, FAQSection, FooterSection });

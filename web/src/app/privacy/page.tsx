import ChapterRule from '@/components/ChapterRule';

// Server component on purpose: this is static legal copy and must render
// without JavaScript. Keep it factually true — the previous version claimed
// data stayed on-device, which was never the case.

const LAST_UPDATED = 'September 2, 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2
        className="text-[11px] tracking-[1.4px] uppercase mb-2"
        style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
      >
        {title}
      </h2>
      <div className="text-[14px] leading-relaxed space-y-3" style={{ color: '#9aa0a6' }}>
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen pb-24">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-5 pt-3 pb-5">
        <div
          className="text-[10px] tracking-[1.8px] uppercase mb-1"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: '#c9a84c' }}
        >
          Last updated {LAST_UPDATED}
        </div>
        <h1
          className="text-[32px] font-medium leading-none tracking-tight"
          style={{ fontFamily: 'var(--font-serif, Georgia, serif)', color: '#e6eef8' }}
        >
          Privacy<br />
          <em style={{ color: '#c9a84c' }}>policy.</em>
        </h1>
      </div>

      <ChapterRule className="mx-5" />

      <div className="px-5 max-w-2xl flex flex-col gap-7">
        <p className="text-[15px] leading-relaxed" style={{ color: '#e6eef8' }}>
          Arete (&ldquo;the App&rdquo;) is a personal excellence app. This policy explains what
          we collect, where it lives, who else sees it, and how to get rid of it.
        </p>

        <Section title="What we collect">
          <ul className="space-y-2 pl-4">
            <li>&bull; Your account: the email address you sign in with, and the first name you give us.</li>
            <li>&bull; Your Know Thyself profile: background, identity, goals, strengths, weaknesses, patterns, defining moments, and your description of your future self.</li>
            <li>&bull; Your writing: journal entries, beliefs, and the reflections you save from the evening routine.</li>
            <li>&bull; Your routines: morning and evening check-ins, streaks, goals, and focus sessions.</li>
            <li>&bull; Your reading: books, pages, and reading sessions you record.</li>
            <li>&bull; Your Cabinet conversations: everything you send to your counselors and everything they send back, including shared sessions you take part in.</li>
            <li>&bull; Billing records: subscription status and identifiers from our payment processor. We never see or store your card details.</li>
          </ul>
        </Section>

        <Section title="Where it is stored">
          <p>
            All of the above is stored in the App&apos;s database, hosted by Supabase, under your
            account. It is not stored only on your device: it syncs so that the web app and the
            iOS app show you the same thing. Row-level security restricts each row to the account
            that owns it.
          </p>
          <p>
            A small amount of convenience state — a saved draft, a dismissed banner, your
            preference for what the Cabinet may see — is kept in your browser&apos;s local storage
            and never leaves your device.
          </p>
        </Section>

        <Section title="How it is used">
          <p>
            We use your data to run the App: to show you your own history, and to give your
            counselors the context that makes their answers worth reading.
          </p>
          <p>
            When you write to the Cabinet, your message, recent conversation history, and relevant
            profile context are sent to the third-party AI providers whose models generate the
            counselor responses. Those providers process the request on our behalf in order to
            return an answer. We do not sell your data, and we do not use it for advertising.
          </p>
          <p>
            Subscription payments are handled by Stripe. Stripe receives the billing details you
            enter and returns us your subscription status; your account is unlocked from that
            status alone.
          </p>
        </Section>

        <Section title="What we do not collect on the web">
          <p>
            The web app collects no screen-time data, no health or sleep data, and no calendar
            data. Your counselors are told plainly that they cannot see those things rather than
            being left to guess at them.
          </p>
        </Section>

        <Section title="Deleting your account">
          <p>
            Settings &rarr; Delete Account permanently deletes your account and everything
            attached to it — conversations, journal entries, beliefs, routines, reading data, and
            subscription records — and cancels any active subscription. This cannot be undone.
          </p>
        </Section>

        <Section title="Children&rsquo;s privacy">
          <p>
            The App is not intended for children under 13, and we do not knowingly collect
            information from them.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions, requests, or corrections:{' '}
            <a
              href="mailto:support@pursuearete.com"
              className="hover:opacity-80"
              style={{ color: '#c9a84c' }}
            >
              support@pursuearete.com
            </a>
          </p>
        </Section>
      </div>
    </div>
  );
}

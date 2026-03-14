import PageHeader from '@/components/PageHeader';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-arete-bg p-6 md:p-8 max-w-2xl">
      <PageHeader title="Privacy Policy" subtitle="Last updated March 5, 2026" />

      <div className="space-y-6 text-arete-muted text-sm leading-relaxed">
        <p className="text-arete-text">
          Arete (&ldquo;the App&rdquo;) is a personal excellence app. This Privacy Policy explains what information is collected, how it is used, and your rights.
        </p>

        <section>
          <h2 className="text-arete-gold font-semibold mb-2">Information We Collect</h2>
          <p className="mb-2">The App collects the following information:</p>
          <ul className="space-y-2 pl-4">
            <li>• Your first name — entered during setup and stored locally on your device only.</li>
            <li>• Personal profile information — background, goals, and reflections; stored locally.</li>
            <li>• Journal entries — stored locally on your device only.</li>
            <li>• Messages to the Cabinet — messages and relevant profile context may be sent to Anthropic&apos;s API to generate responses.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-arete-gold font-semibold mb-2">How We Use Your Information</h2>
          <p>
            Your profile and journal data remains on your device and is not transmitted to our servers. When you use the Cabinet feature, your message and a summary of profile context may be sent to Anthropic; see Anthropic&apos;s Privacy Policy for details.
          </p>
        </section>

        <section>
          <h2 className="text-arete-gold font-semibold mb-2">Data Storage</h2>
          <p>
            Personal data is stored locally (localStorage in the browser). Clearing your browser data or using a different browser will remove your local data.
          </p>
        </section>

        <section>
          <h2 className="text-arete-gold font-semibold mb-2">Children&apos;s Privacy</h2>
          <p>
            The App is not intended for children under 13. We do not knowingly collect information from children under 13.
          </p>
        </section>

        <section>
          <h2 className="text-arete-gold font-semibold mb-2">Contact</h2>
          <p>Contact: you@yourdomain.com</p>
        </section>
      </div>
    </div>
  );
}

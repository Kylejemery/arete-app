'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getEnrollment } from '@/lib/db';
import { Card, CardLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Topbar from '@/components/navigation/Topbar';
import type { Enrollment, Tier } from '@/types';

const TIER_DETAILS: Record<Tier, { label: string; price: string; agents: string[]; description: string }> = {
  auditor: {
    label: 'Auditor',
    price: '$19/mo',
    agents: ['Socratic Proctor'],
    description: 'Access to PHIL 701 and the Socratic Proctor. The beginning of the examined life.',
  },
  scholar: {
    label: 'Scholar',
    price: '$39/mo',
    agents: ['Socratic Proctor', 'The Archivist', 'The Examiner'],
    description: 'Full curriculum and three agents. You are now a serious student.',
  },
  fellow: {
    label: 'Fellow',
    price: '$79/mo',
    agents: ['All six agents'],
    description: 'The complete doctoral experience. No restrictions.',
  },
};

export default function ProfilePage() {
  const [email, setEmail] = useState('');
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmail(user.email ?? '');
      const enroll = await getEnrollment();
      setEnrollment(enroll);
      setLoaded(true);
    }
    load();
  }, []);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-academy-muted italic text-sm">Loading profile...</p>
      </div>
    );
  }

  const tier = (enrollment?.tier ?? 'auditor') as Tier;
  const tierDetails = TIER_DETAILS[tier];
  const enrolledDate = enrollment?.enrolled_at
    ? new Date(enrollment.enrolled_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown';

  return (
    <div>
      <Topbar title="Student Profile" subtitle="Know thyself" />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Account Info */}
        <Card>
          <CardLabel>Account</CardLabel>
          <p className="text-academy-text text-sm font-medium mb-1">{email}</p>
          <p className="text-academy-muted text-xs">Enrolled {enrolledDate}</p>
          <div className="mt-4 pt-4 border-t border-academy-border">
            <p className="text-academy-muted text-xs mb-3">
              Account settings and password changes are managed through your Arete account.
            </p>
            <a
              href="https://areteapp.com/settings"
              className="text-academy-gold text-xs hover:opacity-80 transition-opacity"
            >
              Manage account settings →
            </a>
          </div>
        </Card>

        {/* Standing */}
        <Card gold>
          <CardLabel>Academic Standing</CardLabel>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-serif text-2xl text-academy-text">{tierDetails.label}</p>
              <p className="text-academy-gold text-sm">{tierDetails.price}</p>
            </div>
            <div className="text-3xl">🎓</div>
          </div>
          <p className="text-academy-muted text-sm leading-relaxed mb-4">{tierDetails.description}</p>
          <div>
            <p className="text-academy-muted text-xs uppercase tracking-wider mb-2">Available Agents</p>
            <div className="flex flex-wrap gap-2">
              {tierDetails.agents.map(a => (
                <span key={a} className="text-xs border border-academy-border rounded-full px-3 py-1 text-academy-text">
                  {a}
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* Current Course */}
        <Card>
          <CardLabel>Current Course</CardLabel>
          <p className="text-academy-text font-semibold text-sm uppercase tracking-wider">
            {enrollment?.current_course?.toUpperCase().replace('-', ' ') ?? 'PHIL 701'}
          </p>
          <p className="text-academy-muted text-xs mt-1">
            Program: PhD in Stoic Philosophy
          </p>
        </Card>

        {/* Upgrade CTA — only for non-fellows */}
        {tier !== 'fellow' && (
          <Card>
            <CardLabel>Upgrade Standing</CardLabel>
            <p className="text-academy-muted text-sm leading-relaxed mb-4">
              {tier === 'auditor'
                ? 'Upgrade to Scholar to unlock the full curriculum, The Archivist, and The Examiner.'
                : 'Upgrade to Fellow to unlock all six agents including The Dialectician, Rhetorician, and Chronologist.'}
            </p>
            <Button
              onClick={() => alert('Stripe integration coming in Phase 2.')}
            >
              Upgrade to {tier === 'auditor' ? 'Scholar — $39/mo' : 'Fellow — $79/mo'}
            </Button>
            <p className="text-academy-muted text-xs mt-2 italic">
              Payment integration coming in Phase 2.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

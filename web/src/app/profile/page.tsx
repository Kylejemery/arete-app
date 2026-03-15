'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getItem, setItem } from '@/lib/storage';
import PageHeader from '@/components/PageHeader';

const YEAR_OPTIONS = [5, 10, 15, 20];

export default function ProfilePage() {
  const router = useRouter();
  const [background, setBackground] = useState('');
  const [identity, setIdentity] = useState('');
  const [goals, setGoals] = useState('');
  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [patterns, setPatterns] = useState('');
  const [majorEvents, setMajorEvents] = useState('');
  const [futureSelfYears, setFutureSelfYears] = useState(10);
  const [futureSelfDescription, setFutureSelfDescription] = useState('');
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const name = getItem('userName');
    if (!name) { router.replace('/onboarding'); return; }

    setBackground(getItem('kt_background') || '');
    setIdentity(getItem('kt_identity') || '');
    setGoals(getItem('kt_goals') || '');
    setStrengths(getItem('kt_strengths') || '');
    setWeaknesses(getItem('kt_weaknesses') || '');
    setPatterns(getItem('kt_patterns') || '');
    setMajorEvents(getItem('kt_major_events') || '');
    setFutureSelfYears(parseInt(getItem('futureSelfYears') || '10'));
    setFutureSelfDescription(getItem('futureSelfDescription') || '');
    setLoaded(true);
  }, [router]);

  const handleSave = () => {
    setItem('kt_background', background.trim());
    setItem('kt_identity', identity.trim());
    setItem('kt_goals', goals.trim());
    setItem('userGoals', goals.trim());
    setItem('kt_strengths', strengths.trim());
    setItem('kt_weaknesses', weaknesses.trim());
    setItem('kt_patterns', patterns.trim());
    setItem('kt_major_events', majorEvents.trim());
    setItem('futureSelfYears', String(futureSelfYears));
    setItem('futureSelfDescription', futureSelfDescription.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!loaded) return null;

  const inputClass = "bg-arete-bg border border-arete-border rounded-lg px-3 py-2 text-arete-text focus:border-arete-gold focus:outline-none w-full";
  const textareaClass = `${inputClass} resize-none`;

  const sections = [
    { label: 'Background & Life Story', sub: 'Where did you come from? What shaped you?', value: background, onChange: setBackground, rows: 5 },
    { label: 'Professional Identity & Pursuits', sub: 'What do you do? What are you building?', value: identity, onChange: setIdentity, rows: 4 },
    { label: 'Goals', sub: 'What are you working toward? Be specific.', value: goals, onChange: setGoals, rows: 4 },
    { label: 'Strengths', sub: 'What are you genuinely good at?', value: strengths, onChange: setStrengths, rows: 3 },
    { label: 'Weaknesses', sub: 'Where do you consistently fall short?', value: weaknesses, onChange: setWeaknesses, rows: 3 },
    { label: 'Patterns & Failure Modes', sub: 'What do you do when things get hard?', value: patterns, onChange: setPatterns, rows: 4 },
    { label: 'Major Life Events', sub: 'What defining moments shaped who you are?', value: majorEvents, onChange: setMajorEvents, rows: 4 },
  ];

  return (
    <div className="min-h-screen bg-arete-bg p-6 md:p-8">
      <PageHeader title="Know Thyself" subtitle="The Cabinet reads this before every session" />

      <p className="text-arete-muted text-sm mb-6 bg-arete-surface rounded-lg border border-arete-border p-4">
        Changes take effect on your next Cabinet session. The more honest and specific you are here, the more useful your counselors will be.
      </p>

      <div className="space-y-6">
        {sections.map(section => (
          <div key={section.label} className="bg-arete-surface rounded-lg border border-arete-border p-4">
            <label className="text-arete-gold font-semibold text-sm block mb-1">{section.label}</label>
            <p className="text-arete-muted text-xs mb-2">{section.sub}</p>
            <textarea
              className={textareaClass}
              rows={section.rows}
              value={section.value}
              onChange={e => section.onChange(e.target.value)}
            />
          </div>
        ))}

        {/* Future Self */}
        <div className="bg-arete-surface rounded-lg border border-arete-border p-4">
          <label className="text-arete-gold font-semibold text-sm block mb-1">Future Self</label>
          <p className="text-arete-muted text-xs mb-3">Who will you be if you do the work?</p>
          <div className="flex gap-2 mb-3">
            {YEAR_OPTIONS.map(y => (
              <button
                key={y}
                onClick={() => setFutureSelfYears(y)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${futureSelfYears === y ? 'bg-arete-gold text-arete-bg border-arete-gold' : 'border-arete-border text-arete-muted hover:border-arete-gold hover:text-arete-text'}`}
              >
                {y} yrs
              </button>
            ))}
          </div>
          <textarea
            className={textareaClass}
            rows={5}
            placeholder={`Describe who you are ${futureSelfYears} years from now...`}
            value={futureSelfDescription}
            onChange={e => setFutureSelfDescription(e.target.value)}
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 sticky bottom-6">
        <button
          onClick={handleSave}
          className={`w-full font-semibold rounded-lg px-4 py-3 transition-all ${
            saved
              ? 'bg-green-600 text-white'
              : 'bg-arete-gold text-arete-bg hover:opacity-90'
          }`}
        >
          {saved ? '✓ Profile Saved' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}

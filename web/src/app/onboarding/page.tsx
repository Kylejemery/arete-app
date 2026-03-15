'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setItem } from '@/lib/storage';
import { COUNSELOR_LIST } from '@/lib/counselors';

const TOTAL_STEPS = 11;
const OPTIONAL_STEPS = [3, 4, 6, 7, 8];
const YEAR_OPTIONS = [5, 10, 15, 20];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [name, setName] = useState('');
  const [background, setBackground] = useState('');
  const [identity, setIdentity] = useState('');
  const [goals, setGoals] = useState('');
  const [strengths, setStrengths] = useState('');
  const [weaknesses, setWeaknesses] = useState('');
  const [patterns, setPatterns] = useState('');
  const [majorEvents, setMajorEvents] = useState('');
  const [futureSelfYears, setFutureSelfYears] = useState(10);
  const [futureSelfDescription, setFutureSelfDescription] = useState('');
  const [activeMembers, setActiveMembers] = useState<string[]>([
    'marcus', 'epictetus', 'goggins', 'roosevelt', 'futureSelf',
  ]);

  const isOptionalStep = OPTIONAL_STEPS.includes(step);

  const canContinue = (): boolean => {
    if (step === 2) return name.trim().length > 0;
    if (step === 5) return goals.trim().length > 0;
    if (step === 9) return futureSelfDescription.trim().length > 0;
    if (step === 10) {
      const optionals = activeMembers.filter(id => id !== 'marcus' && id !== 'futureSelf');
      return optionals.length > 0;
    }
    return true;
  };

  const toggleMember = (id: string) => {
    if (id === 'marcus' || id === 'futureSelf') return;
    const isActive = activeMembers.includes(id);
    if (isActive) {
      const optionals = activeMembers.filter(m => m !== 'marcus' && m !== 'futureSelf');
      if (optionals.length <= 1) return;
      setActiveMembers(activeMembers.filter(m => m !== id));
    } else {
      setActiveMembers([...activeMembers, id]);
    }
  };

  const handleCommit = () => {
    setItem('userName', name.trim());
    setItem('userGoals', goals.trim());
    setItem('kt_background', background.trim());
    setItem('kt_identity', identity.trim());
    setItem('kt_goals', goals.trim());
    setItem('kt_strengths', strengths.trim());
    setItem('kt_weaknesses', weaknesses.trim());
    setItem('kt_patterns', patterns.trim());
    setItem('kt_major_events', majorEvents.trim());
    setItem('futureSelfYears', String(futureSelfYears));
    setItem('futureSelfDescription', futureSelfDescription.trim());
    setItem('cabinetMembers', JSON.stringify(activeMembers));
    router.replace('/');
  };

  const progressPercent = Math.round((step / TOTAL_STEPS) * 100);

  const inputClass = "bg-arete-bg border border-arete-border rounded-lg px-3 py-2 text-arete-text focus:border-arete-gold focus:outline-none w-full";
  const textareaClass = `${inputClass} resize-none`;
  const btnPrimary = "bg-arete-gold text-arete-bg font-semibold rounded-lg px-6 py-2.5 hover:opacity-90 transition-opacity";

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h1 className="text-5xl font-bold text-arete-gold tracking-widest">ARETE</h1>
            <p className="text-arete-text text-xl italic">Be who you want to be.</p>
            <div className="h-px bg-arete-border" />
            <p className="text-arete-muted leading-relaxed">
              The Cabinet of Invisible Counselors is an ancient practice, revived for this moment.
              Within this app, you will assemble a council of history&apos;s most tested minds and ask
              them to accompany you through your own trials.
            </p>
            <p className="text-arete-muted leading-relaxed">
              They will not flatter you. They will not accept your excuses. They will hold you
              to the standard you claim to want.
            </p>
            <p className="text-arete-muted leading-relaxed">
              This is not a productivity app. This is a commitment to excellence — the Greek ideal
              of <span className="text-arete-gold">arete</span>: virtue, excellence, the fullest
              expression of what you are capable of becoming.
            </p>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-arete-gold font-semibold text-xl">What shall we call you?</h2>
            <p className="text-arete-muted text-sm">
              The Cabinet will address you by name. Choose carefully — this is how you will be known here.
            </p>
            <input
              className={inputClass}
              placeholder="Your first name..."
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-arete-gold font-semibold text-xl">Background &amp; Life Story</h2>
            <p className="text-arete-muted text-sm">
              Where did you come from? What shaped you? What battles have you already fought?
            </p>
            <textarea
              className={textareaClass}
              rows={6}
              placeholder="Tell the Cabinet who you are and where you come from..."
              value={background}
              onChange={e => setBackground(e.target.value)}
            />
            <p className="text-arete-muted text-xs italic">Optional — you can skip this now and fill it in on the profile page later.</p>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-arete-gold font-semibold text-xl">Professional Identity &amp; Pursuits</h2>
            <p className="text-arete-muted text-sm">
              What do you do? What are you building? What does your work mean to you?
            </p>
            <textarea
              className={textareaClass}
              rows={6}
              placeholder="Describe your professional life and what you are pursuing..."
              value={identity}
              onChange={e => setIdentity(e.target.value)}
            />
            <p className="text-arete-muted text-xs italic">Optional</p>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h2 className="text-arete-gold font-semibold text-xl">Your Goals</h2>
            <p className="text-arete-muted text-sm">
              What are you working toward? Be specific. The Cabinet will hold you to these.
            </p>
            <textarea
              className={textareaClass}
              rows={6}
              placeholder="State your goals clearly..."
              value={goals}
              onChange={e => setGoals(e.target.value)}
            />
            <p className="text-arete-muted text-xs italic">Required — this powers the Cabinet&apos;s coaching.</p>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <h2 className="text-arete-gold font-semibold text-xl">Strengths &amp; Weaknesses</h2>
            <p className="text-arete-muted text-sm">Be honest. The Cabinet will use this to both leverage and challenge you.</p>
            <div>
              <label className="text-arete-text text-sm font-medium block mb-1">Strengths</label>
              <textarea
                className={textareaClass}
                rows={3}
                placeholder="What are you genuinely good at?"
                value={strengths}
                onChange={e => setStrengths(e.target.value)}
              />
            </div>
            <div>
              <label className="text-arete-text text-sm font-medium block mb-1">Weaknesses</label>
              <textarea
                className={textareaClass}
                rows={3}
                placeholder="Where do you consistently fall short?"
                value={weaknesses}
                onChange={e => setWeaknesses(e.target.value)}
              />
            </div>
            <p className="text-arete-muted text-xs italic">Optional</p>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <h2 className="text-arete-gold font-semibold text-xl">Patterns &amp; Failure Modes</h2>
            <p className="text-arete-muted text-sm">
              What do you do when things get hard? What are your recurring patterns of self-sabotage or avoidance?
            </p>
            <textarea
              className={textareaClass}
              rows={6}
              placeholder="Describe your patterns, tendencies, and failure modes..."
              value={patterns}
              onChange={e => setPatterns(e.target.value)}
            />
            <p className="text-arete-muted text-xs italic">Optional</p>
          </div>
        );

      case 8:
        return (
          <div className="space-y-4">
            <h2 className="text-arete-gold font-semibold text-xl">Major Life Events</h2>
            <p className="text-arete-muted text-sm">
              What defining moments shaped who you are? What have you survived, overcome, or been changed by?
            </p>
            <textarea
              className={textareaClass}
              rows={6}
              placeholder="Describe the events that made you who you are..."
              value={majorEvents}
              onChange={e => setMajorEvents(e.target.value)}
            />
            <p className="text-arete-muted text-xs italic">Optional</p>
          </div>
        );

      case 9:
        return (
          <div className="space-y-4">
            <h2 className="text-arete-gold font-semibold text-xl">Your Future Self</h2>
            <p className="text-arete-muted text-sm">
              Who will you be if you do the work? Describe that person in as much detail as you can.
            </p>
            <div>
              <label className="text-arete-text text-sm font-medium block mb-2">Years from now:</label>
              <div className="flex gap-2">
                {YEAR_OPTIONS.map(y => (
                  <button
                    key={y}
                    onClick={() => setFutureSelfYears(y)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${futureSelfYears === y ? 'bg-arete-gold text-arete-bg border-arete-gold' : 'border-arete-border text-arete-muted hover:border-arete-gold hover:text-arete-text'}`}
                  >
                    {y} yrs
                  </button>
                ))}
              </div>
            </div>
            <textarea
              className={textareaClass}
              rows={6}
              placeholder={`Describe who you are ${futureSelfYears} years from now...`}
              value={futureSelfDescription}
              onChange={e => setFutureSelfDescription(e.target.value)}
            />
            <p className="text-arete-muted text-xs italic">Required — your Future Self will join your Cabinet.</p>
          </div>
        );

      case 10:
        return (
          <div className="space-y-4">
            <h2 className="text-arete-gold font-semibold text-xl">Choose Your Cabinet</h2>
            <p className="text-arete-muted text-sm">
              Select which counselors will join your Cabinet. Marcus Aurelius and your Future Self are always present.
            </p>
            <div className="space-y-3">
              {COUNSELOR_LIST.map(member => {
                const isActive = activeMembers.includes(member.id);
                return (
                  <button
                    key={member.id}
                    onClick={() => toggleMember(member.id)}
                    disabled={member.locked}
                    className={`w-full text-left rounded-lg border p-4 transition-colors ${
                      isActive
                        ? 'bg-arete-gold border-arete-gold'
                        : 'bg-arete-surface border-arete-border hover:border-arete-gold'
                    } ${member.locked ? 'opacity-80 cursor-default' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-semibold ${isActive ? 'text-arete-bg' : 'text-arete-text'}`}>{member.name}</p>
                        <p className={`text-xs mt-0.5 ${isActive ? 'text-arete-bg opacity-80' : 'text-arete-muted'}`}>{member.role}</p>
                        <p className={`text-sm mt-1 ${isActive ? 'text-arete-bg opacity-90' : 'text-arete-muted'}`}>{member.description}</p>
                      </div>
                      {member.locked ? (
                        <span className={`text-xs px-2 py-1 rounded ${isActive ? 'bg-arete-bg text-arete-gold' : 'bg-arete-border text-arete-muted'}`}>Locked</span>
                      ) : (
                        <span className={`text-lg ${isActive ? 'text-arete-bg' : 'text-arete-muted'}`}>{isActive ? '✓' : '+'}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 11:
        return (
          <div className="space-y-6">
            <h2 className="text-arete-gold font-semibold text-2xl">Your Commitment</h2>
            <p className="text-arete-muted leading-relaxed">
              You have assembled your Cabinet. They know your goals. They know your weaknesses. They know who you are trying to become.
            </p>
            <p className="text-arete-muted leading-relaxed">
              From this point forward, your Cabinet will hold you to the standard you have set for yourself. They will not let you hide.
            </p>
            <div className="bg-arete-surface rounded-lg border border-arete-border p-4 space-y-2">
              <p className="text-arete-text font-semibold">Your name: <span className="text-arete-gold">{name}</span></p>
              <p className="text-arete-text font-semibold">Cabinet: <span className="text-arete-gold">{activeMembers.map(id => id === 'futureSelf' ? 'Future Self' : id.charAt(0).toUpperCase() + id.slice(1)).join(', ')}</span></p>
              {goals && <p className="text-arete-text font-semibold">Goal: <span className="text-arete-muted text-sm">{goals.length > 100 ? goals.slice(0, 100) + '…' : goals}</span></p>}
            </div>
            <p className="text-arete-gold italic text-sm">
              &ldquo;Waste no more time arguing about what a good man should be. Be one.&rdquo; — Marcus Aurelius
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-arete-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-arete-muted text-xs">Step {step} of {TOTAL_STEPS}</span>
            {isOptionalStep && <span className="text-arete-muted text-xs italic">Optional</span>}
          </div>
          <div className="h-1.5 bg-arete-border rounded-full overflow-hidden">
            <div
              className="h-full bg-arete-gold transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="bg-arete-surface rounded-xl border border-arete-border p-6 md:p-8 mb-6">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
            className="text-arete-muted hover:text-arete-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
          >
            ← Back
          </button>

          {step < TOTAL_STEPS ? (
            <div className="flex gap-2">
              {isOptionalStep && (
                <button
                  onClick={() => setStep(s => s + 1)}
                  className="text-arete-muted hover:text-arete-text text-sm transition-colors"
                >
                  Skip
                </button>
              )}
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canContinue()}
                className={`${btnPrimary} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                Continue
              </button>
            </div>
          ) : (
            <button onClick={handleCommit} className={btnPrimary}>
              Begin ⚔️
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

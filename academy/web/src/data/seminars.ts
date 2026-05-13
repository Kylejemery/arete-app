import type { BriefingData } from '@/components/PreSeminarBriefing';

export const SEMINARS: Record<string, BriefingData[]> = {
  'phil-701': [
    {
      session: 1,
      title: 'What is Philosophy For?',
      problem: 'We inherit philosophy as an academic discipline — a body of texts to be read, positions to be understood, arguments to be evaluated. But the Stoics did not think of philosophy this way. For them, philosophy was a set of practices, not a set of propositions. Hadot calls these "spiritual exercises." The problem of this seminar is simple and unsettling: if Hadot is right, modern philosophy has fundamentally misread the ancients.',
      whyItMatters: 'How you answer this question determines what kind of student you become. If philosophy is a body of knowledge, your job is to learn it. If philosophy is a practice, your job is to do it — which is much harder, and much more demanding.',
      watchFor: [
        'Hadot\'s distinction between "philosophy as discourse" and "philosophy as way of life"',
        'The concept of spiritual exercises: attention (prosoche), meditation, the view from above',
        'The difference between reading a Stoic text as doctrine versus reading it as exercise',
        'Where you find yourself resisting Hadot\'s thesis — and why',
      ],
      yourTask: 'Before engaging the Proctor, write one sentence stating what you believe philosophy is for. Then bring that sentence into the seminar and be prepared to defend it against the question: how do you know?',
    },
  ],
};

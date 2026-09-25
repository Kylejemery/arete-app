'use client';

// The Agora is closed to teens (13-17) until there is a moderation plan (run
// B, Part B5). The database enforces it; this says so plainly instead of an
// empty room. Everyone else sees exactly what they saw before.
import Link from 'next/link';
import { useAgeStatus } from '@/lib/useAgeStatus';

export default function AgoraTeenGate({ children }: { children: React.ReactNode }) {
  const { isTeen } = useAgeStatus();
  if (!isTeen) return <>{children}</>;
  return (
    <div className="max-w-xl mx-auto px-6 py-24">
      <h1 className="text-2xl mb-3" style={{ color: '#c9a84c' }}>The Agora is not open to you yet</h1>
      <p className="text-[15px] leading-relaxed mb-6">It is for members 18 and older for now. Your Cabinet is here whenever you want it.</p>
      <Link href="/cabinet" className="text-sm underline" style={{ color: '#c9a84c' }}>Go to your Cabinet</Link>
    </div>
  );
}

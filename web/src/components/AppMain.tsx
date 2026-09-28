'use client';

import { usePathname } from 'next/navigation';
import { showsAppChrome } from '@/lib/appChrome';

// The page's scroll container. It leaves room for the sidebar (desktop) and
// the floating pill nav (mobile) only on routes that show them, so the sign
// in page is centred in the full window (retention plan R12 j).
export default function AppMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const chrome = showsAppChrome(pathname);
  return (
    <main className={`${chrome ? 'md:ml-[220px] pb-24 md:pb-0' : ''} h-full overflow-y-auto relative z-10`}>
      {children}
    </main>
  );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const navItems = [
  { href: '/dashboard',         label: 'Dashboard',  icon: '🏛️' },
  { href: '/dashboard/courses', label: 'Courses',    icon: '📚' },
  { href: '/dashboard/library', label: 'Library',    icon: '📜' },
  { href: '/dashboard/papers',  label: 'Papers',     icon: '✒️' },
  { href: '/dashboard/profile', label: 'Profile',    icon: '👤' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 min-h-screen bg-academy-surface border-r border-academy-border fixed left-0 top-0">
        <div className="p-6 border-b border-academy-border">
          <p className="text-academy-muted text-xs tracking-[0.3em] uppercase mb-1">Arete</p>
          <h1 className="font-serif text-academy-gold text-2xl tracking-wide">Academy</h1>
          <p className="text-academy-muted text-xs mt-1 italic">PhD in Stoic Philosophy</p>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                isActive(item.href)
                  ? 'text-academy-gold bg-academy-bg border-r-2 border-academy-gold'
                  : 'text-academy-muted hover:text-academy-text hover:bg-academy-bg'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-academy-border space-y-2">
          <a
            href="https://areteapp.com"
            className="block text-academy-muted text-xs hover:text-academy-text transition-colors"
          >
            ← Back to Arete
          </a>
          <button
            onClick={handleSignOut}
            className="text-red-400 text-xs hover:text-red-300 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-academy-surface border-t border-academy-border z-50">
        <div className="flex">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-3 flex-1 text-xs transition-colors ${
                isActive(item.href) ? 'text-academy-gold' : 'text-academy-muted'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

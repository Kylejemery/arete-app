import Sidebar from '@/components/navigation/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-academy-bg text-academy-text min-h-screen">
      <Sidebar />
      <main className="md:ml-60 pb-24 md:pb-0 min-h-screen">
        <div className="p-6 md:p-10 max-w-5xl">
          {children}
        </div>
      </main>
    </div>
  );
}

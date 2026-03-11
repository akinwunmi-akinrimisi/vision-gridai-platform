import Sidebar from './Sidebar';
import SupervisorToastProvider from '../SupervisorToastProvider';

export default function AppLayout({ children, onLogout }) {
  return (
    <SupervisorToastProvider>
      <div className="flex min-h-screen bg-surface dark:bg-surface-dark">
        {/* Subtle gradient overlay for dark mode depth */}
        <div className="fixed inset-0 pointer-events-none dark:bg-gradient-to-br dark:from-primary-900/[0.05] dark:via-transparent dark:to-accent-600/[0.03]" />

        <Sidebar onLogout={onLogout} />

        <main className="relative flex-1 min-w-0 overflow-y-auto scrollbar-thin">
          <div className="p-5 lg:p-8 pt-16 lg:pt-8 max-w-[1440px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </SupervisorToastProvider>
  );
}

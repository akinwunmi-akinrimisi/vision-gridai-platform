import Sidebar from './Sidebar';
import SupervisorToastProvider from '../SupervisorToastProvider';

export default function AppLayout({ children, onLogout }) {
  return (
    <SupervisorToastProvider>
      <div className="flex min-h-screen bg-surface dark:bg-surface-dark">
        <Sidebar onLogout={onLogout} />
        <main className="flex-1 min-w-0 overflow-y-auto scrollbar-thin">
          <div className="p-5 lg:p-8 pt-16 lg:pt-8 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </SupervisorToastProvider>
  );
}

import Sidebar from './Sidebar';

export default function AppLayout({ children, onLogout }) {
  return (
    <div className="flex min-h-screen bg-surface dark:bg-surface-dark">
      <Sidebar onLogout={onLogout} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-6 lg:p-8 pt-16 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}

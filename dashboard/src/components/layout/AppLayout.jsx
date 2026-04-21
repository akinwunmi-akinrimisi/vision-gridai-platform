import { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import CommandPalette from './CommandPalette';
import LimitedModeBanner from './LimitedModeBanner';

export default function AppLayout({ children, onLogout }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        onLogout={onLogout}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
        />
        <LimitedModeBanner />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-7 pt-20 max-w-[1440px] mx-auto">{children}</div>
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}

import { useState } from 'react';
import { NavLink, useParams } from 'react-router';
import {
  LayoutDashboard,
  Monitor,
  ListChecks,
  FileText,
  Activity,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import ConnectionStatus from './ConnectionStatus';

const navItems = [
  { label: 'Home', icon: LayoutDashboard, path: '/', exact: true },
  { label: 'Dashboard', icon: Monitor, path: '/project/:id', needsProject: true },
  { label: 'Topics', icon: ListChecks, path: '/project/:id/topics', needsProject: true },
  { label: 'Scripts', icon: FileText, path: '/project/:id/topics/:topicId/script', needsProject: true },
  { label: 'Production', icon: Activity, path: '/project/:id/production', needsProject: true },
  { label: 'Analytics', icon: BarChart3, path: '/project/:id/analytics', needsProject: true },
  { label: 'Settings', icon: Settings, path: '/project/:id/settings', needsProject: true },
];

function resolveNavPath(pathTemplate, projectId) {
  return pathTemplate
    .replace(':id', projectId || '_')
    .replace(':topicId', '_');
}

export default function Sidebar({ onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { id: projectId } = useParams();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border dark:border-border-dark">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-white font-bold text-sm">V</span>
        </div>
        {!collapsed && (
          <span className="font-semibold text-slate-900 dark:text-white truncate">
            Vision GridAI
          </span>
        )}
      </div>

      {/* Project switcher */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-border dark:border-border-dark">
          <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-text-muted dark:text-text-muted-dark bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer truncate">
            Select Project
          </button>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const path = item.needsProject
            ? resolveNavPath(item.path, projectId)
            : item.path;
          const disabled = item.needsProject && !projectId;

          if (disabled) {
            return (
              <div
                key={item.label}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg
                  text-text-muted/50 dark:text-text-muted-dark/50
                  cursor-not-allowed
                  ${collapsed ? 'justify-center' : ''}
                `}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </div>
            );
          }

          return (
            <NavLink
              key={item.label}
              to={path}
              end={item.exact}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-all duration-200 cursor-pointer
                ${collapsed ? 'justify-center' : ''}
                ${
                  isActive
                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-400 font-semibold'
                    : 'text-text-muted dark:text-text-muted-dark hover:bg-slate-100 dark:hover:bg-slate-800'
                }
              `}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-border dark:border-border-dark space-y-2">
        {/* Connection status */}
        <ConnectionStatus collapsed={collapsed} />

        <ThemeToggle collapsed={collapsed} />

        <button
          onClick={onLogout}
          className={`
            flex items-center gap-2 w-full px-3 py-2 rounded-lg
            text-text-muted dark:text-text-muted-dark
            hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400
            transition-all duration-200 cursor-pointer
            ${collapsed ? 'justify-center' : ''}
          `}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="
          fixed top-4 left-4 z-50 p-2 rounded-lg
          bg-card dark:bg-card-dark shadow-md
          text-slate-900 dark:text-white
          lg:hidden cursor-pointer
          transition-all duration-200
        "
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-sidebar
          bg-card dark:bg-card-dark
          border-r border-border dark:border-border-dark
          transform transition-transform duration-200
          lg:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1 text-text-muted dark:text-text-muted-dark hover:text-slate-900 dark:hover:text-white cursor-pointer"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`
          hidden lg:flex flex-col flex-shrink-0 h-screen sticky top-0
          bg-card dark:bg-card-dark
          border-r border-border dark:border-border-dark
          transition-all duration-200
          ${collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'}
        `}
      >
        {sidebarContent}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="
            absolute -right-3 top-7 z-10
            w-6 h-6 rounded-full
            bg-card dark:bg-card-dark
            border border-border dark:border-border-dark
            shadow-sm flex items-center justify-center
            text-text-muted dark:text-text-muted-dark
            hover:bg-slate-50 dark:hover:bg-slate-700
            transition-all duration-200 cursor-pointer
          "
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </aside>
    </>
  );
}

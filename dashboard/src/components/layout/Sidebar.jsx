import { useState } from 'react';
import { NavLink, useParams, useLocation, Link } from 'react-router';
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
  Zap,
  ArrowLeft,
  Search,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import ConnectionStatus from './ConnectionStatus';

// Global nav items (shown at root /)
const globalNavItems = [
  { label: 'Projects', icon: LayoutDashboard, path: '/' },
];

// Project-scoped nav items (shown inside /project/:id/*)
const projectNavItems = [
  { label: 'Dashboard', icon: Monitor, path: '/project/:id' },
  { label: 'Research', icon: Search, path: '/project/:id/research' },
  { label: 'Topics', icon: ListChecks, path: '/project/:id/topics' },
  { label: 'Scripts', icon: FileText, path: '/project/:id/scripts' },
  { label: 'Production', icon: Activity, path: '/project/:id/production' },
  { label: 'Analytics', icon: BarChart3, path: '/project/:id/analytics' },
  { label: 'Settings', icon: Settings, path: '/project/:id/settings' },
];

function resolveNavPath(pathTemplate, projectId) {
  return pathTemplate.replace(':id', projectId || '_');
}

function NavItem({ item, collapsed, projectId, onClick, exact }) {
  const Icon = item.icon;
  const path = projectId ? resolveNavPath(item.path, projectId) : item.path;

  return (
    <NavLink
      to={path}
      end={exact}
      onClick={onClick}
      className={({ isActive }) => `
        group flex items-center gap-3 px-3 py-2.5 rounded-xl
        transition-all duration-200 cursor-pointer relative
        ${collapsed ? 'justify-center' : ''}
        ${
          isActive
            ? 'bg-primary/[0.08] text-primary dark:bg-primary/[0.15] dark:text-blue-400 font-semibold'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white'
        }
      `}
      title={collapsed ? item.label : undefined}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
          )}
          <Icon className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span className="text-[13px] font-medium">{item.label}</span>}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { id: projectId } = useParams();
  const location = useLocation();

  // Detect if we're inside a project route
  const isInsideProject = !!projectId && location.pathname.startsWith('/project/');

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border/50 dark:border-border-dark/50">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-md shadow-primary/20">
          <Zap className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight truncate">
              Vision GridAI
            </span>
            <span className="text-[10px] text-text-muted dark:text-text-muted-dark font-medium uppercase tracking-wider">
              Platform
            </span>
          </div>
        )}
      </div>

      {/* Back to Projects link (when inside a project) */}
      {isInsideProject && !collapsed && (
        <div className="px-3 py-3 border-b border-border/50 dark:border-border-dark/50">
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className="
              flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
              text-slate-500 dark:text-slate-400
              hover:bg-slate-100/80 dark:hover:bg-white/[0.04]
              hover:text-slate-900 dark:hover:text-white
              transition-all duration-200
            "
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>
        </div>
      )}

      {/* Project switcher (only when NOT inside a project) */}
      {!isInsideProject && !collapsed && (
        <div className="px-3 py-3 border-b border-border/50 dark:border-border-dark/50">
          <button className="
            w-full text-left px-3 py-2.5 rounded-xl text-sm
            text-text-muted dark:text-text-muted-dark
            bg-slate-50/80 dark:bg-white/[0.04]
            border border-border/50 dark:border-white/[0.06]
            hover:bg-slate-100 dark:hover:bg-white/[0.06]
            hover:border-slate-300 dark:hover:border-white/[0.1]
            transition-all duration-200 cursor-pointer truncate
            font-medium
          ">
            Select Project
          </button>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {isInsideProject ? (
          // Project-scoped navigation
          projectNavItems.map((item) => (
            <NavItem
              key={item.label}
              item={item}
              collapsed={collapsed}
              projectId={projectId}
              onClick={() => setMobileOpen(false)}
              exact={item.path === '/project/:id'}
            />
          ))
        ) : (
          // Global navigation
          globalNavItems.map((item) => (
            <NavItem
              key={item.label}
              item={item}
              collapsed={collapsed}
              projectId={null}
              onClick={() => setMobileOpen(false)}
              exact={true}
            />
          ))
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-border/50 dark:border-border-dark/50 space-y-0.5">
        <ConnectionStatus collapsed={collapsed} />
        <ThemeToggle collapsed={collapsed} />

        <button
          onClick={onLogout}
          className={`
            flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl
            text-slate-500 dark:text-slate-500
            hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/[0.08] dark:hover:text-red-400
            transition-all duration-200 cursor-pointer
            ${collapsed ? 'justify-center' : ''}
          `}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span className="text-[13px] font-medium">Logout</span>}
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
          fixed top-4 left-4 z-50 p-2.5 rounded-xl
          bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg
          shadow-lg shadow-black/[0.05] dark:shadow-black/[0.3]
          border border-border/50 dark:border-white/[0.06]
          text-slate-700 dark:text-white
          lg:hidden cursor-pointer
          transition-all duration-200
          hover:bg-white dark:hover:bg-slate-700
        "
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity duration-200"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-sidebar
          bg-white dark:bg-slate-900
          border-r border-border/50 dark:border-white/[0.06]
          shadow-2xl shadow-black/10 dark:shadow-black/40
          transform transition-transform duration-300 ease-out
          lg:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer transition-colors duration-200"
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
          bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl
          border-r border-border/50 dark:border-white/[0.06]
          transition-all duration-300 ease-out
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
            bg-white dark:bg-slate-800
            border border-border dark:border-slate-700
            shadow-md shadow-black/[0.08] dark:shadow-black/[0.3]
            flex items-center justify-center
            text-slate-400 dark:text-slate-500
            hover:text-primary dark:hover:text-blue-400
            hover:border-primary/30 dark:hover:border-blue-400/30
            transition-all duration-200 cursor-pointer
          "
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>
      </aside>
    </>
  );
}

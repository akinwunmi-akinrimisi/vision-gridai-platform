import { useState, useEffect, useMemo } from 'react';
import { NavLink, useParams, useLocation, Link, useNavigate } from 'react-router';
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
  ChevronDown,
  Menu,
  X,
  Zap,
  ArrowLeft,
  Search,
  Upload,
  Clapperboard,
  Share2,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import ConnectionStatus from './ConnectionStatus';
import { useSupervisorToasts } from '../SupervisorToastProvider';
import { useQuotaStatus } from '../../hooks/useQuotaStatus';
import { supabase } from '../../lib/supabase';

const globalNavItems = [
  { label: 'Projects', icon: LayoutDashboard, path: '/' },
  { label: 'Shorts Creator', icon: Clapperboard, path: '/shorts' },
  { label: 'Social Publisher', icon: Share2, path: '/social' },
];

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

function NavItem({ item, collapsed, projectId, onClick, exact, badge }) {
  const Icon = item.icon;
  const path = projectId ? resolveNavPath(item.path, projectId) : item.path;

  return (
    <NavLink
      to={path}
      end={exact}
      onClick={onClick}
      className={({ isActive }) => `
        group flex items-center gap-3 px-3 py-2 rounded-xl
        transition-all duration-200 cursor-pointer relative
        will-change-[background-color,box-shadow]
        ${collapsed ? 'justify-center' : ''}
        ${isActive
          ? 'nav-item-active'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white'
        }
      `}
      style={({ isActive }) => isActive ? { boxShadow: '0 0 20px rgba(37,99,235,0.08), 0 0 40px rgba(37,99,235,0.04)' } : undefined}
      title={collapsed ? item.label : undefined}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
          )}
          <span className="relative flex-shrink-0">
            <Icon className={`w-[18px] h-[18px] transition-transform duration-200 ${isActive ? 'drop-shadow-[0_0_3px_rgba(37,99,235,0.3)]' : 'group-hover:scale-105'}`} strokeWidth={isActive ? 2.2 : 1.8} />
            {badge && (
              <span
                data-testid="supervisor-badge"
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900 animate-pulse"
              />
            )}
          </span>
          {!collapsed && (
            <span className={`text-[13px] transition-colors duration-200 ${isActive ? 'font-semibold' : 'font-medium'}`}>
              {item.label}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

/**
 * Project selector dropdown — shows current project name + list of all projects.
 */
function ProjectSelector({ currentProjectId, collapsed }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    supabase
      .from('projects')
      .select('id, name, niche, status')
      .order('created_at', { ascending: false })
      .then(({ data }) => setProjects(data || []));
  }, []);

  const current = projects.find((p) => p.id === currentProjectId);

  if (collapsed || projects.length <= 1) return null;

  const statusDotColor = (status) => {
    if (status === 'active' || status === 'in_production') return 'bg-emerald-500';
    if (status?.startsWith('researching')) return 'bg-amber-500';
    if (status === 'research_failed') return 'bg-red-500';
    return 'bg-slate-400';
  };

  return (
    <div className="relative px-3 pt-2 pb-1">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-white/[0.03] border border-border/30 dark:border-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
      >
        <span className="truncate">{current?.name || current?.niche || 'Select Project'}</span>
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-white dark:bg-slate-800 border border-border/50 dark:border-white/[0.08] rounded-xl shadow-lg max-h-60 overflow-y-auto scrollbar-thin">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setOpen(false);
                if (p.id !== currentProjectId) {
                  navigate(`/project/${p.id}`);
                }
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors ${
                p.id === currentProjectId ? 'font-semibold text-primary' : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDotColor(p.status)}`} />
              <span className="flex-1 truncate">{p.name || p.niche}</span>
              <span className="text-2xs text-text-muted dark:text-text-muted-dark truncate max-w-[60px]">{p.niche}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Total spend indicator for the sidebar footer.
 */
function TotalSpend({ collapsed }) {
  const [totalSpend, setTotalSpend] = useState(0);

  useEffect(() => {
    supabase
      .from('topics')
      .select('total_cost')
      .then(({ data }) => {
        const sum = (data || []).reduce((s, t) => s + (parseFloat(t.total_cost) || 0), 0);
        setTotalSpend(sum);
      });

    // Subscribe to realtime updates
    const channel = supabase
      .channel('sidebar-spend')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'topics' }, () => {
        supabase
          .from('topics')
          .select('total_cost')
          .then(({ data }) => {
            const sum = (data || []).reduce((s, t) => s + (parseFloat(t.total_cost) || 0), 0);
            setTotalSpend(sum);
          });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (totalSpend <= 0) return null;

  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-slate-400 dark:text-slate-500 ${collapsed ? 'justify-center' : ''}`}
      title={collapsed ? `$${totalSpend.toFixed(0)} spent` : undefined}
    >
      {!collapsed && (
        <span className="text-xs font-mono tabular-nums">
          ${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })} spent
        </span>
      )}
    </div>
  );
}

export default function Sidebar({ onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { id: projectId } = useParams();
  const location = useLocation();
  const { hasSupervisorAlert } = useSupervisorToasts();

  const isInsideProject = !!projectId && location.pathname.startsWith('/project/');
  const { remaining: quotaRemaining } = useQuotaStatus(isInsideProject ? projectId : null);

  // Cmd+B / Ctrl+B keyboard shortcut to toggle collapse
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-collapse below 1280px
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1280px)');
    const handler = (e) => {
      if (e.matches) setCollapsed(true);
    };
    // Set initial
    if (mql.matches) setCollapsed(true);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 dark:border-white/[0.06]">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent-600 flex items-center justify-center shadow-md shadow-primary/25">
          <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">
              GridAI
            </span>
            <span className="text-2xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-widest">
              Platform
            </span>
          </div>
        )}
      </div>

      {/* Back to Projects (inside project) */}
      {isInsideProject && !collapsed && (
        <div className="px-3 pt-3 pb-1">
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className="
              flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium
              text-slate-400 dark:text-slate-500
              hover:bg-slate-100/80 dark:hover:bg-white/[0.04]
              hover:text-slate-700 dark:hover:text-slate-300
              transition-all duration-200
            "
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All Projects
          </Link>
        </div>
      )}

      {/* Project selector dropdown */}
      {isInsideProject && (
        <ProjectSelector currentProjectId={projectId} collapsed={collapsed} />
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {!isInsideProject && !collapsed && (
          <div className="px-3 pt-1 pb-2">
            <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Overview
            </span>
          </div>
        )}
        {isInsideProject && !collapsed && (
          <div className="px-3 pt-1 pb-2">
            <span className="text-2xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Project
            </span>
          </div>
        )}

        {isInsideProject
          ? projectNavItems.map((item) => (
              <NavItem
                key={item.label}
                item={item}
                collapsed={collapsed}
                projectId={projectId}
                onClick={() => setMobileOpen(false)}
                exact={item.path === '/project/:id'}
                badge={item.label === 'Production' && hasSupervisorAlert}
              />
            ))
          : globalNavItems.map((item) => (
              <NavItem
                key={item.label}
                item={item}
                collapsed={collapsed}
                projectId={null}
                onClick={() => setMobileOpen(false)}
                exact={true}
              />
            ))
        }
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-slate-100 dark:border-white/[0.06] space-y-0.5">
        <ConnectionStatus collapsed={collapsed} />

        {isInsideProject && (
          <div
            data-testid="quota-indicator"
            className={`
              flex items-center gap-2.5 px-3 py-2 rounded-xl
              ${collapsed ? 'justify-center' : ''}
              ${quotaRemaining === 0
                ? 'text-red-500 dark:text-red-400'
                : quotaRemaining <= 2
                  ? 'text-amber-500 dark:text-amber-400'
                  : 'text-slate-400 dark:text-slate-500'}
            `}
            title={collapsed ? `${quotaRemaining}/6 uploads remaining` : undefined}
          >
            <Upload className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.8} />
            {!collapsed && (
              <span className="text-[13px] font-medium font-mono tabular-nums">
                {quotaRemaining}/6
              </span>
            )}
          </div>
        )}

        <TotalSpend collapsed={collapsed} />

        <ThemeToggle collapsed={collapsed} />

        <button
          onClick={onLogout}
          className={`
            flex items-center gap-2.5 w-full px-3 py-2 rounded-xl
            text-slate-400 dark:text-slate-500
            hover:bg-red-50 hover:text-red-600
            dark:hover:bg-red-500/[0.08] dark:hover:text-red-400
            transition-all duration-200 cursor-pointer
            ${collapsed ? 'justify-center' : ''}
          `}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.8} />
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
          bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg
          shadow-elevation-2 dark:shadow-glass
          border border-slate-200/60 dark:border-white/[0.06]
          text-slate-600 dark:text-slate-300
          lg:hidden cursor-pointer
          transition-all duration-200
          hover:bg-white dark:hover:bg-slate-700
          active:scale-95
        "
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-sidebar
          bg-white dark:bg-slate-900
          border-r border-slate-200/60 dark:border-white/[0.06]
          shadow-elevation-4 dark:shadow-glass-lg
          transform transition-transform duration-300 ease-out
          lg:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer transition-colors duration-200"
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
          bg-white/60 dark:bg-white/[0.02] backdrop-blur-xl
          border-r border-slate-200/60 dark:border-white/[0.06]
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
            border border-slate-200 dark:border-slate-700
            shadow-elevation-2 dark:shadow-glass
            flex items-center justify-center
            text-slate-400 dark:text-slate-500
            hover:text-primary dark:hover:text-blue-400
            hover:border-primary/30 dark:hover:border-blue-500/30
            hover:shadow-[0_0_12px_rgba(37,99,235,0.15)]
            transition-all duration-200 cursor-pointer
            active:scale-90
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

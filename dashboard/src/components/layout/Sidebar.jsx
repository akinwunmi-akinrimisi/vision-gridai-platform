import { useState, useEffect, useMemo } from 'react';
import { NavLink, useParams, useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Monitor,
  ListChecks,
  Activity,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Clapperboard,
  Microscope,
  Share2,
  Upload,
  Zap,
  CalendarDays,
  MessageCircle,
  Youtube,
  Hash,
  Brain,
  Lightbulb,
  Radar,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import useMediaQuery from '@/hooks/useMediaQuery';
import { useQuotaStatus } from '@/hooks/useQuotaStatus';
import { useProjects } from '@/hooks/useProjects';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// ── Nav configuration ────────────────────────────────

const platformNavItems = [
  { label: 'Niche Research', icon: Microscope, path: '/youtube-discovery' },
  { label: 'Channel Analyzer', icon: Radar, path: '/channel-analyzer' },
  { label: 'Projects', icon: LayoutDashboard, path: '/' },
  { label: 'Shorts Creator', icon: Clapperboard, path: '/shorts' },
  { label: 'Social Publisher', icon: Share2, path: '/social' },
];

const projectNavItems = [
  { label: 'Dashboard', icon: Monitor, path: '/project/:id' },
  { label: 'Research', icon: Search, path: '/project/:id/research' },
  { label: 'Topics', icon: ListChecks, path: '/project/:id/topics' },
  { label: 'Keywords', icon: Hash, path: '/project/:id/keywords' },
  { label: 'Intelligence', icon: Brain, path: '/project/:id/intelligence' },
  { label: 'Daily Ideas', icon: Lightbulb, path: '/project/:id/ideas' },
  { label: 'AI Coach', icon: MessageCircle, path: '/project/:id/coach' },
  { label: 'Production', icon: Activity, path: '/project/:id/production' },
  { label: 'Analytics', icon: BarChart3, path: '/project/:id/analytics' },
  { label: 'Calendar', icon: CalendarDays, path: '/project/:id/calendar' },
  { label: 'Engagement', icon: MessageCircle, path: '/project/:id/engagement' },
  { label: 'Settings', icon: Settings, path: '/project/:id/settings' },
];

function resolveNavPath(pathTemplate, projectId) {
  return pathTemplate.replace(':id', projectId || '_');
}

// ── NavItem component ────────────────────────────────

function NavItem({ item, collapsed, projectId, onClick, exact, badge }) {
  const Icon = item.icon;
  const path = projectId ? resolveNavPath(item.path, projectId) : item.path;

  const linkContent = ({ isActive }) => (
    <>
      <span className="relative flex-shrink-0">
        <Icon
          className={cn(
            'w-[18px] h-[18px] transition-transform duration-200',
            isActive
              ? 'drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]'
              : 'group-hover:scale-105'
          )}
          strokeWidth={isActive ? 2.2 : 1.8}
        />
        {badge && (
          <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-warning text-warning-foreground text-[10px] font-bold flex items-center justify-center tabular-nums">
            {typeof badge === 'number' ? badge : ''}
          </span>
        )}
      </span>
      {!collapsed && (
        <span
          className={cn(
            'text-[13px] transition-colors duration-200',
            isActive ? 'font-semibold' : 'font-medium'
          )}
        >
          {item.label}
        </span>
      )}
    </>
  );

  const navLink = (
    <NavLink
      to={path}
      end={exact}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 cursor-pointer relative',
          collapsed ? 'justify-center' : '',
          isActive
            ? 'bg-[rgba(251,191,36,0.1)] text-accent border-l-2 border-accent'
            : 'text-muted-foreground hover:text-foreground hover:bg-[rgba(255,255,255,0.04)]'
        )
      }
    >
      {linkContent}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{navLink}</TooltipTrigger>
        <TooltipContent side="right">
          <p>{item.label}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return navLink;
}

// ── Project Selector ─────────────────────────────────

function ProjectSelector({ currentProjectId, collapsed }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const projects = useMemo(() => {
    const cached = queryClient.getQueryData(['projects']);
    return cached || [];
  }, [queryClient]);

  const current = projects.find((p) => p.id === currentProjectId);

  if (collapsed || projects.length <= 1) return null;

  const statusDotColor = (status) => {
    if (status === 'active' || status === 'in_production') return 'bg-success';
    if (status?.startsWith('researching')) return 'bg-warning';
    if (status === 'research_failed') return 'bg-danger';
    return 'bg-muted-foreground';
  };

  return (
    <div className="px-3 pt-2 pb-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm font-medium text-foreground bg-secondary border border-border hover:bg-card-hover transition-colors cursor-pointer">
            <span className="truncate">
              {current?.name || current?.niche || 'Select Project'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {projects.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => {
                if (p.id !== currentProjectId) {
                  navigate(`/project/${p.id}`);
                }
              }}
              className={cn(
                'cursor-pointer',
                p.id === currentProjectId && 'font-semibold text-accent'
              )}
            >
              <span
                className={cn(
                  'w-2 h-2 rounded-full flex-shrink-0',
                  statusDotColor(p.status)
                )}
              />
              <span className="flex-1 truncate">{p.name || p.niche}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ── Total Spend ──────────────────────────────────────

/**
 * Rolled-up total spend across every project. Derived from the already
 * cached `projects_list` query (each project carries its topics_summary
 * with total_cost). Post-2026-04-21 RLS lockdown — no direct supabase
 * calls, no Realtime channel.
 */
function TotalSpend({ collapsed }) {
  const { data: projects = [] } = useProjects();
  const totalSpend = useMemo(() => {
    let sum = 0;
    for (const p of projects) {
      for (const t of (p.topics_summary || [])) {
        sum += parseFloat(t.total_cost) || 0;
      }
    }
    return sum;
  }, [projects]);

  if (totalSpend <= 0) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-muted-foreground',
        collapsed ? 'justify-center' : ''
      )}
      title={collapsed ? `$${totalSpend.toFixed(0)} spent` : undefined}
    >
      {!collapsed && (
        <span className="text-xs font-mono tabular-nums">
          ${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}{' '}
          spent
        </span>
      )}
    </div>
  );
}

// ── Pending Topics Badge ─────────────────────────────

function usePendingTopicsCount(projectId) {
  // Derived from the cached projects_list: each project carries its
  // topics_summary with review_status. No Realtime channel, no anon
  // Supabase call (migration 030 locks those down).
  const { data: projects = [] } = useProjects();
  return useMemo(() => {
    if (!projectId) return 0;
    const p = projects.find((x) => x.id === projectId);
    if (!p) return 0;
    return (p.topics_summary || []).filter((t) => t.review_status === 'pending').length;
  }, [projects, projectId]);
}

// ── Sidebar Main Component ───────────────────────────

export default function Sidebar({ onLogout, collapsed, setCollapsed }) {
  const location = useLocation();
  const projectIdMatch = location.pathname.match(/^\/project\/([^/]+)/);
  const projectId = projectIdMatch?.[1] || null;
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [mobileOpen, setMobileOpen] = useState(false);

  const isInsideProject =
    !!projectId && location.pathname.startsWith('/project/');
  const { remaining: quotaRemaining } = useQuotaStatus(
    isInsideProject ? projectId : null
  );
  const pendingTopicsCount = usePendingTopicsCount(
    isInsideProject ? projectId : null
  );

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
  }, [setCollapsed]);

  // Auto-collapse below 1024px on desktop (only on resize, not initial mount)
  useEffect(() => {
    if (isMobile) return;
    const mql = window.matchMedia('(max-width: 1024px)');
    const handler = (e) => {
      if (e.matches) setCollapsed(true);
    };
    // Only listen for future resizes — do NOT collapse on initial mount
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [setCollapsed, isMobile]);

  const closeMobile = () => setMobileOpen(false);

  const sidebarContent = (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col h-full">
        {/* ── Logo + Project Switcher ── */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow-primary">
            <span className="text-sm font-bold text-background">G</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-foreground text-sm tracking-tight">
                GridAI
              </span>
              <span className="text-2xs text-muted-foreground font-medium uppercase tracking-widest">
                Platform
              </span>
            </div>
          )}
        </div>

        {/* ── Project Selector (inside project context) ── */}
        {isInsideProject && (
          <ProjectSelector
            currentProjectId={projectId}
            collapsed={collapsed}
          />
        )}

        {/* ── Search trigger ── */}
        {!collapsed && (
          <div className="px-3 pt-3 pb-1">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary border border-border text-muted-foreground text-sm cursor-pointer hover:bg-card-hover hover:border-border-hover transition-colors">
              <Search className="w-3.5 h-3.5" />
              <span className="flex-1">Search...</span>
              <kbd className="text-2xs bg-background/50 px-1.5 py-0.5 rounded border border-border font-mono">
                Ctrl+K
              </kbd>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="px-3 pt-3 pb-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center p-2 rounded-md bg-secondary border border-border text-muted-foreground cursor-pointer hover:bg-card-hover hover:border-border-hover transition-colors">
                  <Search className="w-4 h-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Search (Ctrl+K)</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* ── Navigation ── */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto scrollbar-thin">
          {/* Platform section */}
          {!collapsed && (
            <div className="px-3 pt-1 pb-2">
              <span className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
                Platform
              </span>
            </div>
          )}
          {platformNavItems.map((item) => (
            <NavItem
              key={item.label}
              item={item}
              collapsed={collapsed}
              projectId={null}
              onClick={closeMobile}
              exact={item.path === '/'}
            />
          ))}

          {/* Project section (only when inside a project) */}
          {isInsideProject && (
            <>
              {!collapsed && (
                <div className="px-3 pt-4 pb-2">
                  <span className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
                    Project
                  </span>
                </div>
              )}
              {collapsed && <div className="h-3" />}
              {projectNavItems.map((item) => (
                <NavItem
                  key={item.label}
                  item={item}
                  collapsed={collapsed}
                  projectId={projectId}
                  onClick={closeMobile}
                  exact={item.path === '/project/:id'}
                  badge={
                    item.label === 'Topics' && pendingTopicsCount > 0
                      ? pendingTopicsCount
                      : undefined
                  }
                />
              ))}
            </>
          )}
        </nav>

        {/* ── Footer ── */}
        <div className="px-3 py-3 border-t border-border space-y-0.5">
          {isInsideProject && (
            <div
              data-testid="quota-indicator"
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md',
                collapsed ? 'justify-center' : '',
                quotaRemaining === 0
                  ? 'text-danger'
                  : quotaRemaining <= 2
                    ? 'text-warning'
                    : 'text-muted-foreground'
              )}
              title={
                collapsed
                  ? `${quotaRemaining}/6 uploads remaining`
                  : undefined
              }
            >
              <Upload
                className="w-[18px] h-[18px] flex-shrink-0"
                strokeWidth={1.8}
              />
              {!collapsed && (
                <span className="text-[13px] font-medium font-mono tabular-nums">
                  {quotaRemaining}/6
                </span>
              )}
            </div>
          )}

          <TotalSpend collapsed={collapsed} />

          {/* User section */}
          <div
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-md',
              collapsed ? 'justify-center' : ''
            )}
          >
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-background flex-shrink-0">
              A
            </div>
            {!collapsed && (
              <span className="text-[13px] font-medium text-muted-foreground flex-1">
                Admin
              </span>
            )}
          </div>

          {/* Logout */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onLogout}
                  className="flex items-center justify-center w-full px-3 py-2 rounded-md text-muted-foreground hover:bg-danger-bg hover:text-danger transition-all duration-200 cursor-pointer"
                >
                  <LogOut
                    className="w-[18px] h-[18px] flex-shrink-0"
                    strokeWidth={1.8}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Logout</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={onLogout}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-muted-foreground hover:bg-danger-bg hover:text-danger transition-all duration-200 cursor-pointer"
            >
              <LogOut
                className="w-[18px] h-[18px] flex-shrink-0"
                strokeWidth={1.8}
              />
              <span className="text-[13px] font-medium">Logout</span>
            </button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );

  // ── Mobile: Sheet overlay ──────────────────────────

  if (isMobile) {
    return (
      <>
        {/* Mobile hamburger trigger (rendered by TopBar via setSidebarCollapsed) */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[240px] p-0 bg-background border-r border-border">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // ── Desktop: sticky sidebar ────────────────────────

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col flex-shrink-0 h-screen sticky top-0',
        'bg-background/60 backdrop-blur-xl',
        'border-r border-border',
        'transition-all duration-300 ease-out',
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
      )}
    >
      {sidebarContent}

      {/* Collapse toggle pill */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-7 z-10 w-6 h-6 rounded-full bg-card border border-border shadow-card flex items-center justify-center text-muted-foreground hover:text-primary hover:border-border-accent hover:shadow-glow-primary transition-all duration-200 cursor-pointer active:scale-90"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </aside>
  );
}

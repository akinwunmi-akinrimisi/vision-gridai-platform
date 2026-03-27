import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useParams, Link, useNavigate } from 'react-router';
import {
  Menu,
  Bell,
  ChevronRight,
  ListChecks,
  FileText,
  Film,
  Clapperboard,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConnectionStatus from './ConnectionStatus';
import { useNotifications } from '@/hooks/useNotifications';
import { useProjects } from '@/hooks/useProjects';

// ── Icon map for notification types ──────────────────

const ICON_MAP = {
  ListChecks,
  FileText,
  Film,
  Clapperboard,
  AlertTriangle,
};

const TYPE_COLORS = {
  topics: 'text-warning bg-warning-bg',
  scripts: 'text-info bg-info-bg',
  videos: 'text-info bg-info-bg',
  shorts: 'text-primary bg-primary/10',
  errors: 'text-danger bg-danger-bg',
};

// ── Relative time formatter ──────────────────────────

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return then.toLocaleDateString();
}

// ── Breadcrumb builder ───────────────────────────────

function useBreadcrumbs(projects) {
  const location = useLocation();
  const { id: projectId, topicId } = useParams();

  return useMemo(() => {
    const path = location.pathname;

    if (path === '/') return [{ label: 'Projects' }];
    if (path === '/shorts') return [{ label: 'Shorts Creator' }];
    if (path === '/social') return [{ label: 'Social Publisher' }];

    const crumbs = [{ label: 'Projects', href: '/' }];

    if (projectId) {
      const project = (projects || []).find((p) => p.id === projectId);
      const projectName = project?.name || project?.niche || 'Project';

      crumbs.push({ label: projectName, href: `/project/${projectId}` });

      if (path.includes('/research')) {
        crumbs.push({ label: 'Research' });
      } else if (path.includes('/topics') && topicId) {
        crumbs.push({ label: 'Topics', href: `/project/${projectId}/topics` });
        if (path.includes('/script')) crumbs.push({ label: 'Script' });
        else if (path.includes('/review')) crumbs.push({ label: 'Review' });
        else crumbs.push({ label: 'Detail' });
      } else if (path.includes('/topics')) {
        crumbs.push({ label: 'Topics' });
      } else if (path.includes('/production')) {
        crumbs.push({ label: 'Production' });
      } else if (path.includes('/analytics')) {
        crumbs.push({ label: 'Analytics' });
      } else if (path.includes('/settings')) {
        crumbs.push({ label: 'Settings' });
      }
    }

    return crumbs;
  }, [location.pathname, projectId, topicId, projects]);
}

// ── Notification Dropdown ────────────────────────────

function NotificationDropdown({ items, onClose, onDismissAll }) {
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 z-50 bg-card border border-border rounded-lg shadow-card overflow-hidden animate-fade-in"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold text-foreground">
          Notifications
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          aria-label="Close notifications"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Items */}
      <div className="max-h-80 overflow-y-auto scrollbar-thin">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              All caught up -- no pending actions
            </p>
          </div>
        ) : (
          items.map((item, idx) => {
            const Icon = ICON_MAP[item.icon] || Bell;
            const colorCls =
              TYPE_COLORS[item.type] ||
              'text-muted-foreground bg-secondary';

            return (
              <button
                key={`${item.type}-${item.path}-${idx}`}
                onClick={() => {
                  navigate(item.path);
                  onClose();
                }}
                className="flex items-start gap-3 w-full px-4 py-3 text-left hover:bg-card-hover transition-colors cursor-pointer border-b border-border/50 last:border-0"
              >
                <span
                  className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center ${colorCls}`}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {item.title}
                    </span>
                    <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center tabular-nums">
                      {item.count}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {item.description}
                  </p>
                  <span className="text-2xs text-muted-foreground/60 mt-0.5 block">
                    {relativeTime(item.updatedAt)}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border">
          <button
            onClick={onDismissAll}
            className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer font-medium"
          >
            Mark all as seen
          </button>
        </div>
      )}
    </div>
  );
}

// ── TopBar ───────────────────────────────────────────

export default function TopBar({ sidebarCollapsed, setSidebarCollapsed }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedAt, setDismissedAt] = useState(() => {
    try {
      return localStorage.getItem('notifications_dismissed_at') || null;
    } catch {
      return null;
    }
  });

  const { data: notificationsData } = useNotifications();
  const { data: projects } = useProjects();
  const breadcrumbs = useBreadcrumbs(projects);

  // Filter notifications by dismissed timestamp
  const visibleItems = useMemo(() => {
    if (!notificationsData?.items) return [];
    if (!dismissedAt) return notificationsData.items;
    return notificationsData.items.filter(
      (item) => new Date(item.updatedAt) > new Date(dismissedAt)
    );
  }, [notificationsData, dismissedAt]);

  const badgeCount = visibleItems.reduce((sum, item) => sum + item.count, 0);

  function handleDismissAll() {
    const now = new Date().toISOString();
    setDismissedAt(now);
    try {
      localStorage.setItem('notifications_dismissed_at', now);
    } catch {
      // localStorage unavailable
    }
    setShowNotifications(false);
  }

  return (
    <header
      className="fixed top-0 right-0 z-30 h-12 border-b border-border bg-background/80 backdrop-blur-xl flex items-center justify-between px-6 transition-[left] duration-300"
      style={{ left: sidebarCollapsed ? '56px' : '240px' }}
    >
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden mr-2"
        onClick={() => setSidebarCollapsed((c) => !c)}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0 overflow-hidden">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && (
              <ChevronRight className="w-3 h-3 flex-shrink-0 text-muted-foreground/40" />
            )}
            {crumb.href ? (
              <Link
                to={crumb.href}
                className="hover:text-foreground transition-colors truncate"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="text-foreground truncate">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications((prev) => !prev)}
            className="relative p-2 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
            aria-label={`Notifications${badgeCount > 0 ? ` (${badgeCount} pending)` : ''}`}
          >
            <Bell className="w-[18px] h-[18px]" strokeWidth={1.8} />
            {badgeCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center tabular-nums ring-2 ring-background animate-fade-in">
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <NotificationDropdown
              items={visibleItems}
              onClose={() => setShowNotifications(false)}
              onDismissAll={handleDismissAll}
            />
          )}
        </div>

        {/* Connection status */}
        <ConnectionStatus />
      </div>
    </header>
  );
}

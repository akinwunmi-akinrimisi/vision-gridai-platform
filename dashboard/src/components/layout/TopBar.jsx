import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useParams, NavLink, useNavigate } from 'react-router';
import {
  ChevronRight,
  Bell,
  User,
  ListChecks,
  FileText,
  Film,
  Clapperboard,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { useProjects } from '../../hooks/useProjects';

// ── Icon map for notification types ──────────────────

const ICON_MAP = {
  ListChecks,
  FileText,
  Film,
  Clapperboard,
  AlertTriangle,
};

const TYPE_COLORS = {
  topics: 'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/[0.12]',
  scripts: 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/[0.12]',
  videos: 'text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/[0.12]',
  shorts: 'text-cyan-500 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/[0.12]',
  errors: 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/[0.12]',
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
    const crumbs = [];
    const path = location.pathname;

    // Always start with Projects
    crumbs.push({ label: 'Projects', path: '/' });

    if (path === '/shorts') {
      crumbs.push({ label: 'Shorts Creator', path: '/shorts' });
      return crumbs;
    }

    if (path === '/social') {
      crumbs.push({ label: 'Social Publisher', path: '/social' });
      return crumbs;
    }

    if (projectId) {
      // Find project name
      const project = (projects || []).find((p) => p.id === projectId);
      const projectName = project?.name || project?.niche || 'Project';

      crumbs.push({ label: projectName, path: `/project/${projectId}` });

      if (path.includes('/research')) {
        crumbs.push({ label: 'Research', path: `/project/${projectId}/research` });
      } else if (path.includes('/topics') && topicId) {
        crumbs.push({ label: 'Topics', path: `/project/${projectId}/topics` });

        if (path.includes('/script')) {
          crumbs.push({ label: 'Script Review', path: path });
        } else if (path.includes('/review')) {
          crumbs.push({ label: 'Video Review', path: path });
        } else {
          crumbs.push({ label: 'Topic Detail', path: path });
        }
      } else if (path.includes('/topics')) {
        crumbs.push({ label: 'Topics', path: `/project/${projectId}/topics` });
      } else if (path.includes('/production')) {
        crumbs.push({ label: 'Production', path: `/project/${projectId}/production` });
      } else if (path.includes('/analytics')) {
        crumbs.push({ label: 'Analytics', path: `/project/${projectId}/analytics` });
      } else if (path.includes('/settings')) {
        crumbs.push({ label: 'Settings', path: `/project/${projectId}/settings` });
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
      className="
        absolute right-0 top-full mt-2 w-80 sm:w-96 z-50
        bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl
        border border-slate-200/60 dark:border-white/[0.08]
        rounded-2xl shadow-elevation-4 dark:shadow-glass-lg
        animate-slide-down overflow-hidden
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/[0.06]">
        <span className="text-sm font-semibold text-slate-900 dark:text-white">
          Notifications
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors duration-200 cursor-pointer"
          aria-label="Close notifications"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Items */}
      <div className="max-h-80 overflow-y-auto scrollbar-thin">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              All caught up — no pending actions
            </p>
          </div>
        ) : (
          items.map((item, idx) => {
            const Icon = ICON_MAP[item.icon] || Bell;
            const colorCls = TYPE_COLORS[item.type] || 'text-slate-500 bg-slate-100 dark:bg-white/[0.06]';

            return (
              <button
                key={`${item.type}-${item.path}-${idx}`}
                onClick={() => {
                  navigate(item.path);
                  onClose();
                }}
                className="
                  flex items-start gap-3 w-full px-4 py-3 text-left
                  hover:bg-slate-50 dark:hover:bg-white/[0.04]
                  transition-colors duration-150 cursor-pointer
                  border-b border-slate-50 dark:border-white/[0.03] last:border-0
                "
              >
                <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${colorCls}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {item.title}
                    </span>
                    <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-xs font-bold flex items-center justify-center tabular-nums">
                      {item.count}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {item.description}
                  </p>
                  <span className="text-2xs text-slate-400 dark:text-slate-500 mt-0.5 block">
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
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-white/[0.06]">
          <button
            onClick={onDismissAll}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary-400 transition-colors duration-200 cursor-pointer font-medium"
          >
            Mark all as seen
          </button>
        </div>
      )}
    </div>
  );
}

// ── TopBar ───────────────────────────────────────────

export default function TopBar() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedAt, setDismissedAt] = useState(() => {
    try {
      return localStorage.getItem('notifications_dismissed_at') || null;
    } catch {
      return null;
    }
  });

  const { data: notificationsData, isLoading: notificationsLoading } = useNotifications();
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
      className="
        fixed top-0 right-0 z-40 h-16
        left-0 lg:left-[260px]
        bg-white/80 dark:bg-surface-dark/80 backdrop-blur-xl
        border-b border-slate-200/60 dark:border-white/[0.06]
        transition-all duration-300
      "
    >
      <div className="flex items-center justify-between h-full px-5 lg:px-8 max-w-[1440px] mx-auto">
        {/* Left: Breadcrumbs */}
        <nav className="flex items-center gap-1.5 min-w-0 overflow-hidden" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;

            return (
              <div key={crumb.path + idx} className="flex items-center gap-1.5 min-w-0">
                {idx > 0 && (
                  <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-slate-300 dark:text-slate-600" />
                )}
                {isLast ? (
                  <span className="text-sm font-medium text-primary dark:text-primary-400 truncate">
                    {crumb.label}
                  </span>
                ) : (
                  <NavLink
                    to={crumb.path}
                    className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-200 truncate"
                  >
                    {crumb.label}
                  </NavLink>
                )}
              </div>
            );
          })}
        </nav>

        {/* Right: Notifications + User */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications((prev) => !prev)}
              className="
                relative p-2 rounded-xl
                text-slate-500 dark:text-slate-400
                hover:bg-slate-100 dark:hover:bg-white/[0.06]
                hover:text-slate-900 dark:hover:text-white
                transition-all duration-200 cursor-pointer
              "
              aria-label={`Notifications${badgeCount > 0 ? ` (${badgeCount} pending)` : ''}`}
            >
              <Bell className="w-[18px] h-[18px]" strokeWidth={1.8} />
              {badgeCount > 0 && (
                <span className="
                  absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1
                  rounded-full bg-red-500 text-white text-[10px] font-bold
                  flex items-center justify-center tabular-nums
                  ring-2 ring-white dark:ring-surface-dark
                  animate-scale-in
                ">
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {showNotifications && (
              <NotificationDropdown
                items={visibleItems}
                onClose={() => setShowNotifications(false)}
                onDismissAll={handleDismissAll}
              />
            )}
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-slate-200 dark:bg-white/[0.06]" />

          {/* User indicator */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent-600 flex items-center justify-center shadow-sm">
              <User className="w-3.5 h-3.5 text-white" strokeWidth={2} />
            </div>
            <span className="hidden sm:block text-sm font-medium text-slate-700 dark:text-slate-300">
              Admin
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

# Frontend Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild all 12 dashboard pages with shadcn/ui components, Neon Pipeline design system (deep violet-black + warm amber/orange), and Figma-inspired SaaS product aesthetic.

**Architecture:** Evolutionary rebuild — keep Vite + React Router 7 + React Query + Supabase Realtime. Replace only the UI layer (components, styles, layout). All hooks and API files stay unchanged.

**Tech Stack:** React 18, Vite 5, Tailwind CSS 3.4, shadcn/ui, Radix UI, cmdk, Recharts, Lucide React, Sonner

> **Note:** The design spec mentions Tailwind CSS 4, but we stay on Tailwind 3.4 for this rebuild. shadcn/ui works perfectly with v3, and a Tailwind 4 migration is orthogonal to the UI overhaul — it can be done separately later with zero visual impact.

**Design Spec:** `docs/superpowers/specs/2026-03-26-frontend-overhaul-design.md`

---

## Phase 1: Foundation

### Task 1: Install shadcn/ui and Dependencies

**Files:**
- Modify: `dashboard/package.json`
- Create: `dashboard/components.json`
- Create: `dashboard/src/lib/utils.js`
- Modify: `dashboard/vite.config.js` (add path alias)
- Modify: `dashboard/index.html` (swap font to Inter)

- [ ] **Step 1: Install core dependencies**

```bash
cd dashboard
npm install clsx tailwind-merge class-variance-authority
npm install cmdk
npm install -D @types/node
```

- [ ] **Step 2: Add path alias to vite.config.js**

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/webhook': {
        target: 'https://n8n.srv1297445.hstgr.cloud',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
  },
});
```

- [ ] **Step 3: Create lib/utils.js**

```javascript
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Create components.json (shadcn config)**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": false,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/styles/globals.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 5: Swap font to Inter in index.html**

Replace the Fira Sans/Code Google Fonts link with:
```html
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
  rel="stylesheet"
/>
```

- [ ] **Step 6: Install shadcn/ui components**

```bash
cd dashboard
npx shadcn@latest add button dialog dropdown-menu tabs table card badge tooltip sheet command input textarea select switch separator scroll-area popover calendar avatar
```

Note: shadcn will install the required @radix-ui/* packages automatically per component. If `npx shadcn` prompts for config, point it to the `components.json` created in Step 4. Components are copied into `src/components/ui/`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: install shadcn/ui, dependencies, and path aliases"
```

---

### Task 2: Design Tokens — Neon Pipeline Theme

**Files:**
- Rewrite: `dashboard/tailwind.config.js`
- Rewrite: `dashboard/src/styles/index.css` → `dashboard/src/styles/globals.css`
- Modify: `dashboard/src/main.jsx` (update CSS import path)

- [ ] **Step 1: Rewrite tailwind.config.js with Neon Pipeline tokens**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0C0A1A',
        foreground: '#FAFAFA',
        card: {
          DEFAULT: '#110E2A',
          hover: '#16123A',
        },
        popover: {
          DEFAULT: '#110E2A',
          foreground: '#FAFAFA',
        },
        primary: {
          DEFAULT: '#F59E0B',
          hover: '#D97706',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: 'rgba(255,255,255,0.04)',
          foreground: '#A1A1AA',
        },
        muted: {
          DEFAULT: '#1A1640',
          foreground: '#71717A',
        },
        accent: {
          DEFAULT: '#FBBF24',
          foreground: '#0C0A1A',
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FAFAFA',
        },
        border: 'rgba(255,255,255,0.06)',
        'border-hover': 'rgba(255,255,255,0.12)',
        'border-accent': 'rgba(251,191,36,0.15)',
        input: 'rgba(255,255,255,0.06)',
        ring: '#F59E0B',
        success: {
          DEFAULT: '#34D399',
          bg: 'rgba(16,185,129,0.1)',
          border: 'rgba(16,185,129,0.2)',
        },
        warning: {
          DEFAULT: '#FBBF24',
          bg: 'rgba(251,191,36,0.1)',
          border: 'rgba(251,191,36,0.15)',
        },
        danger: {
          DEFAULT: '#F87171',
          bg: 'rgba(239,68,68,0.08)',
          border: 'rgba(239,68,68,0.15)',
        },
        info: {
          DEFAULT: '#A78BFA',
          bg: 'rgba(139,92,246,0.1)',
          border: 'rgba(139,92,246,0.15)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'Cascadia Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      spacing: {
        sidebar: '240px',
        'sidebar-collapsed': '56px',
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '6px',
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(245,158,11,0.2)',
        'glow-primary-lg': '0 0 30px rgba(245,158,11,0.3), 0 0 80px rgba(245,158,11,0.1)',
        'glow-success': '0 0 20px rgba(16,185,129,0.2)',
        'card': '0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
        'card-hover': '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'slide-up': 'slide-up 0.3s ease-out forwards',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 2: Create globals.css (replaces index.css)**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    background-color: #0C0A1A;
    color: #FAFAFA;
  }

  ::selection {
    background-color: rgba(245, 158, 11, 0.2);
    color: #FAFAFA;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
}

@layer components {
  /* Scrollbar */
  .scrollbar-thin::-webkit-scrollbar { width: 5px; }
  .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
  .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 9999px; }
  .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
  .scrollbar-none::-webkit-scrollbar { display: none; }

  /* Stagger animation delays */
  .stagger-1 { animation-delay: 50ms; }
  .stagger-2 { animation-delay: 100ms; }
  .stagger-3 { animation-delay: 150ms; }
  .stagger-4 { animation-delay: 200ms; }
  .stagger-5 { animation-delay: 250ms; }
  .stagger-6 { animation-delay: 300ms; }
  .stagger-7 { animation-delay: 350ms; }
  .stagger-8 { animation-delay: 400ms; }
}
```

- [ ] **Step 3: Delete old index.css**

```bash
rm dashboard/src/styles/index.css
```

- [ ] **Step 4: Update main.jsx CSS import**

Change `import './styles/index.css';` to `import './styles/globals.css';`

- [ ] **Step 5: Verify build compiles**

```bash
cd dashboard && npm run build
```

Expected: Build succeeds. Pages will look broken (expected — old CSS classes removed, new ones not yet applied).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: Neon Pipeline design tokens + globals.css"
```

---

### Task 3: App Shell — Sidebar, TopBar, AppLayout

**Files:**
- Rewrite: `dashboard/src/components/layout/AppLayout.jsx`
- Rewrite: `dashboard/src/components/layout/Sidebar.jsx`
- Rewrite: `dashboard/src/components/layout/TopBar.jsx`
- Rewrite: `dashboard/src/components/layout/ConnectionStatus.jsx`
- Rewrite: `dashboard/src/components/layout/ThemeToggle.jsx`
- Delete: `dashboard/src/components/SupervisorToastProvider.jsx` (move toast logic into layout)

Reference: Design spec Section 4 (App Shell) for exact structure.

- [ ] **Step 1: Rewrite AppLayout.jsx**

```jsx
import { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { Toaster } from 'sonner';

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
        <TopBar sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed} />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-7 pt-20 max-w-[1440px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      <Toaster
        position="bottom-right"
        richColors
        toastOptions={{
          style: {
            background: '#110E2A',
            border: '1px solid rgba(255,255,255,0.06)',
            color: '#FAFAFA',
          },
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Rewrite Sidebar.jsx**

Build the two-tier sidebar per the design spec:
- Logo + Project Switcher (DropdownMenu) at top
- Search trigger ("Search... ⌘K") that opens CommandPalette
- Platform nav section: Projects, Shorts Creator, Social Publisher
- Project nav section (visible when project selected): Dashboard, Research, Topics, Scripts, Production, Analytics, Settings
- Badge counts on Topics and Production nav items
- User section at bottom: avatar, connection status, theme toggle, logout
- Active state: `bg-warning-bg border-l-2 border-accent text-accent`
- Collapsed state: 56px wide, icon-only, Tooltip on each icon
- Mobile: render inside shadcn Sheet component

Use `NavLink` from react-router for active state detection. Use `useParams` to get current project ID. Use Tooltip (shadcn) for collapsed labels. Use Sheet (shadcn) for mobile overlay.

Fetch pending topic count and active production count from Supabase for nav badges:
```jsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Inside Sidebar component:
const { data: pendingCount } = useQuery({
  queryKey: ['pending-topics', projectId],
  queryFn: async () => {
    if (!projectId) return 0;
    const { count } = await supabase
      .from('topics')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('review_status', 'pending');
    return count || 0;
  },
  enabled: !!projectId,
});
```

Full implementation: ~200 lines. Follow the mockup structure from the design spec Section 4.

- [ ] **Step 3: Rewrite TopBar.jsx**

```jsx
import { useLocation, useParams, Link } from 'react-router';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConnectionStatus from './ConnectionStatus';
import ThemeToggle from './ThemeToggle';

export default function TopBar({ sidebarCollapsed, setSidebarCollapsed }) {
  const location = useLocation();
  const { id: projectId, topicId } = useParams();

  const breadcrumbs = buildBreadcrumbs(location.pathname, projectId, topicId);

  return (
    <header className="fixed top-0 right-0 z-30 h-12 border-b border-border flex items-center justify-between px-6"
      style={{ left: sidebarCollapsed ? '56px' : '240px' }}>
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden mr-2"
        onClick={() => setSidebarCollapsed(c => !c)}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-muted-foreground/40">/</span>}
            {crumb.href ? (
              <Link to={crumb.href} className="hover:text-foreground transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-foreground">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <ConnectionStatus />
        <ThemeToggle />
      </div>
    </header>
  );
}

function buildBreadcrumbs(pathname, projectId, topicId) {
  const crumbs = [];
  if (pathname === '/') return [{ label: 'Projects' }];
  if (pathname === '/shorts') return [{ label: 'Shorts Creator' }];
  if (pathname === '/social') return [{ label: 'Social Publisher' }];

  if (projectId) {
    crumbs.push({ label: 'Projects', href: '/' });
    // Project name would come from context/query — use ID as fallback
    crumbs.push({ label: 'Project', href: `/project/${projectId}` });

    if (pathname.includes('/topics') && topicId) {
      crumbs.push({ label: 'Topics', href: `/project/${projectId}/topics` });
      crumbs.push({ label: `Topic` });
      if (pathname.includes('/script')) crumbs.push({ label: 'Script' });
      if (pathname.includes('/review')) crumbs.push({ label: 'Review' });
    } else if (pathname.includes('/topics')) {
      crumbs.push({ label: 'Topics' });
    } else if (pathname.includes('/research')) {
      crumbs.push({ label: 'Research' });
    } else if (pathname.includes('/production')) {
      crumbs.push({ label: 'Production' });
    } else if (pathname.includes('/analytics')) {
      crumbs.push({ label: 'Analytics' });
    } else if (pathname.includes('/settings')) {
      crumbs.push({ label: 'Settings' });
    }
  }
  return crumbs;
}
```

- [ ] **Step 4: Rewrite ConnectionStatus.jsx**

```jsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function ConnectionStatus() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const channel = supabase.channel('connection-check')
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-success' : 'bg-danger'}`} />
        </TooltipTrigger>
        <TooltipContent>
          <p>{connected ? 'Realtime connected' : 'Disconnected'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

- [ ] **Step 5: Simplify ThemeToggle.jsx**

Since the spec says dark-only for v1, ThemeToggle becomes a no-op placeholder:

```jsx
export default function ThemeToggle() {
  // Dark-only for v1. Placeholder for future light mode toggle.
  return null;
}
```

- [ ] **Step 6: Build and verify shell renders**

```bash
cd dashboard && npm run build
```

Expected: Build succeeds. App shell (sidebar + topbar) renders with Neon Pipeline colors. Page content will still be broken.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: app shell — Sidebar, TopBar, AppLayout with Neon Pipeline theme"
```

---

### Task 4: Command Palette

**Files:**
- Create: `dashboard/src/components/layout/CommandPalette.jsx`
- Modify: `dashboard/src/components/layout/AppLayout.jsx` (add CommandPalette)

- [ ] **Step 1: Create CommandPalette.jsx**

```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard, Search, ListChecks, FileText, Activity,
  BarChart3, Settings, Clapperboard, Share2, Zap,
} from 'lucide-react';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const go = (path) => {
    navigate(path);
    setOpen(false);
  };

  // Get cached projects for search
  const projects = queryClient.getQueryData(['projects']) || [];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, projects, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Pages">
          <CommandItem onSelect={() => go('/')}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Projects Home
          </CommandItem>
          <CommandItem onSelect={() => go('/shorts')}>
            <Clapperboard className="mr-2 h-4 w-4" />
            Shorts Creator
          </CommandItem>
          <CommandItem onSelect={() => go('/social')}>
            <Share2 className="mr-2 h-4 w-4" />
            Social Publisher
          </CommandItem>
        </CommandGroup>

        {projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {projects.map((p) => (
                <CommandItem key={p.id} onSelect={() => go(`/project/${p.id}`)}>
                  <Zap className="mr-2 h-4 w-4" />
                  {p.name} — {p.niche}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
```

- [ ] **Step 2: Add CommandPalette to AppLayout.jsx**

Import and render `<CommandPalette />` inside the layout, after the `<Toaster />`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: Cmd+K command palette for power-user navigation"
```

---

## Phase 2: Shared Components

### Task 5: Shared UI Primitives

**Files:**
- Create: `dashboard/src/components/shared/KPICard.jsx`
- Create: `dashboard/src/components/shared/StatusBadge.jsx`
- Create: `dashboard/src/components/shared/PageHeader.jsx`
- Create: `dashboard/src/components/shared/HeroCard.jsx`
- Create: `dashboard/src/components/shared/EmptyState.jsx`

These are reused across multiple pages. Build them once.

- [ ] **Step 1: Create KPICard.jsx**

```jsx
import { cn } from '@/lib/utils';

export default function KPICard({ label, value, delta, deltaType, icon: Icon, className }) {
  return (
    <div className={cn(
      'bg-card border border-border rounded-lg p-4 transition-colors hover:border-border-hover',
      className
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
      </div>
      <div className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{value}</div>
      {delta && (
        <div className={cn(
          'mt-1 text-xs',
          deltaType === 'positive' ? 'text-success' : 'text-danger'
        )}>
          {deltaType === 'positive' ? '↑' : '↓'} {delta}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create StatusBadge.jsx**

```jsx
import { cn } from '@/lib/utils';

const variants = {
  published: 'bg-success-bg text-success border-success-border',
  active: 'bg-warning-bg text-warning border-warning-border',
  pending: 'bg-muted text-muted-foreground border-border',
  failed: 'bg-danger-bg text-danger border-danger-border',
  review: 'bg-info-bg text-info border-info-border',
  approved: 'bg-success-bg text-success border-success-border',
  rejected: 'bg-danger-bg text-danger border-danger-border',
  scripting: 'bg-info-bg text-info border-info-border',
  assembly: 'bg-warning-bg text-warning border-warning-border',
};

export default function StatusBadge({ status, label, className }) {
  const display = label || status;
  const variant = variants[status] || variants.pending;

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] font-medium border',
      variant,
      className
    )}>
      {display}
    </span>
  );
}
```

- [ ] **Step 3: Create PageHeader.jsx**

```jsx
export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2 flex-shrink-0">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Create HeroCard.jsx**

```jsx
import { cn } from '@/lib/utils';

export default function HeroCard({ children, className }) {
  return (
    <div className={cn(
      'relative overflow-hidden bg-[rgba(251,191,36,0.04)] border border-border-accent rounded-xl p-5',
      className
    )}>
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-destructive" />
      {children}
    </div>
  );
}
```

- [ ] **Step 5: Create EmptyState.jsx**

```jsx
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-sm font-semibold mb-1">{title}</h3>
      {description && <p className="text-xs text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: shared UI primitives — KPICard, StatusBadge, PageHeader, HeroCard, EmptyState"
```

---

## Phase 3: Page Rebuilds

Each task below rebuilds one page. The page file is rewritten in place (same filename, same route). All hooks and API imports stay identical — only JSX and component imports change.

**Convention for all page tasks:**
- Import shadcn components from `@/components/ui/`
- Import shared components from `@/components/shared/`
- Import domain components from `@/components/{domain}/`
- Use `cn()` for conditional classes
- Use `animate-slide-up` + `stagger-N` for entrance animations
- Follow the Neon Pipeline color tokens from tailwind.config.js
- Reference design spec Section 5 for exact layout per page

---

### Task 6: Projects Home Page

**Files:**
- Rewrite: `dashboard/src/pages/ProjectsHome.jsx`
- Rewrite: `dashboard/src/components/projects/ProjectCard.jsx`
- Rewrite: `dashboard/src/components/projects/CreateProjectModal.jsx`

Rebuild using: PageHeader, KPICard (4-column stat row), ProjectCard grid (2-col), CreateProjectModal (shadcn Dialog).

**ProjectCard:** Card with amber top-gradient bar, emoji + project name, topic/published counts, revenue/ROI/spend inline metrics, mini progress bar (`div` with percentage width + `bg-gradient-to-r from-primary to-destructive`), status badge. Dashed placeholder card for "Create new project".

**CreateProjectModal:** shadcn Dialog with Input (niche name), Textarea (description), Input (target count, default 25), primary gradient Button ("Start Research").

Hooks used (unchanged): `useProjects()`, `useCreateProject()`, `useRetryResearch()`.

- [ ] **Step 1: Rewrite ProjectCard.jsx** — Card component per design spec
- [ ] **Step 2: Rewrite CreateProjectModal.jsx** — shadcn Dialog with form
- [ ] **Step 3: Rewrite ProjectsHome.jsx** — PageHeader + KPICard grid + ProjectCard grid
- [ ] **Step 4: Verify page renders** — `npm run dev`, navigate to `/`
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: rebuild Projects Home with Neon Pipeline theme"
```

---

### Task 7: Project Dashboard Page

**Files:**
- Rewrite: `dashboard/src/pages/ProjectDashboard.jsx`
- Rewrite: `dashboard/src/components/dashboard/PipelineTable.jsx`
- Keep: `dashboard/src/components/dashboard/SegmentedProgressBar.jsx` (restyle only)

Rebuild using: PageHeader, KPICard (5-column), PipelineTable (shadcn Table with filter tabs).

**PipelineTable:** shadcn Table inside a card. Filter tabs (All/Active/Published/Failed) using inline tab buttons. Columns: #, Title, Angle, Status (StatusBadge), Score (amber text), Views, Revenue. Rows clickable → `navigate()` to topic detail. Hover: `bg-card-hover`.

Hooks used (unchanged): `useTopics(projectId)`, `useProjectMetrics(projectId)`.

- [ ] **Step 1: Rewrite PipelineTable.jsx** — shadcn Table with filters
- [ ] **Step 2: Rewrite ProjectDashboard.jsx** — PageHeader + KPIs + table
- [ ] **Step 3: Verify** — navigate to `/project/:id`
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: rebuild Project Dashboard with pipeline table"
```

---

### Task 8: Niche Research Page

**Files:**
- Rewrite: `dashboard/src/pages/NicheResearch.jsx`
- Rewrite: `dashboard/src/components/research/BlueOceanHero.jsx`
- Rewrite: `dashboard/src/components/research/CompetitorCards.jsx`
- Rewrite: `dashboard/src/components/research/PainPoints.jsx`
- Rewrite: `dashboard/src/components/research/PlaylistCards.jsx`
- Rewrite: `dashboard/src/components/research/RedOceanList.jsx`
- Rewrite: `dashboard/src/components/research/KeywordCloud.jsx`

Rebuild using: HeroCard for blue ocean, card grid for competitors, tag badges for pain points, 3-column PlaylistCards, collapsible RedOceanList.

Hooks used (unchanged): `useNicheProfile(projectId)`, `useProject(projectId)`.

- [ ] **Step 1: Rewrite all research components** — apply Neon Pipeline styling
- [ ] **Step 2: Rewrite NicheResearch.jsx** — compose sections
- [ ] **Step 3: Verify** — navigate to `/project/:id/research`
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: rebuild Niche Research page"
```

---

### Task 9: Topic Review Page

**Files:**
- Rewrite: `dashboard/src/pages/TopicReview.jsx`
- Rewrite: `dashboard/src/components/topics/TopicCard.jsx`
- Rewrite: `dashboard/src/components/topics/TopicSummaryBar.jsx`
- Rewrite: `dashboard/src/components/topics/TopicBulkBar.jsx`
- Rewrite: `dashboard/src/components/topics/EditPanel.jsx`
- Keep: `dashboard/src/components/topics/RefinePanel.jsx` (restyle)

Rebuild using: PageHeader, TopicSummaryBar (visual status breakdown), TopicCard (expandable with actions), EditPanel (shadcn Sheet), RefinePanel (textarea expansion).

**TopicCard expanded:** Topic number badge (`bg-warning-bg text-accent`), triple metadata badges, title, hook text, inline avatar row (4 key fields), action buttons column (Approve/Reject/Refine using shadcn Button variants).

**TopicCard collapsed (approved):** Single row with title + StatusBadge.

Hooks used (unchanged): `useTopics(projectId)`, `useApproveTopics()`, `useRejectTopics()`, `useRefineTopic()`, `useEditTopic()`, `useEditAvatar()`.

- [ ] **Step 1: Rewrite topic components** — TopicCard, SummaryBar, BulkBar, EditPanel
- [ ] **Step 2: Rewrite TopicReview.jsx** — compose with filters
- [ ] **Step 3: Verify** — navigate to `/project/:id/topics`
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: rebuild Topic Review with expandable cards"
```

---

### Task 10: Topic Detail Page

**Files:**
- Rewrite: `dashboard/src/pages/TopicDetail.jsx`

Rebuild: horizontal pipeline roadmap (14 colored dots), asset cards grid, scene drill-down with expandable sections.

Hooks used (unchanged): `useScenes(topicId)`, `useScript(topicId)`, `useVideoReview(topicId)`.

- [ ] **Step 1: Rewrite TopicDetail.jsx** — pipeline roadmap + asset cards
- [ ] **Step 2: Verify** — navigate to `/project/:id/topics/:topicId`
- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: rebuild Topic Detail with pipeline roadmap"
```

---

### Task 11: Script Review Page

**Files:**
- Rewrite: `dashboard/src/pages/ScriptReview.jsx`
- Rewrite: `dashboard/src/components/script/ScorePanel.jsx`
- Rewrite: `dashboard/src/components/script/ChapterAccordion.jsx`
- Rewrite: `dashboard/src/components/script/SceneRow.jsx`
- Rewrite: `dashboard/src/components/script/PassTracker.jsx`
- Rewrite: `dashboard/src/components/script/ScriptContent.jsx`
- Rewrite: `dashboard/src/components/script/ScriptRefinePanel.jsx`
- Rewrite: `dashboard/src/components/script/ScriptToolbar.jsx`
- Keep: `dashboard/src/components/script/SceneEditForm.jsx` (restyle)
- Keep: `dashboard/src/components/script/ForcePassBanner.jsx` (restyle)

Rebuild as split panel: fixed left ScorePanel (240px) with amber gradient score, 7-dimension bars, stats, actions. Flex right with pass tabs, collapsible chapters, scene cards.

Hooks used (unchanged): `useScript(topicId)`, `useScenes(topicId)`, `useGenerateScript()`, `useApproveScript()`, `useRejectScript()`, `useRefineScript()`.

- [ ] **Step 1: Rewrite ScorePanel.jsx** — amber gradient score + bar charts
- [ ] **Step 2: Rewrite script content components** — PassTracker, ChapterAccordion, SceneRow
- [ ] **Step 3: Rewrite ScriptReview.jsx** — split panel layout
- [ ] **Step 4: Verify** — navigate to `/project/:id/topics/:topicId/script`
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: rebuild Script Review with split panel layout"
```

---

### Task 12: Video Review Page

**Files:**
- Rewrite: `dashboard/src/pages/VideoReview.jsx`
- Rewrite: `dashboard/src/components/video/MetadataPanel.jsx`
- Rewrite: `dashboard/src/components/video/PublishDialog.jsx`
- Rewrite: `dashboard/src/components/video/RejectDialog.jsx`
- Rewrite: `dashboard/src/components/video/ThumbnailPreview.jsx`
- Rewrite: `dashboard/src/components/video/ProductionSummary.jsx`
- Rewrite: `dashboard/src/components/video/UploadProgress.jsx`
- Rewrite: `dashboard/src/components/video/BatchPublishDialog.jsx`
- Keep: `dashboard/src/components/video/CaptionPreview.jsx` (restyle)
- Keep: `dashboard/src/components/video/VideoPlayer.jsx` (restyle)

Rebuild: video player + metadata panel + publish/reject actions. Use shadcn Dialog for publish, Calendar + Popover for scheduling.

Hooks used (unchanged): `useVideoReview(topicId)`, `useApproveVideo()`, `useRejectVideo()`, `usePublishVideo()`, `useRegenerateThumbnail()`, `useUpdateMetadata()`.

- [ ] **Step 1: Rewrite video components** — MetadataPanel, PublishDialog, RejectDialog, etc.
- [ ] **Step 2: Rewrite VideoReview.jsx** — compose with player + actions
- [ ] **Step 3: Verify** — navigate to `/project/:id/topics/:topicId/review`
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: rebuild Video Review with publish/schedule dialogs"
```

---

### Task 13: Production Monitor Page

**Files:**
- Rewrite: `dashboard/src/pages/ProductionMonitor.jsx`
- Rewrite: `dashboard/src/components/production/HeroCard.jsx` → rename to `ActiveProductionHero.jsx`
- Rewrite: `dashboard/src/components/production/DotGrid.jsx`
- Rewrite: `dashboard/src/components/production/QueueList.jsx`
- Rewrite: `dashboard/src/components/production/ActivityLog.jsx`
- Rewrite: `dashboard/src/components/production/FailedScenes.jsx`
- Rewrite: `dashboard/src/components/production/SupervisorAlert.jsx`
- Create: `dashboard/src/components/production/StageProgress.jsx`
- Create: `dashboard/src/components/production/CostBreakdown.jsx`
- Delete: `dashboard/src/components/production/SceneDetailPanel.jsx` (merge into DotGrid)
- Delete: `dashboard/src/components/production/ErrorLogModal.jsx` (merge into FailedScenes)
- Delete: `dashboard/src/components/production/CostEstimateDialog.jsx` (merge into CostBreakdown)

Rebuild: HeroCard (shared) wrapping active production info, 6-stage StageProgress bar, 172-dot DotGrid, 2-column grid (CostBreakdown + QueueList), collapsible ActivityLog and FailedScenes.

Hooks used (unchanged): `useProductionProgress(topicId)`, `useProductionLog(topicId)`, `useScenes(topicId)`, `useProductionMutations(projectId)`.

- [ ] **Step 1: Create StageProgress.jsx** — 6-stage horizontal bar
- [ ] **Step 2: Create CostBreakdown.jsx** — itemized cost card
- [ ] **Step 3: Rewrite DotGrid.jsx** — 172 dots with color legend
- [ ] **Step 4: Rewrite remaining production components**
- [ ] **Step 5: Rewrite ProductionMonitor.jsx** — compose all sections
- [ ] **Step 6: Verify** — navigate to `/project/:id/production`
- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: rebuild Production Monitor with stage progress and dot grid"
```

---

### Task 14: Analytics Page

**Files:**
- Rewrite: `dashboard/src/pages/Analytics.jsx`
- Rewrite: `dashboard/src/components/analytics/ViewsChart.jsx`
- Rewrite: `dashboard/src/components/analytics/RevenueChart.jsx`
- Rewrite: `dashboard/src/components/analytics/PerformanceChart.jsx`
- Rewrite: `dashboard/src/components/analytics/PerformanceTable.jsx`
- Rewrite: `dashboard/src/components/analytics/TopPerformerCard.jsx`
- Rewrite: `dashboard/src/components/analytics/TimeRangeFilter.jsx`
- Keep: `dashboard/src/components/analytics/CostDonut.jsx` (restyle)
- Keep: `dashboard/src/components/analytics/CostRevenueChart.jsx` (restyle)

Rebuild: PageHeader + TimeRangeFilter (toggle buttons), KPICard row with deltas, Recharts with amber gradient fills, TopPerformerCard (HeroCard), sortable PerformanceTable (shadcn Table).

Recharts theming: use `#FBBF24` (amber) for primary series, `#34D399` (success) for secondary. Area fills with `opacity: 0.1`. Grid lines: `rgba(255,255,255,0.04)`. Tooltip bg: `#110E2A`.

Hooks used (unchanged): `useAnalytics(projectId, timeRange)`, `useProjectMetrics(projectId)`.

- [ ] **Step 1: Rewrite chart components** — amber-themed Recharts
- [ ] **Step 2: Rewrite Analytics.jsx** — KPIs + charts + table
- [ ] **Step 3: Verify** — navigate to `/project/:id/analytics`
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: rebuild Analytics with amber Recharts and KPI deltas"
```

---

### Task 15: Shorts Creator Page

**Files:**
- Rewrite: `dashboard/src/pages/ShortsCreator.jsx` (77.6 KB → split into sections)

This is the largest page (77.6 KB). Split into sub-components during rebuild:
- Create: `dashboard/src/components/shorts/TopicBrowser.jsx`
- Create: `dashboard/src/components/shorts/ClipCard.jsx`
- Create: `dashboard/src/components/shorts/ClipReviewGrid.jsx`
- Create: `dashboard/src/components/shorts/ClipPreview.jsx`
- Create: `dashboard/src/components/shorts/ViralityBadge.jsx`
- Create: `dashboard/src/components/shorts/ProductionProgress.jsx`

Rebuild: topic browser (filterable list, only published topics selectable), "Analyze" button, clip review grid with virality badges, approve/skip actions, 9:16 preview player.

Hooks used (unchanged): `useShorts(topicId)`, `useShortsSummary(projectId)`, `useAnalyzeForClips()`, `useApproveClip()`, `useSkipClip()`, `useBulkApproveClips()`, `useProduceClip()`, `useProduceAllApproved()`.

- [ ] **Step 1: Create shorts sub-components** — TopicBrowser, ClipCard, ViralityBadge, ClipReviewGrid, ClipPreview, ProductionProgress
- [ ] **Step 2: Rewrite ShortsCreator.jsx** — compose sub-components (target: <200 lines)
- [ ] **Step 3: Verify** — navigate to `/shorts`
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: rebuild Shorts Creator with decomposed components"
```

---

### Task 16: Social Publisher Page

**Files:**
- Rewrite: `dashboard/src/pages/SocialPublisher.jsx`
- Rewrite: `dashboard/src/components/social/PostingHistory.jsx`
- Rewrite: `dashboard/src/components/social/ScheduleModal.jsx`
- Rewrite: `dashboard/src/components/social/ClipPreviewModal.jsx`
- Create: `dashboard/src/components/social/PostTable.jsx`
- Create: `dashboard/src/components/social/AccountCard.jsx`

Rebuild: PostTable (shadcn Table with per-platform status dots, actions), bulk actions bar, ScheduleModal (shadcn Dialog + Calendar), PostingHistory (sortable/filterable table), AccountCard (connection status).

Hooks used (unchanged): `useSocialPosts()`, `usePostClip()`, `useAutoScheduleAll()`, `useUpdateClipCaptions()`.

- [ ] **Step 1: Create PostTable.jsx and AccountCard.jsx**
- [ ] **Step 2: Rewrite social components** — ScheduleModal, PostingHistory, ClipPreviewModal
- [ ] **Step 3: Rewrite SocialPublisher.jsx** — compose sections
- [ ] **Step 4: Verify** — navigate to `/social`
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: rebuild Social Publisher with post table and scheduling"
```

---

### Task 17: Settings Page

**Files:**
- Rewrite: `dashboard/src/pages/Settings.jsx`
- Rewrite: `dashboard/src/components/settings/ConfigTab.jsx`
- Rewrite: `dashboard/src/components/settings/PromptsTab.jsx`
- Rewrite: `dashboard/src/components/settings/PromptCard.jsx`

Rebuild: shadcn Tabs (General, Models, YouTube, Social, Prompts). Each tab as a separate section component. Use shadcn Input, Select, Switch for form fields. PromptCard with editable textarea and version history.

Hooks used (unchanged): `useProjectSettings(projectId)`, `useUpdateSettings()`, `usePromptConfigs(projectId)`, `usePromptMutations()`.

- [ ] **Step 1: Rewrite settings components** — ConfigTab, PromptsTab, PromptCard
- [ ] **Step 2: Rewrite Settings.jsx** — shadcn Tabs with 5 tab sections
- [ ] **Step 3: Verify** — navigate to `/project/:id/settings`
- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: rebuild Settings with tabbed config panels"
```

---

## Phase 4: Cleanup & Polish

### Task 18: Auth Gate Restyle

**Files:**
- Rewrite: `dashboard/src/components/auth/PinGate.jsx`

Restyle the PIN login screen with Neon Pipeline theme: centered card on `bg-background`, gradient logo, shadcn Input for PIN, primary gradient Button.

- [ ] **Step 1: Rewrite PinGate.jsx** — Neon Pipeline styled login
- [ ] **Step 2: Verify** — log out and check login screen
- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: restyle PinGate with Neon Pipeline theme"
```

---

### Task 19: Delete Old Design System & Unused Files

**Files:**
- Delete: `dashboard/src/components/ui/ComingSoon.jsx` (replaced by EmptyState)
- Delete: `dashboard/src/components/ui/Modal.jsx` (replaced by shadcn Dialog)
- Delete: `dashboard/src/components/ui/SidePanel.jsx` (replaced by shadcn Sheet)
- Delete: `dashboard/src/components/ui/FilterDropdown.jsx` (replaced by shadcn Select/DropdownMenu)
- Delete: `dashboard/src/components/ui/SkeletonCard.jsx` (replaced by shadcn Skeleton)
- Delete: `dashboard/src/components/ui/SkeletonLoader.jsx` (replaced by shadcn Skeleton)
- Delete: `dashboard/src/components/ui/ConfirmDialog.jsx` (replaced by shadcn AlertDialog)
- Delete: `dashboard/src/components/SupervisorToastProvider.jsx` (toast logic moved to sonner)
- Delete: `dashboard/src/components/production/ErrorLogModal.jsx` (merged into FailedScenes)
- Delete: `dashboard/src/components/production/SceneDetailPanel.jsx` (merged into DotGrid)
- Delete: `dashboard/src/components/production/CostEstimateDialog.jsx` (merged into CostBreakdown)

- [ ] **Step 1: Delete unused component files**
- [ ] **Step 2: Grep for any remaining imports of deleted files**

```bash
cd dashboard && grep -r "ComingSoon\|Modal\|SidePanel\|FilterDropdown\|SkeletonCard\|SkeletonLoader\|ConfirmDialog\|SupervisorToastProvider\|ErrorLogModal\|SceneDetailPanel\|CostEstimateDialog" src/ --include="*.jsx" --include="*.js" -l
```

Expected: No results. If any files still import deleted components, update those imports.

- [ ] **Step 3: Verify build**

```bash
cd dashboard && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete old UI components replaced by shadcn/ui"
```

---

### Task 20: Final Build & Deploy

**Files:**
- No new files

- [ ] **Step 1: Full build**

```bash
cd dashboard && npm run build
```

Expected: Build succeeds. Check bundle size — should be smaller than current 1.1MB since we removed the large custom CSS.

- [ ] **Step 2: Local smoke test**

```bash
cd dashboard && npm run preview
```

Navigate through all 12 pages. Verify:
- Sidebar navigation works (expand/collapse, project switching, badges)
- Cmd+K command palette opens and navigates
- All pages render with Neon Pipeline theme (deep violet-black background, amber accents)
- Stat cards, tables, badges all use new design system
- Supabase Realtime subscriptions still work (check Production Monitor)
- Forms work (create project, approve topic, etc.)

- [ ] **Step 3: Deploy to VPS**

```bash
cd dashboard && npm run build
scp -i ~/.ssh/vps_gridai -r dist/. root@srv1297445.hstgr.cloud:/opt/dashboard/
```

- [ ] **Step 4: Verify live site**

Open https://dashboard.operscale.cloud — verify all pages work on production.

- [ ] **Step 5: Commit any final fixes**

```bash
git add -A
git commit -m "feat: complete frontend overhaul — Neon Pipeline theme, shadcn/ui, 12 pages rebuilt"
```

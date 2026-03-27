import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// Mock supabase -- needs chainable .then() for TotalSpend in Sidebar
const mockThen = vi.fn().mockImplementation((cb) => { cb({ data: [], error: null }); return { catch: vi.fn() }; });
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: mockThen,
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    })),
    removeChannel: vi.fn(),
  },
}));

// Mock webhookCall
vi.mock('../lib/api', () => ({
  webhookCall: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock useNotifications
vi.mock('../hooks/useNotifications', () => ({
  useNotifications: () => ({ data: { items: [] }, isLoading: false }),
}));

// Mock useProjects
vi.mock('../hooks/useProjects', () => ({
  useProjects: () => ({ data: [], isLoading: false }),
}));

// Mock useQuotaStatus
vi.mock('../hooks/useQuotaStatus', () => ({
  useQuotaStatus: () => ({ uploadsToday: 0, remaining: 6, isLoading: false }),
}));

import { Routes, Route } from 'react-router';
import AppLayout from '../components/layout/AppLayout';
import Sidebar from '../components/layout/Sidebar';
import TopBar from '../components/layout/TopBar';

function renderWithProviders(ui, { initialEntries = ['/'] } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function renderWithRoute(Component, props, { initialEntries = ['/project/test-id'] } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/project/:id" element={<Component {...props} />} />
          <Route path="/" element={<Component {...props} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AppLayout', () => {
  it('renders children', () => {
    renderWithProviders(
      <AppLayout onLogout={vi.fn()}>
        <div>Test Content</div>
      </AppLayout>
    );
    expect(screen.getByText('Test Content')).toBeTruthy();
  });

  it('renders main area', () => {
    const { container } = renderWithProviders(
      <AppLayout onLogout={vi.fn()}>
        <div>Page</div>
      </AppLayout>
    );
    expect(container.querySelector('main')).toBeTruthy();
  });
});

describe('Sidebar', () => {
  it('renders platform nav items', () => {
    renderWithProviders(
      <Sidebar
        onLogout={vi.fn()}
        collapsed={false}
        setCollapsed={vi.fn()}
      />
    );
    expect(screen.getByText('Projects')).toBeTruthy();
    expect(screen.getByText('Shorts Creator')).toBeTruthy();
    expect(screen.getByText('Social Publisher')).toBeTruthy();
  });

  it('renders GridAI logo', () => {
    renderWithProviders(
      <Sidebar
        onLogout={vi.fn()}
        collapsed={false}
        setCollapsed={vi.fn()}
      />
    );
    expect(screen.getByText('GridAI')).toBeTruthy();
  });

  it('renders logout button', () => {
    renderWithProviders(
      <Sidebar
        onLogout={vi.fn()}
        collapsed={false}
        setCollapsed={vi.fn()}
      />
    );
    expect(screen.getByText('Logout')).toBeTruthy();
  });

  it('calls onLogout when logout is clicked', () => {
    const onLogout = vi.fn();
    renderWithProviders(
      <Sidebar
        onLogout={onLogout}
        collapsed={false}
        setCollapsed={vi.fn()}
      />
    );
    screen.getByText('Logout').closest('button').click();
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('renders collapse toggle button', () => {
    renderWithProviders(
      <Sidebar
        onLogout={vi.fn()}
        collapsed={false}
        setCollapsed={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Collapse sidebar')).toBeTruthy();
  });

  it('renders expand toggle button when collapsed', () => {
    renderWithProviders(
      <Sidebar
        onLogout={vi.fn()}
        collapsed={true}
        setCollapsed={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Expand sidebar')).toBeTruthy();
  });

  it('shows project nav items when inside a project', () => {
    renderWithRoute(Sidebar, {
      onLogout: vi.fn(),
      collapsed: false,
      setCollapsed: vi.fn(),
    }, { initialEntries: ['/project/test-id'] });
    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('Topics')).toBeTruthy();
    expect(screen.getByText('Production')).toBeTruthy();
    expect(screen.getByText('Analytics')).toBeTruthy();
  });
});

describe('TopBar', () => {
  it('renders breadcrumbs', () => {
    renderWithProviders(
      <TopBar sidebarCollapsed={false} setSidebarCollapsed={vi.fn()} />
    );
    // At root, breadcrumb shows "Projects"
    expect(screen.getByText('Projects')).toBeTruthy();
  });

  it('renders notification bell button', () => {
    renderWithProviders(
      <TopBar sidebarCollapsed={false} setSidebarCollapsed={vi.fn()} />
    );
    // Notification button has an aria-label containing "Notifications"
    expect(screen.getByLabelText(/Notifications/)).toBeTruthy();
  });
});

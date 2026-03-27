import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Activity, Zap, FolderOpen } from 'lucide-react';
import KPICard from '../components/shared/KPICard';
import StatusBadge from '../components/shared/StatusBadge';
import PageHeader from '../components/shared/PageHeader';
import HeroCard from '../components/shared/HeroCard';
import EmptyState from '../components/shared/EmptyState';

describe('KPICard', () => {
  it('renders label and value', () => {
    render(<KPICard label="Total Views" value="67,000" />);
    expect(screen.getByText('Total Views')).toBeTruthy();
    expect(screen.getByText('67,000')).toBeTruthy();
  });

  it('renders positive delta with up arrow', () => {
    render(<KPICard label="Revenue" value="$2,301" delta="+15%" deltaType="positive" />);
    expect(screen.getByText(/\+15%/)).toBeTruthy();
  });

  it('renders negative delta with down arrow', () => {
    render(<KPICard label="CTR" value="5.2%" delta="-2.1%" deltaType="negative" />);
    expect(screen.getByText(/-2.1%/)).toBeTruthy();
  });

  it('renders icon when provided', () => {
    const { container } = render(<KPICard label="Test" value="0" icon={Activity} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('does not render delta when not provided', () => {
    const { container } = render(<KPICard label="Test" value="42" />);
    // No delta div (success/danger classes)
    expect(container.querySelector('.text-success')).toBeNull();
    expect(container.querySelector('.text-danger')).toBeNull();
  });
});

describe('StatusBadge', () => {
  it('renders status text', () => {
    render(<StatusBadge status="published" />);
    expect(screen.getByText('published')).toBeTruthy();
  });

  it('renders custom label when provided', () => {
    render(<StatusBadge status="published" label="Published" />);
    expect(screen.getByText('Published')).toBeTruthy();
  });

  it('uses success styling for published status', () => {
    const { container } = render(<StatusBadge status="published" />);
    expect(container.firstChild.className).toContain('text-success');
  });

  it('uses danger styling for failed status', () => {
    const { container } = render(<StatusBadge status="failed" />);
    expect(container.firstChild.className).toContain('text-danger');
  });

  it('uses muted styling for pending status', () => {
    const { container } = render(<StatusBadge status="pending" />);
    expect(container.firstChild.className).toContain('text-muted-foreground');
  });

  it('uses info styling for review status', () => {
    const { container } = render(<StatusBadge status="review" />);
    expect(container.firstChild.className).toContain('text-info');
  });

  it('uses warning styling for active status', () => {
    const { container } = render(<StatusBadge status="active" />);
    expect(container.firstChild.className).toContain('text-warning');
  });

  it('falls back to pending styling for unknown status', () => {
    const { container } = render(<StatusBadge status="unknown_thing" />);
    expect(container.firstChild.className).toContain('text-muted-foreground');
  });
});

describe('PageHeader', () => {
  it('renders title', () => {
    render(<PageHeader title="Projects" />);
    expect(screen.getByText('Projects')).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    render(<PageHeader title="Projects" subtitle="All your niches" />);
    expect(screen.getByText('All your niches')).toBeTruthy();
  });

  it('does not render subtitle when not provided', () => {
    const { container } = render(<PageHeader title="Projects" />);
    expect(container.querySelector('p')).toBeNull();
  });

  it('renders children actions', () => {
    render(
      <PageHeader title="Projects">
        <button>New Project</button>
      </PageHeader>
    );
    expect(screen.getByText('New Project')).toBeTruthy();
  });
});

describe('HeroCard', () => {
  it('renders with gradient bar at top', () => {
    const { container } = render(
      <HeroCard><p>Content</p></HeroCard>
    );
    const gradientBar = container.querySelector('.bg-gradient-to-r');
    expect(gradientBar).toBeTruthy();
  });

  it('renders children', () => {
    render(<HeroCard><p>Test content</p></HeroCard>);
    expect(screen.getByText('Test content')).toBeTruthy();
  });

  it('accepts custom className', () => {
    const { container } = render(
      <HeroCard className="mt-4"><p>Content</p></HeroCard>
    );
    expect(container.firstChild.className).toContain('mt-4');
  });

  it('has accent border', () => {
    const { container } = render(
      <HeroCard><p>Content</p></HeroCard>
    );
    expect(container.firstChild.className).toContain('border-border-accent');
  });
});

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No projects yet" />);
    expect(screen.getByText('No projects yet')).toBeTruthy();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="Create your first project" />);
    expect(screen.getByText('Create your first project')).toBeTruthy();
  });

  it('renders icon when provided', () => {
    const { container } = render(<EmptyState title="Empty" icon={FolderOpen} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders action button when provided', () => {
    render(<EmptyState title="Empty" action={<button>Create</button>} />);
    expect(screen.getByText('Create')).toBeTruthy();
  });

  it('does not render description when not provided', () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByRole('paragraph')).toBeNull();
  });
});

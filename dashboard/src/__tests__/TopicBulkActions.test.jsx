import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TopicBulkBar from '../components/topics/TopicBulkBar';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TopicBulkActions (TOPC-10)', () => {
  it('shows bulk bar when topics are selected', () => {
    render(
      <TopicBulkBar
        selectedCount={3}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onClearSelection={vi.fn()}
      />
    );
    expect(screen.getByText('3 selected')).toBeTruthy();
    expect(screen.getByText('Approve All')).toBeTruthy();
    expect(screen.getByText('Reject All')).toBeTruthy();
  });

  it('bulk approve calls onApprove callback', () => {
    const onApprove = vi.fn();
    render(
      <TopicBulkBar
        selectedCount={2}
        onApprove={onApprove}
        onReject={vi.fn()}
        onClearSelection={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Approve All'));
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('bulk reject calls onReject callback', () => {
    const onReject = vi.fn();
    render(
      <TopicBulkBar
        selectedCount={2}
        onApprove={vi.fn()}
        onReject={onReject}
        onClearSelection={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Reject All'));
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('clear selection hides bulk bar', () => {
    const { rerender } = render(
      <TopicBulkBar
        selectedCount={3}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onClearSelection={vi.fn()}
      />
    );
    expect(screen.getByText('3 selected')).toBeTruthy();

    // Re-render with 0 selected — the bar should not render
    rerender(
      <TopicBulkBar
        selectedCount={0}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onClearSelection={vi.fn()}
      />
    );
    expect(screen.queryByText('Approve All')).toBeNull();
  });
});

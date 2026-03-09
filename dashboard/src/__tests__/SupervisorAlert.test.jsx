import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import SupervisorAlert from '../components/production/SupervisorAlert';

const mockOnDismiss = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SupervisorAlert', () => {
  it('renders amber warning banner when supervisor_alerted=true', () => {
    render(<SupervisorAlert visible={true} onDismiss={mockOnDismiss} />);
    const banner = screen.getByTestId('supervisor-alert-banner');
    expect(banner).toBeTruthy();
    expect(banner.className).toMatch(/amber|warning|yellow/);
  });

  it('does not render when supervisor_alerted=false', () => {
    render(<SupervisorAlert visible={false} onDismiss={mockOnDismiss} />);
    expect(screen.queryByTestId('supervisor-alert-banner')).toBeNull();
  });

  it('shows "Supervisor detected stuck pipeline" message', () => {
    render(<SupervisorAlert visible={true} onDismiss={mockOnDismiss} />);
    expect(screen.getByText(/supervisor detected stuck pipeline/i)).toBeTruthy();
  });

  it('dismiss button resets alert state', () => {
    render(<SupervisorAlert visible={true} onDismiss={mockOnDismiss} />);
    const dismissBtn = screen.getByTestId('dismiss-supervisor-alert');
    fireEvent.click(dismissBtn);
    expect(mockOnDismiss).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PinGate from '../components/auth/PinGate';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PinGate', () => {
  it('renders PIN input and submit button', () => {
    render(<PinGate onLogin={vi.fn()} />);
    expect(screen.getByPlaceholderText('- - - -')).toBeTruthy();
    expect(screen.getByText('Unlock Dashboard')).toBeTruthy();
  });

  it('renders app title', () => {
    render(<PinGate onLogin={vi.fn()} />);
    expect(screen.getByText('Vision GridAI')).toBeTruthy();
  });

  it('renders PIN prompt text', () => {
    render(<PinGate onLogin={vi.fn()} />);
    expect(screen.getByText('Enter your PIN to continue')).toBeTruthy();
  });

  it('submit button is disabled when PIN is empty', () => {
    render(<PinGate onLogin={vi.fn()} />);
    expect(screen.getByText('Unlock Dashboard')).toBeDisabled();
  });

  it('submit button is enabled when PIN has input', () => {
    render(<PinGate onLogin={vi.fn()} />);
    const input = screen.getByPlaceholderText('- - - -');
    fireEvent.change(input, { target: { value: '1234' } });
    expect(screen.getByText('Unlock Dashboard')).not.toBeDisabled();
  });

  it('shows error on wrong PIN', async () => {
    const onLogin = vi.fn().mockResolvedValue(false);
    render(<PinGate onLogin={onLogin} />);

    const input = screen.getByPlaceholderText('- - - -');
    fireEvent.change(input, { target: { value: '0000' } });
    fireEvent.submit(input.closest('form'));

    await waitFor(() => {
      expect(screen.getByText('Wrong PIN')).toBeTruthy();
    });
  });

  it('calls onLogin with entered PIN', async () => {
    const onLogin = vi.fn().mockResolvedValue(true);
    render(<PinGate onLogin={onLogin} />);

    const input = screen.getByPlaceholderText('- - - -');
    fireEvent.change(input, { target: { value: '1234' } });
    fireEvent.submit(input.closest('form'));

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith('1234');
    });
  });

  it('only allows numeric input', () => {
    render(<PinGate onLogin={vi.fn()} />);
    const input = screen.getByPlaceholderText('- - - -');
    fireEvent.change(input, { target: { value: 'abc123' } });
    expect(input.value).toBe('123');
  });

  it('limits PIN to 6 characters', () => {
    render(<PinGate onLogin={vi.fn()} />);
    const input = screen.getByPlaceholderText('- - - -');
    expect(input.getAttribute('maxLength')).toBe('6');
  });

  it('shows SHA-256 security note', () => {
    render(<PinGate onLogin={vi.fn()} />);
    expect(screen.getByText(/SHA-256/)).toBeTruthy();
  });
});

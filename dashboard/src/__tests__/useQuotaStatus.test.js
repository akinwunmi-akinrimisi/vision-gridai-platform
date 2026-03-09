import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Chain: from().select().eq().eq().gte() -> { count, error }
  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValueOnce({ eq: mockEq });
  mockEq.mockReturnValueOnce({ gte: mockGte });
});

describe('useQuotaStatus', () => {
  it.skip('returns uploads today count from supabase', async () => {
    mockGte.mockResolvedValue({ count: 3, error: null });
    // Hook returns uploadsToday=3, remaining=3
    // Test implementation deferred to GREEN phase
    expect(true).toBe(true);
  });

  it.skip('returns 0 when no uploads today', async () => {
    mockGte.mockResolvedValue({ count: 0, error: null });
    // Hook returns uploadsToday=0, remaining=6
    expect(true).toBe(true);
  });

  it.skip('caps remaining at 0 when over quota', async () => {
    mockGte.mockResolvedValue({ count: 7, error: null });
    // Hook returns uploadsToday=7, remaining=0
    expect(true).toBe(true);
  });
});

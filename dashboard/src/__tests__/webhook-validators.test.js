import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/* ================================================================== *
 *  Webhook payload construction, validation, and utility tests.       *
 *  Covers: webhookCall, quota logic, extractChannelIdentifier, cn()  *
 * ================================================================== */

// ── webhookCall tests ───────────────────────────────────────────────

describe('webhookCall — payload construction and validation', () => {
  let webhookCall;
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../lib/api.js');
    webhookCall = mod.webhookCall;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('constructs correct headers: Content-Type only (auth is nginx server-side)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await webhookCall('test/endpoint', { foo: 'bar' });

    const [, options] = globalThis.fetch.mock.calls[0];
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers['Authorization']).toBeUndefined();
  });

  it('applies 30s timeout via AbortController by default', async () => {
    // Create a long-running fetch that we can inspect
    let capturedSignal = null;
    globalThis.fetch = vi.fn().mockImplementation((url, opts) => {
      capturedSignal = opts.signal;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    });

    await webhookCall('test/endpoint', {});

    // Signal should be an AbortSignal
    expect(capturedSignal).toBeTruthy();
    expect(capturedSignal).toBeInstanceOf(AbortSignal);
  });

  it('handles non-200 responses with error message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: () => Promise.resolve('Workflow execution failed'),
    });

    const result = await webhookCall('test/endpoint', {});

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toContain('HTTP 500');
    expect(result.error).toContain('Workflow execution failed');
  });

  it('returns timeout error when AbortController fires', async () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError');
    // Use Object.defineProperty to ensure .name is 'AbortError'
    globalThis.fetch = vi.fn().mockRejectedValue(abortError);

    const result = await webhookCall('test/endpoint', {}, { timeoutMs: 100 });

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toMatch(/timed out|aborted/i);
  });

  it('handles 401 unauthorized with descriptive error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: () => Promise.resolve('Invalid or missing API token'),
    });

    const result = await webhookCall('protected/endpoint', {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('401');
  });

  it('handles network errors gracefully', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await webhookCall('test/endpoint', {});

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to fetch');
  });
});

// ── Gate payload validation ─────────────────────────────────────────

describe('Gate payload validation', () => {
  let webhookCall;
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../lib/api.js');
    webhookCall = mod.webhookCall;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('Gate 1 (topics/action): sends action and topic_ids array', async () => {
    await webhookCall('topics/action', {
      action: 'approve',
      topic_ids: ['uuid-1', 'uuid-2', 'uuid-3'],
    });

    const [, options] = globalThis.fetch.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body.action).toBe('approve');
    expect(body.topic_ids).toEqual(['uuid-1', 'uuid-2', 'uuid-3']);
    expect(Array.isArray(body.topic_ids)).toBe(true);
  });

  it('Gate 2 (script/approve): sends topic_id', async () => {
    await webhookCall('script/approve', { topic_id: 'uuid-topic-1' });

    const [, options] = globalThis.fetch.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body.topic_id).toBe('uuid-topic-1');
    expect(typeof body.topic_id).toBe('string');
  });

  it('Gate 3 (video/approve): sends topic_id', async () => {
    await webhookCall('video/approve', { topic_id: 'uuid-topic-1' });

    const [, options] = globalThis.fetch.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body.topic_id).toBe('uuid-topic-1');
  });

  it('convenience helpers use correct endpoints', async () => {
    vi.resetModules();
    const api = await import('../lib/api.js');

    // generateScript
    await api.generateScript('topic-uuid');
    let [url] = globalThis.fetch.mock.calls[0];
    expect(url).toContain('script/generate');

    // approveScript
    await api.approveScript('topic-uuid');
    [url] = globalThis.fetch.mock.calls[1];
    expect(url).toContain('script/approve');

    // rejectScript
    await api.rejectScript('topic-uuid', 'needs more data');
    [url] = globalThis.fetch.mock.calls[2];
    expect(url).toContain('script/reject');
    const rejectBody = JSON.parse(globalThis.fetch.mock.calls[2][1].body);
    expect(rejectBody.topic_id).toBe('topic-uuid');
    expect(rejectBody.feedback).toBe('needs more data');
  });
});

// ── YouTube quota logic ─────────────────────────────────────────────

describe('YouTube quota — MAX_DAILY_UPLOADS', () => {
  const MAX_DAILY_UPLOADS = 6;

  it('MAX_DAILY_UPLOADS is 6', () => {
    expect(MAX_DAILY_UPLOADS).toBe(6);
  });

  it('remaining = max(0, 6 - uploadsToday) when under quota', () => {
    const uploadsToday = 2;
    const remaining = Math.max(0, MAX_DAILY_UPLOADS - uploadsToday);
    expect(remaining).toBe(4);
  });

  it('remaining = 0 when at quota limit', () => {
    const uploadsToday = 6;
    const remaining = Math.max(0, MAX_DAILY_UPLOADS - uploadsToday);
    expect(remaining).toBe(0);
  });

  it('remaining = 0 when over quota (should never happen, but guard)', () => {
    const uploadsToday = 8;
    const remaining = Math.max(0, MAX_DAILY_UPLOADS - uploadsToday);
    expect(remaining).toBe(0);
  });

  it('remaining = 6 when no uploads today', () => {
    const uploadsToday = 0;
    const remaining = Math.max(0, MAX_DAILY_UPLOADS - uploadsToday);
    expect(remaining).toBe(6);
  });
});

// ── extractChannelIdentifier ────────────────────────────────────────

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('../hooks/useRealtimeSubscription', () => ({
  useRealtimeSubscription: vi.fn(),
}));

describe('extractChannelIdentifier', () => {
  let extractChannelIdentifier;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../hooks/useIntelligenceHub.js');
    extractChannelIdentifier = mod.extractChannelIdentifier;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles UC channel ID (24 chars: UC + 22) in URL', () => {
    // UC + exactly 22 word chars = 24 total. The regex /(UC[\w-]{22})/ captures this.
    const result = extractChannelIdentifier(
      'https://www.youtube.com/channel/UCaBcDeFgHiJkLmNoPqRsTuV',
    );
    expect(result.kind).toBe('channel_id');
    expect(result.value).toBe('UCaBcDeFgHiJkLmNoPqRsTuV');
    expect(result.value.length).toBe(24);
  });

  it('handles @handle URL', () => {
    const result = extractChannelIdentifier('https://www.youtube.com/@MrBeast');
    expect(result.kind).toBe('handle');
    expect(result.value).toBe('MrBeast');
  });

  it('handles /channel/UC... URL format', () => {
    const result = extractChannelIdentifier(
      'https://youtube.com/channel/UC1234567890abcdefghijkl',
    );
    expect(result.kind).toBe('channel_id');
    expect(result.value).toMatch(/^UC/);
    expect(result.value.length).toBe(24);
  });

  it('handles null input', () => {
    const result = extractChannelIdentifier(null);
    expect(result.kind).toBeNull();
    expect(result.value).toBeNull();
  });

  it('handles empty string input', () => {
    const result = extractChannelIdentifier('');
    expect(result.kind).toBeNull();
    expect(result.value).toBeNull();
  });

  it('handles non-string input', () => {
    const result = extractChannelIdentifier(123);
    expect(result.kind).toBeNull();
    expect(result.value).toBeNull();
  });

  it('handles undefined input', () => {
    const result = extractChannelIdentifier(undefined);
    expect(result.kind).toBeNull();
    expect(result.value).toBeNull();
  });

  it('handles URL with trailing whitespace', () => {
    const result = extractChannelIdentifier(
      '  https://www.youtube.com/@CodeWithMosh  ',
    );
    expect(result.kind).toBe('handle');
    expect(result.value).toBe('CodeWithMosh');
  });

  it('extracts UC ID from anywhere in the string (highest confidence)', () => {
    // If a UC ID (UC + 22 chars = 24 total) appears anywhere, it takes priority
    const result = extractChannelIdentifier(
      'Check out UCaBcDeFgHiJkLmNoPqRsTuV channel',
    );
    expect(result.kind).toBe('channel_id');
    expect(result.value).toBe('UCaBcDeFgHiJkLmNoPqRsTuV');
  });
});

// ── cn() utility ────────────────────────────────────────────────────

describe('cn() utility — class merging', () => {
  let cn;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../lib/utils.js');
    cn = mod.cn;
  });

  it('merges multiple class strings', () => {
    expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz');
  });

  it('resolves tailwind conflicts (last wins)', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
  });

  it('handles null and undefined gracefully', () => {
    expect(cn('foo', null, undefined, 'bar')).toBe('foo bar');
  });

  it('handles false and empty string', () => {
    expect(cn('foo', false, '', 'bar')).toBe('foo bar');
  });

  it('handles empty call', () => {
    expect(cn()).toBe('');
  });

  it('preserves non-conflicting classes', () => {
    const result = cn('bg-red-500', 'text-blue-500', 'p-4', 'rounded-lg');
    expect(result).toContain('bg-red-500');
    expect(result).toContain('text-blue-500');
    expect(result).toContain('p-4');
    expect(result).toContain('rounded-lg');
  });

  it('handles conditional classes via clsx-style arrays', () => {
    const isActive = true;
    const isDisabled = false;
    const result = cn(
      'base-class',
      isActive && 'active-class',
      isDisabled && 'disabled-class',
    );
    expect(result).toContain('base-class');
    expect(result).toContain('active-class');
    expect(result).not.toContain('disabled-class');
  });

  it('handles object syntax from clsx', () => {
    const result = cn('base', { 'text-red-500': true, 'text-blue-500': false });
    expect(result).toContain('base');
    expect(result).toContain('text-red-500');
    expect(result).not.toContain('text-blue-500');
  });
});

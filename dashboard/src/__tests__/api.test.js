import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('webhookCall', () => {
  let webhookCall;
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    // Reset modules to pick up fresh import.meta.env
    vi.resetModules();
    const mod = await import('../lib/api.js');
    webhookCall = mod.webhookCall;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('sends POST request with correct Content-Type header', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: {}, error: null }),
    });

    await webhookCall('test/endpoint', { foo: 'bar' });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [, options] = globalThis.fetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  it('sends Authorization Bearer header', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: {}, error: null }),
    });

    await webhookCall('test/endpoint');

    const [, options] = globalThis.fetch.mock.calls[0];
    expect(options.headers['Authorization']).toMatch(/^Bearer /);
  });

  it('constructs correct URL from endpoint parameter', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: {}, error: null }),
    });

    await webhookCall('project/create', {});

    const [url] = globalThis.fetch.mock.calls[0];
    expect(url).toContain('/project/create');
  });

  it('returns parsed JSON response on success', async () => {
    const mockResponse = { success: true, data: { id: '123' }, error: null };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await webhookCall('test', {});

    expect(result).toEqual(mockResponse);
  });

  it('sends request body as JSON string', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: {}, error: null }),
    });

    const payload = { niche: 'credit cards', name: 'Test' };
    await webhookCall('test', payload);

    const [, options] = globalThis.fetch.mock.calls[0];
    expect(options.body).toBe(JSON.stringify(payload));
  });

  it('returns error envelope on fetch failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await webhookCall('test');

    expect(result.success).toBe(false);
    expect(result.data).toBeNull();
    expect(result.error).toBe('Network error');
  });
});

import { describe, it, expect } from 'vitest';

/**
 * Test the cost breakdown filtering logic from TopicDetail.jsx.
 * The logic filters out i2v/t2v entries, adds ken_burns at $0.00,
 * and deduplicates. We extract this as a pure function for testing.
 */

function filterCostBreakdown(costBreakdown) {
  return Object.entries(costBreakdown)
    .map(([key, val]) => {
      // Replace deprecated I2V/T2V with Ken Burns ($0)
      const lk = key.toLowerCase();
      if (lk === 'i2v' || lk === 't2v') return null;
      return [key, val];
    })
    .filter(Boolean)
    .concat([['ken_burns', 0]])
    // Deduplicate ken_burns if it already exists
    .filter(([key], i, arr) => arr.findIndex(([k]) => k === key) === i);
}

describe('TopicDetail -- Cost Breakdown Filtering', () => {
  it('filters out i2v entries', () => {
    const result = filterCostBreakdown({ script: 0.75, tts: 0.30, images: 3.20, i2v: 3.13 });
    const keys = result.map(([k]) => k);
    expect(keys).not.toContain('i2v');
  });

  it('filters out t2v entries', () => {
    const result = filterCostBreakdown({ script: 0.75, tts: 0.30, t2v: 9.00 });
    const keys = result.map(([k]) => k);
    expect(keys).not.toContain('t2v');
  });

  it('filters out both i2v and t2v when both present', () => {
    const result = filterCostBreakdown({ script: 0.75, tts: 0.30, images: 3.20, i2v: 3.13, t2v: 9.00 });
    const keys = result.map(([k]) => k);
    expect(keys).not.toContain('i2v');
    expect(keys).not.toContain('t2v');
  });

  it('adds ken_burns entry with $0.00 value', () => {
    const result = filterCostBreakdown({ script: 0.75, tts: 0.30 });
    const kenBurns = result.find(([k]) => k === 'ken_burns');
    expect(kenBurns).toBeTruthy();
    expect(kenBurns[1]).toBe(0);
  });

  it('preserves other entries (tts, images, script) unchanged', () => {
    const result = filterCostBreakdown({ script: 0.75, tts: 0.30, images: 3.20, i2v: 3.13, t2v: 9.00 });
    const keys = result.map(([k]) => k);
    expect(keys).toContain('script');
    expect(keys).toContain('tts');
    expect(keys).toContain('images');
    // Verify values are preserved
    const scriptEntry = result.find(([k]) => k === 'script');
    expect(scriptEntry[1]).toBe(0.75);
    const ttsEntry = result.find(([k]) => k === 'tts');
    expect(ttsEntry[1]).toBe(0.30);
    const imagesEntry = result.find(([k]) => k === 'images');
    expect(imagesEntry[1]).toBe(3.20);
  });

  it('deduplicates ken_burns if it already exists in breakdown', () => {
    const result = filterCostBreakdown({ script: 0.75, ken_burns: 0 });
    const kenBurnsEntries = result.filter(([k]) => k === 'ken_burns');
    expect(kenBurnsEntries.length).toBe(1);
    expect(kenBurnsEntries[0][1]).toBe(0); // keeps the first one (original)
  });

  it('handles case-insensitive i2v/t2v keys (uppercase I2V)', () => {
    const result = filterCostBreakdown({ script: 0.75, I2V: 3.13, T2V: 9.00 });
    const keys = result.map(([k]) => k);
    expect(keys).not.toContain('I2V');
    expect(keys).not.toContain('T2V');
    expect(keys).toContain('script');
    expect(keys).toContain('ken_burns');
  });
});

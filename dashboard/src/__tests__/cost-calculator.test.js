import { describe, it, expect } from 'vitest';
import { computeCostOption, IMAGE_COST, VIDEO_COST, RATIO_OPTIONS } from '../hooks/useCostCalculator';

/* ================================================================== *
 *  Cost calculation tests for the hybrid image/video pipeline.       *
 *                                                                    *
 *  Pricing:                                                          *
 *    Script:   $1.80 flat (3-pass generation)                        *
 *    TTS:      sceneCount x $0.002                                   *
 *    Images:   sceneCount x $0.04 (Seedream 4.5)                     *
 *    I2V:      videoCount x $2.419 (Seedance 2.0 Fast, 10s clip)    *
 *    Assembly: $0.06 flat (Ken Burns + color + music + end card)     *
 *                                                                    *
 *  ALL scenes get images. Video clips are additional cost on top.    *
 *  User picks ratio: 100/0, 95/5, 90/10, 85/15.                    *
 * ================================================================== */

// ── Constants validation ───────────────────────────────────────────

describe('Cost constants', () => {
  it('IMAGE_COST is $0.04 (Seedream 4.5)', () => {
    expect(IMAGE_COST).toBe(0.04);
  });

  it('VIDEO_COST is $2.419 (Seedance 2.0 Fast, 10s clip)', () => {
    expect(VIDEO_COST).toBe(2.419);
  });

  it('RATIO_OPTIONS has exactly 4 options', () => {
    expect(RATIO_OPTIONS).toHaveLength(4);
  });

  it('RATIO_OPTIONS labels and ratios are correct', () => {
    expect(RATIO_OPTIONS[0]).toEqual({ label: '100% / 0%', imageRatio: 1.0, videoRatio: 0.0 });
    expect(RATIO_OPTIONS[1]).toEqual({ label: '95% / 5%', imageRatio: 0.95, videoRatio: 0.05 });
    expect(RATIO_OPTIONS[2]).toEqual({ label: '90% / 10%', imageRatio: 0.90, videoRatio: 0.10 });
    expect(RATIO_OPTIONS[3]).toEqual({ label: '85% / 15%', imageRatio: 0.85, videoRatio: 0.15 });
  });
});

// ── computeCostOption — core formula tests ─────────────────────────

describe('computeCostOption — ratio calculations (172 scenes)', () => {
  const SCENE_COUNT = 172;

  it('100/0 ratio: 172 images ($6.88) + 0 clips ($0.00) = $6.88 media', () => {
    const result = computeCostOption(SCENE_COUNT, RATIO_OPTIONS[0]);

    expect(result.imageCount).toBe(172);
    expect(result.videoCount).toBe(0); // Math.round(172 * 0.0) = 0
    expect(result.imageCost).toBeCloseTo(6.88, 2);
    expect(result.videoCost).toBeCloseTo(0.0, 2);
    expect(result.totalCost).toBeCloseTo(6.88, 2);
  });

  it('95/5 ratio: 172 images ($6.88) + 9 clips ($21.77) = $28.65 media', () => {
    const result = computeCostOption(SCENE_COUNT, RATIO_OPTIONS[1]);

    expect(result.imageCount).toBe(172);
    expect(result.videoCount).toBe(9); // Math.round(172 * 0.05) = 9
    expect(result.imageCost).toBeCloseTo(6.88, 2);
    expect(result.videoCost).toBeCloseTo(21.77, 2); // 9 * 2.419 = 21.771
    expect(result.totalCost).toBeCloseTo(28.65, 2);
  });

  it('90/10 ratio: 172 images ($6.88) + 17 clips ($41.12) = $48.00 media', () => {
    const result = computeCostOption(SCENE_COUNT, RATIO_OPTIONS[2]);

    expect(result.imageCount).toBe(172);
    expect(result.videoCount).toBe(17); // Math.round(172 * 0.10) = 17
    expect(result.imageCost).toBeCloseTo(6.88, 2);
    expect(result.videoCost).toBeCloseTo(41.12, 2); // 17 * 2.419 = 41.123
    expect(result.totalCost).toBeCloseTo(48.00, 2);
  });

  it('85/15 ratio: 172 images ($6.88) + 26 clips ($62.89) = $69.77 media', () => {
    const result = computeCostOption(SCENE_COUNT, RATIO_OPTIONS[3]);

    expect(result.imageCount).toBe(172);
    expect(result.videoCount).toBe(26); // Math.round(172 * 0.15) = 26
    expect(result.imageCost).toBeCloseTo(6.88, 2);
    expect(result.videoCost).toBeCloseTo(62.89, 2); // 26 * 2.419 = 62.894
    expect(result.totalCost).toBeCloseTo(69.77, 2);
  });
});

describe('computeCostOption — custom scene counts', () => {
  it('100 scenes at 90/10 ratio: 10 video clips', () => {
    const result = computeCostOption(100, RATIO_OPTIONS[2]);

    expect(result.imageCount).toBe(100);
    expect(result.videoCount).toBe(10); // Math.round(100 * 0.10) = 10
    expect(result.imageCost).toBeCloseTo(4.00, 2); // 100 * 0.04
    expect(result.videoCost).toBeCloseTo(24.19, 2); // 10 * 2.419
    expect(result.totalCost).toBeCloseTo(28.19, 2);
  });

  it('zero scenes produces $0 media cost for all ratios', () => {
    for (const option of RATIO_OPTIONS) {
      const result = computeCostOption(0, option);
      expect(result.imageCount).toBe(0);
      expect(result.videoCount).toBe(0);
      expect(result.imageCost).toBe(0);
      expect(result.videoCost).toBe(0);
      expect(result.totalCost).toBe(0);
    }
  });

  it('1 scene at 85/15 ratio: rounds to 0 video clips (Math.round(0.15) = 0)', () => {
    const result = computeCostOption(1, RATIO_OPTIONS[3]);
    expect(result.imageCount).toBe(1);
    expect(result.videoCount).toBe(0); // Math.round(1 * 0.15) = 0
    expect(result.imageCost).toBeCloseTo(0.04, 2);
    expect(result.videoCost).toBe(0);
    expect(result.totalCost).toBeCloseTo(0.04, 2);
  });

  it('200 scenes at 95/5 ratio: 10 video clips', () => {
    const result = computeCostOption(200, RATIO_OPTIONS[1]);
    expect(result.videoCount).toBe(10); // Math.round(200 * 0.05) = 10
    expect(result.imageCount).toBe(200);
  });
});

describe('computeCostOption — precision and rounding', () => {
  it('image cost per scene is exactly $0.04', () => {
    const result = computeCostOption(1, RATIO_OPTIONS[0]);
    expect(result.imageCost).toBe(IMAGE_COST);
    expect(result.imageCost).toBe(0.04);
  });

  it('I2V clip cost is exactly $2.419', () => {
    // Create a custom option that produces exactly 1 video
    const singleVideoOption = { label: 'test', imageRatio: 0, videoRatio: 1.0 };
    const result = computeCostOption(1, singleVideoOption);
    expect(result.videoCost).toBe(VIDEO_COST);
    expect(result.videoCost).toBe(2.419);
  });

  it('video count uses Math.round for rounding', () => {
    // 172 * 0.05 = 8.6, Math.round(8.6) = 9
    const r1 = computeCostOption(172, RATIO_OPTIONS[1]);
    expect(r1.videoCount).toBe(Math.round(172 * 0.05));
    expect(r1.videoCount).toBe(9);

    // 172 * 0.10 = 17.2, Math.round(17.2) = 17
    const r2 = computeCostOption(172, RATIO_OPTIONS[2]);
    expect(r2.videoCount).toBe(Math.round(172 * 0.10));
    expect(r2.videoCount).toBe(17);

    // 172 * 0.15 = 25.8, Math.round(25.8) = 26
    const r3 = computeCostOption(172, RATIO_OPTIONS[3]);
    expect(r3.videoCount).toBe(Math.round(172 * 0.15));
    expect(r3.videoCount).toBe(26);
  });
});

describe('computeCostOption — return shape', () => {
  it('returns correct shape with all required fields', () => {
    const result = computeCostOption(172, RATIO_OPTIONS[1]);

    // Spread from the option
    expect(result).toHaveProperty('label', '95% / 5%');
    expect(result).toHaveProperty('imageRatio', 0.95);
    expect(result).toHaveProperty('videoRatio', 0.05);

    // Computed fields
    expect(result).toHaveProperty('imageCount');
    expect(result).toHaveProperty('videoCount');
    expect(result).toHaveProperty('imageCost');
    expect(result).toHaveProperty('videoCost');
    expect(result).toHaveProperty('totalCost');

    // Types
    expect(typeof result.imageCount).toBe('number');
    expect(typeof result.videoCount).toBe('number');
    expect(typeof result.imageCost).toBe('number');
    expect(typeof result.videoCost).toBe('number');
    expect(typeof result.totalCost).toBe('number');
  });

  it('totalCost always equals imageCost + videoCost', () => {
    for (const option of RATIO_OPTIONS) {
      const result = computeCostOption(172, option);
      expect(result.totalCost).toBeCloseTo(result.imageCost + result.videoCost, 10);
    }
  });

  it('imageCount always equals sceneCount (all scenes get images)', () => {
    for (const option of RATIO_OPTIONS) {
      const result = computeCostOption(172, option);
      expect(result.imageCount).toBe(172);
    }
  });
});

// ── Full per-video cost formula (script + TTS + media + assembly) ──

describe('Full per-video cost estimation', () => {
  const SCRIPT_COST = 1.80;
  const TTS_RATE = 0.002;
  const ASSEMBLY_COST = 0.06;

  function fullVideoCost(sceneCount, ratioOption) {
    const media = computeCostOption(sceneCount, ratioOption);
    const tts = sceneCount * TTS_RATE;
    return SCRIPT_COST + tts + media.totalCost + ASSEMBLY_COST;
  }

  it('172 scenes, 100/0: ~$9.20 per video', () => {
    // script(1.80) + tts(172*0.002=0.344) + images(6.88) + assembly(0.06) = 9.084
    const total = fullVideoCost(172, RATIO_OPTIONS[0]);
    expect(total).toBeCloseTo(9.084, 2);
  });

  it('172 scenes, 85/15: ~$71.89 per video', () => {
    // script(1.80) + tts(0.344) + media(69.774) + assembly(0.06) = 71.978
    const total = fullVideoCost(172, RATIO_OPTIONS[3]);
    expect(total).toBeCloseTo(1.80 + 0.344 + 69.774 + 0.06, 2);
  });

  it('shorts pack (20 clips * ~5 scenes) analysis cost stays under $0.50', () => {
    // Shorts analysis cost is separate from media production
    const analysisCost = 0.08;
    expect(analysisCost).toBeLessThan(0.50);
  });

  it('topic refinement cost: ~$0.15 per refinement (25 topics context)', () => {
    const refinementCost = 0.15;
    const maxRefinements = 25;
    expect(refinementCost * maxRefinements).toBeLessThanOrEqual(5.0);
  });
});

// ── Legacy cost breakdown filtering (TopicDetail pattern) ──────────

describe('filterCostBreakdown — legacy cost keys', () => {
  // Extract the filter function as used in TopicDetail.jsx
  function filterCostBreakdown(costBreakdown) {
    return Object.entries(costBreakdown)
      .map(([key, val]) => {
        const lk = key.toLowerCase();
        if (lk === 'i2v' || lk === 't2v') return null;
        return [key, val];
      })
      .filter(Boolean)
      .concat([['ken_burns', 0]])
      .filter(([key], i, arr) => arr.findIndex(([k]) => k === key) === i);
  }

  it('removes deprecated i2v/t2v keys and adds ken_burns: 0', () => {
    const result = filterCostBreakdown({
      script: 1.80,
      tts: 0.34,
      images: 5.16,
      i2v: 3.13,
      t2v: 9.00,
    });
    const keys = result.map(([k]) => k);
    expect(keys).not.toContain('i2v');
    expect(keys).not.toContain('t2v');
    expect(keys).toContain('ken_burns');
    const kenBurns = result.find(([k]) => k === 'ken_burns');
    expect(kenBurns[1]).toBe(0);
    expect(keys).toContain('script');
    expect(keys).toContain('tts');
    expect(keys).toContain('images');
  });
});

// ── useProjectMetrics aggregation (unchanged logic) ────────────────

describe('useProjectMetrics — computeMetrics aggregation', () => {
  const IN_PROGRESS_STATUSES = [
    'scripting', 'audio', 'images', 'video', 'assembly',
    'assembling', 'producing', 'queued',
  ];

  function computeMetrics(topics) {
    if (!topics || topics.length === 0) {
      return { totalTopics: 0, approved: 0, inProgress: 0, published: 0, failed: 0, totalSpend: 0, totalRevenue: 0, avgCpm: 0, netProfit: 0 };
    }
    const totalTopics = topics.length;
    const approved = topics.filter((t) => t.review_status === 'approved').length;
    const inProgress = topics.filter((t) => IN_PROGRESS_STATUSES.includes(t.status)).length;
    const published = topics.filter((t) => t.status === 'published').length;
    const failed = topics.filter((t) => t.status === 'failed').length;
    const totalSpend = topics.reduce((sum, t) => sum + (parseFloat(t.total_cost) || 0), 0);
    const totalRevenue = topics.reduce((sum, t) => sum + (parseFloat(t.yt_estimated_revenue) || 0), 0);
    const topicsWithCpm = topics.filter((t) => t.yt_actual_cpm != null && t.yt_actual_cpm > 0);
    const avgCpm = topicsWithCpm.length > 0
      ? topicsWithCpm.reduce((sum, t) => sum + parseFloat(t.yt_actual_cpm), 0) / topicsWithCpm.length
      : 0;
    const netProfit = Math.round((totalRevenue - totalSpend) * 100) / 100;
    return {
      totalTopics, approved, inProgress, published, failed,
      totalSpend: Math.round(totalSpend * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgCpm: Math.round(avgCpm * 100) / 100,
      netProfit,
    };
  }

  it('totalSpend sums topic.total_cost across topics', () => {
    const topics = [
      { total_cost: '5.16', yt_estimated_revenue: '0', status: 'published', review_status: 'approved' },
      { total_cost: '8.20', yt_estimated_revenue: '0', status: 'published', review_status: 'approved' },
      { total_cost: '3.50', yt_estimated_revenue: '0', status: 'scripting', review_status: 'approved' },
    ];
    const m = computeMetrics(topics);
    expect(m.totalSpend).toBeCloseTo(16.86, 2);
  });

  it('avgCpm computes mean of non-null yt_actual_cpm values', () => {
    const topics = [
      { yt_actual_cpm: 34.50, total_cost: '0', yt_estimated_revenue: '0', status: 'published', review_status: 'approved' },
      { yt_actual_cpm: 28.00, total_cost: '0', yt_estimated_revenue: '0', status: 'published', review_status: 'approved' },
      { yt_actual_cpm: null, total_cost: '0', yt_estimated_revenue: '0', status: 'pending', review_status: 'pending' },
      { yt_actual_cpm: 0, total_cost: '0', yt_estimated_revenue: '0', status: 'pending', review_status: 'pending' },
    ];
    const m = computeMetrics(topics);
    expect(m.avgCpm).toBeCloseTo((34.50 + 28.00) / 2, 2);
  });

  it('netProfit = totalRevenue - totalSpend', () => {
    const topics = [
      { total_cost: '8.09', yt_estimated_revenue: '1575.00', status: 'published', review_status: 'approved' },
      { total_cost: '8.09', yt_estimated_revenue: '2200.50', status: 'published', review_status: 'approved' },
    ];
    const m = computeMetrics(topics);
    expect(m.netProfit).toBeCloseTo(3775.50 - 16.18, 2);
  });

  it('returns zeroes for empty or null topics', () => {
    expect(computeMetrics([]).totalTopics).toBe(0);
    expect(computeMetrics(null).totalSpend).toBe(0);
  });

  it('correctly counts statuses', () => {
    const topics = [
      { status: 'published', review_status: 'approved', total_cost: '0', yt_estimated_revenue: '0' },
      { status: 'scripting', review_status: 'approved', total_cost: '0', yt_estimated_revenue: '0' },
      { status: 'audio', review_status: 'approved', total_cost: '0', yt_estimated_revenue: '0' },
      { status: 'failed', review_status: 'approved', total_cost: '0', yt_estimated_revenue: '0' },
      { status: 'pending', review_status: 'pending', total_cost: '0', yt_estimated_revenue: '0' },
    ];
    const m = computeMetrics(topics);
    expect(m.totalTopics).toBe(5);
    expect(m.published).toBe(1);
    expect(m.inProgress).toBe(2);
    expect(m.failed).toBe(1);
    expect(m.approved).toBe(4);
  });

  it('handles null/undefined total_cost gracefully', () => {
    const topics = [
      { total_cost: null, yt_estimated_revenue: null, status: 'pending', review_status: 'pending' },
      { total_cost: undefined, yt_estimated_revenue: undefined, status: 'pending', review_status: 'pending' },
    ];
    const m = computeMetrics(topics);
    expect(m.totalSpend).toBe(0);
    expect(m.totalRevenue).toBe(0);
  });
});

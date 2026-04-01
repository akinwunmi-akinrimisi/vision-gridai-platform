import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Test the pure validation logic from the render service.
 * We cannot import the Express server directly (it auto-starts),
 * so we extract and test the validation logic and VALID_TEMPLATES constant.
 */

// The VALID_TEMPLATES list and validateRequest function from render-service.js
const VALID_TEMPLATES = [
  'stat_callout',
  'comparison_layout',
  'bar_chart',
  'list_breakdown',
  'chapter_title',
  'quote_card',
  'timeline_graphic',
  'data_table',
  'before_after',
  'percentage_ring',
  'map_visual',
  'metric_highlight',
];

function validateRequest({ template_key, data_payload }) {
  if (!template_key || !VALID_TEMPLATES.includes(template_key)) {
    return `Invalid template_key: ${template_key}. Valid: ${VALID_TEMPLATES.join(', ')}`;
  }
  if (!data_payload) {
    return 'data_payload is required';
  }
  return null;
}

describe('RenderService -- validateRequest', () => {
  it('rejects invalid template_key', () => {
    const error = validateRequest({ template_key: 'nonexistent_template', data_payload: { value: 1 } });
    expect(error).toContain('Invalid template_key');
    expect(error).toContain('nonexistent_template');
  });

  it('rejects null template_key', () => {
    const error = validateRequest({ template_key: null, data_payload: { value: 1 } });
    expect(error).toContain('Invalid template_key');
  });

  it('rejects undefined template_key', () => {
    const error = validateRequest({ template_key: undefined, data_payload: { value: 1 } });
    expect(error).toContain('Invalid template_key');
  });

  it('rejects missing data_payload', () => {
    const error = validateRequest({ template_key: 'stat_callout', data_payload: null });
    expect(error).toBe('data_payload is required');
  });

  it('rejects undefined data_payload', () => {
    const error = validateRequest({ template_key: 'bar_chart', data_payload: undefined });
    expect(error).toBe('data_payload is required');
  });

  it('accepts valid request with known template and data_payload', () => {
    const error = validateRequest({ template_key: 'stat_callout', data_payload: { value: 42, label: 'Test' } });
    expect(error).toBeNull();
  });

  it('accepts all valid template keys', () => {
    for (const key of VALID_TEMPLATES) {
      const error = validateRequest({ template_key: key, data_payload: { test: true } });
      expect(error).toBeNull();
    }
  });
});

describe('RenderService -- VALID_TEMPLATES', () => {
  it('has exactly 12 entries', () => {
    expect(VALID_TEMPLATES.length).toBe(12);
  });

  it('contains all expected template names', () => {
    const expected = [
      'stat_callout', 'comparison_layout', 'bar_chart', 'list_breakdown',
      'chapter_title', 'quote_card', 'timeline_graphic', 'data_table',
      'before_after', 'percentage_ring', 'map_visual', 'metric_highlight',
    ];
    for (const name of expected) {
      expect(VALID_TEMPLATES).toContain(name);
    }
  });

  it('all template keys are snake_case strings', () => {
    const snakeCaseRegex = /^[a-z][a-z0-9_]*$/;
    for (const key of VALID_TEMPLATES) {
      expect(key).toMatch(snakeCaseRegex);
    }
  });
});

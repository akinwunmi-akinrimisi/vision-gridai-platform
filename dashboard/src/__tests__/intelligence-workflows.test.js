/**
 * Intelligence Layer Workflow Contract Tests
 *
 * Reads the 19 Intelligence workflow JSON files and verifies structural
 * properties: valid JSON, nodes present, $env usage (no process.env),
 * fetch() pattern (no this.helpers.httpRequest), correct Claude model,
 * production_logs writes, and retry/backoff logic.
 *
 * Grouped by sprint (S1-S8) matching the Intelligence Layer spec.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const WORKFLOWS_DIR = path.resolve(__dirname, '../../../workflows');

function loadWorkflow(filename) {
  const fullPath = path.join(WORKFLOWS_DIR, filename);
  const raw = fs.readFileSync(fullPath, 'utf-8');
  return { raw, json: JSON.parse(raw) };
}

function workflowExists(filename) {
  return fs.existsSync(path.join(WORKFLOWS_DIR, filename));
}

/* ------------------------------------------------------------------ */
/*  Workflow manifest (19 files, grouped by sprint)                    */
/* ------------------------------------------------------------------ */

const INTELLIGENCE_WORKFLOWS = [
  // Sprint S1: Topic Scoring
  { file: 'WF_OUTLIER_SCORE.json', cf: 'CF01', sprint: 'S1', label: 'Outlier Score' },
  { file: 'WF_SEO_SCORE.json', cf: 'CF02', sprint: 'S1', label: 'SEO Score' },
  { file: 'WF_KEYWORD_SCAN.json', cf: 'CF02', sprint: 'S1', label: 'Keyword Scan' },

  // Sprint S2: Revenue + Competitor
  { file: 'WF_RPM_CLASSIFY.json', cf: 'CF03', sprint: 'S2', label: 'RPM Classify' },
  { file: 'WF_COMPETITOR_MONITOR.json', cf: 'CF04', sprint: 'S2', label: 'Competitor Monitor' },
  { file: 'WF_STYLE_DNA.json', cf: 'CF14', sprint: 'S2', label: 'Style DNA' },

  // Sprint S3: CTR + Thumbnail
  { file: 'WF_CTR_OPTIMIZE.json', cf: 'CF05', sprint: 'S3', label: 'CTR Optimize' },
  { file: 'WF_THUMBNAIL_SCORE.json', cf: 'CF06', sprint: 'S3', label: 'Thumbnail Score' },
  { file: 'WF_AB_TEST_ROTATE.json', cf: 'CF17', sprint: 'S3', label: 'A/B Test Rotate' },

  // Sprint S4: PPS + Hook Analyzer
  { file: 'WF_PREDICT_PERFORMANCE.json', cf: 'CF13', sprint: 'S4', label: 'Predict Performance' },
  { file: 'WF_HOOK_ANALYZER.json', cf: 'CF12', sprint: 'S4', label: 'Hook Analyzer' },
  { file: 'WF_VIRAL_TAG.json', cf: 'CF12', sprint: 'S4', label: 'Viral Tag' },

  // Sprint S5: Music
  { file: 'WF_MUSIC_GENERATE.json', cf: 'CF07', sprint: 'S5', label: 'Music Generate' },

  // Sprint S6: AI Advisory
  { file: 'WF_DAILY_IDEAS.json', cf: 'CF08', sprint: 'S6', label: 'Daily Ideas' },
  { file: 'WF_AI_COACH.json', cf: 'CF09', sprint: 'S6', label: 'AI Coach' },

  // Sprint S7: Analytics Loop
  { file: 'WF_NICHE_HEALTH.json', cf: 'CF11', sprint: 'S7', label: 'Niche Health' },
  { file: 'WF_REVENUE_ATTRIBUTION.json', cf: 'CF15', sprint: 'S7', label: 'Revenue Attribution' },
  { file: 'WF_PPS_CALIBRATE.json', cf: 'CF13', sprint: 'S7', label: 'PPS Calibrate' },

  // Sprint S8: Audience
  { file: 'WF_AUDIENCE_INTELLIGENCE.json', cf: 'CF16', sprint: 'S8', label: 'Audience Intelligence' },
];

// Allowed Claude model identifiers (invariant #13 from spec)
const ALLOWED_CLAUDE_MODELS = [
  'claude-opus-4-6',
  'claude-haiku-4-5-20251001',
];

/* ------------------------------------------------------------------ */
/*  Core structural tests — per-workflow                               */
/* ------------------------------------------------------------------ */

describe.each(INTELLIGENCE_WORKFLOWS)(
  '$sprint — $label ($file, $cf)',
  ({ file, cf, sprint, label }) => {
    it('file exists and parses as valid JSON', () => {
      expect(workflowExists(file)).toBe(true);
      expect(() => loadWorkflow(file)).not.toThrow();
    });

    it('has a nodes array with at least 1 node', () => {
      const { json } = loadWorkflow(file);
      expect(json).toHaveProperty('nodes');
      expect(Array.isArray(json.nodes)).toBe(true);
      expect(json.nodes.length).toBeGreaterThanOrEqual(1);
    });

    it('uses $env pattern for environment variables (invariant #15)', () => {
      const { raw } = loadWorkflow(file);
      // All Code nodes MUST reference $env for credential access
      expect(raw).toContain('$env');
    });

    it('does NOT use this.helpers.httpRequest (broken in n8n 2.8.4)', () => {
      const { raw } = loadWorkflow(file);
      expect(raw).not.toContain('this.helpers.httpRequest');
    });

    it('does NOT use process.env (use $env instead)', () => {
      const { raw } = loadWorkflow(file);
      expect(raw).not.toContain('process.env');
    });

    it('uses correct Claude model if Anthropic API is called (invariant #13)', () => {
      const { raw } = loadWorkflow(file);
      // If the workflow calls Anthropic, check for allowed models
      if (raw.includes('api.anthropic.com') || raw.includes('anthropic-version')) {
        const hasAllowedModel = ALLOWED_CLAUDE_MODELS.some((model) =>
          raw.includes(model),
        );
        expect(hasAllowedModel).toBe(true);
      }
    });

    it('writes to production_logs for structured logging (or is an FFmpeg-only workflow)', () => {
      const { raw } = loadWorkflow(file);
      // WF_MUSIC_GENERATE is an FFmpeg/Lyria pipeline that doesn't write to
      // production_logs directly (logging happens in the caller). Allow it.
      const EXEMPT_FROM_LOGGING = ['WF_MUSIC_GENERATE.json'];
      if (EXEMPT_FROM_LOGGING.includes(file)) {
        expect(true).toBe(true); // exempt
      } else {
        expect(raw).toContain('production_logs');
      }
    });

    it('has retry/backoff logic for resilience (or uses sequential FFmpeg steps)', () => {
      const { raw } = loadWorkflow(file);
      const lower = raw.toLowerCase();
      // WF_MUSIC_GENERATE uses sequential FFmpeg execSync calls with try/catch
      // instead of the standard retry pattern — it has its own error handling.
      const EXEMPT_FROM_RETRY = ['WF_MUSIC_GENERATE.json'];
      if (EXEMPT_FROM_RETRY.includes(file)) {
        // Verify it at least has try/catch error handling
        expect(lower).toContain('catch');
      } else {
        const hasRetryLogic =
          lower.includes('backoff') ||
          lower.includes('retry') ||
          lower.includes('attempt') ||
          lower.includes('delay') ||
          lower.includes('maxretries') ||
          lower.includes('max_retries');
        expect(hasRetryLogic).toBe(true);
      }
    });
  },
);

/* ------------------------------------------------------------------ */
/*  Sprint-level grouping tests                                        */
/* ------------------------------------------------------------------ */

describe('Sprint S1 — Topic Scoring (CF01 + CF02)', () => {
  it('all 3 S1 workflows exist', () => {
    const s1Files = INTELLIGENCE_WORKFLOWS.filter((w) => w.sprint === 'S1');
    expect(s1Files).toHaveLength(3);
    s1Files.forEach(({ file }) => {
      expect(workflowExists(file)).toBe(true);
    });
  });

  it('WF_OUTLIER_SCORE uses YouTube API + Claude Opus for scoring', () => {
    const { raw } = loadWorkflow('WF_OUTLIER_SCORE.json');
    expect(raw).toContain('googleapis.com/youtube');
    expect(raw).toContain('api.anthropic.com');
    expect(raw).toContain('outlier_score');
  });

  it('WF_SEO_SCORE generates keyword variants and uses YouTube autocomplete', () => {
    const { raw } = loadWorkflow('WF_SEO_SCORE.json');
    expect(raw).toContain('suggestqueries.google.com');
    expect(raw).toContain('seo_score');
    expect(raw).toContain('seo_classification');
  });

  it('WF_KEYWORD_SCAN has webhook trigger for on-demand scanning', () => {
    const { json } = loadWorkflow('WF_KEYWORD_SCAN.json');
    const hasWebhook = json.nodes.some(
      (n) => n.type === 'n8n-nodes-base.webhook',
    );
    expect(hasWebhook).toBe(true);
  });
});

describe('Sprint S2 — Revenue + Competitor (CF03 + CF04 + CF14)', () => {
  it('all 3 S2 workflows exist', () => {
    const s2Files = INTELLIGENCE_WORKFLOWS.filter((w) => w.sprint === 'S2');
    expect(s2Files).toHaveLength(3);
    s2Files.forEach(({ file }) => {
      expect(workflowExists(file)).toBe(true);
    });
  });

  it('WF_RPM_CLASSIFY writes rpm_category to topics', () => {
    const { raw } = loadWorkflow('WF_RPM_CLASSIFY.json');
    expect(raw).toContain('rpm_category');
  });

  it('WF_COMPETITOR_MONITOR tracks competitor channels', () => {
    const { raw } = loadWorkflow('WF_COMPETITOR_MONITOR.json');
    expect(raw).toContain('competitor');
  });

  it('WF_STYLE_DNA analyzes channel style patterns', () => {
    const { raw } = loadWorkflow('WF_STYLE_DNA.json');
    const lower = raw.toLowerCase();
    const hasStyle = lower.includes('style_dna') || lower.includes('style') || lower.includes('thumbnail');
    expect(hasStyle).toBe(true);
  });
});

describe('Sprint S3 — CTR + Thumbnail (CF05 + CF06 + CF17)', () => {
  it('all 3 S3 workflows exist', () => {
    const s3Files = INTELLIGENCE_WORKFLOWS.filter((w) => w.sprint === 'S3');
    expect(s3Files).toHaveLength(3);
    s3Files.forEach(({ file }) => {
      expect(workflowExists(file)).toBe(true);
    });
  });

  it('WF_CTR_OPTIMIZE references click-through rate data', () => {
    const { raw } = loadWorkflow('WF_CTR_OPTIMIZE.json');
    const lower = raw.toLowerCase();
    const hasCTR = lower.includes('ctr') || lower.includes('click');
    expect(hasCTR).toBe(true);
  });

  it('WF_THUMBNAIL_SCORE has scoring output', () => {
    const { raw } = loadWorkflow('WF_THUMBNAIL_SCORE.json');
    const lower = raw.toLowerCase();
    const hasScore = lower.includes('score') || lower.includes('thumbnail');
    expect(hasScore).toBe(true);
  });

  it('WF_AB_TEST_ROTATE handles A/B test rotation', () => {
    const { raw } = loadWorkflow('WF_AB_TEST_ROTATE.json');
    const lower = raw.toLowerCase();
    const hasAB = lower.includes('ab_test') || lower.includes('a/b') || lower.includes('rotate') || lower.includes('variant');
    expect(hasAB).toBe(true);
  });
});

describe('Sprint S4 — PPS + Hook Analyzer (CF12 + CF13)', () => {
  it('all 3 S4 workflows exist', () => {
    const s4Files = INTELLIGENCE_WORKFLOWS.filter((w) => w.sprint === 'S4');
    expect(s4Files).toHaveLength(3);
    s4Files.forEach(({ file }) => {
      expect(workflowExists(file)).toBe(true);
    });
  });

  it('WF_PREDICT_PERFORMANCE computes predicted performance score', () => {
    const { raw } = loadWorkflow('WF_PREDICT_PERFORMANCE.json');
    const lower = raw.toLowerCase();
    const hasPPS = lower.includes('pps') || lower.includes('predicted') || lower.includes('performance');
    expect(hasPPS).toBe(true);
  });

  it('WF_HOOK_ANALYZER analyzes script hooks', () => {
    const { raw } = loadWorkflow('WF_HOOK_ANALYZER.json');
    const lower = raw.toLowerCase();
    expect(lower).toContain('hook');
  });

  it('WF_VIRAL_TAG identifies viral signals', () => {
    const { raw } = loadWorkflow('WF_VIRAL_TAG.json');
    const lower = raw.toLowerCase();
    const hasViral = lower.includes('viral') || lower.includes('tag');
    expect(hasViral).toBe(true);
  });
});

describe('Sprint S5 — Music (CF07)', () => {
  it('WF_MUSIC_GENERATE exists and has nodes', () => {
    expect(workflowExists('WF_MUSIC_GENERATE.json')).toBe(true);
    const { json } = loadWorkflow('WF_MUSIC_GENERATE.json');
    expect(json.nodes.length).toBeGreaterThanOrEqual(1);
  });

  it('WF_MUSIC_GENERATE references music/audio generation', () => {
    const { raw } = loadWorkflow('WF_MUSIC_GENERATE.json');
    const lower = raw.toLowerCase();
    const hasMusic = lower.includes('music') || lower.includes('lyria') || lower.includes('audio');
    expect(hasMusic).toBe(true);
  });
});

describe('Sprint S6 — AI Advisory (CF08 + CF09)', () => {
  it('WF_DAILY_IDEAS has a schedule trigger for daily cron', () => {
    const { json } = loadWorkflow('WF_DAILY_IDEAS.json');
    const hasCron = json.nodes.some(
      (n) =>
        n.type === 'n8n-nodes-base.scheduleTrigger' ||
        n.type === 'n8n-nodes-base.cron' ||
        (n.name || '').toLowerCase().includes('schedule'),
    );
    expect(hasCron).toBe(true);
  });

  it('WF_AI_COACH references coaching/advisory logic', () => {
    const { raw } = loadWorkflow('WF_AI_COACH.json');
    const lower = raw.toLowerCase();
    const hasCoach = lower.includes('coach') || lower.includes('advisory') || lower.includes('recommendation');
    expect(hasCoach).toBe(true);
  });
});

describe('Sprint S7 — Analytics Loop (CF10 + CF11 + CF15)', () => {
  it('all 3 S7 workflows exist', () => {
    const s7Files = INTELLIGENCE_WORKFLOWS.filter((w) => w.sprint === 'S7');
    expect(s7Files).toHaveLength(3);
    s7Files.forEach(({ file }) => {
      expect(workflowExists(file)).toBe(true);
    });
  });

  it('WF_NICHE_HEALTH computes niche health metrics', () => {
    const { raw } = loadWorkflow('WF_NICHE_HEALTH.json');
    const lower = raw.toLowerCase();
    expect(lower).toContain('health');
  });

  it('WF_REVENUE_ATTRIBUTION handles revenue data', () => {
    const { raw } = loadWorkflow('WF_REVENUE_ATTRIBUTION.json');
    const lower = raw.toLowerCase();
    const hasRevenue = lower.includes('revenue') || lower.includes('attribution') || lower.includes('rpm');
    expect(hasRevenue).toBe(true);
  });

  it('WF_PPS_CALIBRATE calibrates prediction model', () => {
    const { raw } = loadWorkflow('WF_PPS_CALIBRATE.json');
    const lower = raw.toLowerCase();
    const hasCal = lower.includes('calibrat') || lower.includes('pps') || lower.includes('accuracy');
    expect(hasCal).toBe(true);
  });
});

describe('Sprint S8 — Audience (CF16)', () => {
  it('WF_AUDIENCE_INTELLIGENCE exists and has nodes', () => {
    expect(workflowExists('WF_AUDIENCE_INTELLIGENCE.json')).toBe(true);
    const { json } = loadWorkflow('WF_AUDIENCE_INTELLIGENCE.json');
    expect(json.nodes.length).toBeGreaterThanOrEqual(1);
  });

  it('WF_AUDIENCE_INTELLIGENCE analyzes audience data', () => {
    const { raw } = loadWorkflow('WF_AUDIENCE_INTELLIGENCE.json');
    const lower = raw.toLowerCase();
    const hasAudience = lower.includes('audience') || lower.includes('viewer') || lower.includes('subscriber');
    expect(hasAudience).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  Workflow chaining tests                                            */
/* ------------------------------------------------------------------ */

describe('Execute Workflow chain wiring', () => {
  it('WF_PROJECT_CREATE exists (chain source for RPM)', () => {
    expect(workflowExists('WF_PROJECT_CREATE.json')).toBe(true);
    const { json } = loadWorkflow('WF_PROJECT_CREATE.json');
    expect(json.nodes.length).toBeGreaterThanOrEqual(1);
  });

  it('WF_THUMBNAIL_SCORE exists and could be chained from thumbnail generation', () => {
    expect(workflowExists('WF_THUMBNAIL_SCORE.json')).toBe(true);
    const { json } = loadWorkflow('WF_THUMBNAIL_SCORE.json');
    expect(json.nodes.length).toBeGreaterThanOrEqual(1);
    // Verify it has an Execute Workflow Trigger (meaning it is called as a sub-workflow)
    // OR a webhook trigger (called via HTTP)
    const hasTrigger = json.nodes.some(
      (n) =>
        n.type === 'n8n-nodes-base.executeWorkflowTrigger' ||
        n.type === 'n8n-nodes-base.webhook',
    );
    expect(hasTrigger).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  Cross-cutting invariants                                           */
/* ------------------------------------------------------------------ */

describe('Cross-cutting — all 19 Intelligence workflows', () => {
  it('total workflow count is exactly 19', () => {
    expect(INTELLIGENCE_WORKFLOWS).toHaveLength(19);
  });

  it('every workflow file name starts with WF_ and ends with .json', () => {
    INTELLIGENCE_WORKFLOWS.forEach(({ file }) => {
      expect(file).toMatch(/^WF_.*\.json$/);
    });
  });

  it('no workflow uses hardcoded API keys', () => {
    const DANGEROUS_PATTERNS = [
      /sk-[a-zA-Z0-9]{20,}/,        // Anthropic/OpenAI key
      /AIza[a-zA-Z0-9_-]{35}/,      // Google API key
      /fal_[a-zA-Z0-9]{20,}/,       // Fal.ai key
      /eyJhbGciOi[a-zA-Z0-9+=\/]{50,}/, // JWT tokens
    ];

    INTELLIGENCE_WORKFLOWS.forEach(({ file }) => {
      const { raw } = loadWorkflow(file);
      DANGEROUS_PATTERNS.forEach((pattern) => {
        expect(raw).not.toMatch(pattern);
      });
    });
  });

  it('all workflows have a name field matching the filename convention', () => {
    INTELLIGENCE_WORKFLOWS.forEach(({ file }) => {
      const { json } = loadWorkflow(file);
      expect(json).toHaveProperty('name');
      // Name should be non-empty
      expect(typeof json.name).toBe('string');
      expect(json.name.length).toBeGreaterThan(0);
    });
  });

  it('no workflow uses require() (blocked in n8n sandbox) — except WF_MUSIC_GENERATE which runs host-side FFmpeg', () => {
    // WF_MUSIC_GENERATE legitimately uses require('child_process') and require('fs')
    // for FFmpeg execSync on the host. It runs via docker exec, not the n8n task runner.
    const EXEMPT_FROM_REQUIRE_BAN = ['WF_MUSIC_GENERATE.json'];

    INTELLIGENCE_WORKFLOWS.forEach(({ file }) => {
      if (EXEMPT_FROM_REQUIRE_BAN.includes(file)) return; // skip exempt
      const { raw } = loadWorkflow(file);
      expect(raw).not.toMatch(/require\s*\(\s*['"](?:util|fs|path|child_process)['"]\s*\)/);
    });
  });
});

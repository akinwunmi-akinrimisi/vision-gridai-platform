/**
 * Vision GridAI — Remotion Render Service
 *
 * Lightweight Express server that renders Remotion templates as static PNGs.
 * Called by n8n WF_REMOTION_RENDER for each Remotion-classified scene.
 *
 * Endpoints:
 *   POST /render   — Render a scene to PNG, save to output_path or /tmp/renders/
 *   POST /preview  — Render a preview PNG to /tmp/previews/ (temporary)
 *   GET  /health   — Service health check + template list
 *   GET  /files/*  — Serve rendered PNGs from both render and preview dirs
 *
 * Start: node dashboard/src/remotion/render-service.js
 * Port:  3100 (override with REMOTION_RENDER_PORT env var)
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.REMOTION_RENDER_PORT || 3100;
const RENDER_DIR = '/tmp/renders';
const PREVIEW_DIR = '/tmp/previews';

// Ensure output directories exist
[RENDER_DIR, PREVIEW_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Template registry — must match keys in templates/index.js TEMPLATE_REGISTRY
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

// ---------------------------------------------------------------------------
// Shared render logic
// ---------------------------------------------------------------------------

/**
 * Renders a Remotion template to a static PNG file.
 *
 * @param {Object} opts
 * @param {string} opts.template_key  — snake_case template key (must be in VALID_TEMPLATES)
 * @param {Object} opts.data_payload  — data passed to the template as inputProps.data
 * @param {string} [opts.color_mood]  — color mood string (default: 'cool_neutral')
 * @param {string} [opts.format]      — 'long' (1920x1080) or 'short' (1080x1920)
 * @param {string} [opts.style_dna]   — style DNA string appended to visual identity
 * @param {string} opts.outputFile    — absolute path for the rendered PNG
 * @returns {Promise<{ file_path: string, filename: string, render_time_ms: number }>}
 */
async function renderTemplate({ template_key, data_payload, color_mood, format, style_dna, outputFile }) {
  const startTime = Date.now();

  // Lazy-require Remotion packages (they may not be installed yet)
  const { renderStill, selectComposition } = require('@remotion/renderer');
  const { bundle } = require('@remotion/bundler');

  // Bundle the Remotion project once and cache for subsequent calls
  if (!global.__remotionBundled) {
    console.log('[Render Service] Bundling Remotion project...');
    global.__remotionBundled = await bundle({
      entryPoint: path.resolve(__dirname, 'templates/index.js'),
      webpackOverride: (config) => config,
    });
    console.log('[Render Service] Bundle complete');
  }

  const bundleLocation = global.__remotionBundled;

  // Map snake_case template_key to PascalCase composition ID
  // e.g. 'stat_callout' -> 'StatCallout'
  const compositionId = template_key
    .split('_')
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join('');

  const inputProps = {
    data: data_payload,
    colorMood: color_mood || 'cool_neutral',
    format: format || 'long',
    styleDna: style_dna || '',
  };

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps,
  });

  await renderStill({
    composition,
    serveUrl: bundleLocation,
    output: outputFile,
    inputProps,
  });

  const renderTimeMs = Date.now() - startTime;
  console.log(`[Render] ${template_key} -> ${outputFile} (${renderTimeMs}ms)`);

  return {
    file_path: outputFile,
    filename: path.basename(outputFile),
    render_time_ms: renderTimeMs,
  };
}

/**
 * Validates the common request body fields for /render and /preview.
 * Returns an error string if invalid, or null if valid.
 */
function validateRequest({ template_key, data_payload }) {
  if (!template_key || !VALID_TEMPLATES.includes(template_key)) {
    return `Invalid template_key: ${template_key}. Valid: ${VALID_TEMPLATES.join(', ')}`;
  }
  if (!data_payload) {
    return 'data_payload is required';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// POST /render — render a scene to PNG (production path)
app.post('/render', async (req, res) => {
  const { template_key, data_payload, color_mood, format, style_dna, output_path } = req.body;

  const validationError = validateRequest({ template_key, data_payload });
  if (validationError) {
    return res.status(400).json({ success: false, error: validationError });
  }

  const outputFile = output_path || path.join(RENDER_DIR, `${template_key}_${Date.now()}.png`);

  try {
    const result = await renderTemplate({
      template_key,
      data_payload,
      color_mood,
      format,
      style_dna,
      outputFile,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error(`[Render Error] ${template_key}:`, err.message);
    res.status(500).json({
      success: false,
      error: err.message,
      template_key,
    });
  }
});

// POST /preview — render a temporary preview PNG
app.post('/preview', async (req, res) => {
  const { template_key, data_payload, color_mood, format, style_dna } = req.body;

  const validationError = validateRequest({ template_key, data_payload });
  if (validationError) {
    return res.status(400).json({ success: false, error: validationError });
  }

  const previewFile = path.join(PREVIEW_DIR, `preview_${template_key}_${Date.now()}.png`);

  try {
    const result = await renderTemplate({
      template_key,
      data_payload,
      color_mood,
      format,
      style_dna,
      outputFile: previewFile,
    });

    res.json({
      success: true,
      preview_url: `/files/${result.filename}`,
      render_time_ms: result.render_time_ms,
    });
  } catch (err) {
    console.error(`[Preview Error] ${template_key}:`, err.message);
    res.status(500).json({
      success: false,
      error: err.message,
      template_key,
    });
  }
});

// GET /health — service health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    templates_loaded: VALID_TEMPLATES.length,
    templates: VALID_TEMPLATES,
    bundled: !!global.__remotionBundled,
  });
});

// Serve rendered files from both output directories
app.use('/files', express.static(RENDER_DIR));
app.use('/files', express.static(PREVIEW_DIR));

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`[Remotion Render Service] Running on port ${PORT}`);
  console.log(`[Remotion Render Service] Endpoints: POST /render, POST /preview, GET /health, GET /files/:name`);
  console.log(`[Remotion Render Service] Render dir: ${RENDER_DIR}`);
  console.log(`[Remotion Render Service] Preview dir: ${PREVIEW_DIR}`);
});

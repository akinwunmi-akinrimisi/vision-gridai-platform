// production_log_helper.js
// Copy this into any n8n Function node that needs to log production events.
// Usage: await logProduction({ topic_id, stage, scene_number, action, status, duration_ms, cost_usd, error_message, metadata })
//
// Example:
//   const start = Date.now();
//   // ... do work ...
//   await logProduction({
//     topic_id: $json.topic_id,
//     stage: 'image_gen',
//     scene_number: $json.scene_number,
//     action: 'generate_image',
//     status: 'completed',
//     duration_ms: Date.now() - start,
//     cost_usd: 0.03,
//   });

async function logProduction(params) {
  const {
    topic_id,
    stage,          // tts | image_gen | ken_burns | color_grade | captions | assembly | render
    scene_number,   // optional
    action,         // e.g., "generate_image", "apply_ken_burns", "retry"
    status,         // started | completed | failed | retried
    duration_ms,    // optional
    cost_usd,       // optional
    error_message,  // optional
    metadata,       // optional JSONB
  } = params;

  const body = { topic_id, stage, action, status };

  if (scene_number !== undefined) body.scene_number = scene_number;
  if (duration_ms !== undefined) body.duration_ms = duration_ms;
  if (cost_usd !== undefined) body.cost_usd = cost_usd;
  if (error_message) body.error_message = error_message;
  if (metadata) body.metadata = metadata;

  try {
    await this.helpers.httpRequest({
      method: 'POST',
      url: `${process.env.SUPABASE_URL}/rest/v1/production_logs`,
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    // Don't let logging failures break production
    console.error('Production log insert failed:', err.message);
  }
}

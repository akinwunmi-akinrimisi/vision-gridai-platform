// Sub-second drop-in for the WF_DASHBOARD_READ n8n shim.
// nginx proxies /webhook/dashboard/read to this service. Same {query, params}
// contract; same Bearer-token auth (token injected by nginx, validated here).

const express = require('express');
const { dispatch } = require('./dispatcher');

const PORT = parseInt(process.env.PORT || '3030', 10);
const TOKEN = process.env.DASHBOARD_API_TOKEN;
if (!TOKEN) throw new Error('Missing DASHBOARD_API_TOKEN env');

const app = express();
app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// Single endpoint: POST /dispatch (body: {query, params}).
// nginx maps /webhook/dashboard/read -> /dispatch on this container.
app.post('/dispatch', async (req, res) => {
  // Auth: Bearer token (injected by nginx server-side, never in client bundle).
  const auth = req.get('authorization') || '';
  const expected = `Bearer ${TOKEN}`;
  if (auth !== expected) {
    return res.status(403).json({ success: false, data: null, error: 'unauthorized', http_status: 403 });
  }

  const { query, params } = req.body || {};
  const result = await dispatch(query, params);
  // Match WF_DASHBOARD_READ Respond-To-Webhook behavior: HTTP 200 envelope
  // even on logical errors (success:false). The dashboard client treats
  // success:false as a typed error.
  res.status(200).json(result);
});

app.use((err, _req, res, _next) => {
  // Last-resort error handler — never leak stack traces.
  console.error('UNHANDLED', err);
  res.status(500).json({ success: false, data: null, error: 'internal error', http_status: 500 });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`dashboard-read-shim listening on :${PORT}`);
});

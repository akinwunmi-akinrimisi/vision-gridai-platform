Read test.md and execute the Full-Spectrum Test & Hardening Campaign.

Start with Phase 0 (Reconnaissance) — produce TEST_INVENTORY.md, SLOs.md, ENV_SAFETY.md.

Context:
- Intelligence Layer (17 features, 8 sprints S0-S8) fully deployed
- 45+ n8n workflows, 13 dashboard pages, 17 Supabase migrations (010-017)
- All deployed to live VPS at srv1297445.hstgr.cloud
- Dashboard at https://dashboard.operscale.cloud (PIN: 2546)
- SSH: ssh -i ~/.ssh/id_ed25519_antigravity root@srv1297445.hstgr.cloud
- Credentials in .env (never commit)
- n8n API key in .env as N8N_API_KEY
- All intelligence webhooks require DASHBOARD_API_TOKEN header auth
- All crons disabled — manual trigger only via webhook
- Read memory/intelligence_layer_deployment.md for all workflow IDs + webhook URLs
- Read memory/project_intelligence_layer.md for full sprint completion notes

Execute Phase 0, then proceed through each phase sequentially.
Do not advance past a phase without passing /review.

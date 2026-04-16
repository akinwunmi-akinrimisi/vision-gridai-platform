# FOLLOWUPS.md — Non-Blockers Logged During Test Campaign

## All Resolved

- ~~**No coverage report**~~ — vitest coverage-v8 configured, baseline: 44.4% statements
- ~~**RLS gap on migration 001 tables**~~ — migration 018 applied, all 37 tables now have RLS
- ~~**0 CI pipelines**~~ — GitHub Actions CI added: test + npm audit + gitleaks + build
- ~~**4 Execute Workflow chains not wired**~~ — All 6 chains now wired
- ~~**WF_I2V/WF_T2V still in workflows/**~~ — Moved to workflows/deprecated/
- ~~**design-system/MASTER.md referenced as active in CLAUDE.md**~~ — All 3 references updated to DEPRECATED
- ~~**No FFmpeg execution tests**~~ — 84 pytest tests for generate_kinetic_ass.py pure functions
- ~~**No Python script unit tests**~~ — tests/unit/python/test_kinetic_ass.py covers ms_to_ass, is_emphasis_word, group_words, generate_ass
- ~~**directives/ directory empty**~~ — 11 pipeline SOPs written (00-10)
- ~~**YouTube API key in React bundle**~~ — Removed client-side YouTube API call, handle resolution deferred to server-side WF_COMPETITOR_MONITOR
- ~~**WF_WEBHOOK_STATUS not active**~~ — Activated via MCP
- ~~**Browser E2E tests**~~ — Playwright installed, 11 smoke tests passing against live dashboard

## Accepted Risks (not fixable without architectural change)

1. **npm audit: 6 moderate vulns** — All in esbuild->vite->vitest chain. Requires vite 5->8 major bump. Monitored, not actionable.
2. **Dashboard API token in React bundle** — `VITE_API_TOKEN` is inherently client-side (Vite bakes VITE_* vars). Protected by PIN gate. Acceptable for single-user deployment.
3. **Caption burn service tests** — Requires VPS Docker environment. Covered by manual E2E on staging.

# FOLLOWUPS.md — Non-Blockers Logged During Test Campaign

## Resolved (commit 087517c)

- ~~**No coverage report**~~ — vitest coverage-v8 configured, baseline: 44.4% statements
- ~~**RLS gap on migration 001 tables**~~ — migration 018 applied, all 37 tables now have RLS
- ~~**0 CI pipelines**~~ — GitHub Actions CI added: test + npm audit + gitleaks + build
- ~~**4 Execute Workflow chains not wired**~~ — All 6 chains now wired (2 were already done, 2 just wired)
- ~~**WF_I2V/WF_T2V still in workflows/**~~ — Moved to workflows/deprecated/
- ~~**design-system/MASTER.md referenced as active in CLAUDE.md**~~ — All 3 references updated to DEPRECATED

## Still Open

1. **No FFmpeg execution tests** — ken_burns.sh, assemble_with_transitions.sh, platform_render.sh need local FFmpeg binary + tiny test fixtures. Defer to staging.
2. **No Python script unit tests** — whisper_align.py and generate_kinetic_ass.py need Python + Whisper. Consider pytest suite.
3. **Caption burn service tests** — Requires Docker + FFmpeg. Defer to staging.
4. **directives/ directory empty** — No SOPs written despite directory structure existing.
5. **npm audit: 6 moderate vulns** — All in esbuild→vite→vitest chain. Requires major vite version bump (5→8). Not actionable without breaking changes.
6. **YouTube API key in React bundle** — Set referrer restriction in GCP Console to `dashboard.operscale.cloud`.
7. **Dashboard API token in React bundle** — Acceptable for single-user PIN-protected deployment. Needs server-side proxy for multi-user.
8. **WF_WEBHOOK_STATUS not active** — Activate in n8n UI.
9. **Browser E2E tests** — Set up Playwright for accessibility + compatibility testing.

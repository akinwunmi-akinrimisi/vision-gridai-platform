# FOLLOWUPS.md — Non-Blockers Logged During Test Campaign

## Phase 1

1. **No FFmpeg execution tests** — ken_burns.sh, assemble_with_transitions.sh, platform_render.sh need local FFmpeg binary + tiny test fixtures. Defer to Phase 2 staging environment.
2. **No Python script unit tests** — whisper_align.py and generate_kinetic_ass.py need Python + Whisper. Consider pytest suite in `tests/unit/python/`.
3. **No coverage report** — Istanbul/c8 not configured. Add `--coverage` to vitest config.
4. **Caption burn service tests** — Requires Docker + FFmpeg. Defer to Phase 2 integration.
5. **RLS gap on migration 001 tables** — projects, niche_profiles, prompt_configs, topics, avatars, scenes, production_log lack RLS. Dashboard uses anon key. Risk: acceptable for single-user but needs fixing for multi-user.
6. **0 CI pipelines** — No GitHub Actions, no pre-commit hooks, no gitleaks. Should add in Phase 2.
7. **directives/ directory empty** — No SOPs written despite directory structure existing.
8. **4 Execute Workflow chains not wired** — CF01+02 (from WF_TOPICS_GENERATE), CF05+12 (from WF_SCRIPT_APPROVE), CF13 (from WF_CAPTIONS_ASSEMBLY), CF16 (audience_context in WF_SCRIPT_GENERATE). All intelligence features work via manual webhook but don't auto-fire.
9. **WF_I2V_GENERATION and WF_T2V_GENERATION still in workflows/** — Deprecated (Ken Burns replaced them) but JSON files remain. Consider archiving.
10. **design-system/MASTER.md documented as deprecated** in test.md Phase 3 note — but still referenced in CLAUDE.md. Reconcile.

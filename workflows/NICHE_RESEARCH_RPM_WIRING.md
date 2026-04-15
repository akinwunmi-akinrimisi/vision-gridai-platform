# Wiring WF_RPM_CLASSIFY into WF_PROJECT_CREATE (CF03)

`WF_RPM_CLASSIFY` classifies a project's niche into one of 12 RPM categories and populates `projects.niche_rpm_category`, `estimated_rpm_low/mid/high`, `revenue_potential_score`, `rpm_classified_at`. Run it once per project immediately after niche research completes.

## Steps

1. In n8n, go to **Workflows → Import from File** and select `workflows/WF_RPM_CLASSIFY.json`.
2. Open the imported workflow and note its ID from the URL (e.g. `/workflow/<id>`).
3. Open `WF_PROJECT_CREATE` in the n8n UI.
4. Find the node that finalizes the niche profile write — the last PATCH/INSERT on `projects` after niche research succeeds (likely named `Update Project With Niche Profile` or similar). This is your anchor.
5. Add an **Execute Workflow** node named `Classify RPM` directly after the anchor:
   - **Workflow:** select `WF_RPM_CLASSIFY`.
   - **Wait For Sub-Workflow Completion:** ON.
   - **Mode:** Run once for each item (or once for all — either works).
   - **Workflow Inputs** (JSON):
     ```json
     { "project_id": "={{$json.project_id}}" }
     ```
6. Connect: `Update Project With Niche Profile` → `Classify RPM` → (next node or end).
7. In the n8n UI, toggle `WF_RPM_CLASSIFY` to **Active**.
8. **Test:** create a new project via the dashboard or `/webhook/project/create`. Within ~30s, query Supabase:
   ```sql
   SELECT id, niche, niche_rpm_category, estimated_rpm_mid, revenue_potential_score, rpm_classified_at
   FROM projects ORDER BY created_at DESC LIMIT 1;
   ```
9. **Resume-safe:** if the project already has `niche_rpm_category`, the sub-workflow returns `{skipped: true}` and does not re-call Claude. Pass `force: true` in the payload to reclassify.

## Manual re-classification

```bash
curl -X POST https://n8n.srv1297445.hstgr.cloud/webhook/rpm/classify \
  -H "Authorization: Bearer $DASHBOARD_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"project_id":"<uuid>","force":true}'
```

# Claude Code — Remotion Hybrid Rendering Merge Prompt
## Paste this into Claude Code AFTER the 31-feature merge is complete.

---

```
I need to merge the Remotion Hybrid Rendering system into the Vision GridAI platform.
This adds AI-powered scene classification (fal_ai vs remotion) and data graphic rendering.

CONTEXT: The 31-feature merge (Phases 1-6) is already complete. This is Phase 7.
ALL scenes currently use text-to-image + FFmpeg Ken Burns. This change makes SOME scenes
use Remotion for data graphics (stats, charts, comparisons) instead of Fal.ai,
while keeping Fal.ai for photorealistic scenes. Both produce .png → same Ken Burns pipeline.

There are 4 merge files + 1 guide:
1. REMOTION_AGENT_MERGE.md → merges into VisionGridAI_Platform_Agent.md
2. REMOTION_CLAUDE_MERGE.md → merges into CLAUDE.md
3. REMOTION_SKILLS_MERGE.md → merges into skills.md
4. REMOTION_GUIDE.md → append as Phase 7 to existing GUIDE.md (do NOT replace GUIDE.md)

## Step-by-step:

### Step 1: VisionGridAI_Platform_Agent.md
Read REMOTION_AGENT_MERGE.md. Apply each ">>>> MERGE INTO:" section:

a) IMMUTABLE rules: append 4 new bullets about hybrid rendering
b) Supabase Schema: add migration 005 block (ALTER scenes + topics, CREATE remotion_templates, seed 12 templates with full props_schema JSON)
c) After "Stage 1b" concept: add Scene Render Classification stage with:
   - Pipeline position diagram
   - AI Classification Prompt (the FULL prompt — copy it exactly as written)
   - Data Payload Generation Prompt (the FULL prompt)
   - Classification Workflow spec (WF_SCENE_CLASSIFY)
   - Classification Review dashboard wireframe
   - Remotion Template Architecture (file structure + shared components)
   - Remotion Render Service spec
   - Image Generation Split logic
   - Short-Form Application notes
d) Dashboard section: add SceneClassificationReview component spec + ProductionMonitor modification
e) Workflows table: add WF_SCENE_CLASSIFY + WF_REMOTION_RENDER
f) Cost table: update image gen cost (108 Fal.ai + 64 Remotion = $3.24, total ~$6.17/video)
g) Error handling: add 4 new rows

### Step 2: CLAUDE.md
Read REMOTION_CLAUDE_MERGE.md:
- ADD Remotion Hybrid Rendering to tech stack
- ADD critical rule about hybrid rendering
- UPDATE Pipeline Quick Reference (add C+ phase, update D2, update total cost)
- ADD project structure entries (remotion templates, render service, new components)
- ADD 8 gotchas

### Step 3: skills.md
Read REMOTION_SKILLS_MERGE.md:
- ADD Remotion Hybrid Rendering skill category
- ADD pipeline stage matrix rows (C+, D2a, D2b)
- ADD "When to Use" entries
- UPDATE cost reference ($6.17/video)

### Step 4: skills.sh
Read REMOTION_SKILLSSH_MERGE.md:
- ADD Section 6 (Remotion checks) after existing Section 5
- Checks: Remotion installed, render service running, template count, DB seeded, classification fields

### Step 5: GUIDE.md
Read REMOTION_GUIDE.md. APPEND it as Phase 7 to the existing GUIDE.md.
Do NOT replace the existing content (Phases 1-6). Add Phase 7 after Phase 6.
Update the Quick Reference table at the bottom to include Phase 7.

### Step 6: Create migration file
Create supabase/migrations/005_remotion_hybrid_rendering.sql with the FULL SQL
from REMOTION_AGENT_MERGE.md (includes ALTER TABLE, CREATE TABLE, all 12 INSERT
statements for template seeding with complete props_schema JSON).

### Step 7: Create render service scaffold
Create dashboard/src/remotion/render-service.js as a placeholder with the
endpoint signatures documented (POST /render, POST /preview, GET /health).
The actual implementation will be built during Phase 7 execution.

### Step 8: Create template directory structure
Create the directory structure:
  dashboard/src/remotion/templates/
  dashboard/src/remotion/templates/shared/
  dashboard/src/remotion/templates/index.js (empty registry placeholder)

### Step 9: Verify
grep -c "render_method" VisionGridAI_Platform_Agent.md
# Should be > 5

grep -c "remotion_template" VisionGridAI_Platform_Agent.md
# Should be > 3

grep -c "WF_SCENE_CLASSIFY" VisionGridAI_Platform_Agent.md
# Should be > 0

grep -c "classification" VisionGridAI_Platform_Agent.md
# Should be > 10

grep "6.17" CLAUDE.md
# Should find updated cost

ls supabase/migrations/005*
# Should exist

ls dashboard/src/remotion/templates/
# Should show index.js and shared/

wc -l GUIDE.md
# Should be > 800 (was ~514, now ~514 + ~300 from Phase 7)

Use /careful for the Agent.md merge — the classification prompt and template schemas must be exact.
Use /review after all merges complete.
```

# Image samples — MYNEW project (topic 4)

Pulled 2026-05-07 ~10:55 UTC from Supabase. Project `19a714fd-7973-497e-bf71-993b74c3c7da`, topic 4 `a904bff1-2994-4a71-8a8c-5c47cdb1503c` ("Australia vs Norway — How We Squandered Our Resource Wealth").

## OpenRouter (`openai/gpt-5-image-mini`) — only 2 scenes routed, both unlinkable

For MYNEW topic 4, the hybrid router sent only **2 of 142 scenes** to OpenRouter (scenes 14 and 69, "complex composition / spreadsheet" prompts). Both rows show the same internal placeholder URL with `image_drive_id=null`:

1. Scene 14 — `http://172.18.0.1:9999/a904bff1-2994-4a71-8a8c-5c47cdb1503c/scene_images/scene_000.png` ⚠️ internal-only (n8n Docker bridge `172.18.0.1`); placeholder filename, no Drive copy
2. Scene 69 — `http://172.18.0.1:9999/a904bff1-2994-4a71-8a8c-5c47cdb1503c/scene_images/scene_000.png` ⚠️ same placeholder

There are **no other OpenRouter assets for MYNEW yet**:

- **No thumbnail.** `WF_THUMBNAIL_GENERATE` (`7GqpEAug8hxxU7f6`, the gemini-3-pro-image-preview text-on-image flow) is chained off assembly completion. Topic 4 is still mid-Ken-Burns (~24/142 clips), so the thumbnail call hasn't fired. Once assembly lands, this is where the 5 text-on-image variants would normally come from.
- **No production_log entries** for `openrouter`/`gpt-5`/`gemini`/`thumbnail` actions on this project.

→ **Until topic 4 finishes assembly, there are no real public OpenRouter image URLs to share for MYNEW.** I'll repopulate this section with the gemini thumbnail variants the moment `WF_THUMBNAIL_GENERATE` writes them.

## Fal.ai scene images (`fal-ai/flux/schnell`) — MYNEW topic 4

5 of 140 Flux-Schnell scenes (public CDN, no auth):

1. Scene 1 — https://v3b.fal.media/files/b/0a993c5f/BzVBM2IUfM0H6-tc36q7k.jpg
2. Scene 2 — https://v3b.fal.media/files/b/0a993c5f/FSQGg6FwV-HnfakveKlmF.jpg
3. Scene 3 — https://v3b.fal.media/files/b/0a993c5f/SobIFPtG--xN-O_YwASrP.jpg
4. Scene 4 — https://v3b.fal.media/files/b/0a993c5f/jq9bFtQDYcjh0VS3YQJ7v.jpg
5. Scene 5 — https://v3b.fal.media/files/b/0a993c5f/-IHCInWCa7-L9PFbzhMLK.jpg

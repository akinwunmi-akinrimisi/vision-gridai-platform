# Vision GridAI Platform — Skills Reference Map

## LobeHub Skills (installed via skills.sh)

18 skills from the LobeHub marketplace, organized by pipeline relevance.

### n8n Workflow Development
| Skill | Purpose |
|-------|---------|
| n8n Workflow Design | Core workflow architecture, node selection, error handling |
| n8n Hub | Community workflow templates and patterns |
| n8n Expression Syntax | JavaScript expressions in n8n nodes |
| n8n Custom Node Builder | For custom nodes if needed (Supabase integration, Kie.ai) |

### Google Ecosystem
| Skill | Purpose |
|-------|---------|
| Google Drive | File upload/download, folder management, permissions |
| Google Sheets CLI | Legacy reference (replaced by Supabase, but useful for data migration) |
| Google Workspace CLI (gog) | Cross-service Google operations |

### Media Production
| Skill | Purpose |
|-------|---------|
| FFmpeg Core | Fundamental FFmpeg operations, codecs, formats |
| FFmpeg Video Toolkit | Advanced video processing, concatenation, filters |
| FFmpeg Reference | Command reference for complex pipelines |
| Video Processor | General video processing patterns |

### YouTube
| Skill | Purpose |
|-------|---------|
| YouTube Uploader | Upload mechanics, resumable uploads, quota management |
| YouTube Data API v3 | Metadata, captions, thumbnails, playlists, analytics |

### AI & Automation
| Skill | Purpose |
|-------|---------|
| Google Gemini Media | TTS patterns, audio processing |
| API Credentials Manager | Secure credential handling in n8n |
| Automation Workflows | General automation patterns |

### Database & Frontend (NEW)
| Skill | Purpose |
|-------|---------|
| Supabase Integration | REST API patterns, Realtime subscriptions, RLS policies |
| React Dashboard | Component architecture, state management, Tailwind patterns |

### Development Workflow Tools
| Tool | Type | Purpose |
|------|------|---------|
| GSD (Get Shit Done) | Slash commands (`/gsd:*`) | Structured build process — phases, parallel agents, fresh context per task, atomic commits |
| UI UX Pro Max | Auto-activating skill | Design intelligence — 67 styles, 96 palettes, 57 font pairings, design system generator |
| n8n Agent Commands | Slash commands (`/n8n:*`) | n8n workflow audit, Supabase query generation |

---

## Skills × Pipeline Stage Matrix

| Pipeline Stage | Primary Skills | Secondary Skills |
|---------------|---------------|-----------------|
| **Phase A:** Project Creation + Niche Research ⚡ | n8n Workflow Design, API Credentials | Supabase Integration |
| **Phase B:** Topic + Avatar Generation ⚡ ⏸ | n8n Expressions, API Credentials | Supabase Integration |
| **Phase C:** Script Generation (3-pass) ⚡ ⏸ | API Credentials, n8n Expressions | Supabase Integration |
| **WF04:** Scene Segmentation ⚡ | API Credentials, n8n Expressions | n8n Workflow Design |
| **WF05:** Voiceover (TTS Master Clock) | Google Gemini Media, FFmpeg Core | API Credentials, Google Drive |
| **WF06:** Image Generation | API Credentials, n8n Hub | Supabase Integration |
| **WF07A:** Image-to-Video | API Credentials, n8n Hub | Supabase Integration |
| **WF07B:** Text-to-Video | API Credentials, n8n Hub | Supabase Integration |
| **WF08:** Caption Generation | n8n Expressions | Video Processor |
| **WF09:** FFmpeg Assembly | FFmpeg Core, FFmpeg Toolkit, FFmpeg Reference | Video Processor |
| **WF10:** Drive Upload | Google Drive | Supabase Integration |
| **WF11:** YouTube Upload | YouTube Uploader, YouTube Data API | API Credentials |
| **WF12:** YouTube Analytics | YouTube Data API | Supabase Integration |
| **Supervisor Agent ⚡** | n8n Workflow Design, n8n Hub | Supabase Integration |
| **Dashboard** | React Dashboard, Supabase Integration, **UI UX Pro Max** | n8n Workflow Design |
| **Webhook API** | n8n Workflow Design, n8n Expressions | Supabase Integration |
| **Build Process** | **GSD** (slash commands) | n8n Agent Commands |

---

## When to Use Which Skill

**Starting a new sprint?** → `/gsd:discuss-phase N` then `/gsd:plan-phase N` — GSD handles structured planning
**Building a dashboard page?** → UI UX Pro Max auto-activates. Read `design-system/MASTER.md` first.
**Building a new workflow?** → Start with `n8n Workflow Design` + the stage-specific primary skill
**Writing FFmpeg commands?** → `FFmpeg Core` for basics, `FFmpeg Toolkit` for assembly, `FFmpeg Reference` for edge cases
**Supabase queries not working?** → `Supabase Integration` for REST API patterns, or `/n8n:supabase-query` for n8n-specific config
**Dashboard component?** → `React Dashboard` for component patterns, `Supabase Integration` for Realtime hooks
**Credential issues?** → `API Credentials Manager` — never hardcode keys
**YouTube upload failing?** → `YouTube Uploader` for resumable upload, `YouTube Data API` for quota management
**Quick ad-hoc fix?** → `/gsd:quick` — GSD guarantees (atomic commits, state tracking) without full planning

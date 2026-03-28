# Phase 4: Captions + Transitions + Assembly — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the assembly pipeline to use xfade transitions between Ken Burns clips, kinetic ASS captions with highlight words, and batched processing for 172 scenes.

**Architecture:** WF_CAPTIONS_ASSEMBLY already exists and handles concatenation. We update it to: (1) use `caption_highlight_word` from scenes for two-tone captions, (2) apply xfade transitions using `transition_to_next` field, (3) batch 15-20 scenes for xfade chains to avoid FFmpeg OOM, then concat batches.

**Tech Stack:** n8n workflows, FFmpeg (xfade, ASS subtitles, concat), Supabase REST API

**Dependencies:** Phase 3 (Ken Burns clips exist as .mp4 files per scene)

---

### Task 1: Create xfade transition assembly script

**Files:**
- Create: `execution/assemble_with_transitions.sh`

### Task 2: Update caption generation for highlight words

**Files:**
- Modify: `execution/generate_kinetic_ass.py` (add highlight word support)

### Task 3: Update WF_CAPTIONS_ASSEMBLY for xfade + batched assembly

**Files:**
- Modify on n8n: WF_CAPTIONS_ASSEMBLY (`Fhdy66BLRh7rAwTi`)

### Task 4: Update Ken Burns to chain to assembly

**Files:**
- Modify on n8n: WF_KEN_BURNS (`OYahvKcydMrUxK8j`) — after all clips done, fire assembly

### Task 5: Verification + commit

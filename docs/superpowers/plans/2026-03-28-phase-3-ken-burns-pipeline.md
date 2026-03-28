# Phase 3: Ken Burns + Color Grade Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace I2V/T2V video generation ($24/video) with FFmpeg Ken Burns + Color Grading ($0/video). Every scene: Seedream 4.0 image → FFmpeg zoompan + color grade → .mp4 clip.

**Architecture:** WF_KEN_BURNS is an n8n workflow triggered after image generation completes. It queries all scenes with `clip_status = 'pending'` and `image_url IS NOT NULL`, downloads each image, runs FFmpeg zoompan (Ken Burns motion) combined with color grading, uploads the resulting clip to Google Drive, and updates the scene in Supabase. Uses WF_RETRY_WRAPPER for API calls and logs to production_logs.

**Tech Stack:** n8n workflows, FFmpeg (zoompan + eq + colorbalance filters), Supabase REST API, Google Drive API

**Dependencies:** Phase 1 (cinematic fields on scenes), Phase 2 (WF_RETRY_WRAPPER)

---

### Task 1: Create Ken Burns Execution Script on VPS

The FFmpeg Ken Burns command runs inside the n8n Docker container. We need a script accessible to n8n.

**Files:**
- Create on VPS: `/data/n8n-production/ken_burns.sh`

- [ ] **Step 1: Create the script on VPS via SSH**

```bash
ssh -i ~/.ssh/vps_gridai root@srv1297445.hstgr.cloud 'cat > /data/n8n-production/ken_burns.sh << '\''SCRIPT'\''
#!/bin/bash
# Ken Burns + Color Grade — generates animated .mp4 clip from static image
# Usage: ken_burns.sh INPUT DURATION ZOOM_DIR COLOR_MOOD OUTPUT [SKIP_COLOR]
# SKIP_COLOR=1 for scenes with selective_color_element (color baked into image)

INPUT="$1"
DURATION="$2"
ZOOM_DIR="$3"
COLOR_MOOD="$4"
OUTPUT="$5"
SKIP_COLOR="${6:-0}"
FPS=30
FRAMES=$(echo "$DURATION * $FPS" | bc | cut -d. -f1)
[ -z "$FRAMES" ] && FRAMES=$((${DURATION%.*} * FPS))

# Zoom direction expressions
case "$ZOOM_DIR" in
  in)                  Z="min(zoom+0.0015,1.5)"; X="iw/2-(iw/zoom/2)"; Y="ih/2-(ih/zoom/2)" ;;
  out)                 Z="if(lte(zoom\\,1.0)\\,1.5\\,max(1.001\\,zoom-0.0015))"; X="iw/2-(iw/zoom/2)"; Y="ih/2-(ih/zoom/2)" ;;
  pan_left)            Z="1.2"; X="iw*0.3-(iw*0.3-iw*0.05)*on/(d-1)"; Y="ih/2-(ih/zoom/2)" ;;
  pan_right)           Z="1.2"; X="iw*0.05+(iw*0.3-iw*0.05)*on/(d-1)"; Y="ih/2-(ih/zoom/2)" ;;
  pan_up)              Z="1.2"; X="iw/2-(iw/zoom/2)"; Y="ih*0.35-(ih*0.35-ih*0.1)*on/(d-1)" ;;
  static_slight_zoom)  Z="min(zoom+0.0005,1.15)"; X="iw/2-(iw/zoom/2)"; Y="ih/2-(ih/zoom/2)" ;;
  *)                   Z="min(zoom+0.0015,1.5)"; X="iw/2-(iw/zoom/2)"; Y="ih/2-(ih/zoom/2)" ;;
esac

# Color mood filter chains
if [ "$SKIP_COLOR" = "1" ]; then
  COLOR=""
else
  case "$COLOR_MOOD" in
    cold_desat)       COLOR=",eq=saturation=0.3:contrast=1.2:brightness=-0.05,colorbalance=bs=0.1:bm=0.05:bh=0.15" ;;
    cool_neutral)     COLOR=",eq=saturation=0.6:contrast=1.08,colorbalance=bs=0.05:bm=0.02:bh=0.05" ;;
    dark_mono)        COLOR=",eq=saturation=0.15:contrast=1.25:brightness=-0.08,colorbalance=bs=0.05:bh=0.05" ;;
    warm_sepia)       COLOR=",eq=saturation=0.6:contrast=1.1,colorbalance=rs=0.15:gm=0.05:bh=-0.1" ;;
    warm_gold)        COLOR=",eq=saturation=0.9:contrast=1.03:brightness=0.02,colorbalance=rs=0.1:gm=0.05:bs=-0.05" ;;
    full_natural)     COLOR=",eq=saturation=1.1:contrast=1.03:brightness=0.03" ;;
    muted_selective)  COLOR=",eq=saturation=0.35:contrast=1.12:brightness=-0.02,colorbalance=bs=0.05:bm=0.03:bh=0.08" ;;
    *)                COLOR=",eq=saturation=1.1:contrast=1.03:brightness=0.03" ;;
  esac
fi

ffmpeg -y -loop 1 -i "$INPUT" \
  -vf "scale=8000:-1,zoompan=z='"'"'$Z'"'"':x='"'"'$X'"'"':y='"'"'$Y'"'"':d=$FRAMES:s=1920x1080:fps=$FPS${COLOR}" \
  -t "$DURATION" -c:v libx264 -pix_fmt yuv420p -preset medium -crf 18 \
  "$OUTPUT" 2>&1
SCRIPT'
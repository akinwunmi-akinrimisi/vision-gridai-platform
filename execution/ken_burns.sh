#!/bin/bash
# Ken Burns + Color Grade — generates animated .mp4 clip from static image
# Usage: ken_burns.sh INPUT DURATION ZOOM_DIR COLOR_MOOD OUTPUT [SKIP_COLOR]
# SKIP_COLOR=1 for scenes with selective_color_element (color baked into image)
#
# Zoom directions: in, out, pan_left, pan_right, pan_up, static_slight_zoom
# Color moods: cold_desat, cool_neutral, dark_mono, warm_sepia, warm_gold, full_natural, muted_selective
#
# Example: ken_burns.sh scene_001.png 7 in warm_gold scene_001.mp4
# Example (skip color): ken_burns.sh scene_005.png 6 pan_left muted_selective scene_005.mp4 1

set -euo pipefail

INPUT="$1"
DURATION="$2"
ZOOM_DIR="${3:-in}"
COLOR_MOOD="${4:-full_natural}"
OUTPUT="$5"
SKIP_COLOR="${6:-0}"
FPS=30

# Calculate frames (handle decimals)
FRAMES=$(awk "BEGIN {printf \"%d\", $DURATION * $FPS}")

if [ "$FRAMES" -lt 1 ]; then
  echo "ERROR: Invalid duration '$DURATION' → 0 frames" >&2
  exit 1
fi

if [ ! -f "$INPUT" ]; then
  echo "ERROR: Input file '$INPUT' not found" >&2
  exit 1
fi

# Smooth long-form-friendly Ken Burns:
# Targets a subtle 1.0 → 1.10 zoom (or 1.10 → 1.0) spread evenly across the
# scene's full duration. Increment per frame = (1.10 - 1.0) / FRAMES, so the
# zoom ends exactly when the audio ends — no abrupt freeze, no fast jolt.
# Pan amount is also scaled to FRAMES so motion is uniform regardless of
# scene length. 8% pan is chosen to be visible but not jittery.
ZOOM_TARGET=1.10
ZOOM_DELTA=$(awk "BEGIN {printf \"%.6f\", ($ZOOM_TARGET - 1.0) / $FRAMES}")
PAN_FRACTION=0.08

case "$ZOOM_DIR" in
  in)
    # Smoothly zoom from 1.0 → 1.10 over the full scene
    Z="min(zoom+${ZOOM_DELTA},${ZOOM_TARGET})"
    X="iw/2-(iw/zoom/2)"
    Y="ih/2-(ih/zoom/2)"
    ;;
  out)
    # Smoothly zoom from 1.10 → 1.0 — start at target, decrement to 1.0
    Z="if(eq(on,0),${ZOOM_TARGET},max(1.0,zoom-${ZOOM_DELTA}))"
    X="iw/2-(iw/zoom/2)"
    Y="ih/2-(ih/zoom/2)"
    ;;
  pan_left)
    # Hold zoom at target, pan left by 8% over full duration
    Z="${ZOOM_TARGET}"
    X="iw*(0.5+${PAN_FRACTION}/2)-iw/zoom/2-on*iw*${PAN_FRACTION}/${FRAMES}"
    Y="ih/2-(ih/zoom/2)"
    ;;
  pan_right)
    Z="${ZOOM_TARGET}"
    X="iw*(0.5-${PAN_FRACTION}/2)-iw/zoom/2+on*iw*${PAN_FRACTION}/${FRAMES}"
    Y="ih/2-(ih/zoom/2)"
    ;;
  pan_up)
    Z="${ZOOM_TARGET}"
    X="iw/2-(iw/zoom/2)"
    Y="ih*(0.5+${PAN_FRACTION}/2)-ih/zoom/2-on*ih*${PAN_FRACTION}/${FRAMES}"
    ;;
  static_slight_zoom)
    # Even more subtle: 1.0 → 1.05 over full duration
    SUBTLE_DELTA=$(awk "BEGIN {printf \"%.6f\", 0.05 / $FRAMES}")
    Z="min(zoom+${SUBTLE_DELTA},1.05)"
    X="iw/2-(iw/zoom/2)"
    Y="ih/2-(ih/zoom/2)"
    ;;
  *)
    echo "WARNING: Unknown zoom_direction '$ZOOM_DIR', defaulting to 'in'" >&2
    Z="min(zoom+${ZOOM_DELTA},${ZOOM_TARGET})"
    X="iw/2-(iw/zoom/2)"
    Y="ih/2-(ih/zoom/2)"
    ;;
esac

# Color mood → FFmpeg filter chain (appended after zoompan)
if [ "$SKIP_COLOR" = "1" ]; then
  COLOR_FILTER=""
else
  case "$COLOR_MOOD" in
    cold_desat)
      COLOR_FILTER=",eq=saturation=0.3:contrast=1.2:brightness=-0.05,colorbalance=bs=0.1:bm=0.05:bh=0.15"
      ;;
    cool_neutral)
      COLOR_FILTER=",eq=saturation=0.6:contrast=1.08,colorbalance=bs=0.05:bm=0.02:bh=0.05"
      ;;
    dark_mono)
      COLOR_FILTER=",eq=saturation=0.15:contrast=1.25:brightness=-0.08,colorbalance=bs=0.05:bh=0.05"
      ;;
    warm_sepia)
      COLOR_FILTER=",eq=saturation=0.6:contrast=1.1,colorbalance=rs=0.15:gm=0.05:bh=-0.1"
      ;;
    warm_gold)
      COLOR_FILTER=",eq=saturation=0.9:contrast=1.03:brightness=0.02,colorbalance=rs=0.1:gm=0.05:bs=-0.05"
      ;;
    full_natural)
      COLOR_FILTER=",eq=saturation=1.1:contrast=1.03:brightness=0.03"
      ;;
    muted_selective)
      COLOR_FILTER=",eq=saturation=0.35:contrast=1.12:brightness=-0.02,colorbalance=bs=0.05:bm=0.03:bh=0.08"
      ;;
    *)
      echo "WARNING: Unknown color_mood '$COLOR_MOOD', defaulting to full_natural" >&2
      COLOR_FILTER=",eq=saturation=1.1:contrast=1.03:brightness=0.03"
      ;;
  esac
fi

# Build the full filter chain
VF="scale=3840:-1,zoompan=z='${Z}':x='${X}':y='${Y}':d=${FRAMES}:s=1920x1080:fps=${FPS}${COLOR_FILTER}"

echo "Ken Burns: ${ZOOM_DIR} + ${COLOR_MOOD} | ${DURATION}s (${FRAMES} frames) | skip_color=${SKIP_COLOR}"

ffmpeg -y -loop 1 -i "$INPUT" \
  -vf "$VF" \
  -t "$DURATION" \
  -c:v libx264 -pix_fmt yuv420p -preset medium -crf 18 \
  "$OUTPUT" 2>&1

echo "Output: $OUTPUT ($(du -h "$OUTPUT" | cut -f1))"

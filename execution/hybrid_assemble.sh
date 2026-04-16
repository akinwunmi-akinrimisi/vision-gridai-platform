#!/bin/bash
# hybrid_assemble.sh — Assemble a hybrid scene with Ken Burns + I2V + Ken Burns
# Usage: hybrid_assemble.sh <image> <i2v_clip> <audio> <start_ms> <end_ms> <total_ms> <output>
#
# The hybrid scene layout:
#   Pre-video:  Ken Burns on image from 0 to start_ms
#   I2V clip:   Placed at start_ms to end_ms (speed-adjusted if needed, audio discarded)
#   Post-video: Ken Burns on image from end_ms to total_ms
#   Transitions: 0.5s crossfade dissolve between segments
#   Audio:      TTS narration is the master track (Seedance audio is discarded)
#
# Arguments:
#   image      — Source image (PNG/JPG) for Ken Burns segments
#   i2v_clip   — Seedance 2.0 generated video clip
#   audio      — TTS narration audio file (master clock)
#   start_ms   — Video placement start in milliseconds
#   end_ms     — Video placement end in milliseconds
#   total_ms   — Total scene duration in milliseconds (from TTS audio)
#   output     — Output .mp4 file path
#
# Environment (optional):
#   ZOOM_DIR     — Ken Burns zoom direction (default: in)
#   COLOR_MOOD   — Color grade mood (default: full_natural)
#   SKIP_COLOR   — Set to 1 to skip color grading (default: 0)
#   FPS          — Frame rate (default: 30)

set -euo pipefail

# --- Parse arguments ---
IMAGE="$1"
I2V_CLIP="$2"
AUDIO="$3"
START_MS="$4"
END_MS="$5"
TOTAL_MS="$6"
OUTPUT="$7"

ZOOM_DIR="${ZOOM_DIR:-in}"
COLOR_MOOD="${COLOR_MOOD:-full_natural}"
SKIP_COLOR="${SKIP_COLOR:-0}"
FPS="${FPS:-30}"

# --- Validate inputs ---
for f in "$IMAGE" "$I2V_CLIP" "$AUDIO"; do
  if [ ! -f "$f" ]; then
    echo "ERROR: File not found: $f" >&2
    exit 1
  fi
done

if [ "$TOTAL_MS" -le 0 ]; then
  echo "ERROR: total_ms must be positive, got $TOTAL_MS" >&2
  exit 1
fi

# --- Calculate durations in seconds (with decimal precision) ---
PRE_DUR=$(awk "BEGIN {printf \"%.3f\", $START_MS / 1000.0}")
I2V_DUR=$(awk "BEGIN {printf \"%.3f\", ($END_MS - $START_MS) / 1000.0}")
POST_DUR=$(awk "BEGIN {printf \"%.3f\", ($TOTAL_MS - $END_MS) / 1000.0}")
TOTAL_DUR=$(awk "BEGIN {printf \"%.3f\", $TOTAL_MS / 1000.0}")

# Crossfade duration (seconds)
XFADE_DUR="0.5"

echo "Hybrid assemble: pre=${PRE_DUR}s | i2v=${I2V_DUR}s | post=${POST_DUR}s | total=${TOTAL_DUR}s"
echo "  Zoom: $ZOOM_DIR | Color: $COLOR_MOOD | Skip color: $SKIP_COLOR"

# --- Temp directory ---
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

# --- Zoom direction → zoompan expressions ---
case "$ZOOM_DIR" in
  in)
    Z="min(zoom+0.0015,1.5)"
    X="iw/2-(iw/zoom/2)"
    Y="ih/2-(ih/zoom/2)"
    ;;
  out)
    Z="if(lte(zoom\,1.0)\,1.5\,max(1.001\,zoom-0.0015))"
    X="iw/2-(iw/zoom/2)"
    Y="ih/2-(ih/zoom/2)"
    ;;
  pan_left)
    Z="1.2"
    X="iw*0.3-on*iw*0.25/${FPS}"
    Y="ih/2-(ih/zoom/2)"
    ;;
  pan_right)
    Z="1.2"
    X="iw*0.05+on*iw*0.25/${FPS}"
    Y="ih/2-(ih/zoom/2)"
    ;;
  pan_up)
    Z="1.2"
    X="iw/2-(iw/zoom/2)"
    Y="ih*0.35-on*ih*0.25/${FPS}"
    ;;
  static_slight_zoom)
    Z="min(zoom+0.0005,1.15)"
    X="iw/2-(iw/zoom/2)"
    Y="ih/2-(ih/zoom/2)"
    ;;
  *)
    echo "WARNING: Unknown zoom_direction '$ZOOM_DIR', defaulting to 'in'" >&2
    Z="min(zoom+0.0015,1.5)"
    X="iw/2-(iw/zoom/2)"
    Y="ih/2-(ih/zoom/2)"
    ;;
esac

# --- Color mood → FFmpeg filter chain ---
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

# Helper: generate a Ken Burns clip from image
# Args: <duration_sec> <output_file>
generate_ken_burns() {
  local dur="$1"
  local out="$2"
  local frames
  frames=$(awk "BEGIN {printf \"%d\", $dur * $FPS}")

  if [ "$frames" -lt 1 ]; then
    echo "  Skipping zero-duration Ken Burns segment" >&2
    return 1
  fi

  local vf="scale=3840:-1,zoompan=z='${Z}':x='${X}':y='${Y}':d=${frames}:s=1920x1080:fps=${FPS}${COLOR_FILTER}"

  ffmpeg -y -loop 1 -i "$IMAGE" \
    -vf "$vf" \
    -t "$dur" \
    -c:v libx264 -pix_fmt yuv420p -preset medium -crf 18 \
    -an \
    "$out" 2>/dev/null

  echo "  Generated Ken Burns: $out (${dur}s, ${frames} frames)"
}

# --- Step 1: Get actual I2V clip duration ---
ACTUAL_I2V_DUR=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$I2V_CLIP" | tr -d '[:space:]')
echo "  Actual I2V clip duration: ${ACTUAL_I2V_DUR}s (target: ${I2V_DUR}s)"

# --- Step 2: Prepare I2V clip (strip audio, speed-adjust if needed, normalize to 30fps) ---
I2V_PREPARED="$TMPDIR/i2v_prepared.mp4"

# Calculate speed factor
SPEED_FACTOR=$(awk "BEGIN {
  actual = $ACTUAL_I2V_DUR;
  target = $I2V_DUR;
  if (target <= 0 || actual <= 0) { printf \"1.0\"; exit }
  factor = actual / target;
  printf \"%.4f\", factor
}")

echo "  Speed factor: ${SPEED_FACTOR}x"

# Determine if speed adjustment is needed (tolerance: 5%)
NEEDS_SPEED_ADJ=$(awk "BEGIN {
  diff = ($SPEED_FACTOR - 1.0);
  if (diff < 0) diff = -diff;
  print (diff > 0.05) ? 1 : 0
}")

if [ "$NEEDS_SPEED_ADJ" = "1" ]; then
  echo "  Adjusting I2V clip speed (${SPEED_FACTOR}x) to match target duration"
  ffmpeg -y -i "$I2V_CLIP" \
    -vf "setpts=PTS/${SPEED_FACTOR}" \
    -t "$I2V_DUR" \
    -an \
    -r "$FPS" \
    -c:v libx264 -pix_fmt yuv420p -preset medium -crf 18 \
    "$I2V_PREPARED" 2>/dev/null
else
  echo "  I2V clip duration within tolerance, trimming to exact duration"
  ffmpeg -y -i "$I2V_CLIP" \
    -t "$I2V_DUR" \
    -an \
    -r "$FPS" \
    -c:v libx264 -pix_fmt yuv420p -preset medium -crf 18 \
    "$I2V_PREPARED" 2>/dev/null
fi

# --- Step 3: Generate Ken Burns segments ---
HAS_PRE=0
HAS_POST=0

PRE_CLIP="$TMPDIR/pre_kb.mp4"
POST_CLIP="$TMPDIR/post_kb.mp4"

# Pre-video Ken Burns (0 to start_ms)
PRE_MIN_DUR=$(awk "BEGIN { print ($PRE_DUR > 0.1) ? 1 : 0 }")
if [ "$PRE_MIN_DUR" = "1" ]; then
  echo "  Generating pre-video Ken Burns (${PRE_DUR}s)"
  if generate_ken_burns "$PRE_DUR" "$PRE_CLIP"; then
    HAS_PRE=1
  fi
fi

# Post-video Ken Burns (end_ms to total_ms)
POST_MIN_DUR=$(awk "BEGIN { print ($POST_DUR > 0.1) ? 1 : 0 }")
if [ "$POST_MIN_DUR" = "1" ]; then
  echo "  Generating post-video Ken Burns (${POST_DUR}s)"
  if generate_ken_burns "$POST_DUR" "$POST_CLIP"; then
    HAS_POST=1
  fi
fi

# --- Step 4: Join segments with crossfade transitions ---
VIDEO_ONLY="$TMPDIR/video_only.mp4"

if [ "$HAS_PRE" = "1" ] && [ "$HAS_POST" = "1" ]; then
  # 3 segments: pre + i2v + post with 2 crossfade transitions
  echo "  Joining: pre + i2v + post (2 crossfades)"

  # Calculate xfade offsets
  # Offset 1: pre_dur - xfade_dur
  OFFSET1=$(awk "BEGIN {printf \"%.3f\", $PRE_DUR - $XFADE_DUR}")
  # After first xfade, combined duration = pre_dur + i2v_dur - xfade_dur
  # Offset 2: combined - xfade_dur
  OFFSET2=$(awk "BEGIN {printf \"%.3f\", $PRE_DUR + $I2V_DUR - $XFADE_DUR - $XFADE_DUR}")

  # Clamp offsets to minimum 0
  OFFSET1=$(awk "BEGIN {v=$OFFSET1; print (v < 0) ? 0 : v}")
  OFFSET2=$(awk "BEGIN {v=$OFFSET2; print (v < 0) ? 0 : v}")

  ffmpeg -y \
    -i "$PRE_CLIP" \
    -i "$I2V_PREPARED" \
    -i "$POST_CLIP" \
    -filter_complex "
      [0:v][1:v]xfade=transition=dissolve:duration=${XFADE_DUR}:offset=${OFFSET1}[v01];
      [v01][2:v]xfade=transition=dissolve:duration=${XFADE_DUR}:offset=${OFFSET2}[vout]
    " \
    -map "[vout]" \
    -c:v libx264 -pix_fmt yuv420p -preset medium -crf 18 \
    -an \
    "$VIDEO_ONLY" 2>/dev/null

elif [ "$HAS_PRE" = "1" ]; then
  # 2 segments: pre + i2v
  echo "  Joining: pre + i2v (1 crossfade)"
  OFFSET1=$(awk "BEGIN {printf \"%.3f\", $PRE_DUR - $XFADE_DUR}")
  OFFSET1=$(awk "BEGIN {v=$OFFSET1; print (v < 0) ? 0 : v}")

  ffmpeg -y \
    -i "$PRE_CLIP" \
    -i "$I2V_PREPARED" \
    -filter_complex "
      [0:v][1:v]xfade=transition=dissolve:duration=${XFADE_DUR}:offset=${OFFSET1}[vout]
    " \
    -map "[vout]" \
    -c:v libx264 -pix_fmt yuv420p -preset medium -crf 18 \
    -an \
    "$VIDEO_ONLY" 2>/dev/null

elif [ "$HAS_POST" = "1" ]; then
  # 2 segments: i2v + post
  echo "  Joining: i2v + post (1 crossfade)"
  OFFSET1=$(awk "BEGIN {printf \"%.3f\", $I2V_DUR - $XFADE_DUR}")
  OFFSET1=$(awk "BEGIN {v=$OFFSET1; print (v < 0) ? 0 : v}")

  ffmpeg -y \
    -i "$I2V_PREPARED" \
    -i "$POST_CLIP" \
    -filter_complex "
      [0:v][1:v]xfade=transition=dissolve:duration=${XFADE_DUR}:offset=${OFFSET1}[vout]
    " \
    -map "[vout]" \
    -c:v libx264 -pix_fmt yuv420p -preset medium -crf 18 \
    -an \
    "$VIDEO_ONLY" 2>/dev/null

else
  # Only I2V clip (no pre/post — placement covers entire duration)
  echo "  Using I2V clip only (no Ken Burns segments needed)"
  cp "$I2V_PREPARED" "$VIDEO_ONLY"
fi

# --- Step 5: Overlay TTS audio as master track ---
echo "  Overlaying TTS audio (master clock)"
ffmpeg -y \
  -i "$VIDEO_ONLY" \
  -i "$AUDIO" \
  -map 0:v -map 1:a \
  -c:v copy \
  -c:a aac -ar 48000 -ac 1 -b:a 128k \
  -t "$TOTAL_DUR" \
  -movflags +faststart \
  "$OUTPUT" 2>/dev/null

# --- Verify output ---
OUT_DUR=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$OUTPUT" | tr -d '[:space:]')
echo "Hybrid assemble complete: $OUTPUT"
echo "  Duration: ${OUT_DUR}s (target: ${TOTAL_DUR}s)"
echo "  Size: $(du -h "$OUTPUT" | cut -f1)"

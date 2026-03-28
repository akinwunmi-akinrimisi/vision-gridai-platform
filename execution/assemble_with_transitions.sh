#!/bin/bash
# Assemble video clips with xfade transitions — batched for memory safety
# Usage: assemble_with_transitions.sh MANIFEST_JSON OUTPUT_FILE [BATCH_SIZE]
#
# MANIFEST_JSON: JSON file with array of: [{ "clip": "path", "duration": N, "transition": "type" }]
# Transitions: crossfade(0.5s), hard_cut(0s), zoom_blur(0.4s), wipe_left(0.5s), dissolve_slow(0.8s)
#
# Batches BATCH_SIZE clips with xfade, then concat batches with -c copy.

set -euo pipefail

MANIFEST="$1"
OUTPUT="$2"
BATCH_SIZE="${3:-15}"
WORK_DIR=$(mktemp -d)
trap "rm -rf $WORK_DIR" EXIT

CLIP_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$MANIFEST','utf8')).length)")
echo "Assembling $CLIP_COUNT clips in batches of $BATCH_SIZE"

if [ "$CLIP_COUNT" -lt 2 ]; then
  node -e "const m=JSON.parse(require('fs').readFileSync('$MANIFEST','utf8'));process.stdout.write(m[0].clip)" | xargs -I{} cp {} "$OUTPUT"
  echo "Single clip — copied"
  exit 0
fi

# Build xfade chain for a batch using node to generate the FFmpeg command
assemble_batch() {
  local BATCH_IDX="$1"
  local START="$2"
  local END="$3"
  local BATCH_OUT="$WORK_DIR/batch_${BATCH_IDX}.mp4"

  # Use node to build the ffmpeg filter_complex string
  node -e "
    const m = JSON.parse(require('fs').readFileSync('$MANIFEST','utf8')).slice($START, $END);
    const transMap = {
      crossfade: { type: 'fade', dur: 0.5 },
      hard_cut: { type: 'none', dur: 0 },
      zoom_blur: { type: 'circleopen', dur: 0.4 },
      wipe_left: { type: 'wipeleft', dur: 0.5 },
      dissolve_slow: { type: 'dissolve', dur: 0.8 },
    };

    if (m.length < 2) {
      console.log('COPY:' + m[0].clip);
      process.exit(0);
    }

    // Build inputs
    const inputs = m.map(c => '-i ' + c.clip).join(' ');

    // Build xfade chain
    let filter = '';
    let offset = 0;
    for (let i = 1; i < m.length; i++) {
      const t = transMap[m[i].transition] || transMap.crossfade;
      const prevLabel = i === 1 ? '[0:v]' : '[v' + (i-1) + ']';
      const nextLabel = i === m.length - 1 ? '[vout]' : '[v' + i + ']';

      if (i === 1) {
        offset = m[0].duration - t.dur;
      } else {
        offset = offset + m[i-1].duration - t.dur;
      }

      if (t.type === 'none') {
        filter += prevLabel + '[' + i + ':v]concat=n=2:v=1:a=0' + nextLabel + ';';
      } else {
        filter += prevLabel + '[' + i + ':v]xfade=transition=' + t.type + ':duration=' + t.dur + ':offset=' + offset.toFixed(3) + nextLabel + ';';
      }
    }
    filter = filter.replace(/;$/, '');

    console.log('CMD:' + inputs + '|' + filter);
  " > "$WORK_DIR/cmd_${BATCH_IDX}.txt"

  local CMD_LINE=$(cat "$WORK_DIR/cmd_${BATCH_IDX}.txt")

  if [[ "$CMD_LINE" == COPY:* ]]; then
    cp "${CMD_LINE#COPY:}" "$BATCH_OUT"
    echo "  Batch $BATCH_IDX: 1 clip (copied)"
  elif [[ "$CMD_LINE" == CMD:* ]]; then
    local PARTS="${CMD_LINE#CMD:}"
    local INPUTS="${PARTS%%|*}"
    local FILTER="${PARTS#*|}"

    eval ffmpeg -y $INPUTS -filter_complex "\"$FILTER\"" -map '"[vout]"' -c:v libx264 -pix_fmt yuv420p -preset medium -crf 18 "\"$BATCH_OUT\"" 2>&1 | tail -2

    if [ -f "$BATCH_OUT" ]; then
      echo "  Batch $BATCH_IDX: OK ($(du -h "$BATCH_OUT" | cut -f1))"
    else
      echo "  ERROR: Batch $BATCH_IDX failed" >&2
      return 1
    fi
  fi
}

# Process in batches
BATCH_NUM=0
BATCH_FILES=()

for ((START=0; START<CLIP_COUNT; START+=BATCH_SIZE)); do
  END=$((START + BATCH_SIZE))
  [ "$END" -gt "$CLIP_COUNT" ] && END=$CLIP_COUNT

  assemble_batch "$BATCH_NUM" "$START" "$END"
  BATCH_FILES+=("$WORK_DIR/batch_${BATCH_NUM}.mp4")
  BATCH_NUM=$((BATCH_NUM + 1))
done

# Concat batches
if [ "${#BATCH_FILES[@]}" -eq 1 ]; then
  cp "${BATCH_FILES[0]}" "$OUTPUT"
else
  echo "Concatenating ${#BATCH_FILES[@]} batches..."
  CONCAT_LIST="$WORK_DIR/concat.txt"
  for bf in "${BATCH_FILES[@]}"; do
    echo "file '$bf'" >> "$CONCAT_LIST"
  done
  ffmpeg -y -f concat -safe 0 -i "$CONCAT_LIST" -c:v copy -movflags +faststart "$OUTPUT" 2>&1 | tail -2
fi

if [ -f "$OUTPUT" ]; then
  echo "Output: $OUTPUT ($(du -h "$OUTPUT" | cut -f1), $(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$OUTPUT")s)"
else
  echo "ERROR: Final assembly failed" >&2
  exit 1
fi

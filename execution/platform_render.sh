#!/bin/bash
# Platform-specific video export — applies CRF, bitrate, resolution per platform
# Usage: platform_render.sh INPUT PLATFORM OUTPUT
#
# Platforms: youtube_long, youtube_shorts, tiktok, instagram
# Each has optimized encoding settings per Agent.md Export Profiles table.

set -euo pipefail

INPUT="$1"
PLATFORM="$2"
OUTPUT="$3"

case "$PLATFORM" in
  youtube_long)
    # YouTube Long: 16:9, CRF 17-19, slow, 12 Mbps, 192k AAC
    ffmpeg -y -i "$INPUT" \
      -c:v libx264 -crf 18 -preset slow -maxrate 12M -bufsize 24M \
      -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
      -c:a aac -b:a 192k -ar 48000 \
      -pix_fmt yuv420p -movflags +faststart \
      "$OUTPUT" 2>&1
    ;;
  youtube_shorts)
    # YouTube Shorts: 9:16, CRF 18-20, slow, 6 Mbps, 192k AAC
    ffmpeg -y -i "$INPUT" \
      -c:v libx264 -crf 19 -preset slow -maxrate 6M -bufsize 12M \
      -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
      -c:a aac -b:a 192k -ar 48000 \
      -pix_fmt yuv420p -movflags +faststart \
      "$OUTPUT" 2>&1
    ;;
  tiktok)
    # TikTok: 9:16, CRF 20-23, medium, 4 Mbps, 128k AAC
    ffmpeg -y -i "$INPUT" \
      -c:v libx264 -crf 21 -preset medium -maxrate 4M -bufsize 8M \
      -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
      -c:a aac -b:a 128k -ar 44100 \
      -pix_fmt yuv420p -movflags +faststart \
      "$OUTPUT" 2>&1
    ;;
  instagram)
    # Instagram Reels: 9:16, CRF 20-23, medium, 3.5 Mbps, 128k AAC
    ffmpeg -y -i "$INPUT" \
      -c:v libx264 -crf 21 -preset medium -maxrate 3500k -bufsize 7M \
      -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
      -c:a aac -b:a 128k -ar 44100 \
      -pix_fmt yuv420p -movflags +faststart \
      "$OUTPUT" 2>&1
    ;;
  *)
    echo "ERROR: Unknown platform '$PLATFORM'. Use: youtube_long, youtube_shorts, tiktok, instagram" >&2
    exit 1
    ;;
esac

if [ -f "$OUTPUT" ]; then
  SIZE=$(du -h "$OUTPUT" | cut -f1)
  DUR=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$OUTPUT")
  RES=$(ffprobe -v quiet -show_entries stream=width,height -of csv=p=0 "$OUTPUT" | head -1)
  echo "Rendered: $PLATFORM | ${RES} | ${DUR}s | $SIZE"
else
  echo "ERROR: Render failed for platform '$PLATFORM'" >&2
  exit 1
fi

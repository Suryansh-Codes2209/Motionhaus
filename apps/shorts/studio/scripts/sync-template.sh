#!/usr/bin/env bash
# Copies the Motionhaus motion kit (packages/motion-kit) into this
# studio. Shorts-specific files are never overwritten:
#   src/video.config.ts  (config comes from input props)
#   src/Root.tsx         (registers "Short", "Long" and "Thumbnail")
#   src/shorts/          (series badge, VO, captions, music ducking, outro)
#   src/longform/        (16:9 deep dives: chapters, end card, thumbnail, SRT)
#   scripts/subtitles.ts (writes the .srt from props.json)
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
TPL="$HERE/../../../packages/motion-kit"
rsync -a --exclude video.config.ts --exclude Root.tsx --exclude shorts/ --exclude longform/ "$TPL/src/" "$HERE/src/"
rsync -a "$TPL/scripts/" "$HERE/scripts/" --exclude sync-template.sh
echo "synced motion kit from $TPL"

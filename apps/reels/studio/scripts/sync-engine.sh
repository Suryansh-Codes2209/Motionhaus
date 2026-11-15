#!/usr/bin/env bash
# Links the vendored huashu art engine (packages/art-engine/engine) into this
# studio's public dir so `remotion studio` can serve it at /huashu/.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
ENGINE="$HERE/../../../packages/art-engine/engine"
mkdir -p "$HERE/public"
ln -sfn "$(cd "$ENGINE" && pwd)" "$HERE/public/huashu"
echo "linked $HERE/public/huashu → $ENGINE"

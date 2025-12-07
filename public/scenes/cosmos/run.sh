#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

python "$REPO_ROOT/sample_synccube.py" \
  --prompt "Immersive cosmic panorama with continuous nebula colors and dense stars, seamless 360 view" \
  --negative "distortion, fisheye, warped lines, incorrect perspective, mismatched lighting, inconsistent colors, duplicate structures, random people, text, watermark, low quality, blurry, seam, border, overexposure, underexposure, stretched textures, AI artifacts" \
  --prompt_mode single_prompt \
  --depth_mode off \
  --controlnet_scale 0.0 \
  --steps 50 \
  --seed 42 \
  --save_dir "$SCRIPT_DIR"

#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

python "$REPO_ROOT/sample_synccube.py" \
  --prompt_mode multi_prompt \
  --face_prompts \
    "Thick impasto brush strokes in Starry Night style, village and cypress wrapping around the cube" \
    "Right sweep of cypress and village with continuous swirling strokes across the corner" \
    "Rear hills and starry sky painted in deep cobalt with luminous swirls" \
    "Left side reconnecting rooftops and cypress, stroke directions aligned across edges" \
    "Top of swirling stars and crescent moon in bright yellow over deep blue" \
    "Painted ground with layered strokes, earthy tones matching the palette" \
  --negative "distortion, fisheye, warped lines, incorrect perspective, mismatched lighting, inconsistent colors, duplicate structures, random people, text, watermark, low quality, blurry, seam, border, overexposure, underexposure, stretched textures, AI artifacts" \
  --depth_mode off \
  --controlnet_scale 0.0 \
  --steps 50 \
  --seed 42 \
  --save_dir "$SCRIPT_DIR"

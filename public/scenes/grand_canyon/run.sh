#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

python "$REPO_ROOT/sample_synccube.py" \
  --prompt_mode multi_prompt \
  --face_prompts \
    "sunset over a vast desert canyon, golden hour light on layered rock formations and dust in the air" \
    "canyon ridges continuing with warm light and dust haze" \
    "distant desert canyon walls glowing at sunset, soft atmospheric dust" \
    "canyon cliffs and terraces in golden hour, drifting dust" \
    "open sky with only soft clouds and blue gradient, no ground visible" \
    "canyon floor with sand and rock texture, warm light and long shadows" \
  --negative "fisheye, panoramic projection, distortion, warping, seams, stitching artifacts, text, watermark, logo, blurry, low quality" \
  --init_image "$SCRIPT_DIR/init_image.png" \
  --init_mode all_faces_from_front \
  --init_strength 0.2 \
  --steps 100 \
  --seed 42 \
  --save_dir "$SCRIPT_DIR"

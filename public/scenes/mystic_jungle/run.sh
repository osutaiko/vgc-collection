#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

python "$REPO_ROOT/sample_synccube.py" \
  --prompt_mode multi_prompt \
  --face_prompts \
    "Dense rainforest canopy with layered foliage, misty shafts of light, rich green textures" \
    "Right view of thick jungle trees and vines, deep shadows and humid haze" \
    "Back view into the rainforest interior, overlapping leaves and trunks fading into mist" \
    "Left view of dense vegetation, tangled vines, ferns, and mossy trunks" \
    "Looking upward from the jungle floor into dense overlapping leaves and branches, only canopy overhead" \
    "Jungle floor with roots, ferns, fallen leaves, soft dappled light" \
  --negative "distortion, fisheye, warped lines, incorrect perspective, mismatched lighting, inconsistent colors, duplicate structures, random people, text, watermark, low quality, blurry, seam, border, overexposure, underexposure, stretched textures, AI artifacts" \
  --depth_mode on \
  --depth_faces 0 0 0 0 0 1 \
  --controlnet_scale 0.3 \
  --steps 50 \
  --seed 42 \
  --save_dir "$SCRIPT_DIR"

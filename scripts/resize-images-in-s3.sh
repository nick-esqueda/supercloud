#!/bin/bash
#
# Shrinks oversized images in the userdata bucket so they load quickly, without visible quality loss.
#
#   - Caps pixel dimensions per folder (aspect ratio is preserved, nothing is cropped).
#     Artwork is shown at most 348px tall, so a 640px short side stays sharp on retina screens.
#   - Re-encodes resized images (JPEG quality 75, 4:2:0 chroma, progressive), applies EXIF rotation,
#     and strips metadata except the color profile. Images already under the cap keep their original bytes.
#   - Sets the correct Content-Type (user uploads were stored as multipart/form-data) and a 1-year
#     Cache-Control on every image.
#   - Backs up each original to s3://$S3_BUCKET/$BACKUP_PREFIX/<key> before overwriting it.
#
# Safe to re-run: images already under the cap are skipped, and existing backups are never overwritten.
#
# Usage:   scripts/resize-images-in-s3.sh [--dry-run] [key ...]
#          With keys, only those objects are processed (using their folder's rule); otherwise all of them.
# Needs:   aws CLI (logged in), ImageMagick 7 (`brew install imagemagick`)

set -euo pipefail

S3_BUCKET="supercloud-userdata"
AWS_REGION="us-east-2"
BACKUP_PREFIX="backups/original-images"
CACHE_CONTROL="public, max-age=31536000"
JPEG_QUALITY=75

DRY_RUN=false
if [ "${1:-}" = "--dry-run" ]; then DRY_RUN=true; shift; fi

command -v magick > /dev/null || { echo "ImageMagick 7 is required: brew install imagemagick" >&2; exit 1; }

# Folder -> resize rule. Rules:
#   short:N         shorter side at most N px   (square, object-fit: cover thumbnails)
#   width:N         width at most N px          (full-width banners)
#   box:LONG:SHORT  long side at most LONG and short side at most SHORT
#                   (user uploads at the bucket root: could be artwork, avatars or banners)
RULES=(
  "royalty-free-song-seeds/artwork-for-song-seeds/|short:640"
  "royalty-free-song-seeds/artwork-for-song-seeds-2/|short:640"
  "user-seeds/avatars-for-user-seeds/|short:640"
  "user-seeds/banners-for-user-seeds/|width:2400"
  "|box:2400:1200"  # bucket root
)

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

s3api() { aws s3api --region "$AWS_REGION" "$@"; }
s3()    { aws s3 --region "$AWS_REGION" "$@"; }

# Prints the image MIME type of an object, or nothing if it isn't a JPEG/PNG.
# Root uploads have no file extension, so sniff the first bytes instead of downloading whole audio files.
mime_type_of() {
  local key="$1"
  case "$(echo "${key##*.}" | tr '[:upper:]' '[:lower:]')" in
    jpg|jpeg) echo "image/jpeg"; return ;;
    png)      echo "image/png";  return ;;
    mp3|wav)  return ;;
  esac
  s3api get-object --bucket "$S3_BUCKET" --key "$key" --range bytes=0-63 "$TMP_DIR/head" > /dev/null
  case "$(file --mime-type -b "$TMP_DIR/head")" in
    image/jpeg) echo "image/jpeg" ;;
    image/png)  echo "image/png" ;;
  esac
}

# Prints the target long-side length in px, or 0 if the image is already within the rule.
target_long_side() {
  local rule="$1" w="$2" h="$3"
  local long=$(( w > h ? w : h )) short=$(( w < h ? w : h ))
  local scale_num=1 scale_den=1  # scale = num/den, kept as integers for bash

  case "$rule" in
    short:*) local cap="${rule#short:}"
             (( short > cap )) && { scale_num=$cap; scale_den=$short; } ;;
    width:*) local cap="${rule#width:}"
             (( w > cap )) && { scale_num=$cap; scale_den=$w; } ;;
    box:*)   local caps="${rule#box:}" cap_long cap_short
             cap_long="${caps%%:*}"; cap_short="${caps##*:}"
             # use whichever cap requires the larger reduction
             if (( long * cap_short > short * cap_long )); then
               (( long > cap_long )) && { scale_num=$cap_long; scale_den=$long; }
             else
               (( short > cap_short )) && { scale_num=$cap_short; scale_den=$short; }
             fi ;;
  esac

  if (( scale_num == scale_den )); then echo 0; else echo $(( long * scale_num / scale_den )); fi
}

process_key() {
  local key="$1" rule="$2"
  local mime; mime="$(mime_type_of "$key")"
  [ -z "$mime" ] && return

  local src="$TMP_DIR/src" out="$TMP_DIR/out"
  s3 cp --only-show-errors "s3://$S3_BUCKET/$key" "$src"

  # dimensions as displayed, i.e. after applying any EXIF rotation (phone photos are often stored sideways)
  local w h
  read -r w h < <(magick "$src[0]" -auto-orient -format '%w %h' info: 2> /dev/null) || true
  if [ -z "${w:-}" ] || [ -z "${h:-}" ]; then
    echo "WARN    $key  couldn't read image, skipped"; rm -f "$src"; return
  fi
  local target; target="$(target_long_side "$rule" "$w" "$h")"
  local old_size; old_size=$(wc -c < "$src" | tr -d ' ')

  if (( target > 0 )); then
    # fit within target x target (long side = target, aspect ratio preserved); keep only the ICC color profile
    local opts=(-auto-orient -resize "${target}x${target}" +profile '!icc,*')
    if [ "$mime" = "image/jpeg" ]; then
      magick "$src[0]" "${opts[@]}" -sampling-factor 4:2:0 -interlace JPEG -quality "$JPEG_QUALITY" "jpeg:$out"
    else
      magick "$src[0]" "${opts[@]}" "png:$out"
    fi
    local new_size; new_size=$(wc -c < "$out" | tr -d ' ')

    if (( new_size < old_size )); then
      echo "RESIZE  $key  ${w}x${h} -> long side ${target}px  $(( old_size / 1024 ))KB -> $(( new_size / 1024 ))KB"
      if ! $DRY_RUN; then
        # back up the original, unless a backup already exists from an earlier run
        if ! s3api head-object --bucket "$S3_BUCKET" --key "$BACKUP_PREFIX/$key" > /dev/null 2>&1; then
          s3 cp --only-show-errors "s3://$S3_BUCKET/$key" "s3://$S3_BUCKET/$BACKUP_PREFIX/$key"
        fi
        s3 cp --only-show-errors "$out" "s3://$S3_BUCKET/$key" \
          --content-type "$mime" --cache-control "$CACHE_CONTROL"
      fi
      rm -f "$src" "$out"
      return
    fi
    echo "KEEP    $key  resizing wouldn't make it smaller"
  fi
  rm -f "$src" "$out"

  # Not resized: just fix headers in place (server-side copy), if they need it
  local current
  current="$(s3api head-object --bucket "$S3_BUCKET" --key "$key" \
    --query '[ContentType, CacheControl]' --output text)"
  if [ "$current" != "$mime"$'\t'"$CACHE_CONTROL" ]; then
    echo "HEADERS $key  ($(echo "$current" | tr '\t' ' ') -> $mime)"
    if ! $DRY_RUN; then
      s3 cp --only-show-errors "s3://$S3_BUCKET/$key" "s3://$S3_BUCKET/$key" \
        --metadata-directive REPLACE --content-type "$mime" --cache-control "$CACHE_CONTROL"
    fi
  fi
}

# Prints the rule for a key: the first RULES entry whose folder the key sits directly in.
rule_for_key() {
  local key="$1" dir=""
  [[ "$key" == */* ]] && dir="${key%/*}/"
  for entry in "${RULES[@]}"; do
    [ "${entry%%|*}" = "$dir" ] && { echo "${entry##*|}"; return; }
  done
  return 0  # no rule: print nothing (the caller skips the key). Without this, set -e would exit the script.
}

$DRY_RUN && echo "DRY RUN: nothing will be written to S3"

if (( $# > 0 )); then
  for key in "$@"; do
    rule="$(rule_for_key "$key")"
    if [ -z "$rule" ]; then echo "SKIP    $key  (no rule for its folder)"; continue; fi
    process_key "$key" "$rule"
  done
  echo "image resizing complete"
  exit 0
fi

for entry in "${RULES[@]}"; do
  prefix="${entry%%|*}"; rule="${entry##*|}"
  echo "== ${prefix:-(bucket root)}  [$rule]"

  if [ -z "$prefix" ]; then
    # root only: keys without a "/"
    keys="$(s3api list-objects-v2 --bucket "$S3_BUCKET" --delimiter / \
      --query 'Contents[].Key' --output text | tr '\t' '\n')"
  else
    keys="$(s3api list-objects-v2 --bucket "$S3_BUCKET" --prefix "$prefix" --delimiter / \
      --query 'Contents[].Key' --output text | tr '\t' '\n')"
  fi

  while IFS= read -r key; do
    [ -z "$key" ] || [ "$key" = "None" ] && continue
    process_key "$key" "$rule"
  done <<< "$keys"
done

echo "image resizing complete"

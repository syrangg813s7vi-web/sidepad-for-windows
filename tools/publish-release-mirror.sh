#!/usr/bin/env bash
set -euo pipefail

TAG="${1:?usage: publish-release-mirror.sh <tag> <asset-directory>}"
ASSET_DIR="${2:?usage: publish-release-mirror.sh <tag> <asset-directory>}"
RETENTION="${MIRROR_RETENTION:-3}"
SSH_PORT="${MIRROR_SSH_PORT:-22}"

: "${MIRROR_SSH_HOST:?MIRROR_SSH_HOST is required}"
: "${MIRROR_SSH_USER:?MIRROR_SSH_USER is required}"
: "${MIRROR_RELEASE_PATH:?MIRROR_RELEASE_PATH is required}"

if [[ ! "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+([.-][A-Za-z0-9.-]+)?$ ]]; then
  echo "Invalid release tag: $TAG" >&2
  exit 2
fi

if [[ ! "$RETENTION" =~ ^[1-9][0-9]*$ ]]; then
  echo "MIRROR_RETENTION must be a positive integer." >&2
  exit 2
fi

if [[ ! "$SSH_PORT" =~ ^[1-9][0-9]*$ ]]; then
  echo "MIRROR_SSH_PORT must be a positive integer." >&2
  exit 2
fi

if [[ ! "$MIRROR_RELEASE_PATH" =~ ^/[A-Za-z0-9._/-]+$ ]]; then
  echo "MIRROR_RELEASE_PATH must be an absolute path containing only safe characters." >&2
  exit 2
fi

if [[ ! -d "$ASSET_DIR" || ! -f "$ASSET_DIR/SHA256SUMS.txt" ]]; then
  echo "Asset directory and SHA256SUMS.txt are required." >&2
  exit 2
fi

(
  cd "$ASSET_DIR"
  sha256sum -c SHA256SUMS.txt
)

SSH_TARGET="${MIRROR_SSH_USER}@${MIRROR_SSH_HOST}"
SSH_OPTIONS=(
  -p "$SSH_PORT"
  -o BatchMode=yes
  -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=yes
)
RUN_ID="${GITHUB_RUN_ID:-manual}-$$"
REMOTE_TEMP="${MIRROR_RELEASE_PATH}/.${TAG}-${RUN_ID}.uploading"

cleanup() {
  ssh "${SSH_OPTIONS[@]}" "$SSH_TARGET" \
    "rm -rf '$REMOTE_TEMP'" >/dev/null 2>&1 || true
}
trap cleanup EXIT

ssh "${SSH_OPTIONS[@]}" "$SSH_TARGET" \
  "install -d -m 0755 '$MIRROR_RELEASE_PATH' '$REMOTE_TEMP'"

rsync -a --partial \
  --chmod=F644,D755 \
  -e "ssh -p $SSH_PORT -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes" \
  "$ASSET_DIR/" "$SSH_TARGET:$REMOTE_TEMP/"

ssh "${SSH_OPTIONS[@]}" "$SSH_TARGET" bash -s -- \
  "$MIRROR_RELEASE_PATH" "$REMOTE_TEMP" "$TAG" "$RETENTION" <<'REMOTE'
set -euo pipefail

root="$1"
incoming="$2"
tag="$3"
retention="$4"
final="$root/$tag"
previous="$root/.${tag}.previous"

cd "$incoming"
sha256sum -c SHA256SUMS.txt
chmod 0644 ./*

rm -rf "$previous"
if [[ -d "$final" ]]; then
  mv "$final" "$previous"
fi

mv "$incoming" "$final"
ln -sfn "$tag" "$root/.latest.next"
mv -Tf "$root/.latest.next" "$root/latest"
rm -rf "$previous"

mapfile -t versions < <(
  find "$root" -mindepth 1 -maxdepth 1 -type d -name 'v*' -printf '%f\n' |
    sort -V
)

excess=$((${#versions[@]} - retention))
if (( excess > 0 )); then
  for ((index = 0; index < excess; index += 1)); do
    rm -rf "$root/${versions[$index]}"
  done
fi
REMOTE

trap - EXIT
echo "Published $TAG to the release mirror."

#!/usr/bin/env bash
# Keep initial release and metadata-only resumption on the same guarded artifact check.
set -euo pipefail
artifact="${1:?exact attempt-scoped artifact name required}"
receipt="${2:?evidence output path required}"
: "${GITHUB_REPOSITORY:?}" "${GITHUB_RUN_ID:?}" "${GITHUB_RUN_ATTEMPT:?}"
case "$artifact" in
  image-pages-"$GITHUB_RUN_ID"-"$GITHUB_RUN_ATTEMPT"|image-final-metadata-"$GITHUB_RUN_ID"-"$GITHUB_RUN_ATTEMPT"|image-metadata-sync-"$GITHUB_RUN_ID"-"$GITHUB_RUN_ATTEMPT") ;;
  *) echo '::error::ARTIFACT_NOT_BOUND_TO_CURRENT_ATTEMPT'; exit 1;;
esac
mkdir -p "$(dirname "$receipt")"
start=$SECONDS
stable=0
last_id=
missing=0
api_errors=0
endpoint="repos/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID/artifacts"
record() {
  jq -n --arg result "$1" --arg name "$artifact" --arg id "${last_id:-}" \
    --arg run "$GITHUB_RUN_ID" --arg attempt "$GITHUB_RUN_ATTEMPT" \
    --argjson probes "$probe" --argjson stable "$stable" --argjson missing "$missing" \
    --argjson errors "$api_errors" --argjson seconds "$((SECONDS-start))" \
    '{schema_version:"image-pages-artifact-visibility-v1",result:$result,artifact_name:$name,
      artifact_id:($id|if length>0 then tonumber else null end),run_id:$run,run_attempt:$attempt,
      probes:$probes,stable_polls:$stable,not_visible_polls:$missing,api_error_polls:$errors,elapsed_seconds:$seconds}' > "$receipt"
  echo "IMAGE_PAGES_ARTIFACT_VISIBILITY result=$1 name=$artifact probes=$probe elapsed_seconds=$((SECONDS-start))"
}
select_ids() {
  jq -ce --arg name "$artifact" '
    .artifacts | if type != "array" then error("invalid listing") else . end |
    [ .[] | select(.name==$name and .expired==false and .size_in_bytes>0) |
      if (.id|type) != "number" then error("invalid artifact ID") else .id end ]
  '
}
for probe in $(seq 1 20); do
  if a="$(gh api "$endpoint" | select_ids)" && b="$(gh api "$endpoint?per_page=100" | select_ids)"; then
    n="$(jq length <<<"$a")"
    m="$(jq length <<<"$b")"
    if [ "$n" -gt 1 ] || [ "$m" -gt 1 ] || { [ "$n" = 1 ] && [ "$m" = 1 ] && [ "$a" != "$b" ]; }; then
      record AMBIGUOUS_CURRENT_ATTEMPT_ARTIFACT
      exit 1
    fi
    if [ "$n" = 1 ] && [ "$m" = 1 ]; then
      id="$(jq -r '.[0]' <<<"$a")"
      if [ -n "$last_id" ] && [ "$id" != "$last_id" ]; then
        record AMBIGUOUS_CURRENT_ATTEMPT_ARTIFACT
        exit 1
      fi
      last_id="$id"
      stable=$((stable+1))
    else
      missing=$((missing+1))
      stable=0
    fi
  else
    api_errors=$((api_errors+1))
    stable=0
  fi
  # Keep the existing bounded settling period and three consecutive agreements.
  if [ "$probe" -ge 8 ] && [ "$stable" -ge 3 ]; then
    record EXACT_ATTEMPT_ARTIFACT_STABLY_VISIBLE
    exit 0
  fi
  if [ "$probe" -lt 20 ]; then sleep 2; fi
done
record CURRENT_ATTEMPT_ARTIFACT_NOT_STABLY_VISIBLE
exit 1

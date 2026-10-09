import crypto from 'node:crypto';
import {applyCorrectionToBundle} from './correction-apply.mjs';

const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const invariant = (ok, message) => { if (!ok) throw new Error(message); };

// Stage a revision; the caller persists the original bundle and publishes only
// through protected CI, immutable Git binary readback, and live verification.
export function applyImageCorrectionBatch({bundle, request, corrections, assets}) {
  invariant(request?.schema_version === 'daily-compiler-image-correction-request-v1', 'request_schema');
  invariant(request.edition_date === bundle.edition_date, 'edition_mismatch');
  invariant(request.status === 'READY_TO_APPLY', 'request_not_ready');
  invariant(typeof request.request_id === 'string' && request.request_id.length > 0, 'request_identity');
  invariant(request.preserve_original === true && request.new_execution_allowed === false, 'request_invariants');
  const selected = request.story_ids;
  invariant(Array.isArray(selected) && selected.length >= 1 && selected.length <= 6 && new Set(selected).size === selected.length, 'selected_story_ids');
  invariant(Array.isArray(corrections) && corrections.length === selected.length, 'correction_count');
  invariant(new Set(corrections.map(c => c.target?.story_id)).size === selected.length, 'duplicate_correction_target');
  invariant(new Set(corrections.map(c => c.correction_id)).size === selected.length, 'duplicate_correction_id');
  invariant(!bundle.corrections?.some(c => corrections.some(n => n.correction_id === c.correction_id)), 'already_applied');
  const known = new Set(bundle.stories.map(s => s.id));
  let output = structuredClone(bundle);
  const receipts = [];
  for (const correction of corrections) {
    const id = correction.target?.story_id;
    invariant(selected.includes(id) && known.has(id), 'unknown_or_unselected_story');
    invariant(correction.correction_type === 'replace_image' && correction.semantic_scope === 'image_only', 'image_only');
    invariant(!correction.replacement?.image_system, 'edition_strategy_immutable');
    const old = bundle.images.find(i => i.story_id === id);
    invariant(old && correction.target.expected_sha256 === old.sha256, 'stale_image');
    const image = correction.replacement?.image;
    invariant(image?.accepted === true && image.accepted_locked === true, 'image_not_locked');
    invariant(image.path !== old.path && !bundle.images.some(i => i.path === image.path), 'versioned_asset_path_required');
    invariant(typeof image.path === 'string' && !image.path.startsWith('/') && !image.path.split('/').includes('..'), 'unsafe_asset_path');
    invariant(image.visual_review?.result === 'PASS' && image.visual_review.reviewed_sha256 === image.sha256, 'canonical_visual_review');
    invariant(image.visual_review.quality_gate_location === 'fresh_regular_chat_per_story', 'story_chat_review_required');
    const bytes = assets?.[id];
    invariant(Buffer.isBuffer(bytes) && bytes.length >= 24, 'asset_bytes_missing');
    invariant(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && bytes.toString('ascii',12,16) === 'IHDR', 'png_required');
    invariant(bytes.readUInt32BE(16) === 1200 && bytes.readUInt32BE(20) === 630, 'canonical_dimensions');
    invariant(digest(bytes) === image.sha256 && image.bytes === bytes.length, 'asset_digest_mismatch');
    const blob = crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
    invariant(blob === image.git_blob_sha, 'git_blob_mismatch');
    output = applyCorrectionToBundle(output, correction);
    receipts.push({story_id:id, old_sha256:old.sha256, new_sha256:image.sha256, git_blob_sha:blob, bytes:bytes.length});
  }
  invariant(new Set(output.images.map(i=>i.sha256)).size === output.images.length, 'duplicate_image_bytes');
  return {bundle:output, receipt:{schema_version:'daily-compiler-image-correction-stage-v1',request_id:request.request_id,edition_date:bundle.edition_date,result:'STAGED',selected_story_ids:selected,images:receipts,semantic_rework:0,unselected_images_preserved:true,publication_verified:false}};
}

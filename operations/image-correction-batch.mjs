import {sha256,gitBlobSha} from '../image-capsules/util.mjs';
import {validateCanonicalPng} from '../image-studio/png-integrity.mjs';
import {applyCorrectionToBundle,validateImageCorrectionMetadata,buildCorrectionRecompileState,correctionAssetManifest,validateImageSystemUpdate} from './correction-apply.mjs';
import {validateCorrection} from './corrections.mjs';

const invariant=(ok,message)=>{if(!ok) throw new Error(message);};

export function validateCorrectionAsset(image,bytes){
  invariant(Buffer.isBuffer(bytes)&&bytes.length>=24,'asset_bytes_missing');
  const dims=validateCanonicalPng(bytes);
  invariant(dims.width===1200&&dims.height===630,'canonical_dimensions');
  invariant(image.width===dims.width&&image.height===dims.height&&image.format==='png','asset_metadata_mismatch');
  invariant(sha256(bytes)===image.sha256&&image.bytes===bytes.length,'asset_digest_mismatch');
  invariant(gitBlobSha(bytes)===image.git_blob_sha,'git_blob_mismatch');
  return {sha256:image.sha256,git_blob_sha:image.git_blob_sha,bytes:bytes.length,width:dims.width,height:dims.height,format:'png'};
}

// Pure staging: every selected record and canonical byte binding is validated
// before any reference is changed. Only protected release may publish the result.
export function applyImageCorrectionBatch({bundle,request,corrections,assets,baseState,bundleText,baseBundleText=bundleText,previousRevision=null}){
  invariant(request?.schema_version==='daily-compiler-image-correction-request-v1','request_schema');
  invariant(request.edition_date===bundle.edition_date,'edition_mismatch');
  invariant(request.status==='READY_TO_APPLY','request_not_ready');
  invariant(typeof request.request_id==='string'&&request.request_id.length>0,'request_identity');
  invariant(request.preserve_original===true&&request.new_execution_allowed===false,'request_invariants');
  const selected=request.story_ids;
  invariant(Array.isArray(selected)&&selected.length>=1&&selected.length<=6&&new Set(selected).size===selected.length,'selected_story_ids');
  invariant(Array.isArray(corrections)&&corrections.length===selected.length,'correction_count');
  invariant(new Set(corrections.map(c=>c.target?.story_id)).size===selected.length,'duplicate_correction_target');
  invariant(new Set(corrections.map(c=>c.correction_id)).size===selected.length,'duplicate_correction_id');
  invariant(new Set(corrections.map(c=>c.replacement?.image?.path)).size===selected.length,'duplicate_asset_path');
  if(request.expected_previous_bundle_sha256!==undefined) invariant(typeof bundleText==='string'&&sha256(bundleText)===request.expected_previous_bundle_sha256,'stale_bundle');
  const receipts=[];
  for(const correction of corrections){
    invariant(validateCorrection(correction).length===0&&correction.status==='VALIDATED','correction_invalid');
    const id=correction.target?.story_id;
    invariant(selected.includes(id),'unknown_or_unselected_story');
    invariant(correction.correction_type==='replace_image'&&correction.semantic_scope==='image_only','image_only');
    const check=validateImageCorrectionMetadata({bundle,correction,imageSystem:request.image_system});
    const identity=validateCorrectionAsset(check.image,assets?.[id]);
    receipts.push({story_id:id,old_path:check.old.path,old_sha256:check.old.sha256,new_path:check.unchanged?check.old.path:check.image.path,new_sha256:check.image.sha256,...identity,unchanged:check.unchanged});
  }
  if(request.image_system) validateImageSystemUpdate(bundle.image_system,request.image_system);
  let output=structuredClone(bundle);
  for(const correction of corrections) output=applyCorrectionToBundle(output,correction);
  invariant(new Set(output.images.map(i=>i.sha256)).size===output.images.length,'duplicate_image_bytes');
  invariant(new Set(output.images.map(i=>i.path)).size===output.images.length,'duplicate_asset_path');
  const changed=receipts.filter(r=>!r.unchanged).map(r=>r.story_id);
  if(request.image_system){
    if(!changed.length) invariant(JSON.stringify(request.image_system)===JSON.stringify(bundle.image_system),'correction_evidence_only_retry_forbidden');
    else output.image_system=structuredClone(request.image_system);
  }
  const receipt={
    schema_version:'daily-compiler-image-correction-stage-v1',request_id:request.request_id,
    edition_date:bundle.edition_date,result:changed.length?'STAGED':'UNCHANGED',selected_story_ids:selected,changed_story_ids:changed,
    correction_ids:corrections.filter(c=>changed.includes(c.target.story_id)).map(c=>c.correction_id),
    images:receipts,superseded_asset_manifest:correctionAssetManifest(bundle),new_asset_manifest:correctionAssetManifest(output),
    semantic_rework:0,accepted_image_regenerations:0,unselected_images_preserved:true,publication_verified:false,correction_created:changed.length>0
  };
  const result={bundle:output,receipt};
  if(baseState&&changed.length){
    const correctedBundleText=JSON.stringify(output,null,2)+'\n';
    result.revision=buildCorrectionRecompileState({beforeState:baseState,beforeBundle:bundle,beforeBundleText:bundleText,baseBundleText,correctedBundle:output,correctedBundleText,corrections,previousRevision,revisionId:request.revision_id||`${request.request_id}:r${Math.max(...corrections.map(c=>c.correction_revision))}`,updatedAt:request.requested_at||corrections[0].requested_at});
    receipt.revision_id=result.revision.revision_id;
    receipt.base_execution_id=baseState.execution_id;
    receipt.original_bundle_sha256=result.revision.original_bundle_sha256;
    receipt.expected_previous_bundle_sha256=result.revision.expected_previous_bundle_sha256;
    receipt.bundle_sha256=result.revision.bundle.digest;
  }
  return result;
}

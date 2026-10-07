import {canonicalSha,sha256} from './util.mjs';

function semanticProjection(bundle={}){
  return {
    schema_version:bundle.schema_version,
    edition_date:bundle.edition_date,
    editorial_contract_version:bundle.editorial_contract_version,
    stories:bundle.stories,
    videos:bundle.videos,
    podcasts:bundle.podcasts,
    watchlist:bundle.watchlist,
    book_mappings:bundle.book_mappings
  };
}

export function semanticFingerprint(bundle={}){
  return canonicalSha(semanticProjection(bundle));
}

export function prepareImageOnlyMigration({state,bundle}={}){
  if(state?.schema_version!=='daily-compiler-state-v1') throw new Error('migration_state_schema');
  if(state?.state!=='SHADOW_VERIFIED'||state?.stage!=='VERIFY') throw new Error('migration_requires_verified_shadow');
  if(state?.bundle?.status!=='BUNDLE_READY'||bundle?.status!=='BUNDLE_READY') throw new Error('migration_requires_bundle_ready');
  if(state?.edition_date!==bundle?.edition_date) throw new Error('migration_edition_mismatch');
  if(!Array.isArray(bundle?.images)||bundle.images.length!==6) throw new Error('migration_requires_six_existing_images');
  return {
    schema_version:'daily-compiler-d0-image-migration-plan-v1',
    edition_date:state.edition_date,
    execution_id:state.execution_id,
    branch:state.branch,
    source_state:'SHADOW_VERIFIED',
    semantic_fingerprint:semanticFingerprint(bundle),
    source_bundle_sha256:canonicalSha(bundle),
    legacy_images:bundle.images.map(x=>({story_id:x.story_id,path:x.path,sha256:x.sha256,git_blob_sha:x.git_blob_sha})),
    target_strategy:'d0_native_image_capsules',
    semantic_rework:0,
    new_execution_allowed:false,
    accepted_legacy_image_regeneration_allowed:false,
    reader_update_authorized:false,
    status:'WAITING_FOR_D0_ACTIVATION'
  };
}

export function verifyImageOnlyMigration({beforeState,beforeBundle,afterState,afterBundle}={}){
  const errors=[];
  if(beforeState?.execution_id!==afterState?.execution_id) errors.push('execution_changed');
  if(beforeState?.edition_date!==afterState?.edition_date||beforeBundle?.edition_date!==afterBundle?.edition_date) errors.push('edition_changed');
  if(semanticFingerprint(beforeBundle)!==semanticFingerprint(afterBundle)) errors.push('semantic_rework_detected');
  if(afterBundle?.image_system?.strategy!=='d0_native_image_capsules') errors.push('d0_image_system_missing');
  if(!Array.isArray(afterBundle?.images)||afterBundle.images.length!==6) errors.push('d0_six_images_required');
  const beforeByStory=new Map((beforeBundle?.images||[]).map(x=>[x.story_id,x]));
  const stories=new Set();
  for(const image of afterBundle?.images||[]){
    if(!image?.story_id||stories.has(image.story_id)) errors.push('d0_story_identity_invalid');
    stories.add(image?.story_id);
    if(image?.image_system!=='d0_native_image_capsules'||image?.accepted!==true||image?.accepted_locked!==true) errors.push('d0_image_not_locked:'+String(image?.story_id));
    const old=beforeByStory.get(image?.story_id);
    if(!old) errors.push('d0_story_not_in_original:'+String(image?.story_id));
    else if(old.sha256===image.sha256) errors.push('d0_image_not_replaced:'+image.story_id);
  }
  if(stories.size!==6) errors.push('d0_unique_story_count');
  const semanticRework=afterBundle?.producer_receipt?.semantic_rework;
  if(semanticRework!==0) errors.push('semantic_rework_counter_nonzero');
  return {
    schema_version:'daily-compiler-d0-image-migration-verification-v1',
    result:errors.length?'FAIL':'PASS',
    edition_date:beforeState?.edition_date??null,
    execution_id:beforeState?.execution_id??null,
    semantic_fingerprint_before:semanticFingerprint(beforeBundle||{}),
    semantic_fingerprint_after:semanticFingerprint(afterBundle||{}),
    semantic_rework:semanticRework??null,
    errors:[...new Set(errors)]
  };
}


export function buildMigratedState({beforeState,beforeBundle,afterBundle,bundleText,updatedAt=new Date().toISOString()}={}){
  if(typeof bundleText!=='string'||bundleText.length===0) throw new Error('migration_bundle_text_required');
  const verification=verifyImageOnlyMigration({beforeState,beforeBundle,afterState:beforeState,afterBundle});
  if(verification.result!=='PASS') throw new Error('image_only_migration_invalid:'+verification.errors.join(','));
  const sys=afterBundle.image_system||{};
  for(const key of ['set_plan_path','set_plan_sha256','set_review_path','set_review_sha256','acceptance_path','acceptance_sha256']){
    if(typeof sys[key]!=='string'||!sys[key]) throw new Error('migration_image_system_'+key);
  }
  const next=structuredClone(beforeState);
  next.state='BUNDLE_READY';
  next.stage='BUNDLE';
  next.updated_at=updatedAt;
  next.images={
    required:6,
    accepted:afterBundle.images.map(x=>x.story_id),
    strategy:'d0_native_image_capsules',
    phase:'ACCEPTED',
    set_plan_path:sys.set_plan_path,
    set_plan_sha256:sys.set_plan_sha256,
    set_review_path:sys.set_review_path,
    set_review_sha256:sys.set_review_sha256,
    acceptance_path:sys.acceptance_path,
    acceptance_sha256:sys.acceptance_sha256
  };
  next.bundle={status:'BUNDLE_READY',digest:sha256(bundleText)};
  next.last_error=null;
  next.retryable=false;
  delete next.preview;
  delete next.reader_parity;
  return {state:next,verification,bundle_digest:next.bundle.digest};
}

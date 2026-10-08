import {isDeepStrictEqual} from 'node:util';
import {sha256,canonicalSha,hex} from '../image-capsules/util.mjs';
import {validateCorrection} from './corrections.mjs';

export const CORRECTION_REVISION_SCHEMA='daily-compiler-correction-revision-v1';
const need=(ok,message)=>{if(!ok) throw new Error(message);};
const same=(a,b)=>isDeepStrictEqual(a,b);
const json=(text,label)=>{need(typeof text==='string'&&text.length>0,label+'_text_required');try{return JSON.parse(text);}catch{throw new Error(label+'_json_required');}};

export function correctionRevisionId(c){return c.revision_id||`${c.correction_id}:r${c.correction_revision}`;}
export function correctionRequestSha(c){
  // Workflow status and receipt location can advance without changing the request.
  const {status,verification_receipt_path,...request}=c;
  return canonicalSha(request);
}
export function safeCorrectionAssetPath(value){
  return typeof value==='string'&&value.length>0&&!value.startsWith('/')&&!/[\\\s:#?%\0]/.test(value)&&!value.split('/').some(p=>!p||p==='.'||p==='..');
}
export function correctionAssetManifest(bundle){
  const assets=(bundle.images||[]).map(image=>Object.fromEntries(['story_id','path','sha256','git_blob_sha','bytes','width','height','format','accepted','accepted_locked'].filter(k=>image[k]!==undefined).map(k=>[k,structuredClone(image[k])])));
  return {sha256:canonicalSha(assets),assets};
}

export function validateImageSystemUpdate(before,after){
  need(before&&after&&before.strategy===after.strategy&&before.contract_version===after.contract_version,'edition_strategy_immutable');
  const pairs=['acceptance_manifest','ingest_handoff','work_porter_receipt','canonical_reviews','set_plan','set_review','acceptance'];
  const fields=new Set(pairs.flatMap(key=>[key+'_path',key+'_sha256']));
  for(const key of new Set([...Object.keys(before),...Object.keys(after)])) if(!fields.has(key)) need(same(before[key],after[key]),'edition_strategy_immutable');
  for(const key of pairs){
    const p=key+'_path',h=key+'_sha256';
    if(before[p]!==undefined||before[h]!==undefined||after[p]!==undefined||after[h]!==undefined){
      need(safeCorrectionAssetPath(after[p])&&hex(after[h],64),'correction_image_system_reference');
      if(before[h]!==after[h]) need(before[p]!==after[p],'correction_versioned_evidence_required');
    }
  }
  return {before:structuredClone(before),after:structuredClone(after)};
}

function replaceAt(array,index,value,label){
  need(Array.isArray(array)&&Number.isInteger(index)&&index>=0&&index<array.length&&value&&typeof value==='object','correction_target_'+label);
  const out=structuredClone(array);out[index]=structuredClone(value);return out;
}
export function validateImageCorrectionMetadata({bundle,correction,imageSystem}){
  const id=correction.target?.story_id,image=correction.replacement?.image;
  const old=bundle.images?.find(x=>x.story_id===id);
  need(old&&bundle.stories?.some(x=>x.id===id)&&image?.story_id===id,'correction_image_target');
  if(correction.replacement?.image_system) validateImageSystemUpdate(bundle.image_system,correction.replacement.image_system);
  need(Object.keys(correction.replacement||{}).every(k=>['image','image_system'].includes(k)),'correction_image_scope');
  need(image.accepted===true&&image.accepted_locked===true,'image_not_locked');
  need(hex(image.sha256,64)&&hex(image.git_blob_sha,40),'correction_image_identity');
  need(safeCorrectionAssetPath(image.path)&&image.path.endsWith('.png'),'unsafe_asset_path');
  const system=imageSystem||correction.replacement?.image_system||bundle.image_system;
  if(image.image_system==='d1_work_browser_fresh_chat'){
    // The existing full canonical-review manifest is authoritative for current
    // D1. A duplicated inline PASS flag is neither needed nor sufficient.
    need(system?.strategy===image.image_system&&safeCorrectionAssetPath(system.canonical_reviews_path)&&hex(system.canonical_reviews_sha256,64),'canonical_visual_review');
    if(image.visual_review) need(image.visual_review.result==='PASS'&&image.visual_review.reviewed_sha256===image.sha256,'canonical_visual_review');
  }else{
    need(image.visual_review?.result==='PASS'&&image.visual_review.reviewed_sha256===image.sha256,'canonical_visual_review');
    need(image.visual_review.quality_gate_location==='fresh_regular_chat_per_story','story_chat_review_required');
  }
  // Replacing image bytes must not silently change the edition's approved strategy.
  need((image.image_system??null)===(old.image_system??null),'edition_strategy_immutable');
  const prior=bundle.corrections?.find(c=>c.correction_id===correction.correction_id);
  if(prior){
    need(prior.request_sha256===correctionRequestSha(correction),'correction_id_conflict');
    need(same(old,image),'correction_replay_conflict');
    return {old,image,unchanged:true};
  }
  need(hex(correction.target?.expected_sha256,64)&&correction.target.expected_sha256===old.sha256,'stale_image');
  // A same-byte transport retry preserves the existing accepted record and path.
  if(image.sha256===old.sha256) return {old,image,unchanged:true};
  need(image.path!==old.path&&!bundle.images.some(i=>i.path===image.path),'versioned_asset_path_required');
  return {old,image,unchanged:false};
}

export function applyCorrectionToBundle(bundle,correction){
  const errors=validateCorrection(correction);
  need(!errors.length,'correction_invalid:'+errors.join(','));
  need(correction.status==='VALIDATED','correction_must_be_validated');
  need(bundle?.edition_date===correction.edition_date,'correction_edition_mismatch');
  const out=structuredClone(bundle),t=correction.target||{},r=correction.replacement||{};
  const prior=out.corrections?.find(c=>c.correction_id===correction.correction_id);
  if(correction.correction_type==='replace_image'){
    const check=validateImageCorrectionMetadata({bundle,correction});
    if(check.unchanged){
      if(r.image_system) need(same(r.image_system,bundle.image_system),'correction_evidence_only_retry_forbidden');
      return out;
    }
    out.images[out.images.findIndex(x=>x.story_id===t.story_id)]=structuredClone(r.image);
    if(r.image_system) out.image_system=structuredClone(r.image_system);
  }else{
    if(prior){need(prior.request_sha256===correctionRequestSha(correction),'correction_id_conflict');return out;}
    if(correction.correction_type==='replace_article'){
      const i=out.stories.findIndex(x=>x.id===t.story_id);
      need(i>=0&&r.story?.id===t.story_id,'correction_story_target');
      // Permanent identity is also the rating/share/comment identity.
      for(const k of ['id','permanent_route']) need(r.story[k]===out.stories[i][k],'correction_story_identity');
      out.stories[i]=structuredClone(r.story);
      if(Array.isArray(r.book_mappings)) out.book_mappings=structuredClone(r.book_mappings);
    }else if(correction.correction_type==='replace_video'){
      out.videos=replaceAt(out.videos,t.index,r.video,'video');
    }else if(correction.correction_type==='replace_podcast'){
      out.podcasts=replaceAt(out.podcasts,t.index,r.podcast,'podcast');
    }else if(correction.correction_type==='replace_watchlist_item'){
      const state=t.state;
      need(Array.isArray(out.watchlist?.[state]),'correction_watchlist_state');
      const i=out.watchlist[state].findIndex(x=>x.topic===t.topic);
      need(i>=0&&r.item,'correction_watchlist_target');
      out.watchlist[state][i]=structuredClone(r.item);
    }else if(correction.correction_type==='add_watchlist_item'){
      const state=r.state;
      need(Array.isArray(out.watchlist?.[state])&&r.item,'correction_watchlist_add');
      need(!out.watchlist[state].some(x=>x.topic===r.item.topic),'correction_watchlist_duplicate');
      out.watchlist[state].push(structuredClone(r.item));
    }else if(correction.correction_type==='remove_watchlist_item'){
      const state=t.state;
      need(Array.isArray(out.watchlist?.[state]),'correction_watchlist_state');
      const before=out.watchlist[state].length;
      out.watchlist[state]=out.watchlist[state].filter(x=>x.topic!==t.topic);
      need(out.watchlist[state].length!==before,'correction_watchlist_target');
    }
  }
  out.corrections=[...(out.corrections||[]),{
    correction_id:correction.correction_id,correction_type:correction.correction_type,
    correction_revision:correction.correction_revision,revision_id:correctionRevisionId(correction),
    request_sha256:correctionRequestSha(correction),
    ...(correction.correction_type==='replace_image'?{expected_previous_sha256:t.expected_sha256}:{}),
    reason:correction.reason,preserve_original:true
  }];
  return out;
}

export function buildCorrectionRecompileState({beforeState,beforeBundle,beforeBundleText,baseBundleText=beforeBundleText,correctedBundle,correctedBundleText,correction,corrections=correction?[correction]:[],previousRevision=null,revisionId,updatedAt=new Date().toISOString()}={}){
  need(beforeState?.state==='SHADOW_VERIFIED'&&beforeState?.stage==='VERIFY','correction_requires_verified_edition');
  need(same(json(beforeBundleText,'previous_bundle'),beforeBundle),'correction_previous_bundle_text_mismatch');
  need(same(json(correctedBundleText,'corrected_bundle'),correctedBundle),'correction_corrected_bundle_text_mismatch');
  need(!same(beforeBundle,correctedBundle),'correction_no_changes');
  const previousIds=new Set((beforeBundle.corrections||[]).map(c=>c.correction_id));
  const appliedIds=new Set((correctedBundle.corrections||[]).filter(c=>!previousIds.has(c.correction_id)).map(c=>c.correction_id));
  corrections=corrections.filter(c=>appliedIds.has(c.correction_id));
  need(corrections.length>0,'correction_requests_required');
  const revisions=corrections.map(c=>c.correction_revision);
  const scopes=new Set(corrections.map(c=>c.semantic_scope));
  need(scopes.size===1,'correction_mixed_scope');
  const revision={
    schema_version:CORRECTION_REVISION_SCHEMA,edition_date:beforeState.edition_date,
    revision_id:revisionId||correctionRevisionId(corrections[0]),correction_ids:corrections.map(c=>c.correction_id),
    correction_revision:Math.max(...revisions),status:'VALIDATED',created_at:updatedAt,
    base_run:structuredClone(beforeState),original_bundle_text:baseBundleText,
    original_bundle_sha256:sha256(baseBundleText),previous_bundle_text:beforeBundleText,
    expected_previous_bundle_sha256:sha256(beforeBundleText),
    predecessor_revision:previousRevision?{sha256:canonicalSha(previousRevision),record:structuredClone(previousRevision)}:null,
    bundle:{status:'BUNDLE_READY',digest:sha256(correctedBundleText)},
    corrections:structuredClone(corrections),semantic_scope:[...scopes][0],
    image_system_update:same(beforeBundle.image_system,correctedBundle.image_system)?null:validateImageSystemUpdate(beforeBundle.image_system,correctedBundle.image_system),
    selected_story_ids:corrections.filter(c=>c.correction_type==='replace_image'&&beforeBundle.images.find(image=>image.story_id===c.target.story_id)?.sha256!==correctedBundle.images.find(image=>image.story_id===c.target.story_id)?.sha256).map(c=>c.target.story_id),
    superseded_asset_manifest:correctionAssetManifest(beforeBundle),new_asset_manifest:correctionAssetManifest(correctedBundle),
    preserve_original:true,new_execution_allowed:false,verification_receipt_path:null,verification_receipt_sha256:null
  };
  validateCorrectionRevision({revision,bundle:correctedBundle,bundleText:correctedBundleText});
  return revision;
}

export function validateCorrectionRevision({revision,bundle,bundleText,baseState=revision?.base_run,baseBundleText=revision?.original_bundle_text,_depth=0}={}){
  need(_depth<64,'correction_revision_chain_limit');
  need(revision?.schema_version===CORRECTION_REVISION_SCHEMA,'correction_revision_schema');
  need(['VALIDATED','DEPLOYED','LIVE_VERIFIED'].includes(revision.status),'correction_revision_status');
  need(revision.preserve_original===true&&revision.new_execution_allowed===false,'correction_revision_invariants');
  need(!Object.hasOwn(revision,'state')&&!Object.hasOwn(revision,'stage')&&!Object.hasOwn(revision,'execution_id'),'correction_revision_is_not_base_run');
  need(baseState?.schema_version==='daily-compiler-state-v1'&&baseState.state==='SHADOW_VERIFIED'&&baseState.stage==='VERIFY'&&typeof baseState.execution_id==='string'&&baseState.execution_id.length>0,'correction_requires_verified_edition');
  need(same(revision.base_run,baseState),'correction_base_state_mismatch');
  const baseBundle=json(baseBundleText,'original_bundle');
  need(baseBundleText===revision.original_bundle_text&&hex(revision.original_bundle_sha256,64)&&sha256(baseBundleText)===revision.original_bundle_sha256&&baseState.bundle?.digest===revision.original_bundle_sha256,'correction_original_bundle_digest');
  const previousBundle=json(revision.previous_bundle_text,'previous_bundle');
  need(sha256(revision.previous_bundle_text)===revision.expected_previous_bundle_sha256,'correction_previous_bundle_digest');
  need(same(json(bundleText,'corrected_bundle'),bundle)&&revision.bundle?.status==='BUNDLE_READY'&&revision.bundle.digest===sha256(bundleText),'correction_bundle_digest');
  need([baseState.edition_date,baseBundle.edition_date,previousBundle.edition_date,bundle.edition_date].every(x=>x===revision.edition_date),'correction_edition_identity');
  need(typeof revision.revision_id==='string'&&revision.revision_id.length>0&&typeof revision.created_at==='string'&&Number.isFinite(Date.parse(revision.created_at)),'correction_revision_identity');
  const verification_receipts=[],image_system_updates=[],historical_assets=correctionAssetManifest(baseBundle).assets;
  if(revision.expected_previous_bundle_sha256!==revision.original_bundle_sha256){
    const predecessor=revision.predecessor_revision;
    need(predecessor?.sha256===canonicalSha(predecessor?.record)&&predecessor.record?.status==='LIVE_VERIFIED'&&typeof predecessor.record.verification_receipt_path==='string'&&predecessor.record.verification_receipt_path.length>0&&hex(predecessor.record.verification_receipt_sha256,64),'correction_predecessor_proof_required');
    need(predecessor.record.revision_id!==revision.revision_id&&revision.correction_revision>predecessor.record.correction_revision,'correction_revision_lineage');
    const validatedPredecessor=validateCorrectionRevision({revision:predecessor.record,bundle:previousBundle,bundleText:revision.previous_bundle_text,baseState,baseBundleText,_depth:_depth+1});
    verification_receipts.push(...validatedPredecessor.verification_receipts);
    historical_assets.push(...validatedPredecessor.historical_assets);
    image_system_updates.push(...validatedPredecessor.image_system_updates);
  }else need(revision.predecessor_revision===null,'correction_unexpected_predecessor');
  need(Array.isArray(revision.corrections)&&revision.corrections.length>0,'correction_requests_required');
  need(same(revision.correction_ids,revision.corrections.map(c=>c.correction_id))&&new Set(revision.correction_ids).size===revision.correction_ids.length,'correction_request_identity');
  need(same((bundle.corrections||[]).slice((previousBundle.corrections||[]).length).map(c=>c.correction_id),revision.correction_ids),'correction_added_identity');
  need(Number.isInteger(revision.correction_revision)&&revision.correction_revision===Math.max(...revision.corrections.map(c=>c.correction_revision)),'correction_revision_number');
  need(revision.corrections.every(c=>c.semantic_scope===revision.semantic_scope),'correction_mixed_scope');
  const changedStoryIds=revision.corrections.filter(c=>c.correction_type==='replace_image'&&previousBundle.images.find(image=>image.story_id===c.target.story_id)?.sha256!==bundle.images.find(image=>image.story_id===c.target.story_id)?.sha256).map(c=>c.target.story_id);
  need(same(revision.selected_story_ids,changedStoryIds)&&new Set(revision.selected_story_ids).size===revision.selected_story_ids.length,'correction_selected_scope');
  let expected=structuredClone(previousBundle);
  for(const c of revision.corrections) expected=applyCorrectionToBundle(expected,c);
  if(!same(previousBundle.image_system,bundle.image_system)){
    need(revision.semantic_scope==='image_only'&&same(revision.image_system_update,validateImageSystemUpdate(previousBundle.image_system,bundle.image_system)),'correction_image_system_scope');
    expected.image_system=structuredClone(revision.image_system_update.after);
    image_system_updates.push({...structuredClone(revision.image_system_update),selected_story_ids:revision.selected_story_ids,edition_date:revision.edition_date});
  }else need(revision.image_system_update===null,'correction_unexpected_image_system_update');
  need(!same(expected,previousBundle)&&same(expected,bundle),'correction_scope_mismatch');
  need(same(revision.superseded_asset_manifest,correctionAssetManifest(previousBundle))&&same(revision.new_asset_manifest,correctionAssetManifest(bundle)),'correction_asset_manifest_mismatch');
  for(const image of bundle.images||[]){
    const old=previousBundle.images?.find(x=>x.story_id===image.story_id);
    if(old&&image.sha256!==old.sha256) need(!historical_assets.some(x=>x.path===image.path),'versioned_asset_path_required');
  }
  historical_assets.push(...revision.new_asset_manifest.assets);
  if(revision.status==='LIVE_VERIFIED'){
    need(safeCorrectionAssetPath(revision.verification_receipt_path)&&hex(revision.verification_receipt_sha256,64),'correction_verification_receipt_required');
    verification_receipts.push({path:revision.verification_receipt_path,sha256:revision.verification_receipt_sha256,edition_date:revision.edition_date,revision_id:revision.revision_id,bundle_sha256:revision.bundle.digest,original_bundle_sha256:revision.original_bundle_sha256,revision:structuredClone(revision)});
  }
  return {baseState,baseBundle,previousBundle,corrections:revision.corrections,verification_receipts,historical_assets,image_system_updates};
}

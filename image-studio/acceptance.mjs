import {nonempty,hex,canonicalSha} from '../image-capsules/util.mjs';

export const D1_ACCEPTANCE_SCHEMA='daily-compiler-d1-image-acceptance-manifest-v2';
export const D1_WORK_SCOPE='IMAGE_BROWSER_ORCHESTRATION_AND_INGEST';

export function validateD1AcceptanceManifest(manifest={}){
  const errors=[];
  if(manifest?.schema_version!==D1_ACCEPTANCE_SCHEMA) errors.push('d1_manifest_schema');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(manifest?.edition_date||'')) errors.push('d1_manifest_edition_date');
  if(!nonempty(manifest?.studio_session_id)) errors.push('d1_manifest_session');
  if(!nonempty(manifest?.accepted_at)) errors.push('d1_manifest_accepted_at');
  if(manifest?.quality_gate_location!=='fresh_regular_chat_per_story') errors.push('d1_quality_gate_location');
  if(manifest?.github_visual_rereview_required!==false) errors.push('d1_github_visual_rereview_forbidden');
  if(manifest?.owner_intervention!==false) errors.push('d1_owner_intervention');

  const set=manifest?.set_review||{};
  if(set.result!=='PASS'||set.unique_compositions!==6||set.unique_byte_streams!==6||set.unique_story_chats!==6||set.distinct_layouts<4||set.distinct_mechanisms<4) errors.push('d1_set_review');

  const images=Array.isArray(manifest?.images)?manifest.images:[];
  if(images.length!==6) errors.push('d1_exactly_six_images');
  const stories=new Set(),chats=new Set(),assets=new Set(),files=new Set(),hashes=new Set(),comps=new Set();
  for(const image of images){
    if(!nonempty(image?.story_id)||stories.has(image.story_id)) errors.push('d1_story_identity'); stories.add(image?.story_id);
    if(!nonempty(image?.chat_session_id)||chats.has(image.chat_session_id)) errors.push('d1_chat_session_identity'); chats.add(image?.chat_session_id);
    if(!nonempty(image?.cloud_asset_id)||assets.has(image.cloud_asset_id)) errors.push('d1_cloud_asset_identity'); assets.add(image?.cloud_asset_id);
    if(!nonempty(image?.filename)||!image.filename.endsWith('.png')||image.filename.includes('/')||files.has(image.filename)) errors.push('d1_filename'); files.add(image?.filename);
    if(image?.width!==1200||image?.height!==630||image?.format!=='png') errors.push('d1_dimensions_format');
    if(!Number.isInteger(image?.bytes)||image.bytes<1) errors.push('d1_bytes');
    if(!hex(image?.sha256,64)||hashes.has(image.sha256)) errors.push('d1_sha256'); hashes.add(image?.sha256);
    if(!nonempty(image?.composition_signature)||comps.has(image.composition_signature)) errors.push('d1_composition_signature'); comps.add(image?.composition_signature);
    if(!Array.isArray(image?.visible_text_allowlist)||new Set(image.visible_text_allowlist).size!==image.visible_text_allowlist.length) errors.push('d1_visible_text_allowlist');
    if(!Number.isInteger(image?.attempt)||image.attempt<1||image.attempt>4) errors.push('d1_attempt');
    if(image?.visual_acceptance!=='PASS'||image?.accepted_locked!==true) errors.push('d1_acceptance');
  }
  if(stories.size!==6) errors.push('d1_unique_stories');
  if(chats.size!==6) errors.push('d1_unique_story_chats');
  if(hashes.size!==6) errors.push('d1_unique_hashes');
  if(comps.size!==6) errors.push('d1_unique_compositions');
  return [...new Set(errors)];
}

export function assertD1AcceptanceManifest(manifest={}){
  const errors=validateD1AcceptanceManifest(manifest);
  if(errors.length) throw new Error('D1 acceptance manifest invalid: '+errors.join(';'));
  return {manifest_sha256:canonicalSha(manifest),images:manifest.images};
}

export function buildD1IngestPlan(manifest={},handoff={}){
  const verified=assertD1AcceptanceManifest(manifest);
  if(handoff?.schema_version!=='daily-compiler-d1-ingest-handoff-v2') throw new Error('D1 ingest handoff schema invalid');
  if(handoff?.manifest_sha256!==verified.manifest_sha256) throw new Error('D1 ingest handoff manifest mismatch');
  if(handoff?.scope!==D1_WORK_SCOPE||handoff?.visual_rereview_required!==false||handoff?.image_generation_allowed!==false) throw new Error('D1 ingest handoff scope invalid');
  if(!Array.isArray(handoff?.items)||handoff.items.length!==6) throw new Error('D1 ingest handoff items invalid');
  const map=new Map(handoff.items.map(x=>[x.story_id,x]));
  if(map.size!==6) throw new Error('D1 ingest handoff story identity invalid');
  return {
    schema_version:'daily-compiler-d1-ingest-plan-v2',edition_date:manifest.edition_date,studio_session_id:manifest.studio_session_id,
    manifest_sha256:verified.manifest_sha256,handoff_sha256:canonicalSha(handoff),repository:handoff.repository,branch:handoff.branch,
    execution_id:handoff.execution_id,visual_quality_review_required:false,image_generation_allowed:false,
    items:manifest.images.map(x=>{
      const h=map.get(x.story_id);
      if(!h||h.filename!==x.filename||typeof h.target_path!=='string'||!h.target_path) throw new Error('D1 ingest handoff binding invalid: '+x.story_id);
      return {story_id:x.story_id,chat_session_id:x.chat_session_id,cloud_asset_id:x.cloud_asset_id,filename:x.filename,target_path:h.target_path,
        expected_sha256:x.sha256,expected_bytes:x.bytes,width:x.width,height:x.height};
    })
  };
}

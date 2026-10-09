// Owner-authorized *one-time* October 9 semantic recovery from immutable past work.
// No source research, image generation, scheduled ChatGPT task, or acceptance fabrication.
// Run only after original source and media evidence have been independently reconciled.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {OCT9_RECOVERY_BRANCH,OCT9_EXCEPTION_VERSION,OCT9_FAILED_HEAD,OCT9_FAILED_EXECUTION,OCT9_ORIGINAL_EDITORIAL_BLOB} from '../compiler/oct9-owner-exception.mjs';

const fail=s=>{throw new Error('oct9-owner-recovery:'+s);};
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
const text=v=>JSON.stringify(v,null,2)+'\n';
const date='2026-10-09';
const placeholder='illustration-pending-1200x630-v1';
const evidenceMethod=new Set(['publisher_main_text','publisher_verified_metadata','independent_full_text']);
const eq=(a,b)=>a===b;
function url(v){try{const u=new URL(v);if(u.protocol!=='https:'||!u.hostname||u.username||u.password)fail('invalid_source_https_url');return u.href;}catch{fail('invalid_source_https_url');}}
function requireString(v,label,min=8){if(typeof v!=='string'||v.trim().length<min)fail(label);}
function checkedSource(story,sourceReceipt){
  if(sourceReceipt.story_id!==story.id||url(sourceReceipt.source_url)!==url(story.source.url)||
    sourceReceipt.source_published_at!==story.source.published_at)fail('source_identity_or_original_date_drift:'+story.id);
  if(sourceReceipt.status!=='verified'||sourceReceipt.full_source_read!==true||
    !evidenceMethod.has(sourceReceipt.method)||!Number.isFinite(Date.parse(sourceReceipt.read_at)))fail('unverified_full_source_read:'+story.id);
  requireString(sourceReceipt.scope,'source_scope',30);
  if(typeof story.image_alt_intent!=='string'||story.image_alt_intent.length<28)fail('missing_original_visual_intent');
  return {
    status:'verified',full_source_read:true,method:sourceReceipt.method,read_at:sourceReceipt.read_at,
    scope:sourceReceipt.scope
  };
}
function checkedMedia(record,evidence){
  if(url(record.url)!==url(evidence.url)||record.original_date!==evidence.date||
    record.verified!==true||evidence.verified_metadata!==true||
    !Number.isFinite(evidence.duration_seconds)||evidence.duration_seconds<1||
    Math.abs(record.duration_minutes*60-evidence.duration_seconds)>0.5)fail('media_original_publisher_identity_or_runtime_drift:'+record.title);
  const method=evidence.identity_method||evidence.method;
  requireString(method,'real_media_verification_method',35);
  return {
    identity_verified:true,duration_verified:true,
    runtime_source_url:evidence.url,checked_at:evidence.checked_at_utc,
    method:'verified_original_publisher_and_independent_metadata',
    verification_scope:method,
    audiovisual_playback_claimed:false
  };
}
export function buildOct9OwnerRecovery({originalSelection,originalSemantic,originalMedia,verification,now='2026-10-09T20:30:00.000Z'}){
  if(verification?.schema_version!=='daily-compiler-oct9-owner-source-revalidation-v1'||
    verification.owner_authorized!==true||
    verification.scope!=='publish_oct9_placeholders_and_provide_external_work_handoff_only'||
    verification.failed_branch_head!==OCT9_FAILED_HEAD||
    verification.historical_failed_execution!==OCT9_FAILED_EXECUTION||
    verification.normal_primary_schedule_unchanged!==true||
    verification.work_app_not_invoked!==true||
    verification.native_images_generated!==0||
    verification.existing_accepted_images_replaced!==0)
      fail('owner_scope_or_failed_history_mismatch');
  if(originalSelection.edition_date!==date||originalSemantic.edition_date!==date||
    originalMedia.edition_date!==date||originalSelection.editorial_result!=='PASS'&&
      originalSelection.editorial_result?.result!=='PASS')fail('not_verified_oct9_source');
  if(originalSelection.execution_id!==OCT9_FAILED_EXECUTION||
    originalSemantic.execution_id!==OCT9_FAILED_EXECUTION||
    originalSelection.selected?.length!==6||originalSemantic.stories?.length!==6||
    originalSemantic.videos?.length!==2||originalSemantic.podcasts?.length!==2||
    originalSemantic.book_mappings?.length<4||verification.sources?.length!==6)fail('incomplete_original_semantics');
  if(!originalMedia.videos||originalMedia.videos.length!==2||
    !originalMedia.podcasts||originalMedia.podcasts.length!==2||
    originalMedia.checked_at_utc!==verification.original_media_evidence_checked_at)fail('media_archive_not_bound');
  if(!Number.isFinite(Date.parse(now)))fail('recovery_time_invalid');
  const selected=new Map(originalSelection.selected.map(s=>[s.id,s]));
  const sourceMap=new Map(verification.sources.map(s=>[s.story_id,s]));
  if(selected.size!==6||sourceMap.size!==6)fail('duplicate_selected_or_source_identity');
  const stories=originalSemantic.stories.map(s=>{
    const lock=selected.get(s.id),receipt=sourceMap.get(s.id);
    if(!lock||!receipt||url(lock.url)!==url(s.source.url)||
      s.focus!==lock.focus||s.source.published_at!==lock.date||
      !s.headline||!s.summary||!s.why_it_matters||!s.permanent_route)fail('archived_story_changed:'+s.id);
    const r=structuredClone(s);
    r.source={...r.source,read_evidence:checkedSource(s,receipt)};
    if(r.agent_skills===true){
      const skillEvidence=verification.agent_skills_evidence;
      if(skillEvidence?.story_id!==s.id || url(skillEvidence.primary_source_url)!==url(s.source.url))
        fail('reusable_skills_evidence_not_source_bound');
      requireString(skillEvidence.explanation,'reusable_agent_skills_evidence',70);
      r.agent_skills_evidence=skillEvidence.explanation;
    }
    return r;
  });
  if(stories.filter(s=>s.agent_skills===true).length!==1)fail('exactly_one_real_agent_skills_story_required');
  for(const focus of ['Technical AI Engineering','Applied Generative AI for Knowledge Workers','Agents for Everyone']){
    if(stories.filter(s=>s.focus===focus).length!==2)fail('focus_balance_changed');
  }
  const videos=originalSemantic.videos.map(v=>{
    const e=originalMedia.videos.find(x=>x.url===v.url);
    if(!e)fail('video_missing_original_verification:'+v.title);
    return {...structuredClone(v),verification:checkedMedia(v,{...e,checked_at_utc:originalMedia.checked_at_utc})};
  });
  const podcasts=originalSemantic.podcasts.map(v=>{
    const e=originalMedia.podcasts.find(x=>x.url===v.url);
    if(!e)fail('podcast_missing_original_verification:'+v.title);
    return {...structuredClone(v),verification:checkedMedia(v,{...e,checked_at_utc:originalMedia.checked_at_utc})};
  });
  if(new Set(podcasts.map(x=>x.source)).size!==2)fail('podcast_publishers_not_diverse');
  const images=stories.map(s=>({story_id:s.id,status:'pending',accepted:false,placeholder_id:placeholder,alt:s.image_alt_intent}));
  const bundle={
    schema_version:'daily-compiler-edition-bundle-v1',edition_date:date,status:'BUNDLE_READY',
    editorial_contract_version:'daily-compiler-editorial-contract-v1',
    stories,videos,podcasts,
    watchlist:structuredClone(originalSemantic.watchlist),
    book_mappings:structuredClone(originalSemantic.book_mappings),
    images,image_representation:{status:'images_pending',placeholder_id:placeholder,width:1200,height:630},
    producer_receipt:{
      schema_version:'daily-compiler-oct9-owner-recovery-producer-v1',
      result:'PASS',owner_intervention:true,scheduled_execution:false,
      exception_contract:OCT9_EXCEPTION_VERSION,historical_failed_execution_reopened:false,
      work_used:false,codex_used:false,paid_model_api_used:false,
      local_computer_used:false,accepted_image_regenerations:0,
      source_archive_branch:'shadow/2026-10-09',source_archive_commit:OCT9_FAILED_HEAD,
      original_editorial_blob_sha:OCT9_ORIGINAL_EDITORIAL_BLOB,
      source_read_evidence_original_and_revalidated:true,
      media_verified_from_original_metadata_not_claimed_as_direct_playback:true,
      actual_new_semantic_story_research_or_rewrite:false,
      old_failed_execution_mutated:false
    }
  };
  const bundleBytes=Buffer.from(text(bundle));
  const state={
    schema_version:'daily-compiler-state-v1',
    edition_date:date,execution_id:'daily-compiler-oct9-owner-placeholder-recovery-r1',
    branch:OCT9_RECOVERY_BRANCH,state:'BUNDLE_READY',stage:'BUNDLE',
    started_at:now,updated_at:now,
    editorial_bundle:{status:'complete',digest:'git-blob-sha1:'+OCT9_ORIGINAL_EDITORIAL_BLOB},
    images:{required:6,accepted:[],mode:'images_pending',placeholder_id:placeholder},
    bundle:{status:'BUNDLE_READY',digest:sha(bundleBytes)},
    last_error:null,retryable:false,
    one_time_recovery:{
      schema_version:OCT9_EXCEPTION_VERSION,owner_authorized:true,
      owner_authorization_scope:'publish_oct9_placeholders_and_provide_external_work_handoff_only',
      historical_branch:'shadow/2026-10-09',historical_commit_sha:OCT9_FAILED_HEAD,
      historical_execution_id:OCT9_FAILED_EXECUTION,historical_terminal_state:'SHADOW_FAILED',
      historical_retryable:false,historical_accepted_images:0,
      historical_editorial_blob_sha:OCT9_ORIGINAL_EDITORIAL_BLOB,
      normal_schedule_unchanged:true,not_an_unattended_release_one_proof:true,image_generation_disabled:true
    }
  };
  return {bundle,state,bundleBytes,provenance:{
    schema_version:'daily-compiler-oct9-owner-placeholder-rescue-evidence-v1',
    source_archive_commit:OCT9_FAILED_HEAD,
    source_editorial_blob:OCT9_ORIGINAL_EDITORIAL_BLOB,
    source_semantic_content_sha256:sha(Buffer.from(text(originalSemantic))),
    source_media_evidence_sha256:sha(Buffer.from(text(originalMedia))),
    verified_source_ids:stories.map(s=>s.id),verified_videos:2,verified_podcasts:2,
    images_generated:0,all_six_figures_are_pending:true,scheduled_release_one_proof:false,
    owner_intervention:true,normal_schedule_unchanged:true,
    original_historical_execution_preserved:true,bundle_digest:state.bundle.digest,
    source_evidence_receipt_digest:sha(Buffer.from(text(verification)))
  }};
}
function main(){
  const [lockPath,semanticPath,mediaPath,verificationPath,outputRoot]=process.argv.slice(2);
  if(!outputRoot)fail('usage: node scripts/prepare-oct9-owner-recovery.mjs <original-selection> <original-semantic> <original-media> <revalidation> <output-directory>');
  const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
  const {bundle,state,provenance}=buildOct9OwnerRecovery({
    originalSelection:read(lockPath),originalSemantic:read(semanticPath),
    originalMedia:read(mediaPath),verification:read(verificationPath),
    now:new Date().toISOString()
  });
  fs.mkdirSync(outputRoot,{recursive:true});
  for(const [name,item] of [['edition-bundle.json',bundle],['compiler-state.json',state],['owner-recovery-provenance.json',provenance]]){
    const f=path.join(outputRoot,name);
    if(fs.existsSync(f))fail('existing_exception_output_must_not_be_overwritten');
    fs.writeFileSync(f,text(item),{flag:'wx'});
  }
  console.log(JSON.stringify({result:'ONE_TIME_BUNDLE_READY',edition_date:date,
    execution_id:state.execution_id,stories:bundle.stories.length,
    images_pending:bundle.images.length,owner_intervention:true,
    bundle_sha256:state.bundle.digest,original_failure_immutable:true}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();

import {readImageProcessVersions} from './image-process-versions.mjs';
import {allowedPendingEditionBranch,isAuthorizedOct9Recovery} from '../compiler/oct9-owner-exception.mjs';
// Compiler-only, deterministic handoff generation. No image-generation or scheduling.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const IMAGE_JOB_SCHEMA='external-compiler-image-job-v1';
export const IMAGE_INDEX_SCHEMA='external-compiler-image-index-v1';
const BASE='https://gttome.github.io/Daily-AI-Brief-Compiler/';
const RAW='https://raw.githubusercontent.com/gttome/Daily-AI-Brief-Compiler/shadow-pages-history/site/image-jobs/';
const fail=message=>{throw new Error('external_image_job:'+message);};
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const json=value=>JSON.stringify(value,null,2)+'\n';
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const isSha=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
function checkedUrl(value,label){
  let u;try{u=new URL(value);}catch{fail(label+'_invalid_url');}
  if(u.protocol!=='https:'||!u.hostname||u.username||u.password||[...u.searchParams.keys()].some(k=>/token|secret|api.?key|password/i.test(k)))fail(label+'_unsafe_url');
  return u.href;
}
function checkedRoute(value,date){
  if(typeof value!=='string'||!value.startsWith('/stories/'+date+'/')||
    !/^\/stories\/\d{4}-\d{2}-\d{2}\/[a-z0-9-]+\/$/.test(value))fail('story_route_invalid');
  return value;
}
function validateInput({bundle,bundleBytes,state,sourceCommit,liveReceipt}){
  const date=bundle?.edition_date;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||date<='2026-10-08')fail('historic_or_invalid_edition');
  if(bundle.schema_version!=='daily-compiler-edition-bundle-v1'||bundle.status!=='BUNDLE_READY'||
    bundle.image_representation?.status!=='images_pending'||
    bundle.image_representation?.placeholder_id!=='illustration-pending-1200x630-v1'||
    bundle.image_representation?.width!==1200||bundle.image_representation?.height!==630||
    bundle.image_system)fail('not_an_honest_placeholder_bundle');
  if(state?.state!=='SHADOW_VERIFIED'||state.stage!=='VERIFY'||
    state.edition_date!==date||!allowedPendingEditionBranch({state,bundle})||
    state.images?.mode!=='images_pending'||state.images?.accepted?.length!==0||
    state.images?.placeholder_id!=='illustration-pending-1200x630-v1'||
    state.bundle?.digest!==hash(bundleBytes)||state.preview?.bundle_digest!==hash(bundleBytes)||
    state.reader_parity?.result!=='PASS')fail('not_a_verified_published_placeholder_execution');
  if(!isSha(sourceCommit))fail('source_commit_sha_required');
  if(liveReceipt?.result!=='PASS'||liveReceipt.mode!=='postdeploy'||liveReceipt.edition_date!==date||
    liveReceipt.oct8_protected_count!==17||liveReceipt.live_checked<17||
    !Array.isArray(liveReceipt.live_http_and_sha256)||liveReceipt.live_http_and_sha256.length<17)fail('independent_live_release_evidence_missing');
  if(!Array.isArray(bundle.stories)||bundle.stories.length!==6||
    !Array.isArray(bundle.images)||bundle.images.length!==6||
    !Array.isArray(bundle.videos)||bundle.videos.length!==2||
    !Array.isArray(bundle.podcasts)||bundle.podcasts.length!==2)fail('editorial_or_figure_count');
  const byId=new Map(),routes=new Set(),sourceUrls=new Set(),focusCounts=new Map();
  for(const story of bundle.stories){
    if(!story?.id||byId.has(story.id))fail('duplicate_story');
    const route=checkedRoute(story.permanent_route,date);
    if(routes.has(route))fail('duplicate_route');
    routes.add(route);byId.set(story.id,story);
    const url=checkedUrl(story.source?.url,'source');
    if(sourceUrls.has(url))fail('duplicate_source');sourceUrls.add(url);
    if(!story.source?.published_at||story.source?.read_evidence?.status!=='verified'||
      story.source.read_evidence.full_source_read!==true||
      !story.source.read_evidence.scope||!story.image_alt_intent||!story.summary||!story.why_it_matters)fail('incomplete_story_evidence');
    focusCounts.set(story.focus,(focusCounts.get(story.focus)||0)+1);
  }
  for(const f of ['Technical AI Engineering','Applied Generative AI for Knowledge Workers','Agents for Everyone']){
    if(focusCounts.get(f)!==2)fail('incorrect_focus_allocation');
  }
  const seen=new Set();
  for(const image of bundle.images){
    if(!byId.has(image.story_id)||seen.has(image.story_id)||
      image.status!=='pending'||image.accepted!==false||
      image.placeholder_id!=='illustration-pending-1200x630-v1'||
      image.alt!==byId.get(image.story_id).image_alt_intent||Object.keys(image).some(k=>!['story_id','status','accepted','placeholder_id','alt'].includes(k)))
      fail('pending_figure_identity_or_status');
    seen.add(image.story_id);
  }
  const roots=liveReceipt.live_http_and_sha256.map(row=>row.url);
  if(!roots.some(u=>u===BASE+'briefs/'+date+'/'))fail('dated_reader_not_in_live_receipt');
  for(const route of routes)if(!roots.includes(BASE+route.slice(1)))fail('permanent_story_not_in_live_receipt');
  return date;
}
// New v7 jobs infer original publication provenance ONLY from positive receipts.
// The source bundle/job bytes for historical editions must never be migrated.
export function positiveImageSourceProvenance({bundle,state}){
 const receipt=bundle?.producer_receipt;
 if(receipt?.edition_date!==bundle?.edition_date||
    receipt.execution_id!==state?.execution_id||
    receipt.result!=='PASS' ||
    typeof receipt.scheduled_execution!=='boolean')
  return {producer_mode:'unknown',unattended_schedule_proven:null,provenance_basis:'source_receipt_missing_or_ambiguous'};
 return {producer_mode:receipt.scheduled_execution?'scheduled':'continued',
   unattended_schedule_proven:receipt.scheduled_execution,
   provenance_basis:'original_immutable_bundle_producer_receipt',
   original_continuation_mode:receipt.continuation_mode??null};
}

export function buildExternalImageJob({bundleBytes,state,sourceCommit,liveReceipt}){
  if(!Buffer.isBuffer(bundleBytes))fail('original_bundle_exact_bytes_required');
  const bundle=JSON.parse(bundleBytes.toString('utf8'));
  const date=validateInput({bundle,bundleBytes,state,sourceCommit,liveReceipt});
  const sourceBundleSha=hash(bundleBytes);
  const rev7=readImageProcessVersions().image_starter_contract_version==='rev7';
  const provenance=rev7?positiveImageSourceProvenance({bundle,state}):null;
  return {
    schema_version:IMAGE_JOB_SCHEMA,
    edition_date:date,
    execution_id:state.execution_id,
    lifecycle:'PUBLISHED_PENDING',
    accepted_images:0,
    source:{
      branch:state.branch,
      one_time_owner_recovery:isAuthorizedOct9Recovery({state,bundle}),
      unattended_schedule_proven:rev7?provenance.unattended_schedule_proven:!isAuthorizedOct9Recovery({state,bundle}),
      ...(rev7?{producer_mode:provenance.producer_mode,provenance_basis:provenance.provenance_basis,original_continuation_mode:provenance.original_continuation_mode??null}:{}),
      commit_sha:sourceCommit,
      bundle_path:'shadow-runs/'+date+'/edition-bundle.json',
      bundle_sha256:sourceBundleSha,
      bundle_url:'https://raw.githubusercontent.com/gttome/Daily-AI-Brief-Compiler/'+sourceCommit+'/shadow-runs/'+date+'/edition-bundle.json',
      verified_reader_url:BASE+'briefs/'+date+'/',
      release_verification_time:liveReceipt.verified_at||null
    },
    placeholder:{id:'illustration-pending-1200x630-v1',width:1200,height:630,count:6},
    editorial_context:{videos:structuredClone(bundle.videos),podcasts:structuredClone(bundle.podcasts),watchlist:structuredClone(bundle.watchlist),book_mappings:structuredClone(bundle.book_mappings)},
    quality:{
      benchmark_path:'docs/D1-PRODUCTION-IMAGE-BENCHMARK-PROFILE.md',
      benchmark_url:'https://github.com/gttome/Daily-AI-Brief-Compiler/blob/main/docs/D1-PRODUCTION-IMAGE-BENCHMARK-PROFILE.md',
      format:'PNG',width:1200,height:630,
      professional_textbook_mechanism:true,white_or_near_white:true,
      minimum_causal_components:12,major_regions:{min:3,max:5},
      minimum_internal_substages:2,minimum_secondary_evidence_links:2,
      useful_canvas_occupancy:'80-90%',story_specific_six_way_differentiation:true,
      forbidden:['people','humanoids','photography','brands','logos','pseudotext','unapproved_text','generic_boxes','generic_dashboard','low_quality_fallback'],
      exact_saved_pixel_review_required:true,
      explanatory_text_required:true,
      story_fit_infographic_allowed:true,
      no_unapproved_labels:true
    },
    stories:bundle.stories.map(story=>({
      story_id:story.id,
      permanent_url:BASE+checkedRoute(story.permanent_route,date).slice(1),
      complete_compiler_story:structuredClone(story),
      primary_source:{
        url:story.source.url,title:story.source.title,publisher:story.source.publisher,
        published_at:story.source.published_at,retrieved_at:story.source.retrieved_at,
        verified_read_evidence:structuredClone(story.source.read_evidence)
      },
      visual_specification:{
        original_image_alt_intent:story.image_alt_intent,
        source_faithful_mechanism:story.summary,
        explanatory_significance:story.why_it_matters,
        factual_scope:story.source.read_evidence.scope,
        visible_text_allowlist:[],
        labels_authorized:true,
        visible_text_required:true,
        label_specification_status:'APP_MUST_PREPARE_SOURCE_SUPPORTED_EXACT_LABELS',
        label_authority:'Owner requires explanatory text; app prepares exact wording without claiming separate owner review.',
        story_fit_infographic_allowed:true,
        story_only_clean_context_required:true,
        external_operator_must_complete_distinct_mechanism_recipe:true
      },
      expected_stage_path:'external-image-packages/'+date+'/images/'+story.id+'.png',
      approval:'NOT_REVIEWED',
      accepted_locked:false
    })),
    replacement_contract:{
      requires_six_differentiated_approved_exact_pngs:true,
      external_app_separate_project:true,
      primary_scheduler_independent:true,
      protected_pr_exact_head_ci:true,
      no_semantic_rewrite:true,
      preserve_all_oct8_live_hashes:true
    }
  };
}
export function writeExternalImageJob({job,historyRoot,outputRoot}){
  if(!historyRoot||!outputRoot)fail('history_and_output_roots_required');
  if(path.resolve(historyRoot)===path.resolve(outputRoot))fail('history_is_read_only');
  const dst=path.resolve(outputRoot),src=path.join(path.resolve(historyRoot),'image-jobs');
  fs.mkdirSync(dst,{recursive:true});
  if(fs.existsSync(src))fs.cpSync(src,dst,{recursive:true,force:false,errorOnExist:true});
  const date=job.edition_date;
  const dest=path.join(dst,date,'job.json');
  const body=json(job);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  if(fs.existsSync(dest)&&fs.readFileSync(dest,'utf8')!==body)fail('immutable_job_already_exists');
  if(!fs.existsSync(dest))fs.writeFileSync(dest,body,{flag:'wx'});
  const indexFile=path.join(dst,'index.json');
  const old=fs.existsSync(indexFile)?readJson(indexFile):{schema_version:IMAGE_INDEX_SCHEMA,editions:[]};
  if(old.schema_version!==IMAGE_INDEX_SCHEMA||!Array.isArray(old.editions))fail('invalid_existing_index');
  const entry={edition_date:date,execution_id:job.execution_id,job_url:RAW+date+'/job.json',job_sha256:hash(Buffer.from(body)),bundle_sha256:job.source.bundle_sha256,source_commit_sha:job.source.commit_sha,status:'PUBLISHED_PENDING',story_count:6};
  const present=old.editions.find(x=>x.edition_date===date);
  if(present&&JSON.stringify(present)!==JSON.stringify(entry))fail('immutable_index_entry_changed');
  const editions=present?old.editions:[...old.editions,entry];
  editions.sort((a,b)=>a.edition_date.localeCompare(b.edition_date));
  if(new Set(editions.map(e=>e.edition_date)).size!==editions.length)fail('duplicate_index_date');
  const index={schema_version:IMAGE_INDEX_SCHEMA,latest_eligible_date:editions.filter(entry=>entry.status==='PUBLISHED_PENDING').map(entry=>entry.edition_date).sort().at(-1)||null,editions};
  fs.writeFileSync(indexFile,json(index));
  return {index,entry};
}
function main(){
  const [bundlePath,statePath,sourceCommit,liveReceiptPath,historyRoot,outputRoot]=process.argv.slice(2);
  if(!outputRoot)fail('usage: node scripts/external-image-jobs.mjs <bundle> <state> <exact-source-commit-sha> <postdeploy-integrity.json> <existing-history-site-root> <new-image-jobs-root>');
  const job=buildExternalImageJob({bundleBytes:fs.readFileSync(bundlePath),state:readJson(statePath),sourceCommit,liveReceipt:readJson(liveReceiptPath)});
  const {entry}=writeExternalImageJob({job,historyRoot,outputRoot});
  process.stdout.write(JSON.stringify({result:'STAGED_READ_ONLY_HISTORY_INPUT',edition_date:job.edition_date,entry})+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();


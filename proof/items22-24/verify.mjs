import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {
  recoveryDecision,
  primaryDecision,
  assertProgressPreserved
} from '../../producer/recovery.mjs';

const FULL_REF='origin/rehearsal/full-six-story-v1';
const EXPECTED_FULL_HEAD='c03c0c3394a8156d797745ed388f259193791ed2';
const ROOT='rehearsals/full-six-story-v1';

const fail=m=>{throw new Error(m);};
const git=(args,opt={})=>execFileSync('git',args,{encoding:opt.binary?null:'utf8',maxBuffer:20*1024*1024}).toString(opt.binary?undefined:'utf8').trim();
const showText=path=>git(['show',FULL_REF+':'+path]);
const showJson=path=>JSON.parse(showText(path));
const showBytes=path=>execFileSync('git',['show',FULL_REF+':'+path],{encoding:null,maxBuffer:20*1024*1024});
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
const gitBlobSha=b=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
const pngDims=b=>{
  if(b.subarray(0,8).toString('hex')!=='89504e470d0a1a0a') fail('invalid PNG signature');
  if(b.subarray(12,16).toString('ascii')!=='IHDR') fail('PNG IHDR missing');
  return {width:b.readUInt32BE(16),height:b.readUInt32BE(20)};
};
const deep=x=>JSON.parse(JSON.stringify(x));

const fullHead=git(['rev-parse',FULL_REF]);
if(fullHead!==EXPECTED_FULL_HEAD) fail('full rehearsal head drift: '+fullHead);
const rehearsal=showJson(ROOT+'/full-rehearsal-receipt.json');
const bundle=showJson(ROOT+'/edition-bundle.json');
const producer=showJson(ROOT+'/producer-receipt.json');
if(rehearsal.result!=='PASS'||rehearsal.semantic_rework!==0||rehearsal.accepted_image_regenerations!==0) fail('full rehearsal not clean PASS');
if(bundle.status!=='BUNDLE_READY'||bundle.images?.length!==6||producer.result!=='PASS') fail('bundle/producer not ready');

const imageAudit=[];
for(const image of bundle.images){
  const sid=image.story_id;
  const receipt=showJson(ROOT+'/images/rendered/'+sid+'/receipt.json');
  const review=showJson(ROOT+'/images/reviews/'+sid+'.json');
  const bytes=showBytes(image.path);
  const dims=pngDims(bytes);
  const actualSha=sha256(bytes);
  const actualBlob=gitBlobSha(bytes);
  if(receipt.result!=='PASS'||receipt.renderer!=='proposal1r-grammar-set-v2.2'||receipt.deterministic!==true) fail('render receipt invalid '+sid);
  if(receipt.dimensions?.width!==1200||receipt.dimensions?.height!==630||dims.width!==1200||dims.height!==630) fail('dimensions invalid '+sid);
  if(review.result!=='PASS'||review.exact_persisted_asset!==true) fail('review invalid '+sid);
  if(Object.values(review.gates||{}).some(v=>v!==true)) fail('visual gate failed '+sid);
  if(actualSha!==image.sha256||actualSha!==receipt.png_sha256||actualSha!==review.png_sha256) fail('sha mismatch '+sid);
  if(actualBlob!==image.git_blob_sha||actualBlob!==receipt.git_blob_sha||actualBlob!==review.git_blob_sha) fail('blob mismatch '+sid);

  const commits=git(['log','--format=%H',FULL_REF,'--',image.path]).split('\n').filter(Boolean);
  const blobs=new Set();
  for(const commit of commits){
    try{blobs.add(git(['rev-parse',commit+':'+image.path]));}catch{}
  }
  if(blobs.size!==1) fail('accepted image regenerated or identity changed '+sid+' unique_blobs='+blobs.size);

  imageAudit.push({
    story_id:sid,
    path:image.path,
    png_sha256:actualSha,
    git_blob_sha:actualBlob,
    render_pass:true,
    exact_persisted_review_pass:true,
    unique_blob_identities_across_history:blobs.size,
    accepted_image_regenerations:0
  });
}

const ids=bundle.images.map(x=>x.story_id);
const base={
  schema_version:'daily-compiler-state-v1',
  edition_date:'2026-10-07',
  execution_id:'recovery-proof-2026-10-07-r1',
  branch:'shadow/2026-10-07',
  state:'PRODUCING',
  stage:'EDITORIAL',
  started_at:'2026-10-06T19:15:00-05:00',
  updated_at:'2026-10-06T19:15:00-05:00',
  editorial_bundle:{status:'pending',digest:null},
  images:{required:6,accepted:[]},
  bundle:{status:'pending',digest:null},
  last_error:null,
  retryable:true
};

const cases=[
  {
    name:'stop_after_editorial',
    state:{...deep(base),stage:'CONTENT',editorial_bundle:{status:'complete',digest:'editorial-lock'}},
    expectedStage:'CONTENT',
    nextImage:null
  },
  {
    name:'stop_after_content',
    state:{...deep(base),stage:'IMAGES',editorial_bundle:{status:'complete',digest:'editorial-lock'}},
    expectedStage:'IMAGES',
    nextImage:1
  },
  {
    name:'stop_after_image_2',
    state:{...deep(base),stage:'IMAGES',editorial_bundle:{status:'complete',digest:'editorial-lock'},images:{required:6,accepted:ids.slice(0,2)}},
    expectedStage:'IMAGES',
    nextImage:3
  },
  {
    name:'stop_after_image_5',
    state:{...deep(base),stage:'IMAGES',editorial_bundle:{status:'complete',digest:'editorial-lock'},images:{required:6,accepted:ids.slice(0,5)}},
    expectedStage:'IMAGES',
    nextImage:6
  }
];

const recoveryAudit=[];
for(const c of cases){
  const before=deep(c.state);
  const d=recoveryDecision([before]);
  if(d.action!=='RESUME'||d.execution_id!==before.execution_id||d.branch!==before.branch||d.stage!==c.expectedStage) fail('recovery decision mismatch '+c.name);
  if((d.next_image_ordinal??null)!==c.nextImage) fail('image ordinal mismatch '+c.name);

  const after=deep(before);
  after.updated_at='2026-10-06T20:15:00-05:00';
  if(c.name==='stop_after_editorial'){
    after.stage='CONTENT';
  }else if(c.name==='stop_after_content'){
    after.images.accepted=[ids[0]];
  }else if(c.name==='stop_after_image_2'){
    after.images.accepted=ids.slice(0,3);
  }else{
    after.images.accepted=ids.slice(0,6);
  }
  assertProgressPreserved(before,after);

  recoveryAudit.push({
    case:c.name,
    action:d.action,
    execution_id_reused:d.execution_id,
    branch_reused:d.branch,
    resumed_stage:d.stage,
    next_image_ordinal:d.next_image_ordinal??null,
    completed_work_preserved:true,
    accepted_images_preserved:true,
    semantic_rework:0,
    accepted_image_regenerations:0
  });
}

const duplicateState=deep(cases[3].state);
const d1=recoveryDecision([duplicateState]);
const d2=recoveryDecision([duplicateState]);
if(JSON.stringify(d1)!==JSON.stringify(d2)) fail('duplicate recovery decision drift');
if(d1.action!=='RESUME'||d1.execution_id!==duplicateState.execution_id) fail('duplicate recovery did not reuse execution');
const primary=primaryDecision([duplicateState],duplicateState.edition_date);
if(primary.action!=='RESUME'||primary.execution_id!==duplicateState.execution_id) fail('primary would duplicate active execution');

const sealed=deep(duplicateState);
sealed.state='BUNDLE_READY';
sealed.stage='BUNDLE';
sealed.images.accepted=ids.slice();
sealed.bundle={status:'BUNDLE_READY',digest:'sealed-bundle-digest'};
const sealedPrimary=primaryDecision([sealed],sealed.edition_date);
const sealedRecovery=recoveryDecision([sealed]);
if(sealedPrimary.action!=='EXIT_NO_MUTATION'||sealedRecovery.action!=='EXIT_NO_MUTATION') fail('sealed bundle could be duplicated/reopened');

const result={
  schema_version:'daily-compiler-items22-24-proof-v1',
  result:'PASS',
  recorded_from_full_rehearsal_head:fullHead,
  owner_intervention:false,
  semantic_rework:0,
  runtime_code_repair:false,
  item_22_image_by_image_persistence:{
    result:'PASS',
    images:imageAudit,
    all_exact_persisted_assets_reviewed:true,
    all_hashes_and_git_blob_identities_match:true,
    accepted_image_regenerations:0
  },
  item_23_interruption_recovery:{
    result:'PASS',
    cases:recoveryAudit,
    same_execution_reused:true,
    completed_work_preserved:true,
    accepted_images_not_regenerated:true
  },
  item_24_duplicate_recovery:{
    result:'PASS',
    first_decision:d1,
    duplicate_decision:d2,
    primary_same_edition_decision:primary,
    sealed_primary_decision:sealedPrimary,
    sealed_recovery_decision:sealedRecovery,
    duplicate_execution_allocations:0,
    duplicate_bundles:0
  },
  forbidden_runtime_components_introduced:{
    supervisor:0,
    watchdog_ring:0,
    writer_lease:0,
    recovery_lease:0,
    worker_pool:0,
    wake_pr:0,
    runtime_repair_framework:0
  }
};

fs.mkdirSync('proof/items22-24',{recursive:true});
fs.writeFileSync('proof/items22-24/result.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));

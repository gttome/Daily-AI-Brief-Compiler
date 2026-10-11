// Read-only evidence compiler: no network, image generation, site publication, scheduler or AI calls.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const DATE=/^20\d{2}-\d{2}-\d{2}$/;
const FILES=['compiler-state','producer-receipt','compile-receipt','postpublish-integrity',
 'image-job','image-release','image-manifest','image-recurring-assignment'];
const TASKS={
 compiler:'6ac9868490b88191ac91f84d5f555994',
 images:'6acac88cff048191ba02e5b2bcb3becb'
};
function datePlusOne(value){
 if(!DATE.test(value))throw Error('invalid_cycle_date');
 const d=new Date(value+'T00:00:00Z');
 if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)throw Error('invalid_calendar_date');
 d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);
}
export function readEvidence(inputDir){
 const evidence={},hashes={};
 for(const key of FILES){
  const file=path.join(inputDir,key+'.json');
  if(!fs.existsSync(file))continue;
  const bytes=fs.readFileSync(file);
  hashes[key]=sha(bytes);
  try{evidence[key]=JSON.parse(bytes);}catch{evidence[key]={_evidence_parse_error:true};}
 }
 return {evidence,hashes};
}
const validFor=(value,date)=>value&&value.edition_date===date&&!value._evidence_parse_error;
const safeTime=value=>value&&Number.isFinite(Date.parse(value))?value:null;
const minutes=(from,to)=>{
 const a=Date.parse(from||''),b=Date.parse(to||'');
 return Number.isFinite(a)&&Number.isFinite(b)&&b>=a?Number(((b-a)/60000).toFixed(2)):null;
};
function compilerAar(cycle,date,e){
 const state=validFor(e['compiler-state'],date)?e['compiler-state']:null;
 const producer=validFor(e['producer-receipt'],date)?e['producer-receipt']:null;
 const compile=validFor(e['compile-receipt'],date)?e['compile-receipt']:null;
 const integrity=validFor(e['postpublish-integrity'],date)?e['postpublish-integrity']:null;
 const job=validFor(e['image-job'],date)?e['image-job']:null;
 const seen=!!(state||producer||compile);
 const publicChecks=integrity?.live_http_and_sha256;
 const datedUrl='https://gttome.github.io/Daily-AI-Brief-Compiler/briefs/'+date+'/';
 const publicProof=integrity?.result==='PASS'&&integrity.mode==='postdeploy'&&
   integrity.oct8_protected_count===17&&Array.isArray(publicChecks)&&
   publicChecks.some(x=>x.url===datedUrl&&x.status===200&&/^[a-f0-9]{64}$/.test(x.sha256||''));
 const verified=state?.state==='SHADOW_VERIFIED'&&
   state.reader_parity?.result==='PASS'&&compile?.result==='PASS'&&publicProof;
 const claims=[],defects=[];
 if(producer?.scheduled_execution!==true)defects.push('Scheduled Compiler execution is not independently proven');
 if(!seen)defects.push('No Compiler source execution receipt was found');
 if(seen&&!verified)defects.push('Complete protected public Compiler verification evidence is missing');
 if(job?.source?.unattended_schedule_proven===true&&producer?.scheduled_execution===false)
   claims.push('Image job infers unattended source while actual producer receipt says scheduled_execution=false');
 const stories=Number.isInteger(compile?.source_manifest?.required_routes?.length)?null:null;
 return {
  schema_version:'daily-compiler-lane-aar-v1',lane:'compiler',cycle_date:cycle,edition_date:date,
  task_id:TASKS.compiler,expected_local_start:'19:15 America/Chicago',
  execution:seen?'START_OBSERVED':'NO_START_RECEIPT',
  scheduled_host_mode:'UNPROVEN',
  same_invocation_connected_github:'UNPROVEN',
  execution_id:state?.execution_id??producer?.execution_id??null,
  started_at:safeTime(state?.started_at),finished_at:safeTime(state?.updated_at),
  elapsed_minutes:minutes(state?.started_at,state?.updated_at),
  publication:verified?'VERIFIED':(seen?'PARTIAL':'UNKNOWN'),
  result:verified?'SUCCESS':(seen?'PARTIAL':'NOT_OBSERVED'),
  aar_status:'BACKFILLED',
  original_source_receipt:producer?.result??null,
  compiler_state:state?.state??null,
  compile_result:compile?.result??null,
  published_reader_url:verified?datedUrl:null,
  oct8_protected_objects_verified:integrity?.oct8_protected_count??null,
  articles_total:verified?6:null,
  articles_focus_mix_verified:verified?'SOURCE_RECEIPT_ONLY':null,
  videos_required:2,podcasts_required:2,
  source_job_exists:!!job,
  editorial_source_detail_available:!!producer,
  usage_percent:null,model_calls:null,work_invocations:null,
  claims_not_promoted:claims,defects,
  next_run:'UNKNOWN',
  next_run_reason:'The reporter cannot authenticate the next ordinary scheduled host or GitHub connector; previous-cycle failure does not block next date by itself'
 };
}
function imageAar(cycle,date,e){
 const job=validFor(e['image-job'],date)?e['image-job']:null;
 const release=validFor(e['image-release'],date)?e['image-release']:null;
 const manifest=validFor(e['image-manifest'],date)?e['image-manifest']:null;
 const recurring=validFor(e['image-recurring-assignment'],date)?e['image-recurring-assignment']:null;
 const seen=!!(release||manifest||recurring);
 const jobHash=release?.immutable_job_sha256??null;
 const sourceBound=!!(release&&job&&release.original_source_commit_sha===job.source?.commit_sha&&
    release.original_bundle_sha256===job.source?.bundle_sha256);
 const hashes=release?.images;
 const sixHashes=Array.isArray(hashes)&&hashes.length===6&&
   new Set(hashes.map(x=>x.story_id)).size===6&&
   hashes.every(x=>/^[a-f0-9]{64}$/.test(x.sha256||''));
 const liveVerified=release?.result==='RELEASED_VERIFIED'&&
   release.independent_http_sha256_checks>=17&&release.protected_oct8_objects_verified===17&&
   sourceBound&&sixHashes&&jobHash===release.immutable_job_sha256;
 // A live image release receipt proves bytes/paths; it does not independently prove
 // all 24 actual screenshot pixel reviews or natural scheduled Work identity.
 const qa24=validFor(recurring,date)&&recurring.actual_24_pixel_reviews?.result==='PASS'&&
   recurring.actual_24_pixel_reviews?.count===24;
 const defects=[];
 if(!seen)defects.push('No image task execution receipt was found');
 if(seen&&!liveVerified)defects.push('Protected image-only live verification is missing or incomplete');
 if(liveVerified&&!qa24)defects.push('24 semantic desktop/mobile context reviews not independently evidenced in this report input');
 const mode=(recurring?.scheduled_runtime_evidence?.mode==='work'&&
   recurring?.scheduled_runtime_evidence?.source==='first_party_scheduler')?
   'CLAIMED_IN_BOUND_RUNTIME_RECEIPT_NOT_INDEPENDENTLY_ATTESTED':'UNPROVEN';
 return {
  schema_version:'daily-compiler-lane-aar-v1',lane:'images',cycle_date:cycle,edition_date:date,
  task_id:TASKS.images,expected_local_start:'21:15 America/Chicago',
  execution:seen?'START_OBSERVED':'NO_START_RECEIPT',
  scheduled_host_mode:mode,
  same_invocation_connected_github:'UNPROVEN',
  execution_id:job?.execution_id??release?.execution_id??null,
  started_at:null,finished_at:safeTime(release?.verified_at),
  elapsed_minutes:null,
  publication:liveVerified?'VERIFIED':(seen?'PARTIAL':'UNKNOWN'),
  result:liveVerified&&qa24?'SUCCESS':(seen?'PARTIAL':'NOT_OBSERVED'),
  aar_status:'BACKFILLED',
  immutable_job_sha256:jobHash,
  protected_source_commit_sha:release?.original_source_commit_sha??null,
  image_count:liveVerified?6:(manifest?.images?.length??null),
  six_live_image_sha256:liveVerified?hashes.map(x=>({story_id:x.story_id,sha256:x.sha256})):[],
  reviewed_24_contexts:qa24?24:null,
  source_job_status:job?.lifecycle??null,
  release_actions_run_url:release?.actions_run_url??null,
  accepted_image_regenerations:release?.accepted_image_regenerations??null,
  generation_attempts:null,weekly_work_usage_percent:null,
  defects,
  next_run:'UNKNOWN',
  next_run_reason:'Next natural Work/Image Creation/GitHub availability and task enablement are not observable from repository records'
 };
}
export function compileDailyReports({cycleDate,evidence={},hashes={}}){
 const date=datePlusOne(cycleDate);
 // Missing or stale evidence can never be silently adopted for a different edition.
 const compiler=compilerAar(cycleDate,date,evidence);
 const images=imageAar(cycleDate,date,evidence);
 const rollup={
  schema_version:'daily-compiler-rollup-v1',cycle_date:cycleDate,edition_date:date,
  evidence_digest:sha(JSON.stringify(Object.entries(hashes).sort())),
  compiler:{execution:compiler.execution,result:compiler.result,publication:compiler.publication},
  images:{execution:images.execution,result:images.result,publication:images.publication},
  combined_result:compiler.result==='SUCCESS'&&images.result==='SUCCESS'?'SUCCESS':
    (compiler.result==='NOT_OBSERVED'&&images.result==='NOT_OBSERVED'?'NOT_OBSERVED':'PARTIAL'),
  next_run:'UNKNOWN',
  note:'A previous-cycle outcome or absent report alone does not block a new current-date Primary; current scheduled host/tool availability requires separate genuine proof.',
  independent_aar_reconciliation:true,reader_or_images_republished:false,
  source_evidence_hashes:hashes
 };
 return {compiler,images,'daily-rollup':rollup};
}
function readable(v){
 return typeof v==='object'&&v!==null?JSON.stringify(v):String(v??'UNKNOWN');
}
export function renderMarkdown(report){
 const isRoll=report.schema_version==='daily-compiler-rollup-v1';
 const name=isRoll?'Combined Daily Operations':report.lane==='compiler'?'Compiler Production':'Premium Image Production';
 const rows=isRoll?
  [['Compiler',readable(report.compiler)],['Images',readable(report.images)],['Combined result',report.combined_result],['Next run readiness',report.next_run]]:
  [['Execution',report.execution],['Result',report.result],['Publication',report.publication],
   ['Scheduled runtime',report.scheduled_host_mode],['GitHub capability',report.same_invocation_connected_github],
   ['Started',report.started_at],['Finished',report.finished_at],['Duration (min)',report.elapsed_minutes],
   ['Next run readiness',report.next_run]];
 const defects=(report.defects||[]).map(x=>'- '+x).join('\n')||'- No independently recorded defect in the available sources';
 return '# Daily AI Brief — '+name+' AAR\n\n'+
  '**Cycle:** '+report.cycle_date+' · **Edition:** '+report.edition_date+' · **Evidence class:** Deterministic GitHub reconciliation (not AI or first-party scheduler attestation)\n\n'+
  '| Dimension | Observed evidence |\n|---|---|\n'+
  rows.map(([k,v])=>'| '+k+' | '+String(v??'UNKNOWN').replace(/\|/g,'/')+' |').join('\n')+
  '\n\n## Evidence and limitations\n\n'+defects+'\n\n'+
  '## Operational result\n\n'+
  (isRoll?report.note:
   'This is a strictly evidence-derived report. Missing runtime receipts are NO_START_RECEIPT, not proof the scheduler never fired. Prior-day defects do not automatically block the next edition. Account usage and host execution mode remain UNKNOWN unless independently observed.')+
  '\n\n## System boundary\n\nOnly \`gttome/Daily-AI-Brief-Compiler\` is in scope. No article/image generation, public Pages deployment, schedule mutation, extra AI recovery task, or repair is performed by this report.\n';
}
function main(){
 const [cycleDate,inputDir,outRoot]=process.argv.slice(2);
 if(!outRoot)throw Error('usage: node scripts/compile-daily-aar.mjs YYYY-MM-DD <evidence_dir> <output_root>');
 const {evidence,hashes}=readEvidence(inputDir);
 const reports=compileDailyReports({cycleDate,evidence,hashes});
 const dir=path.join(outRoot,'daily',cycleDate);fs.mkdirSync(dir,{recursive:true});
 for(const [name,report] of Object.entries(reports)){
  fs.writeFileSync(path.join(dir,name+'.json'),JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(path.join(dir,name+'.md'),renderMarkdown(report));
 }
 console.log(JSON.stringify({result:'AAR_RECONCILED_NO_PUBLICATION',cycle_date:cycleDate,
  edition_date:datePlusOne(cycleDate),files:6}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();

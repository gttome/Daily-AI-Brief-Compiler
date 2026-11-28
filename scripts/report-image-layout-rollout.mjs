import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyImageLayoutAudit,LAYOUT_AUDIT_EFFECTIVE} from '../operations/image-layout-audit.mjs';

import {IMAGE_NOV28_FOLLOWUP_EFFECTIVE,summarizeImageFirstExports} from './image-aar-contract.mjs';

const date=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s);
const metric=(x,min=0,max=Infinity)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max?x:null;
const safeRef=x=>typeof x==='string'&&/^https:\/\/(github\.com\/gttome\/Daily-AI-Brief-Compiler\/|chatgpt\.com\/)/.test(x);
function read(p){
 try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch(e){if(e.code==='ENOENT')return null;throw e}
}
export function reportImageLayoutRollout({repo,site,through}){
 if(!date(through))throw Error('Use the observed Chicago edition date YYYY-MM-DD.');
 const index=read(path.join(site,'image-jobs/index.json'));
 if(!Array.isArray(index?.editions))throw Error('Use the verified Pages history image-job index.');
 const dates=[...new Set(index.editions.filter(x=>date(x.edition_date)&& x.edition_date>=LAYOUT_AUDIT_EFFECTIVE&&
  x.edition_date<=through&&['PUBLISHED_PENDING','RELEASED_VERIFIED'].includes(x.status)).map(x=>x.edition_date))].sort();
 function row(edition){
  const base=path.join(repo,'external-image-packages',edition);
  const m=read(path.join(base,'manifest.json')),a=read(path.join(base,'reviews/after-action.json'));
  const matched=a?.edition_date===edition&&m?.edition_date===edition&&a.job_sha256===m.job_sha256&&
   typeof a.job_sha256==='string'&&/^[a-f0-9]{64}$/.test(a.job_sha256);
  const imgs=matched&&Array.isArray(a?.images)&&a.images.length===6&&new Set(a.images.map(i=>i.story_id)).size===6&&
   a.images.every(i=>Number.isSafeInteger(i.generation_attempts)&&i.generation_attempts>=1&&
    m.images?.some(j=>i.story_id===j.story_id&&i.sha256===j.sha256))?a.images:null;
  const layout=m?.edition_date===edition&&m.set_review?.structural_layout_review?verifyImageLayoutAudit(m):null;
  const obs=matched?a.rollout_observation:null;
  let attempts=metric(imgs?a.production?.actual_generation_count:null,6);
  if(!Number.isSafeInteger(attempts)||attempts!==imgs?.reduce((sum,i)=>sum+i.generation_attempts,0))attempts=null;
  const deployment=Array.isArray(obs?.artifact_deployments)?obs.artifact_deployments.filter(x=>safeRef(x.evidence_ref)&&
   ['deployed','artifact_missing','other_failure','unknown'].includes(x.deploy_outcome)):null;
  const firstExports=summarizeImageFirstExports({edition,aar:a,manifest:m});
  return {
   edition, evidence_status: layout&&imgs?'AVAILABLE':'PARTIAL_OR_NOT_RECORDED',
   distinct_layouts:layout?Object.keys(layout.observed).length:null,
   maximum_repeat:layout?.largest_repeated_layout??null,changed_combinations:layout?.changed_vs_preceding??null,
   visible_contrast:layout?.visible_contrast??null,
   first_pass_accepts:attempts===null?null:imgs.filter(i=>i.generation_attempts===1).length,native_attempts:attempts,
   owner_intervention:safeRef(obs?.intervention_evidence_ref)&&['owner_directed','none_observed'].includes(obs.owner_intervention)?obs.owner_intervention:null,
   work_usage_percent:metric(matched?a.usage?.work_usage_percent:null,0,100),
   image_publication: matched&&typeof a.publication?.result==='string'?a.publication.result:null,
   visual_contexts:metric(matched?a.visual_review?.reviewed_targets:null,0,24),
   artifact_deployments:deployment?.length?deployment.map(x=>({evidence_ref:x.evidence_ref,
    visibility_wait_seconds:metric(x.visibility_wait_seconds),deploy_outcome:x.deploy_outcome})):null,
   source_manifest:m?.edition_date===edition?'external-image-packages/'+edition+'/manifest.json':null,
   source_aar:matched?'external-image-packages/'+edition+'/reviews/after-action.json':null,
   ...(firstExports?{rejected_native_candidates:firstExports.rejected_native_candidates,
    export_only_reexports:firstExports.export_only_reexports,
    first_export_margin_failures:firstExports.first_export_margin_failures,
    efficiency:firstExports.native_calls===null?'NOT_EVIDENCED':firstExports.first_native_accepts>=4&&firstExports.native_calls<=8?'MET':'NOT_MET'}:{})
  };
 }
 const rows=dates.slice(0,7).map(row);
 const followup=dates.filter(x=>x>=IMAGE_NOV28_FOLLOWUP_EFFECTIVE).slice(0,3).map(row);
 return {schema_version:'image-layout-rollout-report-v1',first_eligible_on_or_after:LAYOUT_AUDIT_EFFECTIVE,
  through,window_status:rows.length===7?'FIRST_SEVEN_IDENTIFIED':'COLLECTING',eligible_editions_observed:rows.length,
  assessed_layout_editions:rows.filter(r=>r.distinct_layouts!==null).length,rows,
  ...(through>=IMAGE_NOV28_FOLLOWUP_EFFECTIVE?{november28_followup:{window_status:followup.length===3?'FIRST_THREE_IDENTIFIED':'COLLECTING',
   advisory_targets:{first_native_accepts_minimum:4,native_calls_maximum:8},rows:followup}}:{})};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [repo,site,through]=process.argv.slice(2);
 if(!repo||!site||!through)throw Error('usage: report-image-layout-rollout.mjs <repo-root> <verified-history/site> <through-edition>');
 process.stdout.write(JSON.stringify(reportImageLayoutRollout({repo,site,through}),null,2)+'\n');
}

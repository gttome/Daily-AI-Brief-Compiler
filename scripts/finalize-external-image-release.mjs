// After actual verified GitHub Pages deployment, record a postpublication revision.
// The immutable original image job/bundle remains untouched; the mutable job index advances.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=s=>{throw new Error('external_image_release_index:'+s);};
function stringJson(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
export function finishExternalImageRelease({index,jobBytes,prepared,verification,deployedPagesUrl,ciHeadSha,mergeCommitSha,workflowRunUrl}){
  const job=JSON.parse(jobBytes);
  if(index?.schema_version!=='external-compiler-image-index-v1'||!Array.isArray(index.editions)||index.editions.length<1 ||
    job?.schema_version!=='external-compiler-image-job-v1'||job.lifecycle!=='PUBLISHED_PENDING'||
    prepared?.result!=='PREPARED_ONLY'||verification?.result!=='PASS'||verification.independent_network_byte_checks!==true||
    verification.oct8_checked!==17||verification.changed_checked!==prepared.changed_count||
    prepared.oct8_pinned_count!==17||verification.image_sha256s?.length!==6||
    job.edition_date!==prepared.edition_date||job.edition_date!==verification.edition_date||
    prepared.execution_id!==job.execution_id||verification.execution_id!==job.execution_id||
    prepared.source_bundle_sha256!==job.source.bundle_sha256||
    verification.source_bundle_sha256!==job.source.bundle_sha256||
    prepared.job_sha256!==sha(jobBytes)||verification.job_sha256!==sha(jobBytes)||
    !deployedPagesUrl?.startsWith('https://gttome.github.io/Daily-AI-Brief-Compiler/')||
    !/^[a-f0-9]{40}$/.test(ciHeadSha||'')||
    !/^[a-f0-9]{40}$/.test(mergeCommitSha||'')||
    !/^https:\/\/github\.com\/gttome\/Daily-AI-Brief-Compiler\/actions\/runs\/\d+$/.test(workflowRunUrl||''))
    fail('genuine_postdeploy_evidence_required');
  const i=index.editions.findIndex(row=>row.edition_date===job.edition_date);
  if(i<0||index.editions.filter(row=>row.edition_date===job.edition_date).length!==1||
    index.editions[i].status!=='PUBLISHED_PENDING'||
    index.editions[i].job_sha256!==sha(jobBytes)||index.editions[i].bundle_sha256!==job.source.bundle_sha256)
    fail('job_already_released_or_stale');
  const date=job.edition_date,images=verification.image_sha256s;
  const receipt={schema_version:'external-compiler-image-release-v1',
    result:'RELEASED_VERIFIED',edition_date:date,execution_id:job.execution_id,
    original_source_commit_sha:job.source.commit_sha,original_bundle_sha256:job.source.bundle_sha256,
    immutable_job_sha256:sha(jobBytes),staged_package_head:prepared.staged_package_head,
    protected_main_commit:mergeCommitSha,exact_head_ci_sha:ciHeadSha,
    actions_run_url:workflowRunUrl,deployed_pages_url:deployedPagesUrl,
    verified_at:verification.verified_at,independent_http_sha256_checks:verification.total_http_sha256_checks,
    protected_oct8_objects_verified:17,images,changed_public_objects:verification.changed_checked,
    controls_verified:verification.controls_checked,first_publication_original_immutable:true,
    semantic_rework:0,accepted_image_regenerations:0};
  const updated=structuredClone(index);
  updated.editions[i]={...updated.editions[i],status:'RELEASED_VERIFIED',release_receipt_path:'image-jobs/'+date+'/release.json'};
  updated.latest_eligible_date=updated.editions.filter(row=>row.status==='PUBLISHED_PENDING').map(row=>row.edition_date).sort().at(-1)||null;
  return {index:updated,receipt};
}
function main(){
  const [indexFile,jobFile,preparedFile,verificationFile,deployedPagesUrl,ciHeadSha,mergeCommitSha,workflowRunUrl,outputRoot]=process.argv.slice(2);
  if(!outputRoot)fail('usage: node scripts/finalize-external-image-release.mjs <old-index> <job> <prepared> <postdeploy-live> <page-url> <exact-pr-ci-head-sha> <protected-main-merge-sha> <workflow-run-url> <new-image-jobs-root>');
  const index=stringJson(indexFile),jobBytes=fs.readFileSync(jobFile);
  const result=finishExternalImageRelease({index,jobBytes,
    prepared:stringJson(preparedFile),verification:stringJson(verificationFile),
    deployedPagesUrl,ciHeadSha,mergeCommitSha,workflowRunUrl});
  fs.mkdirSync(outputRoot,{recursive:true});
  const indexPath=path.join(outputRoot,'index.json');
  const receiptPath=path.join(outputRoot,result.receipt.edition_date,'release.json');
  fs.mkdirSync(path.dirname(receiptPath),{recursive:true});
  if(fs.existsSync(receiptPath))fail('existing_release_cannot_reopen');
  fs.writeFileSync(indexPath,JSON.stringify(result.index,null,2)+'\n');
  fs.writeFileSync(receiptPath,JSON.stringify(result.receipt,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({result:result.receipt.result,edition_date:result.receipt.edition_date,latest_eligible_date:result.index.latest_eligible_date}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();

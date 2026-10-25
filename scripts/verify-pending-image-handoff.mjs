// Same-publication-job six-illustration handoff gate; no separate task or image generation.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const HASH=/^[a-f0-9]{64}$/,SHA=/^[a-f0-9]{40}$/;
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const fail=s=>{throw new Error('IMAGE_HANDOFF_BLOCKED: '+s)};
export function verifyPendingImageHandoff({editionDate,index,job,bundle,bundleBytes,jobBytes}){
 if(!/^20\d\d-\d\d-\d\d$/.test(editionDate))fail('invalid edition date');
 const rows=(index?.editions||[]).filter(x=>x.edition_date===editionDate);
 if(rows.length!==1)fail('unique exact-date source entry required');
 const row=rows[0];
 if(row.status!=='PUBLISHED_PENDING'||index.latest_eligible_date!==editionDate)
   fail('current edition must be uniquely PUBLISHED_PENDING');
 if(job.edition_date!==editionDate||job.lifecycle!=='PUBLISHED_PENDING'||
    job.accepted_images!==0||job.schema_version!=='external-compiler-image-job-v1')
   fail('new pending immutable six-story source job required');
 if(bundle?.edition_date!==editionDate||!Array.isArray(bundle.stories)||bundle.stories.length!==6)
   fail('six article sources are required');
 const expected=new Set(bundle.stories.map(s=>s.id));
 if(expected.size!==6||!Array.isArray(job.stories)||job.stories.length!==6||
    !job.stories.every(s=>expected.has(s.id))||new Set(job.stories.map(s=>s.id)).size!==6)
   fail('source/job story IDs differ');
 const source=job.source||{};
 if(!SHA.test(source.commit_sha||'')||row.source_commit_sha!==source.commit_sha||
    row.bundle_sha256!==source.bundle_sha256||!HASH.test(source.bundle_sha256||'')||
    hash(bundleBytes)!==source.bundle_sha256||hash(jobBytes)!==row.job_sha256)
   fail('source/job/index SHA256 and immutable commit binding differ');
 if(source.verified_reader_url!=='https://gttome.github.io/Daily-AI-Brief-Compiler/briefs/'+editionDate+'/')
   fail('exact dated public reader URL required');
 if(row.story_count!==6||job.execution_id!==row.execution_id)
   fail('source execution mismatch');
 return {result:'PENDING_IMAGE_HANDOFF_VERIFIED',edition_date:editionDate,
   story_count:6,immutable_job_sha256:row.job_sha256,
   bundle_sha256:row.bundle_sha256,source_commit_sha:row.source_commit_sha};
}
function main(){
 const [date,indexFile,jobFile,bundleFile]=process.argv.slice(2);
 if(!bundleFile)throw Error('usage: verify-pending-image-handoff <date> <index> <job> <bundle>');
 const index=JSON.parse(fs.readFileSync(indexFile,'utf8'));
 const jobBytes=fs.readFileSync(jobFile),bundleBytes=fs.readFileSync(bundleFile);
 const result=verifyPendingImageHandoff({editionDate:date,index,
  job:JSON.parse(jobBytes),bundle:JSON.parse(bundleBytes),bundleBytes,jobBytes});
 console.log(JSON.stringify(result));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main();

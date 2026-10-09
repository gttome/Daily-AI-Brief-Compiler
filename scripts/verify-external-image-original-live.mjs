// Before image-only Pages deployment, independently verify original published
// placeholder reader routes are still live and byte-identical to history.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditOct8Live,OCT8_PUBLIC_BASE} from './audit-oct8-live.mjs';
import {checkLiveBinary} from './verify-external-image-live.mjs';

const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=s=>{throw new Error('external_image_predeploy:'+s);};
export async function checkOriginalImageTargetLive({job,historyRoot,fetchImpl=fetch}){
  const date=job?.edition_date;
  if(job?.schema_version!=='external-compiler-image-job-v1'||job.lifecycle!=='PUBLISHED_PENDING'||
    !/^20\d{2}-\d{2}-\d{2}$/.test(date||'')||date<='2026-10-08'||
    job.stories?.length!==6||new Set(job.stories.map(s=>s.story_id)).size!==6)
    fail('not_an_eligible_six_story_job');
  const routes=['briefs/'+date+'/index.html',...job.stories.map(s=>{
    const prefix=OCT8_PUBLIC_BASE+'stories/'+date+'/';
    if(typeof s.permanent_url!=='string'||!s.permanent_url.startsWith(prefix)||
      !/^https:\/\/gttome\.github\.io\/Daily-AI-Brief-Compiler\/stories\/\d{4}-\d{2}-\d{2}\/[a-z0-9-]+\/$/.test(s.permanent_url))fail('invalid_story_route');
    return s.permanent_url.slice(OCT8_PUBLIC_BASE.length)+'index.html';
  })];
  if(new Set(routes).size!==7)fail('duplicate_routes');
  const pages=[];
  for(const route of routes){
    const p=path.join(historyRoot,route);
    if(!fs.existsSync(p))fail('historic_target_missing:'+route);
    const bytes=fs.readFileSync(p);
    if(!bytes.toString('utf8').includes('illustration-pending.svg'))
      fail('target_does_not_have_original_placeholders:'+route);
    pages.push(await checkLiveBinary({route,sha256:sha(bytes),bytes:bytes.length,fetchImpl}));
  }
  const old=await auditOct8Live({fetchImpl});
  return {schema_version:'external-compiler-image-original-live-preflight-v1',result:'PASS',
    edition_date:date,original_placeholder_pages_checked:7,oct8_objects_checked:old.objects_verified,
    original_story_and_reader_routes:pages,checked_at:new Date().toISOString()};
}
async function main(){
  const [jobPath,historyRoot,receiptPath]=process.argv.slice(2);
  if(!receiptPath)fail('usage: node scripts/verify-external-image-original-live.mjs <job.json> <history-site> <receipt-path>');
  const r=await checkOriginalImageTargetLive({job:JSON.parse(fs.readFileSync(jobPath,'utf8')),historyRoot});
  fs.mkdirSync(path.dirname(receiptPath),{recursive:true});
  fs.writeFileSync(receiptPath,JSON.stringify(r,null,2)+'\n');
  console.log(JSON.stringify({result:r.result,edition_date:r.edition_date,original_placeholder_pages_checked:7,oct8_objects_checked:17}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();

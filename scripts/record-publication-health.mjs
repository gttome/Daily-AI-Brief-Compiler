// No external services, no new jobs. Persist authentic protected publishing gate evidence.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export const HEALTH_SCHEMA='daily-compiler-publication-health-v1';
const states=new Set(['BLOCKED_PUBLICATION','READER_VERIFIED']);
const date=/^20\d\d-\d\d-\d\d$/;
const gate=/^[A-Z][A-Z_]{2,60}$/;
export function nextPublicationHealth({previous=null,editionDate,status,stage,runUrl,observedAt}){
  if(!date.test(editionDate)||!states.has(status)||!gate.test(stage)||
     typeof runUrl!=='string'||!/^https:\/\/github\.com\/gttome\/Daily-AI-Brief-Compiler\/actions\/runs\/\d+$/.test(runUrl)||
     !Number.isFinite(Date.parse(observedAt)))throw new Error('publication_health_invalid_event');
  if(previous&&(previous.schema_version!==HEALTH_SCHEMA||previous.edition_date!==editionDate||
       !Array.isArray(previous.events)))throw new Error('publication_health_invalid_predecessor');
  const events=[...(previous?.events||[])];
  if(events.some(e=>e.status===status&&e.stage===stage&&e.run_url===runUrl))return previous;
  if(status==='READER_VERIFIED'&&stage!=='READER_PUBLICATION')throw new Error('reader_verified_must_identify_reader_publication');
  events.push({status,stage,run_url:runUrl,observed_at:observedAt});
  const lastBlock=[...events].reverse().find(e=>e.status==='BLOCKED_PUBLICATION');
  const blocked=status==='BLOCKED_PUBLICATION';
  const plan={
    VIDEO_PLAYBACK:'Reselect only failed videos from actual publisher-reviewed backups; require advancing duration-matched signed-out player.',
    MEDIA_HISTORY:'Replace only already published media or article source; preserve accepted unrelated editorial and image assets.',
    SOURCE_READY:'Correct the first invalid edition readiness constraint; do not allocate a second producer.',
    DISPATCH_FAILED:'Inspect dispatch transport; retry only exact sealed source branch and digest.',
    READER_COMPATIBILITY:'Repair Watchlist schema from verified same-topic source evidence; reseal and revalidate only the invalid stage.',
    IMAGE_HANDOFF:'Check released reader and regenerate only exact immutable six-story image job; do not create premium images.',
    PUBLICATION_PIPELINE:'Inspect first failed protected stage and retry only safe idempotent operations.'
  };
  return {schema_version:HEALTH_SCHEMA,edition_date:editionDate,status,observed_at:observedAt,
    events,outstanding_blocker:blocked?{stage,run_url:runUrl,
      first_observed_at:previous?.status==='BLOCKED_PUBLICATION'&&previous.outstanding_blocker?.stage===stage?
        previous.outstanding_blocker.first_observed_at:observedAt,
      next_action:plan[stage]||'Inspect original failed Action and preserve completed stages.'}:null,
    last_recorded_blocker:lastBlock||null,public_reader_verified:status==='READER_VERIFIED',
    unattended_recovery_proven:false,owner_intervention:'UNKNOWN_NOT_ATTESTED_BY_GITHUB',
    image_job_verified:false,
    evidence_limit:'GitHub Action observation only, not a new AI executor, invocation proof or successful image release.'};
}
function main(){
 const [file,editionDate,status,stage,runUrl]=process.argv.slice(2);
 if(!file||!editionDate||!status||!stage||!runUrl)throw new Error('usage: record-publication-health <file> <date> <BLOCKED_PUBLICATION|READER_VERIFIED> <GATE> <run_url>');
 const previous=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
 const next=nextPublicationHealth({previous,editionDate,status,stage,runUrl,observedAt:new Date().toISOString()});
 fs.mkdirSync(path.dirname(file),{recursive:true});
 fs.writeFileSync(file,JSON.stringify(next,null,2)+'\n');
 console.log(JSON.stringify({result:'PUBLICATION_HEALTH_RECORDED',edition_date:editionDate,status,stage,blocked:!!next.outstanding_blocker}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main();

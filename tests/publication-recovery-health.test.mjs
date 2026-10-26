import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {nextPublicationHealth,HEALTH_SCHEMA} from '../scripts/record-publication-health.mjs';
import {verifyPendingImageHandoff} from '../scripts/verify-pending-image-handoff.mjs';
import {publicationRecoveryDecision} from '../operations/publication-recovery.mjs';
const edition='2026-10-26';
const url='https://github.com/gttome/Daily-AI-Brief-Compiler/actions/runs/1234567';
const now='2026-10-25T23:30:00Z';

test('Actions failure is persistent, actionable, append-only and idempotent',()=>{
 const bad=nextPublicationHealth({editionDate:edition,status:'BLOCKED_PUBLICATION',
   stage:'VIDEO_PLAYBACK',runUrl:url,observedAt:now});
 assert.equal(bad.schema_version,HEALTH_SCHEMA);
 assert.equal(bad.status,'BLOCKED_PUBLICATION');
 assert.match(bad.outstanding_blocker.next_action,/publisher-reviewed/);
 assert.equal(nextPublicationHealth({previous:bad,editionDate:edition,status:'BLOCKED_PUBLICATION',
   stage:'VIDEO_PLAYBACK',runUrl:url,observedAt:now}).events.length,1);
 const recovered=nextPublicationHealth({previous:bad,editionDate:edition,status:'READER_VERIFIED',
   stage:'READER_PUBLICATION',runUrl:'https://github.com/gttome/Daily-AI-Brief-Compiler/actions/runs/2345678',
   observedAt:'2026-10-26T00:10:00Z'});
 assert.equal(recovered.status,'READER_VERIFIED');
 assert.equal(recovered.events.length,2);
 assert.equal(recovered.last_recorded_blocker.stage,'VIDEO_PLAYBACK');
 assert.equal(recovered.unattended_recovery_proven,false);
});
test('failure evidence rejects cross-edition and false-success records',()=>{
 const state=nextPublicationHealth({editionDate:edition,status:'BLOCKED_PUBLICATION',
   stage:'MEDIA_HISTORY',runUrl:url,observedAt:now});
 assert.throws(()=>nextPublicationHealth({previous:state,editionDate:'2026-10-27',
   status:'READER_VERIFIED',stage:'READER_PUBLICATION',runUrl:url,observedAt:now}),/predecessor/);
 assert.throws(()=>nextPublicationHealth({editionDate:edition,status:'AUTONOMOUS_SUCCESS',
   stage:'VIDEO_PLAYBACK',runUrl:url,observedAt:now}),/invalid_event/);
});
test('handoff enforces exactly six aligned stories, job/index SHA and public reader identity',()=>{
 const stories=Array.from({length:6},(_,i)=>({id:'story-'+i}));
 const bundle={edition_date:edition,stories},bundleBytes=Buffer.from(JSON.stringify(bundle));
 const digest=crypto.createHash('sha256').update(bundleBytes).digest('hex');
 const commit='a'.repeat(40);
 const job={schema_version:'external-compiler-image-job-v1',edition_date:edition,
   lifecycle:'PUBLISHED_PENDING',accepted_images:0,execution_id:'daily-compiler-test',
   stories:stories.map(x=>({story_id:x.id})),source:{commit_sha:commit,bundle_sha256:digest,
    verified_reader_url:'https://gttome.github.io/Daily-AI-Brief-Compiler/briefs/'+edition+'/'}};
 const jobBytes=Buffer.from(JSON.stringify(job));
 const index={latest_eligible_date:edition,editions:[{edition_date:edition,status:'PUBLISHED_PENDING',
   job_sha256:crypto.createHash('sha256').update(jobBytes).digest('hex'),
   bundle_sha256:digest,source_commit_sha:commit,execution_id:job.execution_id,story_count:6}]};
 const input={editionDate:edition,index,job,bundle,bundleBytes,jobBytes};
 assert.equal(verifyPendingImageHandoff(input).result,'PENDING_IMAGE_HANDOFF_VERIFIED');
 assert.throws(()=>verifyPendingImageHandoff({...input,job:{...job,stories:job.stories.slice(1)}}),/story IDs/);
 assert.throws(()=>verifyPendingImageHandoff({...input,index:{...index,latest_eligible_date:null}}),/PUBLISHED_PENDING/);
 assert.throws(()=>verifyPendingImageHandoff({...input,bundleBytes:Buffer.from('altered')}),/SHA256/);
});
test('same-edition decision only resumes the existing authorized editor, never invents a worker',()=>{
 const health=nextPublicationHealth({editionDate:edition,status:'BLOCKED_PUBLICATION',
   stage:'VIDEO_PLAYBACK',runUrl:url,observedAt:now});
 const inactive=publicationRecoveryDecision({editionDate:edition,health,activePrimary:false});
 assert.equal(inactive.result,'BLOCKED_REQUIRES_EXISTING_PRIMARY_EXECUTOR');
 assert.equal(inactive.requires_new_producer,false);
 const active=publicationRecoveryDecision({editionDate:edition,health,activePrimary:true});
 assert.equal(active.result,'RESUME_SAME_EDITION_NOW');
 assert.equal(active.correction,'REPLACE_INVALID_VIDEO_ONLY');
 const complete=publicationRecoveryDecision({editionDate:edition,
   state:{edition_date:edition,state:'SHADOW_VERIFIED'},
   imageIndex:{editions:[{edition_date:edition,status:'PUBLISHED_PENDING'}]}});
 assert.equal(complete.result,'PUBLIC_READER_READY_FOR_IMAGE_WORKER');
});

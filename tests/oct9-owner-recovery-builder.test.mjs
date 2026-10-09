import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {buildOct9OwnerRecovery} from '../scripts/prepare-oct9-owner-recovery.mjs';

const date='2026-10-09';
const now='2026-10-09T21:00:00Z';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const focus=['Technical AI Engineering','Technical AI Engineering','Applied Generative AI for Knowledge Workers','Applied Generative AI for Knowledge Workers','Agents for Everyone','Agents for Everyone'];
function fixture(){
  const ids=focus.map((_,i)=>'story-'+i);
  const selected=ids.map((id,i)=>({id,focus:focus[i],url:'https://verified-publisher'+i+'.com/story',
    date:'2026-10-08'}));
  const stories=selected.map((s,i)=>({
    id:s.id,headline:'Verified story '+i,focus:s.focus,agent_skills:i===4,
    summary:'Complete original publisher article summary with causally grounded detail and constraints.',
    why_it_matters:'Meaningful reader-value analysis grounded in direct publisher evidence and product boundaries.',
    image_alt_intent:'Layered diagram showing the original story causal mechanism with constraints and source evidence.',
    permanent_route:'/stories/'+date+'/story-'+i+'/',
    source:{url:s.url,publisher:'Publisher '+i,title:'Original article '+i,published_at:s.date,retrieved_at:now},
    reading_time_minutes:3,topics:['agents'],coverage_labels:['new development'],
    related_coverage:'Related prior evidence described elsewhere.'
  }));
  const videos=Array.from({length:2},(_,i)=>({title:'Verified video '+i,url:'https://video.example.org/watch/'+i,
    original_date:'2026-10-08',source:'Publisher',duration_minutes:(120+i)/60,verified:true,
    focus:focus[i],summary:'Original video summary',why_it_matters:'Tied to article'}));
  const podcasts=Array.from({length:2},(_,i)=>({title:'Verified podcast '+i,url:'https://podcast'+i+'.example.org/episode',
    original_date:'2026-10-08',source:'Podcast '+i,duration_minutes:30+i,
    written_reading_time_minutes:4,verified:true,
    summary:'Original podcast episode summary',why_it_matters:'Evidence and reader benefit.'}));
  const originalMedia={edition_date:date,checked_at_utc:now,
    videos:videos.map(v=>({url:v.url,date:v.original_date,duration_seconds:v.duration_minutes*60,
      verified_metadata:true,identity_method:'Original verified first-party channel identity and independent runtime metadata.'})),
    podcasts:podcasts.map(v=>({url:v.url,date:v.original_date,duration_seconds:v.duration_minutes*60,
      verified_metadata:true,method:'Original publisher episode transcript, runtime label and independent directory corroboration.'}))};
  const verification={schema_version:'daily-compiler-oct9-owner-source-revalidation-v1',
    scope:'publish_oct9_placeholders_and_provide_external_work_handoff_only',
    owner_authorized:true,
    failed_branch_head:'246c04d1c9761c4bb9164ce34b63833fa277dc49',
    historical_failed_execution:'daily-compiler-shadow-2026-10-09-validation-r1',
    normal_primary_schedule_unchanged:true,work_app_not_invoked:true,
    native_images_generated:0,existing_accepted_images_replaced:0,
    original_media_evidence_checked_at:now,
    sources:selected.map(s=>({story_id:s.id,source_url:s.url,source_published_at:s.date,status:'verified',
      full_source_read:true,method:'publisher_main_text',read_at:now,
      scope:'Publisher article reviewed for original date, mechanism, demonstrated capabilities and relevant constraints.'})),
    agent_skills_evidence:{story_id:ids[4],primary_source_url:selected[4].url,
      explanation:'The story explicitly documents reusable tools and agent procedures that can be invoked across tasks with contextual restrictions, not a mere mention of the word skill.'}
  };
  return {originalSelection:{edition_date:date,execution_id:'daily-compiler-shadow-2026-10-09-validation-r1',
    editorial_result:'PASS',selected},
    originalSemantic:{edition_date:date,execution_id:'daily-compiler-shadow-2026-10-09-validation-r1',
      stories,videos,podcasts,
      watchlist:{new:[],updated:[],carried_forward:[{topic:'Control points',why:'Still relevant.'}],dropped:[],refreshed_at:now},
      book_mappings:['Reliable Generative AI','Reliable Generative AI Context Engineering',
        'Generative AI Professional Prompt Engineering Guide','Generative AI Prompt Engineering Learning Ecosystem']
          .map((book,i)=>({book,story_id:ids[i],concept_or_chapter:'Chapter 1',connection:'Direct reader link',what_to_study_next:'Read explanation'}))},
    originalMedia,verification,now};
}
test('owner exception reuses actual original six story bodies and media identities without new images',()=>{
  const f=fixture(),output=buildOct9OwnerRecovery(f);
  assert.equal(output.state.state,'BUNDLE_READY');
  assert.equal(output.state.branch,'shadow/2026-10-09-owner-placeholder-20261009');
  assert.equal(output.state.bundle.digest,sha(output.bundleBytes));
  assert.equal(output.bundle.images.length,6);
  assert.ok(output.bundle.images.every(x=>x.accepted===false&&x.status==='pending'));
  assert.ok(output.bundle.stories.every((s,i)=>s.summary===f.originalSemantic.stories[i].summary));
  assert.equal(output.bundle.stories[4].agent_skills_evidence,f.verification.agent_skills_evidence.explanation);
  assert.equal(output.bundle.producer_receipt.owner_intervention,true);
  assert.equal(output.bundle.producer_receipt.scheduled_execution,false);
  assert.equal(output.state.one_time_recovery.historical_terminal_state,'SHADOW_FAILED');
  assert.equal(output.provenance.scheduled_release_one_proof,false);
});
test('cannot promote unsupported original metadata, fabricated source-read, or inconsistent media',()=>{
  const cases=[
    x=>{x.verification.sources[0].source_url='https://wrong.example.org';},
    x=>{x.verification.sources[1].full_source_read=false;},
    x=>{x.verification.agent_skills_evidence.story_id='wrong';},
    x=>{x.originalMedia.videos[0].duration_seconds+=120;},
    x=>{x.originalSelection.selected[0].url='https://wrong.example.org';},
    x=>{x.verification.native_images_generated=1;},
    x=>{x.originalSemantic.podcasts[1].source='Podcast 0';}
  ];
  for(const mutate of cases){
    const f=fixture();mutate(f);
    assert.throws(()=>buildOct9OwnerRecovery(f),/oct9-owner-recovery/);
  }
});
test('event-only one-time workflow does not modify Primary, trigger retired image lanes or accept unverified editorial',()=>{
  const s=fs.readFileSync('.github/workflows/owner-oct9-placeholder-recovery.yml','utf8');
  assert.match(s,/branches:\s*\n\s+- shadow\/2026-10-09-owner-placeholder-20261009/);
  assert.doesNotMatch(s,/\n\s+schedule:/);
  assert.doesNotMatch(s,/render-shadow-images|image_gen|D1 Work Image Lane|automations\.create/);
  assert.match(s,/prepare-oct9-owner-recovery.mjs/);
  assert.match(s,/--release1-production true/);
  assert.match(s,/--allow-pending-images true/);
  assert.match(s,/dispatches/);
  assert.match(s,/test ! -d shadow-runs\/2026-10-09/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildExternalImageJob,writeExternalImageJob} from '../scripts/external-image-jobs.mjs';

const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const DATE='2026-10-11';
const BASE='https://gttome.github.io/Daily-AI-Brief-Compiler/';
function fixture(){
  const focuses=['Technical AI Engineering','Technical AI Engineering','Applied Generative AI for Knowledge Workers','Applied Generative AI for Knowledge Workers','Agents for Everyone','Agents for Everyone'];
  const stories=focuses.map((focus,i)=>{
    const id='story-'+(i+1);
    return {id,focus,headline:'Source verified story '+id,summary:'Detailed story explanation '+id,
      why_it_matters:'Specific verified significance '+id,image_alt_intent:'Mechanism explanation for '+id,
      permanent_route:'/stories/'+DATE+'/'+id+'/',
      source:{url:'https://publisher'+i+'.org/article',title:'Original evidence '+id,publisher:'Publisher '+i,
        published_at:'2026-10-10',retrieved_at:'2026-10-10T12:00:00Z',
        read_evidence:{status:'verified',full_source_read:true,method:'publisher_main_text',scope:'Whole publisher main article',read_at:'2026-10-10T13:00:00Z'}}
    };
  });
  const bundle={schema_version:'daily-compiler-edition-bundle-v1',edition_date:DATE,status:'BUNDLE_READY',
    stories,videos:[{id:1},{id:2}],podcasts:[{id:3},{id:4}],watchlist:{new:[]},book_mappings:[],
    images:stories.map(story=>({story_id:story.id,status:'pending',accepted:false,placeholder_id:'illustration-pending-1200x630-v1',alt:story.image_alt_intent})),
    image_representation:{status:'images_pending',placeholder_id:'illustration-pending-1200x630-v1',width:1200,height:630}
  };
  const bundleBytes=Buffer.from(JSON.stringify(bundle,null,2)+'\n');
  const state={state:'SHADOW_VERIFIED',stage:'VERIFY',edition_date:DATE,execution_id:'compiler-'+DATE+'-r1',branch:'shadow/'+DATE,
    images:{mode:'images_pending',required:6,accepted:[],placeholder_id:'illustration-pending-1200x630-v1'},
    bundle:{digest:digest(bundleBytes)},preview:{bundle_digest:digest(bundleBytes)},
    reader_parity:{result:'PASS'}};
  const liveReceipt={result:'PASS',mode:'postdeploy',edition_date:DATE,oct8_protected_count:17,live_checked:24,
    verified_at:'2026-10-10T15:00:00Z',live_http_and_sha256:[
      ...Array.from({length:17},(_,i)=>({url:BASE+'historic/'+i})),
      {url:BASE+'briefs/'+DATE+'/'},
      ...stories.map(s=>({url:BASE+s.permanent_route.slice(1)}))
    ]};
  return {bundle,bundleBytes,state,sourceCommit:'a'.repeat(40),liveReceipt};
}
test('external app handoff requires explanatory text and permits story-fit infographics without preapproving art',()=>{
  const f=fixture(),job=buildExternalImageJob(f);
  assert.equal(job.lifecycle,'PUBLISHED_PENDING');
  assert.equal(job.accepted_images,0);
  assert.equal(job.source.bundle_sha256,digest(f.bundleBytes));
  assert.equal(job.stories.length,6);
  assert.equal(job.quality.explanatory_text_required,true);
  assert.equal(job.quality.story_fit_infographic_allowed,true);
  assert.deepEqual(job.stories.map(s=>s.story_id),f.bundle.stories.map(s=>s.id));
  assert.equal(new Set(job.stories.map(s=>s.permanent_url)).size,6);
  for(const s of job.stories){
    assert.equal(s.visual_specification.labels_authorized,true);
    assert.equal(s.visual_specification.visible_text_required,true);
    assert.equal(s.visual_specification.label_specification_status,'APP_MUST_PREPARE_SOURCE_SUPPORTED_EXACT_LABELS');
    assert.equal(s.visual_specification.story_fit_infographic_allowed,true);
    assert.deepEqual(s.visual_specification.visible_text_allowlist,[]);
    assert.equal(s.primary_source.verified_read_evidence.full_source_read,true);
    assert.equal(s.accepted_locked,false);
  }
});
test('failed, unverified, stale, wrong-date and fake image input fail closed',()=>{
  const f=fixture();
  assert.throws(()=>buildExternalImageJob({...f,state:{...f.state,state:'SHADOW_FAILED'}}),/verified_published/);
  assert.throws(()=>buildExternalImageJob({...f,liveReceipt:{...f.liveReceipt,result:'FAIL'}}),/live_release/);
  assert.throws(()=>buildExternalImageJob({...f,bundleBytes:Buffer.concat([f.bundleBytes,Buffer.from(' ')])}),/verified_published/);
  assert.throws(()=>buildExternalImageJob({...f,sourceCommit:'f'}),/source_commit/);
  const old=JSON.parse(f.bundleBytes);old.edition_date='2026-10-08';
  assert.throws(()=>buildExternalImageJob({...f,bundleBytes:Buffer.from(JSON.stringify(old))}),/historic/);
  const accepted=JSON.parse(f.bundleBytes);accepted.images[0].accepted=true;
  assert.throws(()=>buildExternalImageJob({...f,bundleBytes:Buffer.from(JSON.stringify(accepted))}),/verified_published|pending_figure/);
});
test('immutable edition packet and index are idempotent; changed source cannot overwrite',t=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'external-job-'));
  t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
  const hist=path.join(tmp,'history'),out=path.join(tmp,'new','image-jobs');
  fs.mkdirSync(hist,{recursive:true});
  const f=fixture(),job=buildExternalImageJob(f);
  const first=writeExternalImageJob({job,historyRoot:hist,outputRoot:out});
  assert.equal(first.index.latest_eligible_date,DATE);
  assert.equal(first.index.editions.length,1);
  assert.equal(fs.existsSync(path.join(out,DATE,'job.json')),true);
  const again=writeExternalImageJob({job,historyRoot:hist,outputRoot:out});
  assert.deepEqual(again.entry,first.entry);
  assert.throws(()=>writeExternalImageJob({job:{...job,execution_id:'mutated'},historyRoot:hist,outputRoot:out}),/immutable_job/);
});


test('postdeploy index inherits immutable older jobs and newest eligible ignores later released jobs',t=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'external-job-history-'));
  t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
  const hist=path.join(tmp,'history'),histIndex=path.join(hist,'image-jobs','index.json');
  const out=path.join(tmp,'new','image-jobs');
  fs.mkdirSync(path.dirname(histIndex),{recursive:true});
  const records=[
    {edition_date:'2026-10-10',status:'PUBLISHED_PENDING',job_url:'historical-job-1'},
    {edition_date:'2026-10-12',status:'RELEASED_VERIFIED',job_url:'historical-job-2'}
  ];
  const original={schema_version:'external-compiler-image-index-v1',latest_eligible_date:'2026-10-10',editions:records};
  const originalText=JSON.stringify(original,null,2)+'\n';
  fs.writeFileSync(histIndex,originalText);
  fs.mkdirSync(path.join(hist,'image-jobs','2026-10-10'),{recursive:true});
  fs.writeFileSync(path.join(hist,'image-jobs','2026-10-10','job.json'),'{"immutable":"older"}\n');
  const job=buildExternalImageJob(fixture());
  const {index}=writeExternalImageJob({job,historyRoot:hist,outputRoot:out});
  assert.equal(index.editions.length,3);
  assert.equal(index.latest_eligible_date,DATE);
  assert.deepEqual(index.editions.map(x=>x.edition_date),['2026-10-10','2026-10-11','2026-10-12']);
  assert.equal(fs.readFileSync(histIndex,'utf8'),originalText);
  assert.equal(fs.readFileSync(path.join(out,'2026-10-10','job.json'),'utf8'),'{"immutable":"older"}\n');
  const latest=JSON.parse(fs.readFileSync(path.join(out,'index.json'),'utf8'));
  assert.equal(latest.latest_eligible_date,DATE);
});
test('publication workflow generates optional index only AFTER live proof and verified state persistence',()=>{
  const yml=fs.readFileSync('.github/workflows/shadow-compile.yml','utf8');
  const live=yml.indexOf('Independently verify every new public page plus all 17 preserved October 8 objects');
  const state=yml.indexOf('Persist parity receipts on the same semantic execution');
  const job=yml.indexOf('Nonblocking post-verification external image-job discovery');
  const history=yml.indexOf('Persist cumulative verified reader history');
  assert.ok(live>=0&&state>live&&job>state&&history>job);
  const scope=yml.slice(job,history);
  assert.match(scope,/continue-on-error: true/);
  assert.match(scope,/scripts\/external-image-jobs\.mjs/);
  assert.match(scope,/build\/postpublish-integrity\.json/);
  assert.match(scope,/git -C run rev-parse HEAD/);
  assert.doesNotMatch(scope,/image_gen|render-shadow-images|workflow_dispatch|create_task|schedule:/);
});


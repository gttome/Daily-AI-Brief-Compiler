import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {compileShadow,validateEdition,sha256} from '../compiler/compile.mjs';
import {validateNewPendingEditorial} from '../compiler/pending-editorial.mjs';
import {adaptCompilerBundle,canonicalWatchTopicId} from '../compiler/reader-adapter.mjs';
import {watchlistScoringProblems,WATCHLIST_RUBRIC_KEYS} from '../compiler/watchlist-rubric.mjs';
import {publicWatchlist} from '../vendor/production-reader/snapshot/_generator/lib/watchlist.mjs';

// Entirely synthetic test data, never production research or scheduled proof.
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const date='2026-10-16',stamp='2026-10-15T18:00:00Z';
const copy={
 summary:'Agent policy checks constrain automated actions through explicit permissions and auditable tool boundaries.',
 why_now:'The October 15 test announcement documents a permission change requiring scoped technical evaluation.',
 practical_value:'Professional teams can design narrow access tests with human escalation before deploying these controls.'
};
const rubric={
 novelty:{score:4,reason:'The test source adds explicit tool permissions to its previously unrestricted execution mechanism.'},
 evidence:{score:4,reason:'The fixture documentation describes permission configuration but supplies no independent operational benchmark results.'},
 independence:{score:1,reason:'Only the original fixture publisher describes this change; independent corroborating developments are unavailable.'},
 momentum:{score:null,reason:'No comparable observations over time exist in these test records, leaving measured momentum unknown.'},
 relevance:{score:5,reason:'Professional users can evaluate the documented permission boundary using a controlled tool access test.'},
 durability:{score:3,reason:'Explicit permission boundaries address recurring workflow requirements, although this implementation may change substantially.'}
};
function candidate(){
 const bundle=read('fixtures/complete-edition/edition-bundle.json');
 const state=read('fixtures/complete-edition/compiler-state.json');
 delete bundle.fixture_only; delete bundle.producer_receipt.preview_only;
 bundle.edition_date=date; state.edition_date=date;state.branch='shadow/'+date;
 state.state='BUNDLE_READY';state.stage='BUNDLE';state.execution_id='test-only-future-format';
 for(const [i,s] of bundle.stories.entries()){
  s.permanent_route='/stories/'+date+'/test-story-'+i+'/';
  s.source.url='https://research-'+i+'.test/article';
  s.source.published_at='2026-10-15';s.source.retrieved_at=stamp;
  s.source.read_evidence={status:'verified',full_source_read:true,method:'publisher_main_text',read_at:stamp,scope:'Synthetic full source scope used only inside this regression test'};
  s.topics=['tool permissions','access checks','human review'];
  s.summary='This synthetic test article describes how explicit permission boundaries constrain tool execution in a controlled agent workflow. The fixture records a request, an access check, an allowed action and an audit entry. It also documents a denied action so that readers can examine the limits of the mechanism.';
  s.why_it_matters='Professional teams can use this test scenario to identify where an action requires permission and where a human should review the outcome. The fixture supports testing validation boundaries without claiming that a real deployment was observed.';
  if(s.agent_skills)s.agent_skills_evidence='The test procedure defines reusable inputs, allowed tool actions, access checks and a repeatable audit output.';
 }
 for(const [i,item] of [...bundle.videos,...bundle.podcasts].entries()){
  item.url='https://media-'+i+'.test/episode';
  item.original_date='2026-10-15';
  item.verification={identity_verified:true,duration_verified:true,checked_at:stamp,runtime_source_url:item.url};
 }
 bundle.watchlist.refreshed_at=stamp;
 for(const kind of ['new','updated','carried_forward','dropped'])for(const item of bundle.watchlist[kind]){
  Object.assign(item,copy,{rubric:structuredClone(rubric)});
  item.evidence={url:'https://watchlist.test/'+kind,date:'2026-10-15'};
 }
 bundle.image_representation={status:'images_pending',placeholder_id:'illustration-pending-1200x630-v1',width:1200,height:630};
 bundle.images=bundle.stories.map(s=>({story_id:s.id,status:'pending',accepted:false,placeholder_id:bundle.image_representation.placeholder_id,alt:s.image_alt_intent}));
 state.images={required:6,accepted:[],mode:'images_pending',placeholder_id:bundle.image_representation.placeholder_id};
 return {bundle,state};
}
function measured(item){
 item.rubric.momentum.score=2;
 item.rubric.momentum.reason='Two dated test observations of the same permission check count establish a limited measurable increase.';
 item.momentum={classification:'baseline',metric:'successful permission checks in the same test workload',observations:[
  {observed_at:'2026-10-14T18:00:00Z',value:10,source_url:'https://watchlist.test/observation-one'},
  {observed_at:'2026-10-15T18:00:00Z',value:12,source_url:'https://watchlist.test/observation-two'}
 ]};
}
function files(p,dir){
 const bundlePath=path.join(dir,'bundle.json'),statePath=path.join(dir,'state.json');
 fs.writeFileSync(bundlePath,JSON.stringify(p.bundle,null,2)+'\n');
 p.state.bundle.digest=sha256(fs.readFileSync(bundlePath));
 fs.writeFileSync(statePath,JSON.stringify(p.state,null,2)+'\n');
 return {bundlePath,statePath,repoRoot:'.',allowPendingImages:true,release1Production:true};
}

test('future-format producer output passes unchanged full deterministic production validation and reader compilation',async()=>{
 const p=candidate(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'future-rubric-'));
 try{
  assert.equal(validateNewPendingEditorial(p).result,'PASS');
  const inputs=files(p,dir);
  assert.equal(validateEdition(inputs).bundle.edition_date,date);
  const cli=JSON.parse(execFileSync(process.execPath,['scripts/validate-semantic-bundle.mjs',inputs.statePath,inputs.bundlePath],{encoding:'utf8'}));
  assert.equal(cli.result,'PASS');assert.equal(cli.bundle_sha256,p.state.bundle.digest);
  const receipt=await compileShadow({...inputs,outDir:path.join(dir,'reader')});
  assert.equal(receipt.result,'PASS');assert.equal(receipt.reader_parity_gate.result,'PASS');
  assert.equal(receipt.accepted_image_regenerations,0);
  const result=publicWatchlist(adaptCompilerBundle(p.bundle).watchlist);
  const item=result.topics.find(t=>t.topic_id===canonicalWatchTopicId(p.bundle.watchlist.new[0]));
  assert.equal(item.rubric.momentum.score,null);
  assert.equal(item.research_score,60); // Legitimate differentiated 60 is allowed; no blanket total blacklist.
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('both new and updated topics reject missing rubric, missing evidence and synthetic defaults',()=>{
 for(const kind of ['new','updated'])for(const change of [
  item=>{delete item.rubric;},
  item=>{delete item.rubric.evidence.reason;},
  item=>{item.rubric.evidence.reason={fake:'not evidence'};},
  item=>{delete item.evidence;},
  item=>{item.rubric=Object.fromEntries(WATCHLIST_RUBRIC_KEYS.map(k=>[k,{score:3,reason:rubric[k].reason}]));},
  item=>{item.rubric.independence.reason=item.rubric.evidence.reason;}
 ]){
  const p=candidate();change(p.bundle.watchlist[kind][0]);
  assert.throws(()=>validateNewPendingEditorial(p),/Watchlist/);
 }
});

test('numeric momentum on new and updated items requires genuine-shaped comparisons and survives adaptation',()=>{
 for(const kind of ['new','updated']){
  const p=candidate(),item=p.bundle.watchlist[kind][0];measured(item);
  assert.equal(validateNewPendingEditorial(p).result,'PASS');
  const adapted=adaptCompilerBundle(p.bundle).watchlist.topics.find(t=>t.topic_id===canonicalWatchTopicId(item));
  assert.deepEqual(adapted.momentum,item.momentum);
  for(const damage of [
   x=>{delete x.momentum;},x=>{x.momentum.observations=[];},
   x=>{x.momentum.observations=[{},{}];},x=>{x.momentum.observations[1]=structuredClone(x.momentum.observations[0]);},
   x=>{x.momentum.observations[0].value=null;},x=>{x.momentum.observations[0].source_url='http://watchlist.test';},
   x=>{delete x.momentum.metric;}
  ]){
   const bad=structuredClone(p);damage(bad.bundle.watchlist[kind][0]);
   assert.throws(()=>validateNewPendingEditorial(bad),/measured momentum/);
   assert.throws(()=>adaptCompilerBundle(bad.bundle),/measured momentum/);
  }
 }
});

test('carried-forward topics retain reviewed rubrics without manufactured scores; missing prior fails closed',()=>{
 const p=candidate(),item=p.bundle.watchlist.carried_forward[0];
 const prior=adaptCompilerBundle(p.bundle).watchlist;
 const expected=structuredClone(prior.topics.find(t=>t.topic_id===canonicalWatchTopicId(item)).rubric);
 delete item.rubric;
 assert.equal(validateNewPendingEditorial(p).result,'PASS');
 const output=adaptCompilerBundle(p.bundle,{priorWatchlist:prior}).watchlist;
 assert.deepEqual(output.topics.find(t=>t.topic_id===canonicalWatchTopicId(item)).rubric,expected);
 assert.throws(()=>adaptCompilerBundle(p.bundle),/missing criterion-specific research rubric/);
 assert.deepEqual(prior.topics.find(t=>t.topic_id===canonicalWatchTopicId(item)).rubric,expected);
});

test('updated topic resets unobserved momentum to unknown while retaining fresh rubric',()=>{
 const p=candidate(),item=p.bundle.watchlist.updated[0];
 const prior=adaptCompilerBundle(p.bundle).watchlist;
 prior.topics.find(t=>t.topic_id===canonicalWatchTopicId(item)).momentum={classification:'baseline',score:4};
 const result=adaptCompilerBundle(p.bundle,{priorWatchlist:prior}).watchlist.topics.find(t=>t.topic_id===canonicalWatchTopicId(item));
 assert.equal(result.rubric.momentum.score,null);assert.equal(result.momentum.score,null);
});

test('October 15 remains compatible and historical bundles are not retroactively rejected',()=>{
 const p=candidate();p.bundle.edition_date='2026-10-15';p.state.edition_date=p.bundle.edition_date;p.state.branch='shadow/'+p.bundle.edition_date;
 for(const kind of ['new','updated','carried_forward','dropped'])for(const item of p.bundle.watchlist[kind])delete item.rubric;
 assert.equal(validateNewPendingEditorial(p).result,'PASS');
 assert.doesNotThrow(()=>adaptCompilerBundle(p.bundle));
});

test('read-only preseal check preserves digest, source reading, allocation and image gates',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'preseal-fail-'));
 try{
  for(const damage of [
   p=>{p.state.bundle.digest='0'.repeat(64);},
   p=>{p.bundle.stories[0].source.read_evidence.full_source_read=false;},
   p=>{p.bundle.stories[0].focus='Agents for Everyone';},
   p=>{p.bundle.images[0].accepted=true;}
  ]){
   const p=candidate();const inputs=files(p,dir);damage(p);
   fs.writeFileSync(inputs.bundlePath,JSON.stringify(p.bundle,null,2)+'\n');
   if(p.state.bundle.digest!=='0'.repeat(64))p.state.bundle.digest=sha256(fs.readFileSync(inputs.bundlePath));
   fs.writeFileSync(inputs.statePath,JSON.stringify(p.state,null,2)+'\n');
   assert.throws(()=>validateEdition(inputs));
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

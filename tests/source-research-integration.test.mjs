import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SOURCE_EVIDENCE_VERSION,buildSourcePlan,makeQualificationPortfolio,
  applySourceQualifications,makeSourceSnapshot,sourceDigest,validateSourceSnapshot
} from '../operations/source-discovery.mjs';
import {reconcileSourceDirectory,resourceRegistryDigest} from '../operations/resources.mjs';
import {
  articleResearchFreshness,buildSourceResearch,replayBoundSourceAcquisition,validateSourceEditorial
} from '../producer/source-research.mjs';
import {RESEARCH_FOCUS,validateResearchEnvelope} from '../producer/research.mjs';
import {mediaDurationBand} from '../compiler/media.mjs';

// Synthetic integration fixtures only. Migration inputs are copied before
// introducing .invalid publishers. No network, real edition state or existing
// fixture file is changed, and these bindings do not assert real live capture.
const read=file=>JSON.parse(fs.readFileSync(new URL(file,import.meta.url),'utf8'));
const baseline=read('../migrations/source-portfolio-v1/registry.before.json');
const directory=read('../migrations/source-portfolio-v1/directory.json');
const policy=read('../config/source-discovery-policy.json');
const copy=value=>structuredClone(value);
const A='synthetic-research-a',B='synthetic-research-b';
const PRIMARY='https://a.example.invalid/catalogue',SECOND='https://b.example.invalid/catalogue';
const ALTERNATE='https://a.example.invalid/archive',NEW='https://new.example.invalid/catalogue';
const PUB='synthetic-publisher',CUT='2026-10-08T06:00:00Z',CHECKED='2026-10-08T06:30:00Z';
const DATE='2026-10-08',REF='tests/synthetic-acquisition.json';
const byId=(context,id)=>context.registry.resources.find(r=>r.resource_id===id);
const has=(errors,part)=>errors.some(error=>error.includes(part));

function resource(id,url){
  return {...copy(baseline.resources[0]),resource_id:id,name:'Synthetic '+id,url,endpoint:url,
    enabled:true,priority:'primary',search_mode:'page',content_types:['article','video','podcast'],publisher:PUB,
    notes:'Synthetic research integration fixture only.',
    health:{status:'unknown',last_checked_at:null,last_success_at:null,consecutive_failures:0,observed_yield_rate:null,freshness_hit_rate:null}};
}
function item(url,patch={}){
  return {url,title:'Synthetic exact item',publication:{precision:'date',original_value:'2026-10-06',timezone:null},
    duration_seconds:null,substantive_support:'Synthetic observed substantive evidence.',evidence_refs:['synthetic:item'],...copy(patch)};
}
function extraction(r,patch={}){
  const raw='Synthetic metadata response for '+r.url;
  return {schema_version:SOURCE_EVIDENCE_VERSION,method:'chatgpt_web_open',resource_id:r.resource_id,endpoint:r.endpoint||r.url,
    checked_at:CHECKED,source_ref:'synthetic:metadata',raw_response_sha256:sourceDigest(raw),returned_response_bytes:Buffer.byteLength(raw),duration_ms:null,
    retrieval:{status:'healthy',http_status:null,reason:null},publisher_identity:{status:'verified',canonical_id:PUB,name:'Synthetic publisher',
      evidence_basis:'Synthetic publisher identity fixture, not a real-world identity assertion.'},
    items:[item(new URL('/items/one',r.url).href)],limitations:[],...copy(patch)};
}
function fixture({shared=false,qualified=true,alternate=false,qualifyNew=false}={}){
  const before=copy(baseline),input=copy(directory);
  before.resources.unshift(resource(A,PRIMARY),resource(B,shared?PRIMARY:SECOND));
  // Two copied directory memberships trace the same new synthetic source.
  for(const layer of [1,3]){
    const row=input.rows.find(r=>r.layer===layer&&r.directory_status==='New');
    row.url=NEW;row.name='Synthetic expanded research publisher';
  }
  input.baseline_registry.sha256=resourceRegistryDigest(before);
  input.baseline_registry.resource_ids=before.resources.map(r=>r.resource_id);
  let registry=reconcileSourceDirectory(before,input,{appliedAt:CUT}).registry;
  const newId=registry.resources.find(r=>r.url===NEW).resource_id;
  const ids=[...(qualified?[A,B]:[]),...(qualifyNew?[newId]:[])];
  const observations=ids.map(id=>extraction(registry.resources.find(r=>r.resource_id===id)));
  if(alternate)observations.find(e=>e.resource_id===A).approved_alternates=[{endpoint:ALTERNATE,evidence_ref:'synthetic:publisher-linked-alternate'}];
  const qualifications=makeQualificationPortfolio(registry,policy,observations,{recorded_at:CHECKED,evidence_path:'tests/synthetic-qualifications.json'});
  registry=applySourceQualifications(registry,policy,qualifications);
  const snapshot=makeSourceSnapshot(registry,policy,qualifications,{recorded_at:CHECKED});
  assert.deepEqual(validateSourceSnapshot(registry,policy,qualifications,snapshot,observations),[]);
  return {registry,policy,qualifications,snapshot,observations,newId};
}
function planFor(context,patch={}){
  return buildSourcePlan(context.registry,policy,{reference_date:DATE,cutoff_at:CUT,purpose:'edition',...patch});
}
function documentFor(plan,evidence,patch={}){
  const mode=plan.purpose==='edition'?'live_plan_capture':'saved_evidence_replay';
  const observations=copy(evidence);
  function bind(e){
    const row=plan.rows.find(r=>r.resource_id===e.resource_id);
    e.acquisition_binding={plan_sha256:sourceDigest(plan),probe_key:row.probe_key,cutoff_at:plan.cutoff_at,mode};
    if(e.alternate_attempt)bind(e.alternate_attempt);
  }
  observations.forEach(bind);
  return {plan_sha256:sourceDigest(plan),research_cutoff_at:plan.cutoff_at,acquisition_mode:mode,evidence_path:REF,observations,...patch};
}
const request=(id,url,patch={})=>({resource_id:id,item_url:url,type:'article',focus:RESEARCH_FOCUS[0],agent_skills:false,score:100,...patch});
function failedPrimary(context){
  return extraction(byId(context,A),{retrieval:{status:'parse_error',http_status:null,reason:'Synthetic failed primary extraction.'},items:[],
    alternate_attempt:extraction(byId(context,A),{endpoint:ALTERNATE,source_ref:'synthetic:alternate',
      items:[item('https://a.example.invalid/items/alternate',{substantive_support:'Synthetic alternate substantive evidence.'})]})});
}

test('protected expanded source can supply bounded article and video research while rollout stays partial',()=>{
  const context=fixture({qualifyNew:true}),before=copy(context),r=byId(context,context.newId);
  const plan=planFor(context,{purpose:'qualification_rehearsal',topic_resource_ids:[r.resource_id]});
  const e=extraction(r),document=documentFor(plan,[e]);
  const result=buildSourceResearch(context,plan,document,[request(r.resource_id,e.items[0].url),request(r.resource_id,e.items[0].url,{type:'video'})]);
  assert.equal(result.result,'BOUNDED_RESEARCH_PASS');
  assert.equal(result.source_rollout,'SOURCE_ROLLOUT_PARTIAL');
  assert.equal(result.acquisition_mode,'saved_evidence_replay');
  assert.equal(result.envelope.retained_articles.length,1);
  assert.equal(result.envelope.media.video.retained_candidates.length,1);
  assert.equal(result.source_bindings.length,2);
  for(const binding of result.source_bindings){
    assert.equal(binding.route_approval,'protected_qualified_route');
    assert.deepEqual(binding.membership_ids,plan.rows.find(row=>row.resource_id===r.resource_id).membership_ids);
    assert.equal(binding.membership_ids.length,2);
  }
  assert.deepEqual(validateResearchEnvelope(result.envelope),[]);
  assert.deepEqual(context,before,'qualification, registry and original source observations are immutable');
});

test('preserved enabled route can establish current usability without a config grant or complete rollout',()=>{
  const context=fixture({qualified:false}),before=copy(context),plan=planFor(context);
  const e=extraction(byId(context,A)),document=documentFor(plan,[e]);
  const result=buildSourceResearch(context,plan,document,[request(A,e.items[0].url)]);
  assert.equal(result.envelope.retained_articles.length,1);
  assert.equal(result.source_bindings[0].route_approval,'preserved_enabled_route_with_current_qualification');
  assert.equal(byId(context,A).discovery.qualification_status,'pending');
  assert.deepEqual(context,before);
});

test('successful current extraction cannot enable an unqualified new import or promote another primary',()=>{
  const context=fixture(),r=byId(context,context.newId),plan=planFor(context,{topic_resource_ids:[r.resource_id]});
  const e=extraction(r),result=buildSourceResearch(context,plan,documentFor(plan,[e]),[request(r.resource_id,e.items[0].url)]);
  assert.equal(result.envelope.retained_articles.length,0);
  assert.equal(result.rejected_requests[0].reason,'resource_not_enabled');
  assert.equal(r.enabled,false);
  const changed=fixture({qualifyNew:true}),registered=byId(changed,changed.newId),p=planFor(changed,{topic_resource_ids:[registered.resource_id]});
  const swapped=extraction(registered,{endpoint:'https://unapproved.example.invalid/catalogue'});
  const rejected=buildSourceResearch(changed,p,documentFor(p,[swapped]),[request(registered.resource_id,swapped.items[0].url)]);
  assert.equal(rejected.envelope.retained_articles.length,0);
  assert.equal(registered.discovery.endpoint,NEW);
});

test('duplicate exact item retains its winning source support and one matching observation binding',()=>{
  const context=fixture(),plan=planFor(context),url='https://items.example.invalid/exact/shared';
  const a=extraction(byId(context,A),{items:[item(url,{substantive_support:'ALPHA retained high-ranked source.'})]});
  const b=extraction(byId(context,B),{items:[item(url,{substantive_support:'BETA discarded lower-ranked source.'})]});
  const document=documentFor(plan,[a,b]),requests=[request(A,url,{score:100}),request(B,url,{score:1})];
  for(const ordered of [requests,[...requests].reverse()]){
    const result=buildSourceResearch(context,plan,document,ordered),retained=result.envelope.retained_articles[0];
    assert.equal(result.envelope.retained_articles.length,1);
    assert.equal(retained.resource_id,A);
    assert.equal(result.envelope.deep_packets[0].evidence_text,a.items[0].substantive_support);
    assert.equal(result.source_bindings.length,1);
    assert.equal(result.source_bindings[0].resource_id,A);
    assert.equal(result.source_bindings[0].source_observation_sha256,sourceDigest(document.observations[0]));
    assert.equal(retained.source_observation_sha256,result.source_bindings[0].source_observation_sha256);
  }
});

test('one qualified shared response supplies an equivalent resource with actual observation provenance',()=>{
  const context=fixture({shared:true}),plan=planFor(context),a=extraction(byId(context,A));
  const document=documentFor(plan,[a]),result=buildSourceResearch(context,plan,document,[request(B,a.items[0].url)]);
  assert.equal(result.envelope.retained_articles.length,1);
  assert.equal(result.envelope.retained_articles[0].resource_id,B);
  assert.equal(result.source_bindings[0].observation_resource_id,A);
  assert.equal(result.source_bindings[0].source_observation_ref,REF+'#'+A);
  assert.equal(result.source_bindings[0].source_observation_sha256,sourceDigest(document.observations[0]));
  assert.equal(replayBoundSourceAcquisition(context,plan,document).unique_primary_probes,1);
});

test('a response from a distinct endpoint cannot supply a missing source or escape exhausted probe budget',()=>{
  const context=fixture(),a=extraction(byId(context,A)),b=extraction(byId(context,B)),plan=planFor(context);
  const missing=buildSourceResearch(context,plan,documentFor(plan,[a]),[request(B,a.items[0].url)]);
  assert.equal(missing.envelope.retained_articles.length,0);
  assert.equal(missing.rejected_requests[0].reason,'current_due_observation_required');
  const limited=planFor(context,{max_probes:1}),document=documentFor(limited,[a,b]);
  const result=buildSourceResearch(context,limited,document,[request(A,a.items[0].url),request(B,b.items[0].url)]);
  assert.deepEqual(result.envelope.retained_articles.map(c=>c.resource_id),[A]);
  assert.equal(result.rejected_requests[0].resource_id,B);
  assert.equal(result.rejected_requests[0].reason,'current_due_observation_required');
});

test('healthy approved alternate supplies research after failed primary without changing the primary grant',()=>{
  const context=fixture({alternate:true}),before=copy(context),plan=planFor(context),primary=failedPrimary(context);
  const document=documentFor(plan,[primary]),result=buildSourceResearch(context,plan,document,[request(A,primary.alternate_attempt.items[0].url)]);
  assert.equal(result.envelope.retained_articles.length,1);
  assert.equal(result.envelope.retained_articles[0].source_url,ALTERNATE);
  const binding=result.source_bindings[0];
  assert.equal(binding.primary_endpoint,PRIMARY);
  assert.equal(binding.retrieval_endpoint,ALTERNATE);
  assert.equal(binding.approved_alternate_used,true);
  assert.equal(binding.source_observation_ref,REF+'#'+A+'/alternate_attempt');
  assert.equal(binding.source_observation_sha256,sourceDigest(document.observations[0].alternate_attempt));
  assert.equal(replayBoundSourceAcquisition(context,plan,document).alternate_probes,1);
  assert.deepEqual(context,before);
});

test('unapproved alternate and alternate after healthy primary fail; wrong publisher cannot yield research',()=>{
  const unapproved=fixture(),p=planFor(unapproved),failure=failedPrimary(unapproved);
  assert.throws(()=>buildSourceResearch(unapproved,p,documentFor(p,[failure]),[]),/unapproved_acquisition_alternate/);
  const context=fixture({alternate:true}),plan=planFor(context),healthy=extraction(byId(context,A),{alternate_attempt:failure.alternate_attempt});
  assert.throws(()=>buildSourceResearch(context,plan,documentFor(plan,[healthy]),[]),/alternate_after_success/);
  const swapped=failedPrimary(context);swapped.alternate_attempt.publisher_identity.canonical_id='different-publisher';
  const result=buildSourceResearch(context,plan,documentFor(plan,[swapped]),[request(A,swapped.alternate_attempt.items[0].url)]);
  assert.equal(result.envelope.retained_articles.length,0);
  assert.equal(result.rejected_requests[0].reason,'current_route_unavailable_or_invalid');
});

test('per-response acquisition bindings reject changed cutoff or plan wrappers with old captured scope',()=>{
  const context=fixture(),plan=planFor(context),e=extraction(byId(context,A)),document=documentFor(plan,[e]);
  const later=planFor(context,{cutoff_at:'2026-10-09T06:00:00Z'}),rewrapped={...document,plan_sha256:sourceDigest(later),research_cutoff_at:later.cutoff_at};
  assert.throws(()=>buildSourceResearch(context,later,rewrapped,[request(A,e.items[0].url)]),/response_acquisition_binding/);
  for(const change of [
    d=>{delete d.observations[0].acquisition_binding;},
    d=>{d.observations[0].acquisition_binding.probe_key='a'.repeat(64);},
    d=>{d.observations[0].acquisition_binding.plan_sha256='b'.repeat(64);},
    d=>{d.observations[0].acquisition_binding.cutoff_at='2026-10-07T06:00:00Z';},
    d=>{d.observations[0].acquisition_binding.mode='saved_evidence_replay';},
    d=>{d.observations[0].acquisition_binding.claimed_verified=true;}
  ]){
    const invalid=copy(document);change(invalid);
    assert.throws(()=>replayBoundSourceAcquisition(context,plan,invalid),/response_acquisition_binding/);
  }
});

test('acquisition modes distinguish edition capture from honestly labeled saved rehearsal replay',()=>{
  const context=fixture(),edition=planFor(context),e=extraction(byId(context,A));
  const live=documentFor(edition,[e]);
  assert.doesNotThrow(()=>replayBoundSourceAcquisition(context,edition,live));
  assert.throws(()=>replayBoundSourceAcquisition(context,edition,{...live,acquisition_mode:'saved_evidence_replay'}),/acquisition_mode_scope/);
  const rehearsal=planFor(context,{purpose:'qualification_rehearsal'}),saved=documentFor(rehearsal,[e]);
  assert.doesNotThrow(()=>replayBoundSourceAcquisition(context,rehearsal,saved));
  assert.throws(()=>replayBoundSourceAcquisition(context,rehearsal,{...saved,acquisition_mode:'live_plan_capture'}),/acquisition_mode_scope/);
  assert.throws(()=>replayBoundSourceAcquisition(context,edition,{...live,acquisition_mode:undefined}),/acquisition_mode_scope/);
});

test('every alternate requires its own binding and must remain in the same due resource group',()=>{
  const context=fixture({alternate:true}),plan=planFor(context),document=documentFor(plan,[failedPrimary(context)]);
  for(const change of [
    d=>{delete d.observations[0].alternate_attempt.acquisition_binding;},
    d=>{d.observations[0].alternate_attempt.acquisition_binding.cutoff_at='2026-10-07T06:00:00Z';},
    d=>{d.observations[0].alternate_attempt.acquisition_binding.mode='saved_evidence_replay';}
  ]){
    const invalid=copy(document);change(invalid);
    assert.throws(()=>replayBoundSourceAcquisition(context,plan,invalid),/response_acquisition_binding/);
  }
  const wrong=copy(document);wrong.observations[0].alternate_attempt.resource_id=B;
  assert.throws(()=>replayBoundSourceAcquisition(context,plan,wrong),/acquisition_resource_scope/);
  const nested=copy(document);nested.observations[0].alternate_attempt.alternate_attempt=copy(document.observations[0].alternate_attempt);
  assert.throws(()=>replayBoundSourceAcquisition(context,plan,nested),/nested_alternate_not_allowed/);
});

test('unknown, duplicate or not-due observations cannot claim a plan capture',()=>{
  const context=fixture(),plan=planFor(context),document=documentFor(plan,[extraction(byId(context,A))]);
  const unknown=copy(document);unknown.observations[0].resource_id='unknown-synthetic-resource';
  assert.throws(()=>replayBoundSourceAcquisition(context,plan,unknown),/acquisition_resource_scope/);
  const duplicate=copy(document);duplicate.observations.push(copy(duplicate.observations[0]));
  assert.throws(()=>replayBoundSourceAcquisition(context,plan,duplicate),/duplicate_or_invalid_observation/);
  const notDue=plan.rows.find(r=>!r.due);assert.ok(notDue);
  const wrong=copy(document);wrong.observations[0].resource_id=notDue.resource_id;
  assert.throws(()=>replayBoundSourceAcquisition(context,plan,wrong),/acquisition_resource_scope/);
});

test('classification requests reject nonprimitive fields and oversized identifiers without echoing raw payloads',()=>{
  const context=fixture(),plan=planFor(context),e=extraction(byId(context,A)),good=request(A,e.items[0].url);
  const malformed=[
    {...good,item_url:{uncounted_text:'x'.repeat(1000000)}},
    {...good,item_url:'https://items.example.invalid/'+'x'.repeat(1000000)},
    {...good,resource_id:{uncounted_text:'Secret nested request body'}},
    {...good,resource_id:'x'.repeat(1000000)},
    {...good,focus:'x'.repeat(1000000)},
    {...good,agent_skills:'false'},
    {...good,score:Infinity},
    {...good,score:{rank:100}},
    {...good,raw_text:'x'.repeat(1000000)},null,[],42
  ];
  const result=buildSourceResearch(context,plan,documentFor(plan,[e]),malformed);
  assert.equal(result.envelope.retained_articles.length,0);
  assert.equal(result.rejected_requests.length,malformed.length);
  assert.equal(result.rejected_requests[0].item_url,null);
  assert.equal(result.rejected_requests[1].item_url,null);
  assert.equal(result.rejected_requests[2].resource_id,null);
  assert.equal(result.rejected_requests[3].resource_id,null);
  assert.ok(result.rejected_requests.every(r=>(r.resource_id===null||typeof r.resource_id==='string')&&(r.item_url===null||typeof r.item_url==='string')));
  assert.ok(JSON.stringify(result).length<10000,'rejection logging does not reintroduce the supplied megabytes into model-visible output');
});

test('classification count and response byte/item limits remain finite at the integrated boundary',()=>{
  const context=fixture(),plan=planFor(context),e=extraction(byId(context,A)),document=documentFor(plan,[e]);
  assert.throws(()=>buildSourceResearch(context,plan,document,Array(plan.unique_due_endpoints*policy.acquisition.max_items_per_response+1).fill(null)),/candidate_request_budget/);
  for(const patch of [
    {returned_response_bytes:policy.acquisition.max_response_bytes+1},
    {items:Array.from({length:policy.acquisition.max_items_per_response+1},(_,i)=>item('https://a.example.invalid/items/'+i))}
  ]){
    const over=extraction(byId(context,A),patch),result=buildSourceResearch(context,plan,documentFor(plan,[over]),[request(A,over.items[0].url)]);
    assert.equal(result.envelope.retained_articles.length,0);
    assert.equal(result.rejected_requests[0].reason,'current_route_unavailable_or_invalid');
  }
});

test('healthy homepage-only or undated evidence remains unqualified despite a previously granted route',()=>{
  const context=fixture(),plan=planFor(context),r=byId(context,A);
  for(const i of [item(PRIMARY),item('https://a.example.invalid/items/undated',{publication:{precision:'unknown',original_value:null,timezone:null}})]){
    const e=extraction(r,{items:[i]}),result=buildSourceResearch(context,plan,documentFor(plan,[e]),[request(A,i.url)]);
    assert.equal(result.envelope.retained_articles.length,0);
    assert.equal(result.rejected_requests[0].reason,'current_route_not_qualified');
  }
});

test('long video and unknown-runtime podcast remain discovery evidence without selected-media admission',()=>{
  const context=fixture(),plan=planFor(context),items=[
    item('https://a.example.invalid/items/long-talk',{duration_seconds:3600}),
    item('https://a.example.invalid/items/unknown-runtime')
  ];
  const e=extraction(byId(context,A),{items}),result=buildSourceResearch(context,plan,documentFor(plan,[e]),[
    request(A,items[0].url,{type:'video'}),request(A,items[1].url,{type:'podcast'})
  ]);
  const video=result.envelope.media.video.retained_candidates[0],podcast=result.envelope.media.podcast.retained_candidates[0];
  assert.equal(video.duration_seconds,3600);assert.equal(video.media_admission,'NOT_RUN');
  assert.equal(podcast.duration_seconds,null);assert.equal(podcast.show_id,PUB);
  assert.equal(result.selected_media_admission,'NOT_RUN');
  assert.equal(result.future_edition_selected,false);assert.equal(result.activation,'NOT_RUN');assert.equal(result.release,'NOT_RUN');
  assert.throws(()=>mediaDurationBand('video',video.duration_seconds),/duration exceeds/);
  assert.throws(()=>mediaDurationBand('podcast',podcast.duration_seconds),/unknown runtime remains unresolved/);
});

test('podcast show identity must match its existing grant while a pending baseline can establish a verified current show',()=>{
  const context=fixture(),plan=planFor(context),e=extraction(byId(context,A));
  e.publisher_identity.canonical_show_id='synthetic-different-show';
  const result=buildSourceResearch(context,plan,documentFor(plan,[e]),[request(A,e.items[0].url,{type:'podcast'})]);
  assert.equal(result.envelope.media.podcast.retained_candidates.length,0);
  assert.equal(result.rejected_requests[0].reason,'current_canonical_show_mismatch');
  assert.equal(byId(context,A).discovery.canonical_show_id,PUB);
  const pending=fixture({qualified:false}),p=planFor(pending),current=extraction(byId(pending,A));
  current.publisher_identity.canonical_show_id='synthetic-current-verified-show';
  const allowed=buildSourceResearch(pending,p,documentFor(p,[current]),[request(A,current.items[0].url,{type:'podcast'})]);
  assert.equal(allowed.envelope.media.podcast.retained_candidates[0].show_id,'synthetic-current-verified-show');
  assert.equal(allowed.source_bindings[0].route_approval,'preserved_enabled_route_with_current_qualification');
  assert.equal(allowed.selected_media_admission,'NOT_RUN');
  assert.equal(byId(pending,A).discovery.canonical_show_id,null);
});

test('article date uncertainty that straddles the 168-hour boundary stays unresolved instead of wholly too old',()=>{
  const dated=original_value=>({precision:'date',original_value,timezone:null});
  assert.deepEqual(articleResearchFreshness(dated('2026-10-01'),CUT),{
    status:'UNRESOLVED',reason:'publication_interval_crosses_168_hour_boundary'});
  assert.deepEqual(articleResearchFreshness(dated('2026-09-29'),CUT),{
    status:'INELIGIBLE',reason:'older_than_168_hours'});
  assert.deepEqual(articleResearchFreshness(dated('2026-10-08'),CUT),{
    status:'UNRESOLVED',reason:'publication_interval_crosses_cutoff'});
  assert.deepEqual(articleResearchFreshness({precision:'second',original_value:'2026-10-01T06:00:00Z',timezone:'UTC'},CUT),{
    status:'ELIGIBLE',band:'extended_168h'});
  assert.deepEqual(articleResearchFreshness({precision:'date',original_value:'2026-09-30',timezone:'UTC'},'2026-10-08T00:00:00Z'),{
    status:'INELIGIBLE',reason:'older_than_168_hours'},'an exclusive interval ending exactly at the lower boundary is wholly too old');
});

test('partial source rollout can validate synthetic six-story editorial research; replay and locked state cannot waive its gate',()=>{
  const context=fixture(),plan=planFor(context),publication={precision:'second',original_value:'2026-10-08T04:00:00Z',timezone:'UTC'};
  const items=Array.from({length:6},(_,i)=>item('https://a.example.invalid/items/story-'+i,{publication}));
  const requests=items.map((i,n)=>request(A,i.url,{focus:RESEARCH_FOCUS[Math.floor(n/2)],agent_skills:n===5,score:100-n}));
  const e=extraction(byId(context,A),{items}),document=documentFor(plan,[e]);
  const receipt=buildSourceResearch(context,plan,document,requests),selection={selected_ids:receipt.envelope.retained_articles.map(c=>c.id)};
  const state={stage:'EDITORIAL',state:'ALLOCATED',research_cutoff_at:CUT,editorial_bundle:{status:'pending'}};
  assert.equal(receipt.source_rollout,'SOURCE_ROLLOUT_PARTIAL');
  assert.deepEqual(validateSourceEditorial(context,plan,document,requests,receipt,selection,state),[]);
  const modified=copy(receipt);modified.envelope.deep_packets[0].evidence_text='Changed source evidence';
  assert.ok(has(validateSourceEditorial(context,plan,document,requests,modified,selection,state),'research_receipt_does_not_replay'));
  assert.ok(has(validateSourceEditorial(context,plan,document,requests,receipt,selection,{...state,editorial_bundle:{status:'complete'}}),'unfinished_editorial_required'));
  assert.ok(has(validateSourceEditorial(context,plan,document,requests,receipt,selection,{...state,research_cutoff_at:'2026-10-08T07:00:00Z'}),'frozen_state_cutoff_mismatch'));
  const rehearsal=planFor(context,{purpose:'qualification_rehearsal'}),saved=documentFor(rehearsal,[e]);
  const replay=buildSourceResearch(context,rehearsal,saved,requests);
  assert.ok(has(validateSourceEditorial(context,rehearsal,saved,requests,replay,selection,state),'qualification_rehearsal_cannot_select_edition'));
});

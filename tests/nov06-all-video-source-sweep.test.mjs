import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildVideoSourceSweepPlan,validateVideoSourceSweep} from '../operations/video-source-sweep.mjs';
import {buildEditorialResearchPlan} from '../operations/editorial-research-plan.mjs';

const registry=JSON.parse(fs.readFileSync('config/resource-registry.json','utf8'));
const edition='2026-11-07';
const lock='2026-11-07T02:30:00Z';
const videoRows=registry.resources.filter(r=>r.content_types.includes('video'));
function fullLedger(){
  const sweep=buildVideoSourceSweepPlan({editionDate:edition,registry});
  for(const o of sweep.observations){
    const r=videoRows.find(x=>x.resource_id===o.resource_id);
    o.outcome='NO_NEW_ITEMS';o.attempted_at='2026-11-07T01:30:00Z';
    o.method=r.search_mode==='feed'?'FEED':'DIRECT_PAGE';
    o.checked_url=r.url;o.candidate_urls=[];
    o.reason='Fixture-only example of a recorded source-specific review with no new candidates. Not an actual discovery result.';
  }
  return sweep;
}
test('planner accounts for all currently registered video sources, enabled and disabled',()=>{
  const p=buildEditorialResearchPlan({editionDate:edition,registry});
  const v=p.video_source_sweep;
  assert.equal(v.registered_count,videoRows.length);
  assert.equal(v.enabled_count,videoRows.filter(x=>x.enabled).length);
  assert.equal(v.qualification_only_count,videoRows.filter(x=>!x.enabled).length);
  assert.deepEqual(new Set(v.registry_snapshot.map(x=>x.resource_id)),
    new Set(videoRows.map(x=>x.resource_id)));
  assert.ok(v.observations.every(x=>x.outcome==='NOT_ATTEMPTED'&&x.attempted_at===null));
  assert.equal(new Set(v.observations.map(x=>x.resource_id)).size,videoRows.length);
  assert.equal(v.schema_version,'daily-video-source-sweep-v1');
});
test('not-attempted planner entries cannot masquerade as completed checks',()=>{
  const v=buildVideoSourceSweepPlan({editionDate:edition,registry});
  assert.throws(()=>validateVideoSourceSweep({
    editionDate:edition,registry,sweep:v,selectionLockedAt:lock}),/unattempted_stale_or_invalid_attempt/);
});
test('complete source-specific observations pass structural validation only',()=>{
  const v=fullLedger();
  const r=validateVideoSourceSweep({editionDate:edition,registry,sweep:v,selectionLockedAt:lock});
  assert.equal(r.result,'PASS');
  assert.equal(r.attempted_count,videoRows.length);
  assert.equal(r.qualification_only_sources,videoRows.filter(x=>!x.enabled).length);
  assert.match(r.caveat,/does not prove website retrieval/);
  assert.equal(r.archived_registry_snapshot,false);
});
test('missing, duplicated, unregistered, wrong-date and stale observations fail',()=>{
  const variations=[
    v=>v.observations.pop(),
    v=>v.observations[1].resource_id=v.observations[0].resource_id,
    v=>v.observations[0].resource_id='not-a-real-registry-id',
    v=>v.edition_date='2026-11-06',
    v=>v.observations[0].attempted_at='2026-11-04T01:30:00Z',
    v=>v.observations[0].attempted_at='2026-11-07T04:30:00Z',
    v=>v.observations[0].reason='ok',
    v=>v.observations[0].checked_url='http://example.com',
    v=>{v.observations[0].outcome='CANDIDATES_FOUND';v.observations[0].candidate_urls=[];},
    v=>v.registry_snapshot.pop(),
  ];
  for(const mutate of variations){
    const v=fullLedger();mutate(v);
    assert.throws(()=>validateVideoSourceSweep({editionDate:edition,registry,sweep:v,
      selectionLockedAt:lock}),/video_source_sweep:/);
  }
});
test('registry additions/removals require same-edition coverage, not a fixed count',()=>{
  const mod=structuredClone(registry);
  mod.resources.push({...videoRows[0],resource_id:'new-video-source-example',
    name:'New discovery qualification lead',
    url:'https://research.example.net/videos/',enabled:false});
  const old=fullLedger();
  assert.throws(()=>validateVideoSourceSweep({editionDate:edition,registry:mod,
    sweep:old,selectionLockedAt:lock}),/not_entire_current_video_registry/);
  const newPlan=buildVideoSourceSweepPlan({editionDate:edition,registry:mod});
  assert.equal(newPlan.registered_count,videoRows.length+1);
  assert.equal(newPlan.qualification_only_count,old.qualification_only_count+1);
});
test('published older editions are exempt from a prospective video sweep',()=>{
  assert.equal(validateVideoSourceSweep({editionDate:'2026-11-06',registry,
    sweep:null,selectionLockedAt:null}).result,'SKIPPED_HISTORICAL');
});

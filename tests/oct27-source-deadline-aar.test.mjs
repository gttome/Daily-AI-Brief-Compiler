import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {oct27SourceReadiness,renderOct27SourceSection} from '../scripts/oct27-source-readiness.mjs';
import {compileDailyReports,renderMarkdown} from '../scripts/compile-daily-aar.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cycle='2026-10-26',edition='2026-10-27';
const plan=()=>oct27SourceReadiness(edition);
const route={edition_date:edition,execution_id:'r27',counts:{
  registered:208,enabled:94,attempted:39,reachable:17,blocked:5,failures:17},
  resources:[{resource_id:'source-one',enabled:true,status:'NOT_CHECKED'}]};
const editorial={edition_date:edition,execution_id:'r27',counts:{
  eligible:83,attempted:9,candidates_found:5},
  resources:[{resource_id:'source-two',outcome:'NOT_VISITED'}]};

test('all five owner requirements are present with exact Oct28 deadline before any source evidence',()=>{
 const r=plan();
 assert.equal(r.target_edition,'2026-10-28');
 assert.equal(r.must_complete_before,'2026-10-27 19:15 America/Chicago');
 assert.deepEqual([r.baseline.registered,r.baseline.enabled,r.baseline.disabled,
   r.baseline.editorial_role_sources],[208,94,114,83]);
 assert.equal(r.actions.length,5);
 assert.deepEqual(r.actions.map(x=>x.id),[
  'SOURCE-01','SOURCE-02','SOURCE-03','SOURCE-04','SOURCE-05']);
 assert.ok(r.actions.every(x=>x.status==='OPEN_UNTIL_REAL_EVIDENCE'));
 assert.equal(r.recorded_route_attempts,null);
 assert.equal(r.recorded_editorial_source_visits,null);
 assert.equal(r.readiness,'NOT_VERIFIED');
 const md=renderOct27SourceSection(r);
 for(const title of ['Inspect real October 27 source-coverage receipts',
  'Qualify the previously disabled source portfolio',
  'Enable only currently qualified, nonduplicate sources',
  'Merge source-only changes under protected main',
  'Verify October 28 source-discovery readiness'])
  assert.ok(md.includes(title),title);
 assert.match(md,/NOT OBSERVED/);
 assert.match(md,/October 28/);
});

test('an incomplete or unaudited source receipt never becomes a completion claim',()=>{
 const r=oct27SourceReadiness(edition,{routeCoverage:route,itemCensus:editorial});
 assert.equal(r.recorded_route_attempts,39);
 assert.equal(r.recorded_editorial_source_visits,9);
 assert.deepEqual(r.unchecked_route_ids,['source-one']);
 assert.deepEqual(r.unvisited_editorial_source_ids,['source-two']);
 assert.equal(r.readiness,'NOT_VERIFIED');
 assert.equal(r.evidence_verified,'NOT_INDEPENDENTLY_VERIFIED_BY_AAR_GENERATOR');
 assert.ok(r.actions.every(x=>x.status==='OPEN_UNTIL_REAL_EVIDENCE'));
 const wrongDate={...route,edition_date:'2026-10-25'};
 const z=oct27SourceReadiness(edition,{routeCoverage:wrongDate});
 assert.equal(z.recorded_route_attempts,null);
 assert.equal(oct27SourceReadiness('2026-10-26'),null);
});

test('October 27 existing Compiler daily AAR and rollup preserve deadline and action list',()=>{
 const reports=compileDailyReports({cycleDate:cycle,evidence:{
  'source-route-coverage':route,'source-item-census':editorial
 }});
 assert.equal(reports.compiler.edition_date,edition);
 assert.equal(reports.compiler.oct28_source_readiness.actions.length,5);
 assert.equal(reports['daily-rollup'].oct28_source_readiness.recorded_route_attempts,39);
 assert.equal(reports.compiler.oct28_source_readiness.implementation_verified,false);
 const md=renderMarkdown(reports.compiler);
 const roll=renderMarkdown(reports['daily-rollup']);
 assert.match(md,/Required October 27 AAR improvement/);
 assert.match(md,/SOURCE-05/);
 assert.match(roll,/Qualify the previously disabled source portfolio/);
 const prev=compileDailyReports({cycleDate:'2026-10-25'});
 assert.equal(prev.compiler.oct28_source_readiness,null);
});

test('unified report generator automatically includes mandatory October 27 source actions',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'oct27-source-aar-'));
 try{
  const inDir=path.join(tmp,'evidence'),out=path.join(tmp,'reports');
  fs.mkdirSync(inDir,{recursive:true});
  const script=path.join(root,'scripts/render-unified-production-aar.mjs');
  const p=spawnSync(process.execPath,[script,cycle,inDir,out],{encoding:'utf8'});
  assert.equal(p.status,0,p.stderr||p.stdout);
  const report=JSON.parse(fs.readFileSync(path.join(out,'combined.json'),'utf8'));
  const md=fs.readFileSync(path.join(out,'combined.md'),'utf8');
  assert.equal(report.edition_date,edition);
  assert.equal(report.oct28_source_readiness.actions.length,5);
  assert.equal(report.oct28_source_readiness.readiness,'NOT_VERIFIED');
  assert.match(md,/October 27 AAR improvement/);
  assert.match(md,/before the October 28 run/i);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

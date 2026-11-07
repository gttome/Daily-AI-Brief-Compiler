import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import crypto from 'node:crypto';
import {summarizeNov02Evidence} from '../scripts/nov02-evidence-summary.mjs';
import {stageNov02ReaderCorrections,NOV02_ROUTES} from '../scripts/stage-nov02-reader-corrections.mjs';
import {imageViewports,planImageElementTargets,evaluateImageTargetEvidence} from '../scripts/capture-image-element24.mjs';
const edition='2026-11-02';
test('AAR distinguishes inaccessible/unreviewed indexes, seal window, capability preflight and unknown origin',()=>{
 const e={'compiler-state':{edition_date:edition,started_at:'2026-11-02T01:58:18Z',updated_at:'2026-11-02T02:03:06Z'},
  'image-route-preflight':{edition_date:edition,result:'CAPABILITY_ROUTE_PROVEN',blockers:[]},
  'source-item-census':{edition_date:edition,resources:[{resource_id:'a',outcome:'CANDIDATES_FOUND'},{resource_id:'b',outcome:'ACCESS_BLOCKED'},{resource_id:'c',outcome:'NOT_VISITED'}]}};
 const s=summarizeNov02Evidence(edition,e);assert.equal(s.compiler_timing.final_seal_window_seconds,288);
 assert.equal(s.compiler_timing.initial_execution_elapsed_seconds,null);assert.equal(s.image_capability_preflight_recorded,true);
 assert.equal(s.image_scheduler_origin_attested,false);assert.equal(s.source_index_coverage.inspected_percent,null);
 assert.equal(s.source_index_coverage.automated_index_scan.processed,1);
 assert.equal(s.source_index_coverage.automated_index_scan.inaccessible,1);assert.equal(s.source_index_coverage.automated_index_scan.not_attempted,1);
});
test('other selected stories and wrong-focus candidates cannot support a freshness fallback',()=>{
 const c={url:'https://example.org/new',focus:'Engineering',original_date:'2026-11-01T12:00:00Z',inspected_at:'2026-11-02T00:00:00Z',rejection_reason:'Insufficient original technical evidence'};
 const e={'edition-bundle':{edition_date:edition,stories:[{id:'s',focus:'Engineering',source:{url:'https://example.org/old',published_at:'2026-10-30T12:00:00Z'}}]},'fallback-search-evidence':{edition_date:edition,fallbacks:[{story_id:'s',searches:[{query:'actual query',source_url:'https://example.org/',attempted_at:'2026-11-02T00:00:00Z',candidate_urls:[c.url]}],newer_rejected_candidates:[c]}]}};
 assert.equal(summarizeNov02Evidence(edition,e).fallback_search_evidence[0].valid_newer_rejections,1);
 c.focus='Unrelated';assert.equal(summarizeNov02Evidence(edition,e).fallback_search_evidence[0].valid_newer_rejections,0);
 c.focus='Engineering';e['edition-bundle'].stories.push({id:'selected',source:{url:c.url}});
 assert.equal(summarizeNov02Evidence(edition,e).fallback_search_evidence[0].valid_newer_rejections,0);
});
test('November 3 uses 320px mobile; historical captures retain 390px',()=>{
 assert.equal(imageViewports('2026-11-02').mobile.width,390);assert.equal(imageViewports('2026-11-03').mobile.width,320);
 const manifest=JSON.parse(fs.readFileSync('external-image-packages/2026-11-02/manifest.json'));
 const job={schema_version:'external-compiler-image-job-v1',edition_date:'2026-11-03',execution_id:manifest.execution_id,
  stories:manifest.images.map((im,i)=>({story_id:im.story_id,permanent_url:'https://gttome.github.io/Daily-AI-Brief-Compiler/stories/2026-11-03/'+im.story_id+'/',complete_compiler_story:{focus:['Technical AI Engineering','Applied Generative AI for Knowledge Workers','Agents for Everyone'][Math.floor(i/2)]}}))};
 manifest.edition_date=job.edition_date;
 const targets=planImageElementTargets({job,manifest});assert.equal(targets.filter(t=>t.viewport_size.width===320).length,12);
 assert.ok(evaluateImageTargetEvidence({targets,rows:[]}).defects.some(x=>x.startsWith('viewport_not_proven:')));
});
test('reader correction changes exactly five leased files and preserves every other byte',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nov02-reader-')),site=path.join(dir,'site'),out=path.join(dir,'out');
 const blob=b=>crypto.createHash('sha1').update('blob '+Buffer.byteLength(b)+'\0').update(b).digest('hex');
 const urls=['https://huggingface.co/blog/protostar','https://every.to/source-code/how-to-get-ai-agents-to-recommend-your-articles'];
 const r={correction_type:'NOV02_MOBILE_AND_SOURCE_ROUTES',edition_date:edition,requested_by:'owner',expected_previous_pages:{}};
 try{
  for(const route of NOV02_ROUTES){
   const text=route.endsWith('.css')?'old CSS':route.includes('nov02-k1')?urls[0]:route.includes('nov02-a2')?urls[1]:urls.join('\n');
   const p=path.join(site,route);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,text);r.expected_previous_pages[route]=blob(text);
  }
  fs.writeFileSync(path.join(site,'accepted.png'),Buffer.from([0,1,2,3]));
  r.expected_header_css_blob_sha=blob(fs.readFileSync('vendor/production-reader/snapshot/assets/css/header.css'));
  const file=path.join(dir,'revision.json');fs.writeFileSync(file,JSON.stringify(r));
  const receipt=stageNov02ReaderCorrections({revisionFile:file,historySite:site,outSite:out});assert.equal(receipt.files_changed,5);
  assert.deepEqual(fs.readFileSync(path.join(out,'accepted.png')),Buffer.from([0,1,2,3]));
  fs.appendFileSync(path.join(site,'index.html'),'new publication');
  assert.throws(()=>stageNov02ReaderCorrections({revisionFile:file,historySite:site,outSite:path.join(dir,'drift')}),/drift/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('post-selection parser census never replaces the actual pre-selection editorial coverage',()=>{
 const e={'source-item-census':{edition_date:edition,created_at:'2026-11-02T02:00:00Z',resources:Array.from({length:87},(_,i)=>({resource_id:String(i),outcome:i<73?'NO_ELIGIBLE_ITEMS':'ACCESS_BLOCKED'}))},
  'edition-bundle':{edition_date:edition,source_discovery_audit:{reviewed_at:'2026-11-02T01:58:18Z',index_review:{eligible:87,inspected:8,unreviewed:Array.from({length:70},(_,i)=>String(i))}}}};
 const s=summarizeNov02Evidence(edition,e).source_index_coverage;
 assert.equal(s.inspected,8);assert.equal(s.inspected_percent,9.2);assert.equal(s.not_editorially_inspected,79);
 assert.equal(s.unclassified_editorial_ids,9);assert.equal(s.inaccessible,null);
 assert.equal(s.automated_index_scan.processed,73);assert.equal(s.automated_index_scan.post_editorial_selection,true);
});

test('current compiler timing and editorial coverage use their original distinct clocks and rosters',()=>{
 const edition='2026-11-08';
 const state={edition_date:edition,state:'SHADOW_VERIFIED',started_at:'2026-11-08T01:23:56Z',
  updated_at:'2026-11-08T14:30:56Z',editorial_bundle:{sealed_at:'2026-11-08T14:25:06Z'}};
 const bundle={edition_date:edition,editorial_provenance:{sealed_at:state.editorial_bundle.sealed_at},
  source_discovery_audit:{index_review:{eligible:3,inspected:1,unreviewed:2,unreviewed_ids:['b','c'],inaccessible_ids:[]}}};
 const inputs={'compiler-state':state,'edition-bundle':bundle,
  'source-item-census':{edition_date:edition,resources:[{resource_id:'a',outcome:'CANDIDATES_FOUND'}]}};
 const summary=summarizeNov02Evidence(edition,inputs);
 assert.equal(summary.compiler_timing.state_elapsed_seconds,47220);
 assert.equal(summary.compiler_timing.final_seal_window_seconds,350);
 assert.equal(summary.source_index_coverage.eligible,3);
 assert.equal(summary.source_index_coverage.unreviewed,2);
 assert.equal(summary.source_index_coverage.unclassified_editorial_ids,0);
 bundle.editorial_provenance.sealed_at='2026-11-08T14:27:00Z';
 assert.equal(summarizeNov02Evidence(edition,inputs).compiler_timing.final_seal_window_seconds,null);
 state.state='BUNDLE_READY';
 assert.equal(summarizeNov02Evidence(edition,inputs).compiler_timing.public_verification_at,null);
});

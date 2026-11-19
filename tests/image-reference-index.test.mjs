import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {buildImageReferenceIndex} from '../scripts/build-image-reference-index.mjs';
const sha=n=>n.toString(16).padStart(64,'0');
const write=(root,file,value)=>{const p=path.join(root,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(value));};
function packageAt(root,day){
 const d='2026-11-'+day,prefix=`external-image-packages/${d}`,images=Array.from({length:6},(_,i)=>({story_id:'s'+i,sha256:sha(day*10+i),accepted_locked:true,path:`${prefix}/images/s${i}.png`}));
 const manifest={edition_date:d,job_sha256:sha(day),images,set_review:{editorial_diversity:{stories:images.map(i=>({...i,visual_thesis:'Trace the supported mechanism',medium_treatment:'Ink section',perspective:'Oblique cutaway',observed_distinctiveness:'A visible dependency explains the mechanism.'}))}}};
 const aar={edition_date:d,job_sha256:sha(day),publication:{result:'RELEASED_VERIFIED'},images:images.map(i=>({story_id:i.story_id,sha256:i.sha256})),errors:[{issue:'A specific rejected arrow hit the label instead of the object.',correction:'Reattach only the incorrect arrow endpoint.',generation_rejection:{story_id:'s0',attempt:1,defect_codes:['CAUSAL_CONNECTOR'],evidence_ref:'https://example.org/rejection.json'}}]};
 write(root,prefix+'/manifest.json',manifest);write(root,prefix+'/reviews/after-action.json',aar);return {manifest,aar};
}
test('only seven earlier released sets enter the index and revisions never become inferred live proof',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'image-reference-'));
 try{
  for(let d=10;d<=21;d++)packageAt(root,d);
  const p='external-image-revisions/2026-11-18/owner-quality-r2';
  write(root,p+'/manifest.json',{edition_date:'2026-11-18',images:[{story_id:'s0',old_sha256:sha(180),sha256:sha(999),path:p+'/images/s0.png',published_route:'briefs/images/revision.png'}]});
  const r=buildImageReferenceIndex({edition:'2026-11-20',root,sourceCommit:'a'.repeat(40)});
  assert.deepEqual(r.reference_editions,['2026-11-19','2026-11-18','2026-11-17','2026-11-16','2026-11-15','2026-11-14','2026-11-13']);
  assert.equal(r.pixel_inspection_performed,false);assert.equal(r.sets[0].examples.length,6);assert.equal(r.sets[0].rejected_regions.length,1);
  assert.equal(r.sets[1].revision_candidates[0].publication_status,'NOT_ESTABLISHED_BY_REVISION_MANIFEST');
  assert.ok(r.sets[0].examples[0].asset_ref.includes('/blob/'+'a'.repeat(40)+'/'));
  assert.equal(fs.existsSync(path.join(root,r.sets[0].examples[0].path)),false,'metadata indexing does not manufacture PNGs');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('pending, truncated, hash-mismatched and traversal references are skipped without historical repair',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'image-reference-gaps-'));
 try{
  const a=packageAt(root,19);a.aar.publication.result='PENDING';write(root,'external-image-packages/2026-11-19/reviews/after-action.json',a.aar);
  packageAt(root,18);fs.writeFileSync(path.join(root,'external-image-packages/2026-11-18/manifest.json'),'{');
  const b=packageAt(root,17);b.manifest.images[0].sha256=sha(999);write(root,'external-image-packages/2026-11-17/manifest.json',b.manifest);
  const c=packageAt(root,16);c.manifest.images[0].path='external-image-packages/2026-11-16/images/../../wrong.png';write(root,'external-image-packages/2026-11-16/manifest.json',c.manifest);
  packageAt(root,15);const r=buildImageReferenceIndex({edition:'2026-11-20',root,sourceCommit:'b'.repeat(40)});
  assert.deepEqual(r.reference_editions,['2026-11-15']);assert.equal(r.skipped_unverified_editions.length,4);
  assert.equal(fs.readFileSync(path.join(root,'external-image-packages/2026-11-18/manifest.json'),'utf8'),'{');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

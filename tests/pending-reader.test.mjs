import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {compileShadow,sha256} from '../compiler/compile.mjs';
import {adaptCompilerBundle} from '../compiler/reader-adapter.mjs';
import {PENDING_PLACEHOLDER_ID} from '../compiler/pending-images.mjs';

const copy=x=>structuredClone(x);
const original=JSON.parse(fs.readFileSync('fixtures/complete-edition/edition-bundle.json','utf8'));
const originalState=JSON.parse(fs.readFileSync('fixtures/complete-edition/compiler-state.json','utf8'));
function prepare(){
 const b=copy(original),s=copy(originalState);
 b.image_representation={status:'images_pending',placeholder_id:PENDING_PLACEHOLDER_ID,width:1200,height:630};
 b.images=b.stories.map(story=>({story_id:story.id,status:'pending',accepted:false,placeholder_id:PENDING_PLACEHOLDER_ID,alt:story.image_alt_intent}));
 s.images={required:6,accepted:[],mode:'images_pending',placeholder_id:PENDING_PLACEHOLDER_ID};
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pending-reader-'));
 const bundlePath=path.join(dir,'bundle.json'),statePath=path.join(dir,'state.json'),outDir=path.join(dir,'reader');
 fs.writeFileSync(bundlePath,JSON.stringify(b,null,2)+'\n');s.bundle.digest=sha256(fs.readFileSync(bundlePath));fs.writeFileSync(statePath,JSON.stringify(s,null,2)+'\n');
 return {b,s,dir,bundlePath,statePath,outDir};
}
test('single canonical 1200×630 pending SVG provides an honest shared figure identity',()=>{
 const s=fs.readFileSync('compiler/assets/illustration-pending.svg','utf8');
 assert.match(s,/width="1200" height="630"/);
 assert.match(s,/Illustration pending/);
 assert.doesNotMatch(s,/accepted|PASS|premium/);
 const p=prepare(),a=adaptCompilerBundle(p.b);
 assert.equal(new Set(a.imageBindings.map(x=>x.source_path)).size,1);
 assert.equal(new Set(a.imageBindings.map(x=>x.sha256)).size,1);
 assert.equal(new Set(a.imageBindings.map(x=>x.reader_filename)).size,1);
 assert.equal(new Set(a.edition.stories.map(x=>x.image.alt)).size,6);
 assert.ok(a.edition.stories.every(x=>x.image.status==='pending'&&x.image.alt.includes('Planned illustration:')));
 fs.rmSync(p.dir,{recursive:true,force:true});
});
test('controlled opt-in builds the unmodified production renderer with six transparent placeholders',async()=>{
 const p=prepare();
 try {
  const r=await compileShadow({statePath:p.statePath,bundlePath:p.bundlePath,repoRoot:'.',outDir:p.outDir,allowPendingImages:true});
  assert.equal(r.result,'PASS');
  assert.equal(r.image_representation,'images_pending');
  assert.equal(r.reader_parity_gate.result,'PASS');
  assert.equal(r.source_manifest.renderer,'vendored-production-reader');
  assert.equal(r.source_manifest.current_images.length,6);
  assert.equal(new Set(r.source_manifest.current_images.map(x=>x.route)).size,1);
  assert.ok(r.source_manifest.current_images.every(x=>x.accepted===false));
  const imageFile=path.join(p.outDir,'briefs','images',p.b.edition_date,'illustration-pending.svg');
  assert.equal(sha256(fs.readFileSync(imageFile)),r.source_manifest.current_images[0].sha256);
  const text=fs.readFileSync(path.join(p.outDir,'briefs',p.b.edition_date+'.md'),'utf8');
  assert.equal((text.match(/illustration-pending\.svg/g)||[]).length,6);
  assert.equal((text.match(/Illustration pending for /g)||[]).length,6);
  assert.equal(r.source_manifest.accepted_image_regenerations,0);
 } finally {fs.rmSync(p.dir,{recursive:true,force:true});}
});
test('routine compile still fails closed on images_pending without explicit controlled opt-in',async()=>{
 const p=prepare();
 try{await assert.rejects(compileShadow({statePath:p.statePath,bundlePath:p.bundlePath,repoRoot:'.',outDir:p.outDir}),/not activated/);}
 finally {fs.rmSync(p.dir,{recursive:true,force:true});}
});

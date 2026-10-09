import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validateEdition,sha256} from '../compiler/compile.mjs';
import {firstIncompleteSemanticStage,assertProgressPreserved} from '../producer/recovery.mjs';
import {PENDING_PLACEHOLDER_ID} from '../compiler/pending-images.mjs';

const clone=x=>structuredClone(x);
const complete=JSON.parse(fs.readFileSync('fixtures/complete-edition/edition-bundle.json','utf8'));
const completeState=JSON.parse(fs.readFileSync('fixtures/complete-edition/compiler-state.json','utf8'));
function pendingFixture(){
  const b=clone(complete),s=clone(completeState);
  b.image_representation={status:'images_pending',placeholder_id:PENDING_PLACEHOLDER_ID,width:1200,height:630};
  b.images=b.stories.map(story=>({story_id:story.id,status:'pending',accepted:false,placeholder_id:PENDING_PLACEHOLDER_ID,alt:story.image_alt_intent}));
  s.images={required:6,accepted:[],mode:'images_pending',placeholder_id:PENDING_PLACEHOLDER_ID};
  return {b,s};
}
function validate({b,s},allowPendingImages=true){
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'pending-mode-gate-'));
  const bundlePath=path.join(tmp,'edition-bundle.json'),statePath=path.join(tmp,'compiler-state.json');
  fs.writeFileSync(bundlePath,JSON.stringify(b,null,2)+'\n');
  s.bundle.digest=sha256(fs.readFileSync(bundlePath));
  fs.writeFileSync(statePath,JSON.stringify(s,null,2)+'\n');
  try {return validateEdition({statePath,bundlePath,repoRoot:'.',allowPendingImages});}
  finally {fs.rmSync(tmp,{recursive:true,force:true});}
}
test('existing illustrated historical bundle still validates with six accepted exact-byte assets',()=>{
  const r=validateEdition({statePath:'fixtures/complete-edition/compiler-state.json',bundlePath:'fixtures/complete-edition/edition-bundle.json',repoRoot:'.'});
  assert.equal(r.imagesPending,false);
  assert.equal(r.imageEvidence.length,6);
});
test('images-pending is editorial complete, six unique generic pending figures, zero accepted artwork',()=>{
  const r=validate(pendingFixture());
  assert.equal(r.imagesPending,true);
  assert.equal(r.imageEvidence.length,0);
  assert.equal(r.pendingImageEvidence.length,6);
  assert.equal(new Set(r.pendingImageEvidence.map(x=>x.placeholder_id)).size,1);
  assert.equal(new Set(r.pendingImageEvidence.map(x=>x.alt)).size,6);
});
test('routine compiler rejects pending-image publication until separately activated',()=>{
  assert.throws(()=>validate(pendingFixture(),false),/not activated/);
});
test('pending figure cannot forge accepted art, hashes, reviews, or competing image systems',()=>{
  for(const mutation of [
    p=>{p.b.images[0].accepted=true;},
    p=>{p.b.images[0].visual_review={result:'PASS'};},
    p=>{p.b.images[0].sha256='a'.repeat(64);},
    p=>{p.b.images[0].path='fixtures/complete-edition/images/story-01.png';},
    p=>{p.b.image_system={strategy:'d0_native_image_capsules'};},
    p=>{p.s.images.accepted=['fixture-story-01'];},
    p=>{p.b.images[1].story_id=p.b.images[0].story_id;},
    p=>{p.b.images[1].alt=p.b.stories[0].image_alt_intent;},
    p=>{p.s.images.mode='accepted';}
  ]){const p=pendingFixture();mutation(p);assert.throws(()=>validate(p),/pending|figure|representation|accepted|state/);}
});
test('pending-image release does not bypass editorial media Watchlist or book gates',()=>{
  const changes=[
    p=>{p.b.stories[0].summary='';},
    p=>{p.b.stories[0].focus='Agents for Everyone';},
    p=>{p.b.stories[4].agent_skills=false;},
    p=>{p.b.videos.pop();},
    p=>{p.b.podcasts[1].verified=false;},
    p=>{p.b.podcasts[1].source=p.b.podcasts[0].source;},
    p=>{p.b.watchlist.updated[0].what_changed='';},
    p=>{p.b.book_mappings.pop();},
    p=>{p.b.stories[0].image_alt_intent='';}
  ];
  for(const mutation of changes){const p=pendingFixture();mutation(p);assert.throws(()=>validate(p));}
});
test('pending representation skips image generation only after editorial checkpoint and cannot be rebound',()=>{
  const {s}=pendingFixture();s.state='PRODUCING';s.stage='IMAGES';
  assert.equal(firstIncompleteSemanticStage(s),'BUNDLE');
  const incomplete=clone(s);incomplete.editorial_bundle.status='pending';
  assert.throws(()=>firstIncompleteSemanticStage(incomplete),/incomplete editorial/);
  const changed=clone(s);changed.images.mode='accepted';
  assert.throws(()=>assertProgressPreserved(s,changed),/image representation changed/);
  const forged=clone(s);forged.images.accepted=['fixture-story-01'];
  assert.throws(()=>assertProgressPreserved(s,forged),/pending edition cannot acquire accepted images/);
});
test('schemas explicitly constrain six pending figures without weakening accepted-image path',()=>{
  const bs=JSON.parse(fs.readFileSync('contracts/edition-bundle.schema.json','utf8'));
  const ss=JSON.parse(fs.readFileSync('contracts/compiler-state.schema.json','utf8'));
  assert.equal(bs.properties.images.minItems,6);
  assert.equal(bs.properties.images.maxItems,6);
  assert.equal(bs.properties.images.items.oneOf.length,2);
  assert.ok(bs.properties.images.items.oneOf[0].required.includes('git_blob_sha'));
  assert.equal(bs.properties.images.items.oneOf[1].properties.accepted.const,false);
  assert.equal(ss.properties.images.properties.mode.const,'images_pending');
});

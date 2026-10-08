import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {makeProductReleaseFixture} from './fixtures/product-release.mjs';
import {stageProductImageCorrection} from './fixtures/product-correction.mjs';
import {validateEdition,compileShadow} from '../compiler/compile.mjs';
import {sha256,canonicalSha} from '../image-capsules/util.mjs';

// All proof records and activation used here are synthetic and temporary. A PASS
// proves deterministic integration only, never native-image quality or rollout.
test('I06-T03 current qualified D1 one/subset/all revisions compile with independent terminal history',async()=>{
  for(const size of [1,3,6]){
    const f=makeProductReleaseFixture();
    try{
      f.state.state='SHADOW_VERIFIED';f.state.stage='VERIFY';f.persist();
      const beforeState=fs.readFileSync(f.statePath),beforeBundle=fs.readFileSync(f.bundlePath),beforeAssets=new Map(f.bundle.images.map(image=>[image.path,fs.readFileSync(path.join(f.root,image.path))]));
      const selected=f.bundle.images.slice(0,size).map(image=>image.story_id),c=stageProductImageCorrection(f,selected);
      const validation=validateEdition({repoRoot:f.root,statePath:c.revisionPath,bundlePath:c.bundlePath});
      assert.equal(validation.d1ImageGate.result,'PASS');assert.equal(validation.mediaGate.result,'PASS');
      assert.equal(c.result.revision.base_run.state,'SHADOW_VERIFIED');assert.equal(c.result.revision.original_bundle_sha256,sha256(beforeBundle));
      for(const key of ['stories','videos','podcasts','watchlist','book_mappings','producer_receipt']) assert.deepEqual(c.result.bundle[key],f.bundle[key]);
      for(const image of f.bundle.images) if(!selected.includes(image.story_id)) assert.deepEqual(c.result.bundle.images.find(row=>row.story_id===image.story_id),image);
      assert.deepEqual(fs.readFileSync(f.statePath),beforeState);assert.deepEqual(fs.readFileSync(f.bundlePath),beforeBundle);
      for(const [asset,bytes] of beforeAssets) assert.deepEqual(fs.readFileSync(path.join(f.root,asset)),bytes);
      if(size===1){
        const receipt=await compileShadow({repoRoot:f.root,statePath:c.revisionPath,bundlePath:c.bundlePath,outDir:path.join(f.root,'reader-revision')});
        assert.equal(receipt.result,'PASS');assert.equal(receipt.verification.reader_contract.ratings,true);assert.equal(receipt.verification.reader_contract.comments,true);
        assert.equal(receipt.verification.reader_contract.share,true);assert.equal(receipt.verification.permanent_story_pages,6);
      }
    }finally{f.cleanup();}
  }
});

test('I06-T02 unselected D1 acceptance evidence cannot be changed through selected-image correction',()=>{
  const f=makeProductReleaseFixture();
  try{
    f.state.state='SHADOW_VERIFIED';f.state.stage='VERIFY';f.persist();
    const c=stageProductImageCorrection(f,[f.bundle.images[0].story_id]);
    const unchanged=c.manifest.images[1];unchanged.cloud_asset_id+='-unauthorized';
    c.handoff.manifest_sha256=canonicalSha(c.manifest);c.porter.manifest_sha256=canonicalSha(c.manifest);c.porter.ingest_handoff_sha256=canonicalSha(c.handoff);c.reviews.manifest_sha256=canonicalSha(c.manifest);
    for(const [key,record] of [['acceptance_manifest',c.manifest],['ingest_handoff',c.handoff],['work_porter_receipt',c.porter],['canonical_reviews',c.reviews]]){
      const relative=c.result.bundle.image_system[key+'_path'];fs.writeFileSync(path.join(f.root,relative),JSON.stringify(record,null,2)+'\n');
      c.result.bundle.image_system[key+'_sha256']=canonicalSha(record);
    }
    c.result.revision.image_system_update.after=structuredClone(c.result.bundle.image_system);
    const text=JSON.stringify(c.result.bundle,null,2)+'\n';c.result.revision.bundle.digest=sha256(text);
    fs.writeFileSync(c.bundlePath,text);fs.writeFileSync(c.revisionPath,JSON.stringify(c.result.revision,null,2)+'\n');
    assert.throws(()=>validateEdition({repoRoot:f.root,statePath:c.revisionPath,bundlePath:c.bundlePath}),/unselected|correction.*scope|correction.*evidence/);
  }finally{f.cleanup();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {gitBlobSha,sha256,canonicalSha} from '../image-capsules/util.mjs';
import {BASIC_GATES,BENCHMARK_DIMENSIONS} from '../image-capsules/review-contract.mjs';
import {buildAtomicAcceptance,observedSetGate} from '../image-capsules/set-review.mjs';
import {validateD0BundleImages} from '../image-capsules/bundle-gate.mjs';

const passGate=()=>({verdict:'PASS',observation:'Concrete visible evidence supports this criterion.'});

function makeFixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'d0-bundle-'));
  fs.mkdirSync(path.join(root,'images'),{recursive:true});
  fs.mkdirSync(path.join(root,'reviews'),{recursive:true});
  const source=JSON.parse(fs.readFileSync('fixtures/complete-edition/edition-bundle.json','utf8'));
  const items=[],setCandidates=[];

  for(let i=0;i<6;i++){
    const storyId='s'+(i+1);
    const bytes=fs.readFileSync(source.images[i].path);
    const assetPath='images/'+storyId+'.png';
    fs.writeFileSync(path.join(root,assetPath),bytes);
    const h=sha256(bytes),b=gitBlobSha(bytes);
    const review={
      schema_version:'daily-compiler-image-review-v3',
      story_id:storyId,
      attempt:1,
      final_path:assetPath,
      final_sha256:h,
      final_git_blob_sha:b,
      packet_sha256:(String(i+1).repeat(64)).slice(0,64),
      prompt_sha256:(String(i+2).repeat(64)).slice(0,64),
      reviewed_at:'2026-10-08T00:00:00Z',
      reviewer_identity:'review-'+storyId,
      basic_gates:Object.fromEntries(BASIC_GATES.map(k=>[k,passGate()])),
      visible_text:{result:'PASS',required_labels:['A'],observed_required_labels:['A'],missing_labels:[],extra_visible_text:[]},
      meaningful_components:Array.from({length:8},(_,n)=>'Visible explanatory component '+(n+1)),
      benchmark_dimensions:Object.fromEntries(BENCHMARK_DIMENSIONS.map(k=>[k,passGate()])),
      generic_or_sparse:false,
      decorative_only:false,
      result:'PASS'
    };
    const reviewPath='reviews/'+storyId+'.json';
    fs.writeFileSync(path.join(root,reviewPath),JSON.stringify(review,null,2)+'\n');
    const reviewSha=canonicalSha(review);
    const signature={
      story_id:storyId,
      final_sha256:h,
      composition_signature:'c'+i,
      layout_signature:'l'+(i%4),
      diagram_grammar:'g'+(i%4),
      hierarchy_signature:'h'+(i%4),
      annotation_pattern_signature:'a'+(i%3)
    };
    setCandidates.push(signature);
    items.push({
      story_id:storyId,
      final_path:assetPath,
      final_sha256:h,
      git_blob_sha:b,
      asset_version:'v2',
      cache_key:'d0-'+h.slice(0,12),
      supersedes:null,
      review,
      review_context:{},
      review_path:reviewPath,
      review_sha256:reviewSha
    });
  }

  const setReview={
    schema_version:'daily-compiler-image-set-review-v3',
    edition_date:'2026-10-08',
    candidates:setCandidates,
    observed_gate:observedSetGate(setCandidates),
    no_labels_swapped_template:true,
    no_repeated_dominant_template:true,
    intentionally_curated:true,
    all_individually_benchmark_grade:true,
    result:'PASS',
    reviewed_at:'2026-10-08T00:10:00Z'
  };
  const setReviewPath='set-review.json';
  fs.writeFileSync(path.join(root,setReviewPath),JSON.stringify(setReview,null,2)+'\n');

  const acceptance=buildAtomicAcceptance({
    editionDate:'2026-10-08',
    items,
    setReview,
    acceptedAt:'2026-10-08T00:11:00Z'
  });
  const acceptancePath='acceptance.json';
  fs.writeFileSync(path.join(root,acceptancePath),JSON.stringify(acceptance,null,2)+'\n');

  const setReviewSha=canonicalSha(setReview);
  const bundle={
    schema_version:'daily-compiler-edition-bundle-v1',
    edition_date:'2026-10-08',
    status:'BUNDLE_READY',
    editorial_contract_version:'daily-compiler-editorial-contract-v1',
    image_strategy:'d0_native_image_capsules',
    image_acceptance:{
      path:acceptancePath,
      sha256:sha256(fs.readFileSync(path.join(root,acceptancePath))),
      set_review_path:setReviewPath,
      set_review_sha256:setReviewSha,
      accepted_locked:true
    },
    images:items.map(x=>({
      story_id:x.story_id,
      path:x.final_path,
      sha256:x.final_sha256,
      git_blob_sha:x.git_blob_sha,
      accepted:true,
      accepted_locked:true,
      asset_version:x.asset_version,
      cache_key:x.cache_key,
      review_path:x.review_path,
      review_sha256:x.review_sha256,
      set_review_sha256:setReviewSha,
      supersedes:null
    }))
  };
  const state={
    images:{
      strategy:'d0_native_image_capsules',
      stage_state:'ACCEPTED',
      accepted:items.map(x=>x.story_id),
      set_review:{status:'PASS',path:setReviewPath,digest:setReviewSha},
      acceptance:{status:'ACCEPTED_LOCKED',path:acceptancePath,digest:canonicalSha(acceptance)}
    }
  };
  return {root,bundle,state,setReview};
}

test('D0 bundle gate passes only the atomic six-image accepted set',()=>{
  const f=makeFixture();
  const result=validateD0BundleImages({state:f.state,bundle:f.bundle,repoRoot:f.root});
  assert.deepEqual(result.errors,[]);
  assert.equal(result.imageEvidence.length,6);
});

test('D0 bundle gate fails five images, an unlocked image, or set-review failure',()=>{
  const f=makeFixture();

  const five=structuredClone(f.bundle);
  five.images.pop();
  assert.ok(validateD0BundleImages({state:f.state,bundle:five,repoRoot:f.root}).errors.includes('d0_bundle_exactly_six_images'));

  const unlocked=structuredClone(f.bundle);
  unlocked.images[0].accepted_locked=false;
  assert.ok(validateD0BundleImages({state:f.state,bundle:unlocked,repoRoot:f.root}).errors.includes('d0_image_acceptance_fields'));

  const badSet=structuredClone(f.setReview);
  badSet.result='FAIL';
  fs.writeFileSync(path.join(f.root,'set-review.json'),JSON.stringify(badSet,null,2)+'\n');
  assert.ok(validateD0BundleImages({state:f.state,bundle:f.bundle,repoRoot:f.root}).errors.some(x=>x.includes('set_review')));
});

test('D0 bundle gate fails review identity or asset identity mismatch',()=>{
  const f=makeFixture();

  const badReview=structuredClone(f.bundle);
  badReview.images[0].review_sha256='f'.repeat(64);
  assert.ok(validateD0BundleImages({state:f.state,bundle:badReview,repoRoot:f.root}).errors.some(x=>x.includes('d0_review_digest')));

  const target=path.join(f.root,f.bundle.images[1].path);
  const changed=Buffer.from(fs.readFileSync(target));
  changed[changed.length-1]^=1;
  fs.writeFileSync(target,changed);
  assert.ok(validateD0BundleImages({state:f.state,bundle:f.bundle,repoRoot:f.root}).errors.some(x=>x.includes('d0_image_asset_identity')));
});

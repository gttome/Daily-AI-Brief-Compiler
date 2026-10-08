import test from 'node:test';
import assert from 'node:assert/strict';
import {sha256,canonicalSha} from '../image-capsules/util.mjs';
import {applyCorrectionToBundle,buildCorrectionRecompileState,validateCorrectionRevision} from '../operations/correction-apply.mjs';

function bundle(){
  return {
    schema_version:'daily-compiler-edition-bundle-v1',edition_date:'2026-10-08',status:'BUNDLE_READY',
    editorial_contract_version:'daily-compiler-editorial-contract-v1',
    stories:[{id:'s1',headline:'Old'}],
    videos:[{title:'v1'},{title:'v2'}],
    podcasts:[{title:'p1'},{title:'p2'}],
    watchlist:{new:[{topic:'A',why:'x'}],updated:[],carried_forward:[],dropped:[]},
    book_mappings:[],
    images:[{story_id:'s1',path:'old.png',sha256:'a'.repeat(64),git_blob_sha:'b'.repeat(40),accepted:true}],
    producer_receipt:{result:'PASS'}
  };
}
function correction(type,target,replacement,scope){
  return {
    schema_version:'daily-compiler-post-publication-correction-v1',
    correction_id:'c1',edition_date:'2026-10-08',requested_at:'2026-10-08T12:00:00Z',
    requested_by:'owner',correction_type:type,target,replacement,reason:'Owner correction.',
    status:'VALIDATED',preserve_original:true,new_execution_allowed:false,protected_pr_required:true,
    live_verification_required:true,semantic_scope:scope,correction_revision:1,supersedes:null,verification_receipt_path:null
  };
}

test('article correction changes only targeted story and appends correction history',()=>{
  const b=bundle();
  const c=correction('replace_article',{story_id:'s1'},{story:{id:'s1',headline:'New'}},'content_only');
  const out=applyCorrectionToBundle(b,c);
  assert.equal(out.stories[0].headline,'New');
  assert.equal(out.videos[0].title,'v1');
  assert.equal(out.corrections[0].correction_id,'c1');
  assert.equal(b.stories[0].headline,'Old');
});

test('media and Watchlist corrections are bounded',()=>{
  const b=bundle();
  const pc=correction('replace_podcast',{index:1},{podcast:{title:'p3'}},'media_only');
  const p=applyCorrectionToBundle(b,pc);
  assert.equal(p.podcasts[1].title,'p3');
  const wc=correction('replace_watchlist_item',{state:'new',topic:'A'},{item:{topic:'B',why:'y'}},'watchlist_only');
  const w=applyCorrectionToBundle(b,wc);
  assert.equal(w.watchlist.new[0].topic,'B');
});

test('I06-T03 correction revision preserves terminal base state, original raw digest and execution identity',()=>{
  const b=bundle(),beforeBundleText=JSON.stringify(b,null,2)+'\n';
  const beforeState={schema_version:'daily-compiler-state-v1',edition_date:'2026-10-08',execution_id:'e1',branch:'shadow/2026-10-08',state:'SHADOW_VERIFIED',stage:'VERIFY',bundle:{status:'BUNDLE_READY',digest:sha256(beforeBundleText)},preview:{url:'x'},reader_parity:{result:'PASS'}};
  const saved=structuredClone(beforeState);
  const c=correction('replace_video',{index:0},{video:{title:'v3'}},'media_only');
  const out=applyCorrectionToBundle(b,c),text=JSON.stringify(out,null,2)+'\n';
  const revision=buildCorrectionRecompileState({beforeState,beforeBundle:b,beforeBundleText,correctedBundle:out,correctedBundleText:text,correction:c,updatedAt:'2026-10-08T13:00:00Z'});
  assert.deepEqual(beforeState,saved);assert.deepEqual(revision.base_run,saved);
  assert.equal(revision.state,undefined);assert.equal(revision.execution_id,undefined);
  assert.equal(revision.status,'VALIDATED');assert.equal(revision.revision_id,'c1:r1');
  assert.equal(revision.original_bundle_sha256,saved.bundle.digest);
  assert.notEqual(revision.bundle.digest,saved.bundle.digest);
  assert.equal(validateCorrectionRevision({revision,bundle:out,bundleText:text}).baseState.state,'SHADOW_VERIFIED');
  const stale=structuredClone(revision);stale.original_bundle_text+=' ';
  assert.throws(()=>validateCorrectionRevision({revision:stale,bundle:out,bundleText:text}),/original_bundle_digest/);
  const corrupt=structuredClone(revision);corrupt.new_asset_manifest.sha256='a'.repeat(64);
  assert.throws(()=>validateCorrectionRevision({revision:corrupt,bundle:out,bundleText:text}),/asset_manifest/);
  const unintended=structuredClone(out);unintended.stories[0].headline='unrelated change';
  assert.throws(()=>buildCorrectionRecompileState({beforeState,beforeBundle:b,beforeBundleText,correctedBundle:unintended,correctedBundleText:JSON.stringify(unintended),correction:c}),/scope_mismatch/);
});

test('revision lineage rejects arbitrary previous content and requires exact verified predecessor identity',()=>{
  const base=bundle(),baseText=JSON.stringify(base);
  const state={schema_version:'daily-compiler-state-v1',edition_date:base.edition_date,execution_id:'e1',state:'SHADOW_VERIFIED',stage:'VERIFY',bundle:{digest:sha256(baseText)}};
  const c1=correction('replace_video',{index:0},{video:{title:'v3'}},'media_only');
  const first=applyCorrectionToBundle(base,c1),firstText=JSON.stringify(first);
  const r1=buildCorrectionRecompileState({beforeState:state,beforeBundle:base,beforeBundleText:baseText,correctedBundle:first,correctedBundleText:firstText,correction:c1});
  const c2={...correction('replace_video',{index:1},{video:{title:'v4'}},'media_only'),correction_id:'c2',correction_revision:2};
  const second=applyCorrectionToBundle(first,c2),secondText=JSON.stringify(second);
  const args={beforeState:state,beforeBundle:first,beforeBundleText:firstText,baseBundleText:baseText,correctedBundle:second,correctedBundleText:secondText,correction:c2};
  assert.throws(()=>buildCorrectionRecompileState(args),/predecessor_proof_required/);
  assert.throws(()=>buildCorrectionRecompileState({...args,previousRevision:r1}),/predecessor_proof_required/);
  const live={...r1,status:'LIVE_VERIFIED',verification_receipt_path:'corrections/r1/live.json',verification_receipt_sha256:'c'.repeat(64)};
  const next=buildCorrectionRecompileState({...args,previousRevision:live});
  assert.equal(next.predecessor_revision.sha256,canonicalSha(live));
  const checked=validateCorrectionRevision({revision:next,bundle:second,bundleText:secondText});
  assert.equal(checked.verification_receipts.length,1);
  assert.equal(checked.verification_receipts[0].bundle_sha256,r1.bundle.digest);
  next.predecessor_revision.record.base_run.execution_id='different';
  assert.throws(()=>validateCorrectionRevision({revision:next,bundle:second,bundleText:secondText}),/predecessor_proof_required/);
});

test('generic image entry refuses stale hashes and missing canonical review; reader identity cannot change',()=>{
  const b=bundle(),c=correction('replace_image',{story_id:'s1',expected_sha256:'z'.repeat(64)},{image:{story_id:'s1',path:'new.png',sha256:'c'.repeat(64),git_blob_sha:'d'.repeat(40),accepted:true,accepted_locked:true,visual_review:{result:'PASS',reviewed_sha256:'c'.repeat(64),quality_gate_location:'fresh_regular_chat_per_story'}}},'image_only');
  assert.throws(()=>applyCorrectionToBundle(b,c),/stale_image/);
  c.target.expected_sha256=b.images[0].sha256;c.replacement.image.visual_review.reviewed_sha256='a'.repeat(64);
  assert.throws(()=>applyCorrectionToBundle(b,c),/canonical_visual_review/);
  b.stories[0].permanent_route='/stories/2026-10-08/s1/';
  const article=correction('replace_article',{story_id:'s1'},{story:{...b.stories[0],permanent_route:'/stories/2026-10-08/renamed/'}},'content_only');
  assert.throws(()=>applyCorrectionToBundle(b,article),/story_identity/);
});

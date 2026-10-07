import test from 'node:test';
import assert from 'node:assert/strict';
import {applyCorrectionToBundle,buildCorrectionRecompileState} from '../operations/correction-apply.mjs';

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

test('correction recompile preserves execution identity and returns same edition to BUNDLE_READY',()=>{
  const beforeState={schema_version:'daily-compiler-state-v1',edition_date:'2026-10-08',execution_id:'e1',branch:'shadow/2026-10-08',state:'SHADOW_VERIFIED',stage:'VERIFY',bundle:{status:'BUNDLE_READY',digest:'a'.repeat(64)},preview:{url:'x'},reader_parity:{result:'PASS'}};
  const b=bundle();
  const c=correction('replace_video',{index:0},{video:{title:'v3'}},'media_only');
  const out=applyCorrectionToBundle(b,c);
  const text=JSON.stringify(out,null,2)+'\n';
  const next=buildCorrectionRecompileState({beforeState,beforeBundle:b,correctedBundle:out,correctedBundleText:text,correction:c,updatedAt:'2026-10-08T13:00:00Z'});
  assert.equal(next.execution_id,'e1');
  assert.equal(next.state,'BUNDLE_READY');
  assert.equal(next.stage,'BUNDLE');
  assert.equal(next.preview,undefined);
  assert.equal(next.reader_parity,undefined);
  assert.equal(next.corrections.active_correction_id,'c1');
});

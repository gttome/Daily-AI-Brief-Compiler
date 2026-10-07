import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMigratedState,semanticFingerprint} from '../image-capsules/migration.mjs';

function fixture(){
  const beforeState={schema_version:'daily-compiler-state-v1',edition_date:'2026-10-07',execution_id:'daily-compiler-shadow-2026-10-07',branch:'shadow/2026-10-07',state:'SHADOW_VERIFIED',stage:'VERIFY',started_at:'2026-10-07T00:00:00Z',updated_at:'2026-10-07T01:00:00Z',editorial_bundle:{status:'complete',digest:'git-blob:x'},images:{required:6,accepted:Array.from({length:6},(_,i)=>'s'+i)},bundle:{status:'BUNDLE_READY',digest:'a'.repeat(64)},last_error:null,retryable:false,preview:{url:'https://example.test/',bundle_digest:'a'.repeat(64)},reader_parity:{result:'PASS'}};
  const beforeBundle={schema_version:'daily-compiler-edition-bundle-v1',edition_date:'2026-10-07',status:'BUNDLE_READY',editorial_contract_version:'daily-compiler-editorial-contract-v1',
    stories:Array.from({length:6},(_,i)=>({id:'s'+i,headline:'H'+i})),videos:[{title:'v1'},{title:'v2'}],podcasts:[{title:'p1'},{title:'p2'}],watchlist:{new:[],updated:[],carried_forward:[],dropped:[]},book_mappings:[{story_id:'s0',book:'b'}],
    images:Array.from({length:6},(_,i)=>({story_id:'s'+i,path:'old/'+i+'.png',sha256:String(i+1).repeat(64).slice(0,64),git_blob_sha:String(i+1).repeat(40).slice(0,40),accepted:true})),producer_receipt:{semantic_rework:0}};
  const afterBundle=structuredClone(beforeBundle);
  afterBundle.image_system={strategy:'d0_native_image_capsules',contract_version:'daily-compiler-image-contract-v3',set_plan_path:'images/set-plan.json',set_plan_sha256:'a'.repeat(64),set_review_path:'images/set-review.json',set_review_sha256:'b'.repeat(64),acceptance_path:'images/acceptance.json',acceptance_sha256:'c'.repeat(64)};
  afterBundle.images=afterBundle.images.map((x,i)=>({...x,path:'new/'+i+'.png',sha256:(i+7).toString(16).repeat(64).slice(0,64),image_system:'d0_native_image_capsules',accepted_locked:true}));
  return {beforeState,beforeBundle,afterBundle};
}

test('migration reopens only deterministic compile state on the same execution',()=>{
  const {beforeState,beforeBundle,afterBundle}=fixture();
  const text=JSON.stringify(afterBundle,null,2)+'\n';
  const r=buildMigratedState({beforeState,beforeBundle,afterBundle,bundleText:text,updatedAt:'2026-10-07T12:00:00Z'});
  assert.equal(r.verification.result,'PASS');
  assert.equal(r.state.execution_id,beforeState.execution_id);
  assert.equal(r.state.state,'BUNDLE_READY');
  assert.equal(r.state.stage,'BUNDLE');
  assert.equal(r.state.images.strategy,'d0_native_image_capsules');
  assert.equal(r.state.images.phase,'ACCEPTED');
  assert.equal(r.state.images.accepted.length,6);
  assert.equal(r.state.bundle.status,'BUNDLE_READY');
  assert.equal(r.state.preview,undefined);
  assert.equal(r.state.reader_parity,undefined);
  assert.equal(semanticFingerprint(beforeBundle),semanticFingerprint(afterBundle));
});

test('migration state builder rejects semantic changes or incomplete D0 replacement',()=>{
  const {beforeState,beforeBundle,afterBundle}=fixture();
  const bad=structuredClone(afterBundle); bad.stories[0].headline='changed';
  assert.throws(()=>buildMigratedState({beforeState,beforeBundle,afterBundle:bad,bundleText:JSON.stringify(bad)}),/semantic_rework_detected/);
  const bad2=structuredClone(afterBundle); bad2.images[0].accepted_locked=false;
  assert.throws(()=>buildMigratedState({beforeState,beforeBundle,afterBundle:bad2,bundleText:JSON.stringify(bad2)}),/d0_image_not_locked/);
});

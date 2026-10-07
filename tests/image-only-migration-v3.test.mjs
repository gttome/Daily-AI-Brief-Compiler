import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareImageOnlyMigration,semanticFingerprint,verifyImageOnlyMigration} from '../image-capsules/migration.mjs';

function base(){
  const state={schema_version:'daily-compiler-state-v1',edition_date:'2026-10-07',execution_id:'daily-compiler-shadow-2026-10-07',branch:'shadow/2026-10-07',state:'SHADOW_VERIFIED',stage:'VERIFY',bundle:{status:'BUNDLE_READY'}};
  const bundle={schema_version:'daily-compiler-edition-bundle-v1',edition_date:'2026-10-07',status:'BUNDLE_READY',editorial_contract_version:'daily-compiler-editorial-contract-v1',
    stories:Array.from({length:6},(_,i)=>({id:'s'+i,headline:'H'+i})),videos:[{title:'v1'},{title:'v2'}],podcasts:[{title:'p1'},{title:'p2'}],
    watchlist:{new:[],updated:[],carried_forward:[],dropped:[]},book_mappings:[{story_id:'s0',book:'b'}],
    images:Array.from({length:6},(_,i)=>({story_id:'s'+i,path:'old/'+i+'.png',sha256:String(i+1).repeat(64).slice(0,64),git_blob_sha:String(i+1).repeat(40).slice(0,40),accepted:true})),
    producer_receipt:{semantic_rework:0}};
  return {state,bundle};
}

test('October 7 migration plan preserves the same verified execution and semantics',()=>{
  const {state,bundle}=base();
  const plan=prepareImageOnlyMigration({state,bundle});
  assert.equal(plan.execution_id,'daily-compiler-shadow-2026-10-07');
  assert.equal(plan.semantic_rework,0);
  assert.equal(plan.new_execution_allowed,false);
  assert.equal(plan.reader_update_authorized,false);
  assert.equal(plan.semantic_fingerprint,semanticFingerprint(bundle));
});

test('image-only verifier requires six actual D0 replacements and zero semantic rework',()=>{
  const {state,bundle}=base(),after=structuredClone(bundle),afterState=structuredClone(state);
  after.image_system={strategy:'d0_native_image_capsules'};
  after.images=after.images.map((x,i)=>({...x,path:'new/'+i+'.png',sha256:(i%2?'a':'b')+x.sha256.slice(1),image_system:'d0_native_image_capsules',accepted_locked:true}));
  after.producer_receipt.semantic_rework=0;
  assert.equal(verifyImageOnlyMigration({beforeState:state,beforeBundle:bundle,afterState,afterBundle:after}).result,'PASS');
  const bad=structuredClone(after); bad.stories[0].headline='changed';
  assert.ok(verifyImageOnlyMigration({beforeState:state,beforeBundle:bundle,afterState,afterBundle:bad}).errors.includes('semantic_rework_detected'));
});

test('migration verifier rejects a new execution',()=>{
  const {state,bundle}=base(),after=structuredClone(bundle),afterState=structuredClone(state);
  afterState.execution_id='new-execution';
  after.image_system={strategy:'d0_native_image_capsules'};
  after.images=after.images.map((x,i)=>({...x,path:'new/'+i+'.png',sha256:'f'+x.sha256.slice(1),image_system:'d0_native_image_capsules',accepted_locked:true}));
  const r=verifyImageOnlyMigration({beforeState:state,beforeBundle:bundle,afterState,afterBundle:after});
  assert.ok(r.errors.includes('execution_changed'));
});

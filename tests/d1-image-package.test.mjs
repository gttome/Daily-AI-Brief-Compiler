import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import fs from 'node:fs';
import {validateD1AcceptanceManifest,buildD1IngestPlan} from '../image-studio/acceptance.mjs';
import {validateD1CloudAssets,buildD1WorkPorterReceipt,sha256,gitBlobSha} from '../work-porter/integrity.mjs';
import {canonicalSha} from '../image-capsules/util.mjs';

async function fixture(){
  const assets={},images=[],comps=['pipeline','layered','comparison','hub','state','loop'];
  for(let i=0;i<6;i++){
    const id='asset-'+i;const bytes=await sharp({create:{width:1200,height:630,channels:3,background:{r:240-i,g:245-i,b:250-i}}}).png().toBuffer();
    assets[id]=bytes;images.push({story_id:'story-'+i,chat_session_id:'chat-'+i,cloud_asset_id:id,filename:'story-'+i+'.png',
      width:1200,height:630,format:'png',bytes:bytes.length,sha256:sha256(bytes),composition_signature:comps[i],
      visible_text_allowlist:['Input','Result'],attempt:1,visual_acceptance:'PASS',accepted_locked:true,supersedes:null});
  }
  const manifest={schema_version:'daily-compiler-d1-image-acceptance-manifest-v2',edition_date:'2026-10-08',studio_session_id:'work-browser-1',
    accepted_at:'2026-10-08T00:00:00Z',quality_gate_location:'fresh_regular_chat_per_story',github_visual_rereview_required:false,
    set_review:{result:'PASS',unique_compositions:6,unique_byte_streams:6,unique_story_chats:6,distinct_layouts:4,distinct_mechanisms:4},
    images,owner_intervention:false};
  const handoff={schema_version:'daily-compiler-d1-ingest-handoff-v2',edition_date:'2026-10-08',execution_id:'daily-compiler-shadow-2026-10-08',
    repository:'gttome/Daily-AI-Brief-Compiler',branch:'shadow/2026-10-08',manifest_sha256:canonicalSha(manifest),
    scope:'IMAGE_BROWSER_ORCHESTRATION_AND_INGEST',visual_rereview_required:false,image_generation_allowed:false,
    items:images.map(x=>({story_id:x.story_id,filename:x.filename,target_path:'shadow-runs/2026-10-08/images/d1/'+x.filename}))};
  return {manifest,handoff,assets};
}
test('manifest proves six unique fresh story chats and no repository target paths',async()=>{
  const {manifest,handoff}=await fixture();
  assert.deepEqual(validateD1AcceptanceManifest(manifest),[]);
  assert.equal(new Set(manifest.images.map(x=>x.chat_session_id)).size,6);
  assert.ok(manifest.images.every(x=>x.target_path===undefined));
  const plan=buildD1IngestPlan(manifest,handoff);assert.equal(plan.items.length,6);assert.equal(plan.image_generation_allowed,false);
});
test('Work browser porter validates exact bytes and raw-readback evidence identity',async()=>{
  const {manifest,handoff,assets}=await fixture();
  const validated=validateD1CloudAssets(manifest,assets,handoff);assert.equal(validated.result,'PASS',validated.errors.join(','));
  const readback={};for(const e of validated.evidence) readback[e.story_id]={sha256:e.sha256,git_blob_sha:e.git_blob_sha,target_path:e.target_path,bytes:e.bytes};
  const receipt=buildD1WorkPorterReceipt({manifest,handoff,assetsById:assets,gitReadbackByStory:readback,recordedAt:'2026-10-08T00:10:00Z'});
  assert.equal(receipt.scope,'IMAGE_BROWSER_ORCHESTRATION_AND_INGEST');assert.equal(receipt.browser_orchestration_performed,true);
  assert.equal(receipt.work_native_image_generation_performed,false);assert.equal(receipt.visual_quality_review_performed,false);
});
test('manifest fails if two stories share one chat',async()=>{
  const {manifest}=await fixture();manifest.images[1].chat_session_id=manifest.images[0].chat_session_id;
  assert.ok(validateD1AcceptanceManifest(manifest).includes('d1_chat_session_identity'));
});
test('porter fails closed on changed bytes',async()=>{
  const {manifest,handoff,assets}=await fixture();const k=manifest.images[0].cloud_asset_id;assets[k]=Buffer.from(assets[k]);assets[k][assets[k].length-1]^=1;
  assert.equal(validateD1CloudAssets(manifest,assets,handoff).result,'FAIL');
});

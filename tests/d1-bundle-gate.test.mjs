import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {applyD1Activation} from '../image-studio/activation-apply.mjs';
import {validateD1BundleImages} from '../image-studio/bundle-gate.mjs';
import {buildD1WorkPorterReceipt,sha256,gitBlobSha} from '../work-porter/integrity.mjs';
import {canonicalSha} from '../image-capsules/util.mjs';
import {makeD1QualificationFixture} from './fixtures/d1-qualification.mjs';

async function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'d1-bundle-'));fs.mkdirSync(path.join(root,'contracts'),{recursive:true});fs.mkdirSync(path.join(root,'proof'),{recursive:true});
  fs.writeFileSync(path.join(root,'contracts/d1-image-contract.json'),fs.readFileSync('contracts/d1-image-contract.json'));
  const qualification=makeD1QualificationFixture({root});
  applyD1Activation({repoRoot:root,proofPath:qualification.proofPath,activatedAt:'2026-10-08T03:00:00Z'});
  const assets={},images=[];
  for(let i=0;i<6;i++){
    const id='asset-'+i,b=await sharp({create:{width:1200,height:630,channels:3,background:{r:230+i,g:240+i,b:245}}}).png().toBuffer();assets[id]=b;
    images.push({story_id:'story-'+i,chat_session_id:'chat-'+i,cloud_asset_id:id,filename:'story-'+i+'.png',width:1200,height:630,format:'png',
      bytes:b.length,sha256:sha256(b),composition_signature:'comp-'+i,visible_text_allowlist:['Input','Result'],attempt:1,visual_acceptance:'PASS',accepted_locked:true,supersedes:null});
  }
  const manifest={schema_version:'daily-compiler-d1-image-acceptance-manifest-v2',edition_date:'2026-10-08',studio_session_id:'work-browser-1',accepted_at:'2026-10-08T00:10:00Z',
    quality_gate_location:'fresh_regular_chat_per_story',github_visual_rereview_required:false,set_review:{result:'PASS',unique_compositions:6,unique_byte_streams:6,unique_story_chats:6,distinct_layouts:4,distinct_mechanisms:4},images,owner_intervention:false};
  const handoff={schema_version:'daily-compiler-d1-ingest-handoff-v2',edition_date:'2026-10-08',execution_id:'daily-compiler-shadow-2026-10-08',repository:'gttome/Daily-AI-Brief-Compiler',
    branch:'shadow/2026-10-08',manifest_sha256:canonicalSha(manifest),scope:'IMAGE_BROWSER_ORCHESTRATION_AND_INGEST',visual_rereview_required:false,image_generation_allowed:false,
    items:images.map(x=>({story_id:x.story_id,filename:x.filename,target_path:'shadow-runs/2026-10-08/images/d1/'+x.filename}))};
  for(const x of images){const target=handoff.items.find(h=>h.story_id===x.story_id).target_path;fs.mkdirSync(path.dirname(path.join(root,target)),{recursive:true});fs.writeFileSync(path.join(root,target),assets[x.cloud_asset_id]);}
  const rb={};for(const x of images){const target=handoff.items.find(h=>h.story_id===x.story_id).target_path;rb[x.story_id]={sha256:x.sha256,git_blob_sha:gitBlobSha(assets[x.cloud_asset_id]),target_path:target,bytes:assets[x.cloud_asset_id].length};}
  const porter=buildD1WorkPorterReceipt({manifest,handoff,assetsById:assets,gitReadbackByStory:rb,recordedAt:'2026-10-08T00:20:00Z'});
  fs.mkdirSync(path.join(root,'shadow-runs/2026-10-08/images'),{recursive:true});
  for(const [name,obj] of [['d1-acceptance.json',manifest],['d1-ingest-handoff.json',handoff],['d1-porter.json',porter]]) fs.writeFileSync(path.join(root,'shadow-runs/2026-10-08/images',name),JSON.stringify(obj));
  const bundle={image_system:{strategy:'d1_work_browser_fresh_chat',contract_version:'daily-compiler-image-contract-v5',
      acceptance_manifest_path:'shadow-runs/2026-10-08/images/d1-acceptance.json',acceptance_manifest_sha256:canonicalSha(manifest),
      ingest_handoff_path:'shadow-runs/2026-10-08/images/d1-ingest-handoff.json',ingest_handoff_sha256:canonicalSha(handoff),
      work_porter_receipt_path:'shadow-runs/2026-10-08/images/d1-porter.json',work_porter_receipt_sha256:canonicalSha(porter)},
    images:images.map(x=>{const target=handoff.items.find(h=>h.story_id===x.story_id).target_path;return {story_id:x.story_id,path:target,sha256:x.sha256,
      git_blob_sha:gitBlobSha(assets[x.cloud_asset_id]),accepted:true,accepted_locked:true,image_system:'d1_work_browser_fresh_chat',asset_version:'d1-v2',cache_key:'d1-'+x.story_id,supersedes:null};})};
  return {root,bundle};
}
test('bundle gate passes exact D1 v5 accepted bytes',async()=>{const {root,bundle}=await fixture();const r=validateD1BundleImages({bundle,repoRoot:root});assert.equal(r.result,'PASS',r.errors.join('\n'));});
test('bundle gate fails on changed repository bytes',async()=>{const {root,bundle}=await fixture();const p=path.join(root,bundle.images[0].path);const b=fs.readFileSync(p);b[b.length-1]^=1;fs.writeFileSync(p,b);assert.equal(validateD1BundleImages({bundle,repoRoot:root}).result,'FAIL');});


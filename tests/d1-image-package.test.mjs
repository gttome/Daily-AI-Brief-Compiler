import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import fs from 'node:fs';
import {validateD1AcceptanceManifest,buildD1IngestPlan} from '../image-studio/acceptance.mjs';
import {validateD1CloudAssets,buildD1WorkPorterReceipt,sha256,gitBlobSha} from '../work-porter/integrity.mjs';
import {canonicalSha} from '../image-capsules/util.mjs';

async function fixture(){
  const assets={};
  const images=[];
  const comps=['pipeline','layered','comparison','hub','state','loop'];
  for(let i=0;i<6;i++){
    const id='asset-'+i;
    const bytes=await sharp({create:{width:1200,height:630,channels:3,background:{r:240-i,g:245-i,b:250-i}}}).png().toBuffer();
    assets[id]=bytes;
    images.push({
      story_id:'story-'+i,
      cloud_asset_id:id,
      filename:'story-'+i+'.png',
      width:1200,height:630,format:'png',bytes:bytes.length,sha256:sha256(bytes),
      composition_signature:comps[i],visible_text_allowlist:['Input','Result'],attempt:1,
      visual_acceptance:'PASS',accepted_locked:true,supersedes:null
    });
  }
  const manifest={
    schema_version:'daily-compiler-d1-image-acceptance-manifest-v1',
    edition_date:'2026-10-08',
    studio_session_id:'studio-1',
    accepted_at:'2026-10-08T00:00:00Z',
    quality_gate_location:'image_studio',
    github_visual_rereview_required:false,
    set_review:{result:'PASS',unique_compositions:6,unique_byte_streams:6,distinct_layouts:4,distinct_mechanisms:4},
    images,
    owner_intervention:false
  };
  const handoff={
    schema_version:'daily-compiler-d1-ingest-handoff-v1',
    edition_date:'2026-10-08',
    execution_id:'daily-compiler-shadow-2026-10-08',
    repository:'gttome/Daily-AI-Brief-Compiler',
    branch:'shadow/2026-10-08',
    manifest_sha256:canonicalSha(manifest),
    scope:'IMAGE_PACKAGE_INGEST',
    visual_rereview_required:false,
    image_generation_allowed:false,
    items:images.map(x=>({story_id:x.story_id,filename:x.filename,target_path:'shadow-runs/2026-10-08/images/d1/'+x.filename}))
  };
  return {manifest,handoff,assets};
}

test('D1 Studio manifest contains quality identity but no repository target paths',async()=>{
  const {manifest,handoff}=await fixture();
  assert.deepEqual(validateD1AcceptanceManifest(manifest),[]);
  assert.ok(manifest.images.every(x=>x.target_path===undefined));
  const plan=buildD1IngestPlan(manifest,handoff);
  assert.equal(plan.items.length,6);
  assert.equal(plan.visual_quality_review_required,false);
  assert.equal(plan.image_generation_allowed,false);
  assert.equal(plan.repository,'gttome/Daily-AI-Brief-Compiler');
  assert.equal(plan.items[0].target_path,'shadow-runs/2026-10-08/images/d1/story-0.png');
});

test('Work Porter validates exact bytes without visual rereview or generation',async()=>{
  const {manifest,handoff,assets}=await fixture();
  const validated=validateD1CloudAssets(manifest,assets,handoff);
  assert.equal(validated.result,'PASS',validated.errors.join(','));
  const readback={};
  for(const e of validated.evidence) readback[e.story_id]={sha256:e.sha256,git_blob_sha:e.git_blob_sha,target_path:e.target_path};
  const receipt=buildD1WorkPorterReceipt({manifest,handoff,assetsById:assets,gitReadbackByStory:readback,recordedAt:'2026-10-08T00:10:00Z'});
  assert.equal(receipt.result,'PASS');
  assert.equal(receipt.scope,'IMAGE_PACKAGE_INGEST');
  assert.equal(receipt.visual_quality_review_performed,false);
  assert.equal(receipt.image_generation_performed,false);
  assert.equal(receipt.ingest_handoff_sha256,canonicalSha(handoff));
  assert.equal(receipt.images.length,6);
});

test('Work Porter fails closed on changed bytes',async()=>{
  const {manifest,handoff,assets}=await fixture();
  const first=manifest.images[0].cloud_asset_id;
  assets[first]=Buffer.from(assets[first]);
  assets[first][assets[first].length-1]^=1;
  const r=validateD1CloudAssets(manifest,assets,handoff);
  assert.equal(r.result,'FAIL');
  assert.ok(r.errors.some(x=>x.startsWith('asset_sha256:story-0')));
});

test('Work Porter fails closed on a repository mapping that does not bind the accepted filename',async()=>{
  const {manifest,handoff,assets}=await fixture();
  handoff.items[0].filename='wrong.png';
  const r=validateD1CloudAssets(manifest,assets,handoff);
  assert.equal(r.result,'FAIL');
  assert.ok(r.errors.some(x=>x.startsWith('ingest_handoff_binding:story-0')));
});

test('D1 contract has no ZIP requirement and only narrow Work scope',()=>{
  const c=JSON.parse(fs.readFileSync('contracts/d1-image-contract.json','utf8'));
  assert.equal(c.transfer.archive_required,false);
  assert.deepEqual(c.allowed_work_scope,['IMAGE_PACKAGE_INGEST']);
  assert.equal(c.transfer.work_may_generate_or_edit_images,false);
  assert.equal(c.transfer.work_may_make_visual_quality_decisions,false);
});

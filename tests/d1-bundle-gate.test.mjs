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

function cloudProof(){
  return {
    schema_version:'daily-compiler-d1-cloud-proof-v1',result:'PASS',proof_id:'proof-1',
    dot_coordinator:{cloud_task:true,separate_image_task:true,persistent_context_used_for_generation:false},
    image_studio:{fresh_conversation:true,native_chatgpt_images:true,six_assets:true,acceptance_manifest_pass:true},
    handoff:{owner_transfer:false,local_file_transfer:false,archive_required:false,programmatic_cloud_transfer:true,exact_assets_preserved:true},
    work_porter:{scope:'IMAGE_PACKAGE_INGEST',cloud_work:true,visual_rereview:false,generation:false,porter_receipt_pass:true},
    cloud_only:true,owner_intervention:false,local_computer_used:false,prohibited_dependencies_used:false
  };
}

async function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'d1-bundle-'));
  fs.mkdirSync(path.join(root,'contracts'),{recursive:true});
  fs.mkdirSync(path.join(root,'proof'),{recursive:true});
  const contract=JSON.parse(fs.readFileSync('contracts/d1-image-contract.json','utf8'));
  fs.writeFileSync(path.join(root,'contracts/d1-image-contract.json'),JSON.stringify(contract));
  fs.writeFileSync(path.join(root,'proof/cloud.json'),JSON.stringify(cloudProof()));
  applyD1Activation({repoRoot:root,proofPath:'proof/cloud.json',activatedAt:'2026-10-08T00:00:00Z'});

  const assets={},images=[];
  for(let i=0;i<6;i++){
    const id='asset-'+i,target='shadow-runs/2026-10-08/images/d1/story-'+i+'.png';
    const bytes=await sharp({create:{width:1200,height:630,channels:3,background:{r:230+i,g:240+i,b:245}}}).png().toBuffer();
    assets[id]=bytes;
    fs.mkdirSync(path.dirname(path.join(root,target)),{recursive:true});
    fs.writeFileSync(path.join(root,target),bytes);
    images.push({
      story_id:'story-'+i,cloud_asset_id:id,filename:'story-'+i+'.png',target_path:target,
      width:1200,height:630,format:'png',bytes:bytes.length,sha256:sha256(bytes),
      composition_signature:'comp-'+i,visible_text_allowlist:['Input','Result'],attempt:1,
      visual_acceptance:'PASS',accepted_locked:true,supersedes:null
    });
  }
  const manifest={
    schema_version:'daily-compiler-d1-image-acceptance-manifest-v1',
    edition_date:'2026-10-08',studio_session_id:'studio-1',accepted_at:'2026-10-08T00:10:00Z',
    quality_gate_location:'image_studio',github_visual_rereview_required:false,
    set_review:{result:'PASS',unique_compositions:6,unique_byte_streams:6,distinct_layouts:4,distinct_mechanisms:4},
    images,owner_intervention:false
  };
  const readback={};
  for(const x of images) readback[x.story_id]={sha256:x.sha256,git_blob_sha:gitBlobSha(assets[x.cloud_asset_id]),target_path:x.target_path};
  const porter=buildD1WorkPorterReceipt({manifest,assetsById:assets,gitReadbackByStory:readback,recordedAt:'2026-10-08T00:20:00Z'});
  fs.mkdirSync(path.join(root,'shadow-runs/2026-10-08/images'),{recursive:true});
  fs.writeFileSync(path.join(root,'shadow-runs/2026-10-08/images/d1-acceptance.json'),JSON.stringify(manifest));
  fs.writeFileSync(path.join(root,'shadow-runs/2026-10-08/images/d1-porter.json'),JSON.stringify(porter));
  const bundle={
    image_system:{
      strategy:'d1_cloud_image_studio',contract_version:'daily-compiler-image-contract-v4',
      acceptance_manifest_path:'shadow-runs/2026-10-08/images/d1-acceptance.json',
      acceptance_manifest_sha256:canonicalSha(manifest),
      work_porter_receipt_path:'shadow-runs/2026-10-08/images/d1-porter.json',
      work_porter_receipt_sha256:canonicalSha(porter)
    },
    images:images.map(x=>({
      story_id:x.story_id,path:x.target_path,sha256:x.sha256,git_blob_sha:gitBlobSha(assets[x.cloud_asset_id]),
      accepted:true,accepted_locked:true,image_system:'d1_cloud_image_studio',
      asset_version:'d1-v1',cache_key:'d1-'+x.story_id,supersedes:null
    }))
  };
  return {root,bundle};
}

test('D1 bundle gate trusts Studio quality manifest and proves exact Git bytes',async()=>{
  const {root,bundle}=await fixture();
  const r=validateD1BundleImages({bundle,repoRoot:root});
  assert.equal(r.result,'PASS',r.errors.join('\n'));
  assert.equal(r.evidence.length,6);
});

test('D1 bundle gate fails on changed repository bytes without invoking visual review',async()=>{
  const {root,bundle}=await fixture();
  const p=path.join(root,bundle.images[0].path);
  const b=fs.readFileSync(p); b[b.length-1]^=1; fs.writeFileSync(p,b);
  const r=validateD1BundleImages({bundle,repoRoot:root});
  assert.equal(r.result,'FAIL');
  assert.ok(r.errors.some(x=>x.startsWith('d1_sha256:story-0')));
});

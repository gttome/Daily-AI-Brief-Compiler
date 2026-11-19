// Preserve complete reviewed JSON bytes during staging/readback. This helper
// never uploads, changes findings, inspects pixels, or manufactures a review.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const fail=s=>{throw Error('image_review_receipt:'+s);};
const hex=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');

export function inspectCompleteImageReview(bytes,manifest){
 let r;try{r=JSON.parse(bytes.toString('utf8'));}catch{fail('invalid_or_truncated_json');}
 const images=manifest?.images;
 if(!Array.isArray(images)||images.length!==6||new Set(images.map(i=>i?.story_id)).size!==6||
    images.some(i=>typeof i?.story_id!=='string'||!i.story_id||!hex(i.sha256)))fail('six_manifest_images_required');
 if(r?.schema_version!=='external-image-semantic-pixel-review-v1'||r.edition_date!==manifest.edition_date||
    r.result!=='PASS'||r.expected_targets!==24||r.captured_targets!==24||r.reviewed_pass!==24||
    !Array.isArray(r.defects)||r.defects.length||!Array.isArray(r.targets)||r.targets.length!==24||
    new Set(r.targets.map(t=>t?.target_id)).size!==24)fail('complete_exact_edition_review_required');
 const contexts=new Set(images.flatMap(i=>['dated_brief','permanent_story'].flatMap(c=>['desktop','mobile'].map(v=>`${i.story_id}:${c}:${v}`))));
 for(const t of r.targets){
  const image=images.find(i=>i.story_id===t?.story_id);
  if(!image||!contexts.has(t.target_id)||t.target_id!==`${t.story_id}:${t.context}:${t.viewport}`||
     t.live_image_sha256!==image.sha256||t.result!=='PASS'||t.actual_pixels_inspected!==true||
     t.correct_story_asset_visible!==true||t.full_diagram_visible!==true||t.clipped_or_overlapped!==false||
     t.placeholder_visible!==false||t.primary_explanatory_labels_recognizable!==true||
     !hex(t.capture_sha256)||!Number.isSafeInteger(t.capture_bytes)||t.capture_bytes<=0)
    fail('unbound_or_incomplete_target');
 }
 return {result:'COMPLETE_REVIEW_BYTES_VALIDATED',edition_date:r.edition_date,
  targets:24,bytes:bytes.length,sha256:sha(bytes),pixel_inspection_not_performed:true};
}

export function prepareImageReviewReceipt({sourcePath,stagedPath,manifest,readbackPath}){
 const bytes=fs.readFileSync(sourcePath),result=inspectCompleteImageReview(bytes,manifest);
 // Readback-only verification is allowed after a prior staging step. Compare
 // every byte, including whitespace; parsed equality cannot detect truncation.
 if(readbackPath){
  const remote=fs.readFileSync(readbackPath);inspectCompleteImageReview(remote,manifest);
  if(!remote.equals(bytes))fail('remote_readback_bytes_differ');
  return {...result,result:'COMPLETE_REMOTE_READBACK_MATCH'};
 }
 if(!stagedPath||path.resolve(stagedPath)===path.resolve(sourcePath))fail('distinct_new_staging_path_required');
 fs.mkdirSync(path.dirname(stagedPath),{recursive:true});
 // Do not silently overwrite a previously staged receipt or a symlink.
 fs.writeFileSync(stagedPath,bytes,{flag:'wx'});
 if(!fs.readFileSync(stagedPath).equals(bytes))fail('staged_bytes_differ');
 return {...result,result:'COMPLETE_REVIEW_STAGED',staged_path:stagedPath};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,manifestFile,sourceFile,targetFile]=process.argv.slice(2);
 if(!['stage','verify-readback'].includes(mode)||!targetFile)
  fail('usage: prepare-image-review-receipt.mjs <stage|verify-readback> <manifest.json> <complete-review.json> <new-staged.json|remote-readback.json>');
 const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
 const result=prepareImageReviewReceipt({sourcePath:sourceFile,manifest,
  ...(mode==='stage'?{stagedPath:targetFile}:{readbackPath:targetFile})});
 // Metadata only. Never route the full receipt through bounded command output.
 console.log(JSON.stringify(result));
}

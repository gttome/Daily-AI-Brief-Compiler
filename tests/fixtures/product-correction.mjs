// TEST_ONLY: reuse saved synthetic PNG pixels, adding a legal ancillary chunk to
// make a distinct byte-binding fixture. No native generation or pixel review.
import fs from 'node:fs';
import path from 'node:path';
import {canonicalSha,sha256,gitBlobSha} from '../../image-capsules/util.mjs';
import {applyImageCorrectionBatch} from '../../operations/image-correction-batch.mjs';

const crc=bytes=>{let value=0xffffffff;for(const byte of bytes){value^=byte;for(let n=0;n<8;n++)value=value&1?0xedb88320^(value>>>1):value>>>1;}return (value^0xffffffff)>>>0;};
function fixtureBytes(original,label){
  const data=Buffer.from('Comment\0TEST_ONLY correction '+label),body=Buffer.concat([Buffer.from('tEXt'),data]),chunk=Buffer.alloc(body.length+8);
  chunk.writeUInt32BE(data.length);body.copy(chunk,4);chunk.writeUInt32BE(crc(body),chunk.length-4);
  return Buffer.concat([original.subarray(0,-12),chunk,original.subarray(-12)]);
}

export function stageProductImageCorrection(f,selected=[f.bundle.images[0].story_id],revisionNumber=1,{previousRevision=null}={}){
  const previousBundleText=fs.readFileSync(f.bundlePath,'utf8'),baseBundleText=previousRevision?.original_bundle_text||previousBundleText,baseState=structuredClone(f.state);
  const originalBundle=structuredClone(f.bundle),manifest=structuredClone(f.manifest),handoff=structuredClone(f.handoff),porter=structuredClone(f.porter),reviews=structuredClone(f.reviews);
  const dir=`corrections/TEST_ONLY-${selected.length}-r${revisionNumber}`,assets={},corrections=[];
  const write=(name,record)=>{const p=path.join(f.root,dir,name);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,Buffer.isBuffer(record)?record:JSON.stringify(record,null,2)+'\n');return dir+'/'+name;};
  for(const id of selected){
    const old=originalBundle.images.find(image=>image.story_id===id),accepted=manifest.images.find(image=>image.story_id===id);
    const bytes=fixtureBytes(fs.readFileSync(path.join(f.root,old.path)),id+'-'+revisionNumber),digest=sha256(bytes),blob=gitBlobSha(bytes),filename=id+'-r'+revisionNumber+'.png',imagePath=write(filename,bytes);
    assets[id]=bytes;
    const context='ctx-'+canonicalSha('TEST_ONLY correction '+id+' '+revisionNumber);
    Object.assign(accepted,{sha256:digest,bytes:bytes.length,filename,chat_session_id:context,cloud_asset_id:'TEST_ONLY-correction-'+id+'-'+revisionNumber,supersedes:{path:old.path,sha256:old.sha256}});
    Object.assign(handoff.items.find(row=>row.story_id===id),{filename,target_path:imagePath});
    Object.assign(porter.images.find(row=>row.story_id===id),{target_path:imagePath,source_sha256:digest,readback_sha256:digest,git_blob_sha:blob});
    const review=reviews.images.find(row=>row.story_id===id);
    Object.assign(review,{final_path:imagePath,final_sha256:digest,final_git_blob_sha:blob,reviewer_identity:context});
    Object.assign(reviews.observations.find(row=>row.story_id===id),{canonical_sha256:digest,review_sha256:canonicalSha(review),context_id:context});
    const session=reviews.sessions.find(row=>row.story_id===id);session.context_id=context;
    for(const attempt of session.attempts){attempt.context_id=context;attempt.raw_sha256=digest;}
    reviews.set_review.candidates.find(row=>row.story_id===id).final_sha256=digest;
    const readback=reviews.binary_readback.images.find(row=>row.story_id===id);
    const identity={sha256:digest,git_blob_sha:blob,bytes:bytes.length,width:1200,height:630,format:'png'};
    const readbackCommit=canonicalSha('TEST_ONLY immutable correction commit '+revisionNumber).slice(0,40);
    Object.assign(readback,{commit:readbackCommit,raw:identity,canonical:{...identity,path:imagePath},url:`https://raw.githubusercontent.com/gttome/Daily-AI-Brief-Compiler/${readbackCommit}/${imagePath}`,readback_sha256:digest,readback_git_blob_sha:blob,readback_bytes:bytes.length});
    const image={...structuredClone(old),path:imagePath,sha256:digest,git_blob_sha:blob,bytes:bytes.length,width:1200,height:630,format:'png',asset_version:'TEST_ONLY-correction-r'+revisionNumber,cache_key:'TEST_ONLY-correction-'+digest,supersedes:{path:old.path,sha256:old.sha256}};
    corrections.push({schema_version:'daily-compiler-post-publication-correction-v1',correction_id:'TEST_ONLY-'+id+'-r'+revisionNumber,edition_date:f.date,requested_at:'2026-10-08T04:00:00Z',requested_by:'owner',correction_type:'replace_image',target:{story_id:id,expected_sha256:old.sha256},replacement:{image},reason:'TEST_ONLY synthetic correction scope and byte-binding fixture.',status:'VALIDATED',semantic_scope:'image_only',correction_revision:revisionNumber,preserve_original:true,new_execution_allowed:false,protected_pr_required:true,live_verification_required:true});
  }
  handoff.manifest_sha256=canonicalSha(manifest);porter.manifest_sha256=canonicalSha(manifest);porter.ingest_handoff_sha256=canonicalSha(handoff);reviews.manifest_sha256=canonicalSha(manifest);
  const system={...originalBundle.image_system};
  for(const [key,record] of [['acceptance_manifest',manifest],['ingest_handoff',handoff],['work_porter_receipt',porter],['canonical_reviews',reviews]]){system[key+'_path']=write(key+'.json',record);system[key+'_sha256']=canonicalSha(record);}
  const request={schema_version:'daily-compiler-image-correction-request-v1',request_id:'TEST_ONLY-correction-'+selected.length,revision_id:'TEST_ONLY-correction-'+selected.length+'-r'+revisionNumber,edition_date:f.date,status:'READY_TO_APPLY',story_ids:selected,preserve_original:true,new_execution_allowed:false,requested_at:'2026-10-08T04:00:00Z',image_system:system,expected_previous_bundle_sha256:sha256(previousBundleText)};
  const result=applyImageCorrectionBatch({bundle:originalBundle,request,corrections,assets,baseState,bundleText:previousBundleText,baseBundleText,previousRevision});
  const revisionPath=write('revision.json',result.revision),bundlePath=write('bundle.json',result.bundle);
  return {result,request,corrections,assets,manifest,handoff,porter,reviews,revisionPath:path.join(f.root,revisionPath),bundlePath:path.join(f.root,bundlePath),write};
}

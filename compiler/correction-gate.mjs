import fs from 'node:fs';
import {canonicalSha,sha256,gitBlobSha,hex} from '../image-capsules/util.mjs';
import {d1EvidencePath,readD1Evidence} from '../image-studio/proof-evidence.mjs';
import {validateCorrectionVerificationReceipt} from '../operations/correction-verification.mjs';

const need=(ok,message)=>{if(!ok)throw new Error(message);};
const same=(a,b)=>canonicalSha(a)===canonicalSha(b);
const retainedRows=(before,after,selected,label)=>{
  need(Array.isArray(before)&&Array.isArray(after),'correction_manifest_rows:'+label);
  for(const row of before){
    if(selected.includes(row.story_id))continue;
    const matches=after.filter(next=>next?.story_id===row.story_id);
    need(matches.length===1&&same(row,matches[0]),'correction_unselected_evidence_changed:'+label+':'+row.story_id);
  }
};

export function validateCorrectionIntegrity({revision,bundle,validation,repoRoot}){
  for(const ref of validation.verification_receipts){
    const bytes=fs.readFileSync(d1EvidencePath(repoRoot,ref.path));
    need(sha256(bytes)===ref.sha256,'correction_verification_receipt_hash');
    const receipt=JSON.parse(bytes);
    validateCorrectionVerificationReceipt({repoRoot,receipt,expected:ref});
  }
  // Old assets and all accepted locks remain available under their old identities.
  const paths=new Map();
  for(const image of validation.historical_assets){
    if(paths.has(image.path)){need(paths.get(image.path)===image.sha256,'correction_historical_path_reused');continue;}
    paths.set(image.path,image.sha256);
    const bytes=fs.readFileSync(d1EvidencePath(repoRoot,image.path));
    need(sha256(bytes)===image.sha256&&gitBlobSha(bytes)===image.git_blob_sha,'correction_historical_asset_changed:'+image.story_id);
  }
  for(const update of validation.image_system_updates){
    const {before,after,selected_story_ids:selected}=update;
    if(before.strategy!=='d1_work_browser_fresh_chat')continue;
    const records={};
    for(const key of ['acceptance_manifest','ingest_handoff','work_porter_receipt','canonical_reviews']){
      records[key]=[before,after].map(system=>readD1Evidence(repoRoot,{path:system[key+'_path'],sha256:system[key+'_sha256']}));
    }
    for(const [key,field] of [['acceptance_manifest','images'],['ingest_handoff','items'],['work_porter_receipt','images']])retainedRows(records[key][0][field],records[key][1][field],selected,key);
    const [oldReview,newReview]=records.canonical_reviews;
    for(const field of ['images','observations','sessions'])retainedRows(oldReview[field],newReview[field],selected,'canonical_reviews.'+field);
    retainedRows(oldReview.binary_readback?.images,newReview.binary_readback?.images,selected,'binary_readback');
    retainedRows(oldReview.set_review?.candidates,newReview.set_review?.candidates,selected,'set_review');
    const [oldRequest,newRequest]=[oldReview,newReview].map(record=>readD1Evidence(repoRoot,record.request));
    retainedRows(oldRequest.stories,newRequest.stories,selected,'sealed_specification');
  }
  return {result:'PASS',revision_id:revision.revision_id,original_bundle_sha256:revision.original_bundle_sha256,new_bundle_sha256:revision.bundle.digest,retained_assets:paths.size,terminal_run_unchanged:true};
}

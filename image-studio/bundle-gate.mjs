import fs from 'node:fs';
import {canonicalSha,hex} from '../image-capsules/util.mjs';
import {assertD1AcceptanceManifest,buildD1IngestPlan,D1_WORK_SCOPE} from './acceptance.mjs';
import {validateD1Activation,D1_STRATEGY,D1_CONTRACT} from './activation.mjs';
import {d1EvidencePath,readD1Evidence} from './proof-evidence.mjs';
import {validateD1ProductEvidence} from './product-evidence.mjs';
import {sha256,gitBlobSha} from '../work-porter/integrity.mjs';
import {validateCanonicalPng} from './png-integrity.mjs';

const need=(ok,message)=>{if(!ok)throw new Error(message);};
const sameStories=(rows,ids)=>Array.isArray(rows)&&rows.length===ids.length&&new Set(rows.map(x=>x?.story_id)).size===ids.length&&rows.every(x=>ids.includes(x?.story_id));

export function validateD1BundleImages({bundle,state=null,repoRoot='.',validatedCorrection=false}={}){
  const evidence=[];
  if(bundle?.image_system?.strategy!==D1_STRATEGY)return {result:'NOT_D1',errors:[],evidence};
  try{
    const sys=bundle.image_system,activation=validateD1Activation({repoRoot});
    need(activation.result==='PASS','activation:'+activation.errors.join(';'));
    need(sys.contract_version===D1_CONTRACT,'d1_contract_version');
    need(/^\d{4}-\d{2}-\d{2}$/.test(bundle.edition_date||''),'d1_edition_date');
    const ids=(bundle.stories||[]).map(story=>story?.id);
    need(ids.length===6&&new Set(ids).size===6&&ids.every(id=>typeof id==='string'&&id.length),'d1_story_identity');
    need(sameStories(bundle.images,ids),'d1_image_story_mapping');
    const records={};
    for(const name of ['acceptance_manifest','ingest_handoff','work_porter_receipt','canonical_reviews']){
      need(hex(sys[name+'_sha256'],64),'d1_'+name+'_sha256');
      records[name]=readD1Evidence(repoRoot,{path:sys[name+'_path'],sha256:sys[name+'_sha256']});
    }
    const manifest=records.acceptance_manifest,handoff=records.ingest_handoff,porter=records.work_porter_receipt;
    assertD1AcceptanceManifest(manifest);
    const plan=buildD1IngestPlan(manifest,handoff);
    need(manifest.edition_date===bundle.edition_date&&handoff.edition_date===bundle.edition_date,'d1_edition_binding');
    need(handoff.repository==='gttome/Daily-AI-Brief-Compiler'&&typeof handoff.execution_id==='string'&&handoff.execution_id.length>0&&typeof handoff.branch==='string'&&handoff.branch.length>0,'d1_handoff_target');
    for(const rows of [manifest.images,handoff.items,porter.images])need(sameStories(rows,ids),'d1_six_mapped_rows');
    need(porter.schema_version==='daily-compiler-d1-work-porter-receipt-v2'&&porter.result==='PASS'&&porter.scope===D1_WORK_SCOPE,'d1_porter_receipt_identity');
    need(porter.visual_quality_review_performed===false&&porter.work_native_image_generation_performed===false&&porter.owner_intervention===false&&porter.browser_orchestration_performed===true,'d1_porter_scope_violation');
    need(porter.manifest_sha256===canonicalSha(manifest)&&porter.ingest_handoff_sha256===canonicalSha(handoff),'d1_porter_binding');
    const paths=new Set(),hashes=new Set();
    for(const image of bundle.images){
      const id=image.story_id,accepted=manifest.images.find(x=>x.story_id===id),mapped=plan.items.find(x=>x.story_id===id),ported=porter.images.find(x=>x.story_id===id);
      need(image.image_system===D1_STRATEGY&&image.accepted===true&&image.accepted_locked===true,'d1_image_not_locked:'+id);
      need(hex(image.sha256,64)&&hex(image.git_blob_sha,40)&&typeof image.asset_version==='string'&&image.asset_version.length>0&&typeof image.cache_key==='string'&&image.cache_key.length>0,'d1_image_fields:'+id);
      need(accepted.sha256===image.sha256&&mapped.target_path===image.path&&mapped.expected_sha256===image.sha256,'d1_manifest_ingest_binding:'+id);
      need(ported.target_path===image.path&&ported.source_sha256===image.sha256&&ported.readback_sha256===image.sha256&&ported.git_blob_sha===image.git_blob_sha&&ported.dimensions==='1200x630'&&ported.integrity_result==='PASS','d1_porter_asset_binding:'+id);
      const bytes=fs.readFileSync(d1EvidencePath(repoRoot,image.path)),dims=validateCanonicalPng(bytes);
      need(dims.width===1200&&dims.height===630,'d1_dimensions:'+id);
      need(sha256(bytes)===image.sha256&&gitBlobSha(bytes)===image.git_blob_sha,'d1_canonical_bytes:'+id);
      need(bytes.length===accepted.bytes&&(image.bytes===undefined||image.bytes===bytes.length),'d1_byte_count:'+id);
      for(const [key,value] of [['width',1200],['height',630],['format','png']])need(image[key]===undefined||image[key]===value,'d1_asset_metadata:'+id+':'+key);
      paths.add(image.path);hashes.add(image.sha256);
      evidence.push({story_id:id,path:image.path,sha256:image.sha256,git_blob_sha:image.git_blob_sha,bytes:bytes.length,width:dims.width,height:dims.height});
    }
    need(paths.size===6&&hashes.size===6,'d1_unique_assets');
    const quality=validateD1ProductEvidence({bundle,state,manifest,handoff,porter,repoRoot,validatedCorrection,reference:{path:sys.canonical_reviews_path,sha256:sys.canonical_reviews_sha256}});
    need(quality.result==='PASS',quality.errors.join(';'));
    return {result:'PASS',errors:[],evidence,manifest_sha256:canonicalSha(manifest),quality,activation_proof_sha256:activation.receipt.cloud_proof_sha256,subjective_rereview_performed:false};
  }catch(error){return {result:'FAIL',errors:[error.message],evidence};}
}

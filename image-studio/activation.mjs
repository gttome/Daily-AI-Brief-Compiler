import fs from 'node:fs';
import path from 'node:path';
import {canonicalSha,hex} from '../image-capsules/util.mjs';

export const D1_ACTIVATION_SCHEMA='daily-compiler-d1-activation-v2';
export const D1_PROOF_SCHEMA='daily-compiler-d1-cloud-proof-v2';
export const D1_STRATEGY='d1_work_browser_fresh_chat';
export const D1_CONTRACT='daily-compiler-image-contract-v5';
export const D1_WORK_SCOPE='IMAGE_BROWSER_ORCHESTRATION_AND_INGEST';

const safeRel=p=>typeof p==='string'&&p.length>0&&!path.isAbsolute(p)&&!p.includes('\\')&&!p.split('/').some(x=>x==='..'||x==='.'||x==='');

export function validateD1CloudProof(proof={}){
  const errors=[];
  if(proof.schema_version!==D1_PROOF_SCHEMA||proof.result!=='PASS') errors.push('d1_cloud_proof_identity');
  if(proof.browser_orchestrator?.work_cloud_browser!==true||proof.browser_orchestrator?.authenticated_session!==true||proof.browser_orchestrator?.work_native_image_generation!==false||proof.browser_orchestrator?.work_subagent_image_generation!==false) errors.push('d1_browser_boundary');
  if(proof.story_chats?.fresh_regular_conversations!==true||proof.story_chats?.conversation_count!==6||proof.story_chats?.native_chatgpt_images!==true||proof.story_chats?.six_assets!==true||proof.story_chats?.acceptance_manifest_pass!==true||proof.story_chats?.prior_conversation_reuse!==false) errors.push('d1_story_chat_boundary');
  if(proof.handoff?.owner_transfer!==false||proof.handoff?.local_file_transfer!==false||proof.handoff?.archive_required!==false||proof.handoff?.programmatic_cloud_download!==true||proof.handoff?.exact_assets_preserved!==true) errors.push('d1_handoff_boundary');
  if(proof.git_readback?.exact_commit_binary_download!==true||proof.git_readback?.all_sha256_match!==true||proof.git_readback?.all_git_blob_match!==true||proof.git_readback?.all_byte_counts_match!==true) errors.push('d1_git_readback_boundary');
  if(proof.cloud_only!==true||proof.owner_intervention!==false||proof.local_computer_used!==false||proof.prohibited_dependencies_used!==false) errors.push('d1_cloud_only_boundary');
  return [...new Set(errors)];
}

export function validateD1ActivationReceipt(receipt={}){
  const errors=[];
  if(receipt.schema_version!==D1_ACTIVATION_SCHEMA||receipt.result!=='PASS') errors.push('d1_activation_identity');
  if(receipt.strategy!==D1_STRATEGY||receipt.contract_version!==D1_CONTRACT) errors.push('d1_activation_contract');
  if(!safeRel(receipt.cloud_proof_path)||!hex(receipt.cloud_proof_sha256,64)) errors.push('d1_activation_proof_binding');
  if(receipt.work_scope!==D1_WORK_SCOPE) errors.push('d1_activation_work_scope');
  if(receipt.owner_intervention!==false) errors.push('d1_activation_owner_intervention');
  return [...new Set(errors)];
}

export function validateD1Activation({repoRoot='.'}={}){
  const errors=[];
  const contractPath=path.resolve(repoRoot,'contracts/d1-image-contract.json');
  if(!fs.existsSync(contractPath)) return {result:'FAIL',errors:['d1_contract_missing'],receipt:null,proof:null};
  let contract;
  try{contract=JSON.parse(fs.readFileSync(contractPath,'utf8'));}catch{return {result:'FAIL',errors:['d1_contract_invalid'],receipt:null,proof:null};}
  if(contract.schema_version!==D1_CONTRACT||contract.strategy!==D1_STRATEGY) errors.push('d1_contract_identity');
  if(contract.activation_status!=='active') errors.push('d1_not_active');
  const receiptPath=contract.activation_receipt_path,receiptSha=contract.activation_receipt_sha256;
  if(!safeRel(receiptPath)||!hex(receiptSha,64)) errors.push('d1_activation_receipt_binding_missing');
  let receipt=null,proof=null;
  if(errors.length===0){
    try{receipt=JSON.parse(fs.readFileSync(path.resolve(repoRoot,receiptPath),'utf8'));}catch{errors.push('d1_activation_receipt_unreadable');}
    if(receipt){
      errors.push(...validateD1ActivationReceipt(receipt));
      if(canonicalSha(receipt)!==receiptSha) errors.push('d1_activation_receipt_digest_mismatch');
      try{proof=JSON.parse(fs.readFileSync(path.resolve(repoRoot,receipt.cloud_proof_path),'utf8'));}catch{errors.push('d1_cloud_proof_unreadable');}
      if(proof){
        errors.push(...validateD1CloudProof(proof));
        if(canonicalSha(proof)!==receipt.cloud_proof_sha256) errors.push('d1_cloud_proof_digest_mismatch');
      }
    }
  }
  return {result:errors.length?'FAIL':'PASS',errors:[...new Set(errors)],receipt,proof};
}

export function buildD1ActivationReceipt({proofPath,proof,activatedAt=new Date().toISOString()}={}){
  const errors=validateD1CloudProof(proof);
  if(errors.length) throw new Error('D1 cloud proof invalid: '+errors.join(';'));
  if(!safeRel(proofPath)) throw new Error('d1_proof_path_invalid');
  return {schema_version:D1_ACTIVATION_SCHEMA,result:'PASS',strategy:D1_STRATEGY,contract_version:D1_CONTRACT,activated_at:activatedAt,
    cloud_proof_path:proofPath,cloud_proof_sha256:canonicalSha(proof),work_scope:D1_WORK_SCOPE,owner_intervention:false};
}

import fs from 'node:fs';
import path from 'node:path';
import {canonicalSha,hex} from '../image-capsules/util.mjs';

export const D1_ACTIVATION_SCHEMA='daily-compiler-d1-activation-v1';
export const D1_PROOF_SCHEMA='daily-compiler-d1-cloud-proof-v1';

const safeRel=p=>typeof p==='string'&&p.length>0&&!path.isAbsolute(p)&&!p.includes('\\')&&!p.split('/').some(x=>x==='..'||x==='.'||x==='');

export function validateD1CloudProof(proof={}){
  const errors=[];
  if(proof.schema_version!==D1_PROOF_SCHEMA||proof.result!=='PASS') errors.push('d1_cloud_proof_identity');
  if(proof.dot_coordinator?.cloud_task!==true||proof.dot_coordinator?.separate_image_task!==true||proof.dot_coordinator?.persistent_context_used_for_generation!==false) errors.push('d1_dot_boundary');
  if(proof.image_studio?.fresh_conversation!==true||proof.image_studio?.native_chatgpt_images!==true||proof.image_studio?.six_assets!==true||proof.image_studio?.acceptance_manifest_pass!==true) errors.push('d1_studio_boundary');
  if(proof.handoff?.owner_transfer!==false||proof.handoff?.local_file_transfer!==false||proof.handoff?.archive_required!==false||proof.handoff?.programmatic_cloud_transfer!==true||proof.handoff?.exact_assets_preserved!==true) errors.push('d1_handoff_boundary');
  if(proof.work_porter?.scope!=='IMAGE_PACKAGE_INGEST'||proof.work_porter?.cloud_work!==true||proof.work_porter?.visual_rereview!==false||proof.work_porter?.generation!==false||proof.work_porter?.porter_receipt_pass!==true) errors.push('d1_work_boundary');
  if(proof.cloud_only!==true||proof.owner_intervention!==false||proof.local_computer_used!==false||proof.prohibited_dependencies_used!==false) errors.push('d1_cloud_only_boundary');
  return [...new Set(errors)];
}

export function validateD1ActivationReceipt(receipt={}){
  const errors=[];
  if(receipt.schema_version!==D1_ACTIVATION_SCHEMA||receipt.result!=='PASS') errors.push('d1_activation_identity');
  if(receipt.strategy!=='d1_cloud_image_studio'||receipt.contract_version!=='daily-compiler-image-contract-v4') errors.push('d1_activation_contract');
  if(!safeRel(receipt.cloud_proof_path)||!hex(receipt.cloud_proof_sha256,64)) errors.push('d1_activation_proof_binding');
  if(receipt.work_exception_scope!=='IMAGE_PACKAGE_INGEST') errors.push('d1_activation_work_scope');
  if(receipt.owner_intervention!==false) errors.push('d1_activation_owner_intervention');
  return [...new Set(errors)];
}

export function validateD1Activation({repoRoot='.'}={}){
  const errors=[];
  const contractPath=path.resolve(repoRoot,'contracts/d1-image-contract.json');
  if(!fs.existsSync(contractPath)) return {result:'FAIL',errors:['d1_contract_missing'],receipt:null,proof:null};
  let contract;
  try{contract=JSON.parse(fs.readFileSync(contractPath,'utf8'));}catch{return {result:'FAIL',errors:['d1_contract_invalid'],receipt:null,proof:null};}
  if(contract.schema_version!=='daily-compiler-image-contract-v4'||contract.strategy!=='d1_cloud_image_studio') errors.push('d1_contract_identity');
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
  return {
    schema_version:D1_ACTIVATION_SCHEMA,result:'PASS',strategy:'d1_cloud_image_studio',
    contract_version:'daily-compiler-image-contract-v4',activated_at:activatedAt,
    cloud_proof_path:proofPath,cloud_proof_sha256:canonicalSha(proof),
    work_exception_scope:'IMAGE_PACKAGE_INGEST',owner_intervention:false
  };
}

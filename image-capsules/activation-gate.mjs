import fs from 'node:fs';
import path from 'node:path';
import {canonicalSha,hex,nonempty} from './util.mjs';

export const D0_ACTIVATION_SCHEMA='daily-compiler-d0-activation-v1';
export const REQUIRED_D0_PROOFS=Object.freeze(['p0_a','p0_b','p0_c','p0_d','p0_e','p0_f']);
const COST_KEYS=Object.freeze([
  'work_used','codex_used','paid_model_api_used','paid_image_service_used',
  'billable_overage_used','new_paid_infrastructure_used','alternate_account_used',
  'owner_image_transfer_used','owner_liveness_used'
]);

const safeRel=p=>typeof p==='string'&&p.length>0&&!path.isAbsolute(p)&&!p.includes('\\')&&!p.split('/').some(x=>x==='..'||x==='.'||x==='');

export function validateD0ActivationReceipt(receipt){
  const errors=[];
  if(receipt?.schema_version!==D0_ACTIVATION_SCHEMA) errors.push('activation_receipt_schema');
  if(receipt?.result!=='PASS') errors.push('activation_receipt_not_pass');
  if(receipt?.strategy!=='d0_native_image_capsules') errors.push('activation_strategy');
  if(receipt?.contract_version!=='daily-compiler-image-contract-v3') errors.push('activation_contract_version');
  if(!nonempty(receipt?.activated_at)) errors.push('activation_time');
  const proofs=receipt?.proofs||{};
  for(const key of REQUIRED_D0_PROOFS){
    const p=proofs?.[key];
    if(p?.result!=='PASS'||!safeRel(p?.evidence_path)||!hex(p?.evidence_sha256,64)) errors.push('activation_proof_'+key);
  }
  for(const key of COST_KEYS) if(receipt?.cost_boundary?.[key]!==false) errors.push('activation_cost_boundary_'+key);
  if(receipt?.proposal1r_reader_story_fallback_used!==false) errors.push('activation_proposal1r_fallback');
  if(receipt?.owner_intervention!==false) errors.push('activation_owner_intervention');
  return [...new Set(errors)];
}

export function validateD0Activation({repoRoot='.'}={}){
  const errors=[];
  const contractPath=path.resolve(repoRoot,'contracts/image-contract.json');
  if(!fs.existsSync(contractPath)) return {result:'FAIL',errors:['d0_activation_contract_missing'],receipt:null};
  let contract;
  try{contract=JSON.parse(fs.readFileSync(contractPath,'utf8'));}catch{return {result:'FAIL',errors:['d0_activation_contract_invalid'],receipt:null};}
  if(contract?.schema_version!=='daily-compiler-image-contract-v3'||contract?.strategy!=='d0_native_image_capsules') errors.push('d0_activation_contract_identity');
  if(contract?.activation_status!=='active') errors.push('d0_activation_not_active');
  const receiptPath=contract?.activation_receipt_path;
  const expectedSha=contract?.activation_receipt_sha256;
  if(!safeRel(receiptPath)||!hex(expectedSha,64)) errors.push('d0_activation_receipt_binding_missing');
  let receipt=null;
  if(errors.length===0){
    const full=path.resolve(repoRoot,receiptPath);
    if(!full.startsWith(path.resolve(repoRoot)+path.sep)||!fs.existsSync(full)) errors.push('d0_activation_receipt_missing');
    else{
      try{receipt=JSON.parse(fs.readFileSync(full,'utf8'));}catch{errors.push('d0_activation_receipt_invalid_json');}
      if(receipt){
        errors.push(...validateD0ActivationReceipt(receipt));
        if(canonicalSha(receipt)!==expectedSha) errors.push('d0_activation_receipt_digest_mismatch');
      }
    }
  }
  return {result:errors.length?'FAIL':'PASS',errors:[...new Set(errors)],receipt};
}

export function assertD0Activation(opts){
  const r=validateD0Activation(opts);
  if(r.result!=='PASS') throw new Error('D0 activation gate failed: '+r.errors.join(';'));
  return r;
}

import fs from 'node:fs';
import path from 'node:path';
import {canonicalSha,nonempty} from './util.mjs';
import {validateFormalD0Proof} from './proof-validators.mjs';

export const D0_PROOF_MANIFEST_SCHEMA='daily-compiler-d0-proof-manifest-v1';
export const D0_PROOF_KEYS=Object.freeze(['p0_a','p0_b','p0_c','p0_d','p0_e','p0_f']);

const safeRel=p=>typeof p==='string'&&p.length>0&&!path.isAbsolute(p)&&!p.includes('\\')&&!p.split('/').some(x=>x==='..'||x==='.'||x==='');

export function loadD0ProofManifest({repoRoot='.',manifestPath='contracts/d0-proof-manifest.json'}={}){
  const full=path.resolve(repoRoot,manifestPath);
  const manifest=JSON.parse(fs.readFileSync(full,'utf8'));
  if(manifest?.schema_version!==D0_PROOF_MANIFEST_SCHEMA) throw new Error('d0_proof_manifest_schema');
  for(const key of D0_PROOF_KEYS){
    const spec=manifest?.proofs?.[key];
    if(!safeRel(spec?.path)||!nonempty(spec?.schema_version)) throw new Error('d0_proof_manifest_'+key);
  }
  return manifest;
}

export function evaluateD0ProofSet({repoRoot='.',manifestPath='contracts/d0-proof-manifest.json'}={}){
  const manifest=loadD0ProofManifest({repoRoot,manifestPath});
  const proofs={},errors=[];
  for(const key of D0_PROOF_KEYS){
    const spec=manifest.proofs[key],full=path.resolve(repoRoot,spec.path);
    if(!fs.existsSync(full)){
      proofs[key]={result:'MISSING',path:spec.path,schema_version:spec.schema_version,evidence_sha256:null};
      errors.push(key+':missing');
      continue;
    }
    let receipt;
    try{receipt=JSON.parse(fs.readFileSync(full,'utf8'));}catch{
      proofs[key]={result:'INVALID_JSON',path:spec.path,schema_version:spec.schema_version,evidence_sha256:null};
      errors.push(key+':invalid_json');
      continue;
    }
    const schemaOK=receipt?.schema_version===spec.schema_version;
    const validatorErrors=validateFormalD0Proof(key,receipt);
    const pass=receipt?.result==='PASS'&&schemaOK&&validatorErrors.length===0;
    const sha=canonicalSha(receipt);
    proofs[key]={result:pass?'PASS':'BLOCKED',path:spec.path,schema_version:receipt?.schema_version??null,evidence_sha256:sha,validator_errors:validatorErrors};
    if(!schemaOK) errors.push(key+':schema');
    if(receipt?.result!=='PASS') errors.push(key+':not_pass');
    if(validatorErrors.length) errors.push(...validatorErrors.map(x=>key+':'+x));
  }
  return {
    schema_version:'daily-compiler-d0-proof-readiness-v1',
    result:errors.length?'BLOCKED':'PASS',
    activation_ready:errors.length===0,
    proofs,
    errors:[...new Set(errors)]
  };
}

export function buildD0ActivationReceipt({repoRoot='.',manifestPath='contracts/d0-proof-manifest.json',activatedAt=new Date().toISOString()}={}){
  const readiness=evaluateD0ProofSet({repoRoot,manifestPath});
  if(!readiness.activation_ready) throw new Error('d0_activation_not_ready:'+readiness.errors.join(','));
  const proofs={};
  for(const key of D0_PROOF_KEYS){
    const p=readiness.proofs[key];
    proofs[key]={result:'PASS',evidence_path:p.path,evidence_sha256:p.evidence_sha256};
  }
  return {
    schema_version:'daily-compiler-d0-activation-v1',
    result:'PASS',
    strategy:'d0_native_image_capsules',
    contract_version:'daily-compiler-image-contract-v3',
    activated_at:activatedAt,
    proofs,
    cost_boundary:{
      work_used:false,codex_used:false,paid_model_api_used:false,paid_image_service_used:false,
      billable_overage_used:false,new_paid_infrastructure_used:false,alternate_account_used:false,
      owner_image_transfer_used:false,owner_liveness_used:false
    },
    proposal1r_reader_story_fallback_used:false,
    owner_intervention:false
  };
}

export function buildActivatedImageContract({contract,activationReceipt,activationPath='proof/d0-native-image-capsules/formal/activation.json'}={}){
  if(contract?.schema_version!=='daily-compiler-image-contract-v3'||contract?.strategy!=='d0_native_image_capsules') throw new Error('d0_contract_invalid');
  if(activationReceipt?.schema_version!=='daily-compiler-d0-activation-v1'||activationReceipt?.result!=='PASS') throw new Error('d0_activation_receipt_invalid');
  if(contract?.paid_capacity_branch_exists!==false) throw new Error('d0_paid_capacity_branch_forbidden');
  if(!safeRel(activationPath)) throw new Error('d0_activation_path_invalid');
  return {
    ...structuredClone(contract),
    activation_status:'active',
    activation_receipt_path:activationPath,
    activation_receipt_sha256:canonicalSha(activationReceipt)
  };
}

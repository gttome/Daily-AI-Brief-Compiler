import fs from 'node:fs';
import path from 'node:path';
import {canonicalSha} from '../image-capsules/util.mjs';
import {buildD1ActivationReceipt,validateD1Activation,D1_CONTRACT,D1_STRATEGY} from './activation.mjs';

export function applyD1Activation({repoRoot='.',proofPath,activatedAt=new Date().toISOString(),receiptPath='proof/d1-work-browser/activation.json'}={}){
  if(!proofPath) throw new Error('d1_proof_path_required');
  const contractPath=path.resolve(repoRoot,'contracts/d1-image-contract.json');
  const proofFull=path.resolve(repoRoot,proofPath);
  const contract=JSON.parse(fs.readFileSync(contractPath,'utf8'));
  const proof=JSON.parse(fs.readFileSync(proofFull,'utf8'));
  if(contract.schema_version!==D1_CONTRACT||contract.strategy!==D1_STRATEGY) throw new Error('d1_contract_invalid');
  if(contract.activation_status!=='proof_required') throw new Error('d1_contract_not_proof_required');
  const receipt=buildD1ActivationReceipt({proofPath,proof,activatedAt,repoRoot});
  const receiptFull=path.resolve(repoRoot,receiptPath);
  fs.mkdirSync(path.dirname(receiptFull),{recursive:true});
  fs.writeFileSync(receiptFull,JSON.stringify(receipt,null,2)+'\n');
  const active={...contract,activation_status:'active',activation_receipt_path:receiptPath,activation_receipt_sha256:canonicalSha(receipt)};
  fs.writeFileSync(contractPath,JSON.stringify(active,null,2)+'\n');
  const verified=validateD1Activation({repoRoot});
  if(verified.result!=='PASS') throw new Error('d1_activation_post_write:'+verified.errors.join(','));
  return {result:'PASS',activation_status:'active',activation_receipt_path:receiptPath,activation_receipt_sha256:active.activation_receipt_sha256};
}


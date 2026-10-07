import fs from 'node:fs';
import path from 'node:path';
import {buildD0ActivationReceipt,buildActivatedImageContract} from './completion-gate.mjs';
import {validateD0Activation,validateD0ActivationReceipt} from './activation-gate.mjs';

export function applyD0Activation({repoRoot='.',activatedAt=new Date().toISOString(),activationPath='proof/d0-native-image-capsules/formal/activation.json'}={}){
  const contractPath=path.resolve(repoRoot,'contracts/image-contract.json');
  const contract=JSON.parse(fs.readFileSync(contractPath,'utf8'));
  const receipt=buildD0ActivationReceipt({repoRoot,activatedAt});
  const receiptErrors=validateD0ActivationReceipt(receipt);
  if(receiptErrors.length) throw new Error('d0_activation_receipt_invalid:'+receiptErrors.join(','));
  const active=buildActivatedImageContract({contract,activationReceipt:receipt,activationPath});
  const receiptFull=path.resolve(repoRoot,activationPath);
  fs.mkdirSync(path.dirname(receiptFull),{recursive:true});
  fs.writeFileSync(receiptFull,JSON.stringify(receipt,null,2)+'\n');
  fs.writeFileSync(contractPath,JSON.stringify(active,null,2)+'\n');
  const verification=validateD0Activation({repoRoot});
  if(verification.result!=='PASS') throw new Error('d0_activation_post_write_verification:'+verification.errors.join(','));
  return {result:'PASS',activation_status:'active',activation_receipt_path:activationPath,activation_receipt_sha256:active.activation_receipt_sha256,activated_at:activatedAt};
}

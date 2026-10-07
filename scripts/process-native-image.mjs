import fs from 'node:fs';
import path from 'node:path';
import {normalizeBuffer,buildFinalReceipt,finalPathFromRaw} from '../image-capsules/normalize.mjs';
import {structuralGate} from '../image-capsules/structural-gate.mjs';
import {validateRawReceipt} from '../image-capsules/persistence.mjs';

const roots=process.argv.slice(2).length?process.argv.slice(2):['shadow-runs','rehearsals'];
function walk(dir,out=[]){
  if(!fs.existsSync(dir)) return out;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,entry.name);
    if(entry.isDirectory()) walk(p,out);
    else if(entry.isFile()&&entry.name==='raw.png') out.push(p);
  }
  return out;
}
let processed=0;
for(const root of roots){
  for(const rawPathFs of walk(root)){
    const posix=rawPathFs.split(path.sep).join('/');
    const receiptPath=rawPathFs.replace(/raw\.png$/,'raw-receipt.json');
    const finalFs=rawPathFs.replace(/raw\.png$/,'final.png');
    const finalReceiptFs=rawPathFs.replace(/raw\.png$/,'final-receipt.json');
    const structuralFs=rawPathFs.replace(/raw\.png$/,'structural-gate.json');
    if(fs.existsSync(finalReceiptFs)&&fs.existsSync(finalFs)&&fs.existsSync(structuralFs)) continue;
    if(!fs.existsSync(receiptPath)) throw new Error('raw receipt missing for '+posix);
    const raw=fs.readFileSync(rawPathFs),rawReceipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
    const rawErrors=validateRawReceipt(rawReceipt,{bytes:raw});
    if(rawErrors.length) throw new Error('raw receipt invalid for '+posix+': '+rawErrors.join(','));
    if(rawReceipt.path!==posix) throw new Error('raw receipt path mismatch for '+posix);
    const finalBytes=await normalizeBuffer(raw);
    const receipt=buildFinalReceipt({rawReceipt,finalBytes,finalPath:finalPathFromRaw(posix)});
    const gate=structuralGate({finalBytes,finalReceipt:receipt,expectedStoryId:rawReceipt.story_id,expectedCandidateId:rawReceipt.candidate_id,expectedAttempt:rawReceipt.attempt});
    if(gate.result!=='PASS') throw new Error('structural gate failed for '+posix+': '+gate.errors.join(','));
    fs.writeFileSync(finalFs,finalBytes);
    fs.writeFileSync(finalReceiptFs,JSON.stringify(receipt,null,2)+'\n');
    fs.writeFileSync(structuralFs,JSON.stringify(gate,null,2)+'\n');
    processed++;
  }
}
console.log(JSON.stringify({result:'PASS',processed,deterministic:true,model_calls:0}));

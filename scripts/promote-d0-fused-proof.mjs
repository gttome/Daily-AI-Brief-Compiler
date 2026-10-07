#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {buildFormalProofsFromFusedLiveProof} from '../image-capsules/fused-proof.mjs';

const input=process.argv[2],outDir=process.argv[3]||'proof/d0-native-image-capsules/formal';
if(!input) throw new Error('usage: node scripts/promote-d0-fused-proof.mjs <fused-proof.json> [out-dir]');
const receipt=JSON.parse(fs.readFileSync(input,'utf8'));
const proofs=buildFormalProofsFromFusedLiveProof(receipt);
fs.mkdirSync(outDir,{recursive:true});
for(const [key,value] of Object.entries(proofs)){
  const name=key.replace('_','-')+'.json';
  fs.writeFileSync(path.join(outDir,name),JSON.stringify(value,null,2)+'\n');
}
console.log(JSON.stringify({result:'PASS',source:input,formal_proofs:['p0-a','p0-d','p0-e','p0-f'],native_generations_added:0},null,2));

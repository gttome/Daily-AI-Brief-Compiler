#!/usr/bin/env node
import fs from 'node:fs';
import {canonicalSha} from '../image-capsules/util.mjs';
import {validateD1CloudProof} from '../image-studio/activation.mjs';
import {d1EvidencePath,validateD1QualificationEvidence} from '../image-studio/proof-evidence.mjs';

const [statePath,manifestPath,handoffPath,porterPath,evidencePath,outPath]=process.argv.slice(2);
if(!statePath||!manifestPath||!handoffPath||!porterPath||!evidencePath||!outPath) throw new Error('usage: node scripts/build-d1-cloud-proof.mjs <state.json> <manifest.json> <handoff.json> <porter.json> <qualification-evidence.json> <out.json>');
const record=JSON.parse(fs.readFileSync(d1EvidencePath('.',evidencePath),'utf8'));
const evidence={path:evidencePath,sha256:canonicalSha(record)};
const qualified=validateD1QualificationEvidence({evidence,proofId:record.proof_id});
if(qualified.result!=='PASS') throw new Error('D1 qualification evidence invalid: '+qualified.errors.join(';'));
for(const [key,input] of Object.entries({state:statePath,manifest:manifestPath,handoff:handoffPath,porter:porterPath})){
  if(input!==record[key].path) throw new Error('D1 proof input path mismatch: '+key);
}
if(qualified.data.state.status!=='GITHUB_VERIFIED') throw new Error('D1 cloud proof requires GITHUB_VERIFIED state');
const proof={schema_version:'daily-compiler-d1-cloud-proof-v2',result:'PASS',proof_id:record.proof_id,...qualified.claims,evidence};
const errors=validateD1CloudProof(proof);
if(errors.length) throw new Error('D1 cloud proof invalid: '+errors.join(';'));
// Exclusive output preserves an existing proof or unrelated accepted evidence.
fs.writeFileSync(outPath,JSON.stringify(proof,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({result:'PASS',out:outPath,proof_sha256:canonicalSha(proof)},null,2));


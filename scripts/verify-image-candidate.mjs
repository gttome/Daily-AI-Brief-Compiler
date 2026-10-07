import fs from 'node:fs';
import {structuralGate} from '../image-capsules/structural-gate.mjs';

const finalPath=process.argv[2],receiptPath=process.argv[3];
if(!finalPath||!receiptPath) throw new Error('usage: node scripts/verify-image-candidate.mjs <final.png> <final-receipt.json>');
const gate=structuralGate({finalBytes:fs.readFileSync(finalPath),finalReceipt:JSON.parse(fs.readFileSync(receiptPath,'utf8'))});
console.log(JSON.stringify(gate,null,2));
if(gate.result!=='PASS') process.exitCode=1;

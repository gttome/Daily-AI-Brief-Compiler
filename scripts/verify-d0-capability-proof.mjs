#!/usr/bin/env node
import fs from 'node:fs';
import {validateD0CapabilityProof} from '../image-capsules/capability-proof.mjs';

const file=process.argv[2];
if(!file) throw new Error('usage: node scripts/verify-d0-capability-proof.mjs <receipt.json>');
const receipt=JSON.parse(fs.readFileSync(file,'utf8'));
const errors=validateD0CapabilityProof(receipt);
if(errors.length){
  console.error(JSON.stringify({ok:false,errors},null,2));
  process.exit(1);
}
console.log(JSON.stringify({ok:true,status:receipt.status,p0_a_authorized:receipt.formal_authorization.p0_a_authorized,p0_b_authorized:receipt.formal_authorization.p0_b_authorized},null,2));

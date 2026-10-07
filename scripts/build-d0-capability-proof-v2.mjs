#!/usr/bin/env node
import fs from 'node:fs';
import {buildD0CapabilityProofV2,validateD0CapabilityProofV2} from '../image-capsules/capability-proof-v2.mjs';
import {promotePreproofToP0A,promotePreproofToP0B} from '../image-capsules/proof-promotion.mjs';

const [aPath,bPath,outPath,p0aPath,p0bPath]=process.argv.slice(2);
if(!aPath||!bPath||!outPath) throw new Error('usage: node scripts/build-d0-capability-proof-v2.mjs <run-a.json> <run-b.json> <capability.json> [p0-a.json] [p0-b.json]');
const runA=JSON.parse(fs.readFileSync(aPath,'utf8'));
const runB=JSON.parse(fs.readFileSync(bPath,'utf8'));
const zeros={work_used:false,codex_used:false,paid_model_api_used:false,paid_image_service_used:false,billable_overage_used:false,new_paid_infrastructure_used:false,alternate_account_used:false,owner_image_transfer_used:false,owner_liveness_used:false};
const receipt=buildD0CapabilityProofV2({proof_id:'d0-zero-cost-preproof-2026-10-07-r1',cost_boundary:zeros,runs:[runA,runB]});
const errors=validateD0CapabilityProofV2(receipt);
if(errors.length||receipt.status!=='PASS'){
  console.error(JSON.stringify({ok:false,status:receipt.status,errors},null,2));
  process.exit(1);
}
fs.writeFileSync(outPath,JSON.stringify(receipt,null,2)+'\n');
if(p0aPath) fs.writeFileSync(p0aPath,JSON.stringify(promotePreproofToP0A(receipt),null,2)+'\n');
if(p0bPath) fs.writeFileSync(p0bPath,JSON.stringify(promotePreproofToP0B(receipt),null,2)+'\n');
console.log(JSON.stringify({ok:true,status:'PASS',run_ids:receipt.runs.map(r=>r.run_id),native_generations_added_for_promotion:0},null,2));

#!/usr/bin/env node
import fs from 'node:fs';
import {promoteTransportPreflightToP0B,validateP0B} from '../image-capsules/p0b-proof.mjs';

const [input,output]=process.argv.slice(2);
if(!input||!output) throw new Error('usage: node scripts/promote-d0-p0b.mjs <transport-receipt.json> <p0-b.json>');
const transport=JSON.parse(fs.readFileSync(input,'utf8'));
const receipt=promoteTransportPreflightToP0B(transport);
const errors=validateP0B(receipt);
if(errors.length) throw new Error(errors.join(';'));
fs.writeFileSync(output,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({ok:true,result:receipt.result,native_generations_added_for_promotion:0,p0_a_dependency:false},null,2));

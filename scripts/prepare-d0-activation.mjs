#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {buildD0ActivationReceipt,buildActivatedImageContract} from '../image-capsules/completion-gate.mjs';

const [repoRoot='.',outDir='build/d0-activation']=process.argv.slice(2);
const contract=JSON.parse(fs.readFileSync(path.resolve(repoRoot,'contracts/image-contract.json'),'utf8'));
const receipt=buildD0ActivationReceipt({repoRoot});
const activated=buildActivatedImageContract({contract,activationReceipt:receipt});
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,'activation.json'),JSON.stringify(receipt,null,2)+'\n');
fs.writeFileSync(path.join(outDir,'image-contract.active.json'),JSON.stringify(activated,null,2)+'\n');
console.log(JSON.stringify({result:'PASS',activation_status:'active',output_dir:outDir},null,2));

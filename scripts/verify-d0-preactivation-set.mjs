#!/usr/bin/env node
import fs from 'node:fs';
import {validateD0ImageEvidenceSet} from '../image-capsules/bundle-gate.mjs';

const bundlePath=process.argv[2];
const repoRoot=process.argv[3]||'.';
if(!bundlePath) throw new Error('usage: node scripts/verify-d0-preactivation-set.mjs <d0-bundle.json> [repo-root]');
const bundle=JSON.parse(fs.readFileSync(bundlePath,'utf8'));
const result=validateD0ImageEvidenceSet({bundle,repoRoot});
console.log(JSON.stringify(result,null,2));
if(result.result!=='PASS') process.exitCode=1;

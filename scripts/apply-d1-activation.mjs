#!/usr/bin/env node
import {applyD1Activation} from '../image-studio/activation-apply.mjs';

const repoRoot=process.argv[2]||'.';
const proofArg=process.argv.find(x=>x.startsWith('--proof='));
if(!proofArg) throw new Error('usage: node scripts/apply-d1-activation.mjs [repo-root] --proof=<proof-path>');
const result=applyD1Activation({repoRoot,proofPath:proofArg.slice('--proof='.length)});
console.log(JSON.stringify(result,null,2));

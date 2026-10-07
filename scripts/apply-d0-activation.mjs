#!/usr/bin/env node
import {applyD0Activation} from '../image-capsules/activation-apply.mjs';

const repoRoot=process.argv[2]||'.';
const activatedAtArg=process.argv.find(x=>x.startsWith('--activated-at='));
const activatedAt=activatedAtArg?activatedAtArg.slice('--activated-at='.length):new Date().toISOString();
const result=applyD0Activation({repoRoot,activatedAt});
console.log(JSON.stringify(result,null,2));

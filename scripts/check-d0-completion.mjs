#!/usr/bin/env node
import {evaluateD0ProofSet} from '../image-capsules/completion-gate.mjs';

const repoRoot=process.argv[2]||'.';
const result=evaluateD0ProofSet({repoRoot});
console.log(JSON.stringify(result,null,2));
if(result.result!=='PASS') process.exitCode=2;

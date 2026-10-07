#!/usr/bin/env node
import fs from 'node:fs';
import {validateCorrection} from '../operations/corrections.mjs';

const p=process.argv[2];
if(!p) throw new Error('usage: node scripts/validate-post-publication-correction.mjs <correction.json>');
const correction=JSON.parse(fs.readFileSync(p,'utf8'));
const errors=validateCorrection(correction);
console.log(JSON.stringify({result:errors.length?'FAIL':'PASS',errors},null,2));
if(errors.length) process.exitCode=1;

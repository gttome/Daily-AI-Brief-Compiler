#!/usr/bin/env node
import fs from 'node:fs';
import {validateP0E} from '../image-capsules/final-proof-gates.mjs';

const p=process.argv[2];
if(!p) throw new Error('usage: node scripts/verify-d0-p0e.mjs <p0-e.json>');
const r=JSON.parse(fs.readFileSync(p,'utf8'));
const errors=validateP0E(r);
console.log(JSON.stringify({result:errors.length?'FAIL':'PASS',errors},null,2));
if(errors.length) process.exitCode=1;

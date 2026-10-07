#!/usr/bin/env node
import fs from 'node:fs';
import {validateD1AcceptanceManifest,buildD1IngestPlan} from '../image-studio/acceptance.mjs';

const p=process.argv[2];
if(!p) throw new Error('usage: node scripts/validate-d1-acceptance-manifest.mjs <manifest.json>');
const manifest=JSON.parse(fs.readFileSync(p,'utf8'));
const errors=validateD1AcceptanceManifest(manifest);
const out={result:errors.length?'FAIL':'PASS',errors};
if(!errors.length) out.ingest_plan=buildD1IngestPlan(manifest);
console.log(JSON.stringify(out,null,2));
if(errors.length) process.exitCode=1;

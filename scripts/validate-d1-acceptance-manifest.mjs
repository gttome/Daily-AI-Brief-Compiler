#!/usr/bin/env node
import fs from 'node:fs';
import {validateD1AcceptanceManifest,buildD1IngestPlan} from '../image-studio/acceptance.mjs';

const manifestPath=process.argv[2],handoffPath=process.argv[3];
if(!manifestPath) throw new Error('usage: node scripts/validate-d1-acceptance-manifest.mjs <manifest.json> [ingest-handoff.json]');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const errors=validateD1AcceptanceManifest(manifest);
const out={result:errors.length?'FAIL':'PASS',errors};
if(!errors.length&&handoffPath){
  const handoff=JSON.parse(fs.readFileSync(handoffPath,'utf8'));
  out.ingest_plan=buildD1IngestPlan(manifest,handoff);
}
console.log(JSON.stringify(out,null,2));
if(errors.length) process.exitCode=1;

#!/usr/bin/env node
import fs from 'node:fs';
import {canonicalSha} from '../image-capsules/util.mjs';
import {validateD1AcceptanceManifest,buildD1IngestPlan} from '../image-studio/acceptance.mjs';

const manifestPath=process.argv[2];
const mappingPath=process.argv[3];
const outPath=process.argv[4];
if(!manifestPath||!mappingPath||!outPath) throw new Error('usage: node scripts/build-d1-ingest-handoff.mjs <acceptance-manifest.json> <ingest-mapping.json> <out.json>');

const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const mapping=JSON.parse(fs.readFileSync(mappingPath,'utf8'));
const errors=validateD1AcceptanceManifest(manifest);
if(errors.length) throw new Error('D1 manifest invalid: '+errors.join(';'));
if(mapping?.schema_version!=='daily-compiler-d1-proof-ingest-mapping-v1'||!Array.isArray(mapping?.items)||mapping.items.length!==6) throw new Error('D1 ingest mapping invalid');

const filenames=new Map(manifest.images.map(x=>[x.story_id,x.filename]));
for(const item of mapping.items){
  if(filenames.get(item.story_id)!==item.filename) throw new Error('D1 ingest mapping filename mismatch: '+item.story_id);
}
const handoff={
  schema_version:'daily-compiler-d1-ingest-handoff-v1',
  edition_date:mapping.edition_date,
  execution_id:mapping.execution_id,
  repository:mapping.repository,
  branch:mapping.branch,
  manifest_sha256:canonicalSha(manifest),
  scope:'IMAGE_PACKAGE_INGEST',
  visual_rereview_required:false,
  image_generation_allowed:false,
  items:mapping.items
};
buildD1IngestPlan(manifest,handoff);
fs.writeFileSync(outPath,JSON.stringify(handoff,null,2)+'\n');
console.log(JSON.stringify({result:'PASS',out:outPath,manifest_sha256:handoff.manifest_sha256,handoff_sha256:canonicalSha(handoff),items:handoff.items.length},null,2));

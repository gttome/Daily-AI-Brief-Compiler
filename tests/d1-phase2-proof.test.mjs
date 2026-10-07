import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initialD1ProofState,nextD1ProofAction,validateD1ProofState} from '../image-studio/proof-state.mjs';

const studio=JSON.parse(fs.readFileSync('rehearsals/d1-cloud-proof-r1/studio-request.json','utf8'));
const mapping=JSON.parse(fs.readFileSync('rehearsals/d1-cloud-proof-r1/ingest-mapping.json','utf8'));
const state=JSON.parse(fs.readFileSync('rehearsals/d1-cloud-proof-r1/execution-state.json','utf8'));

test('D1 cloud proof Studio request is repository-isolated and contains six distinct specs',()=>{
  assert.equal(studio.schema_version,'daily-compiler-d1-studio-request-v1');
  assert.equal(studio.repository_context_forbidden,true);
  assert.equal(studio.zip_required,false);
  assert.equal(studio.stories.length,6);
  assert.equal(new Set(studio.stories.map(x=>x.story_id)).size,6);
  assert.equal(new Set(studio.stories.map(x=>x.filename)).size,6);
  const text=JSON.stringify(studio);
  assert.equal(text.includes('gttome/Daily-AI-Brief-Compiler'),false);
  assert.equal(text.includes('shadow/'),false);
  assert.equal(text.includes('github.com'),false);
  assert.equal(studio.stories.filter(x=>x.stress_case).length,2);
});

test('repository mapping is separate from Image Studio context',()=>{
  assert.equal(mapping.schema_version,'daily-compiler-d1-proof-ingest-mapping-v1');
  assert.equal(mapping.repository,'gttome/Daily-AI-Brief-Compiler');
  assert.equal(mapping.branch,'rehearsal/d1-cloud-proof-r1');
  assert.equal(mapping.items.length,6);
  const names=new Map(studio.stories.map(x=>[x.story_id,x.filename]));
  for(const item of mapping.items) assert.equal(item.filename,names.get(item.story_id));
});

test('D1 proof state resumes from durable phase without owner/local dependency',()=>{
  assert.deepEqual(validateD1ProofState(state),[]);
  assert.deepEqual(nextD1ProofAction(state),{action:'LAUNCH_FRESH_IMAGE_STUDIO'});
  assert.equal(state.owner_intervention,false);
  assert.equal(state.local_computer_used,false);

  const accepted={...structuredClone(state),status:'PACKAGE_ACCEPTED',acceptance_manifest_path:'rehearsals/d1-cloud-proof-r1/acceptance-manifest.json',accepted_assets:['a','b','c','d','e','f']};
  assert.deepEqual(validateD1ProofState(accepted),[]);
  assert.deepEqual(nextD1ProofAction(accepted),{action:'BUILD_INGEST_HANDOFF'});

  const ingest={...accepted,status:'WORK_INGEST',ingest_handoff_path:'rehearsals/d1-cloud-proof-r1/ingest-handoff.json'};
  assert.deepEqual(nextD1ProofAction(ingest),{action:'RESUME_WORK_PORTER'});
});

test('initial D1 proof-state builder matches the proof contract',()=>{
  const built=initialD1ProofState({
    proofId:'x',branch:'rehearsal/x',
    studioRequestPath:'rehearsals/x/studio.json',
    ingestMappingPath:'rehearsals/x/mapping.json',
    updatedAt:'2026-10-07T00:00:00Z'
  });
  assert.deepEqual(validateD1ProofState(built),[]);
  assert.equal(built.status,'PLANNED');
});

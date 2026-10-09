import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initialD1ProofState,nextD1ProofAction,validateD1ProofState} from '../image-studio/proof-state.mjs';
const req=JSON.parse(fs.readFileSync('rehearsals/d1-six-image-browser-r1/request.json','utf8'));
const map=JSON.parse(fs.readFileSync('rehearsals/d1-six-image-browser-r1/ingest-mapping.json','utf8'));
const state=JSON.parse(fs.readFileSync('rehearsals/d1-six-image-browser-r1/execution-state.json','utf8'));

test('six-image browser rehearsal contains six isolated story specifications',()=>{
  assert.equal(req.schema_version,'daily-compiler-d1-browser-rehearsal-request-v1');assert.equal(req.conversation_policy.fresh_chat_per_story,true);
  assert.equal(req.conversation_policy.temporary_chat_forbidden,true);assert.equal(req.stories.length,6);assert.equal(new Set(req.stories.map(x=>x.story_id)).size,6);
});
test('rehearsal mapping is repository-only and separate from story chat request',()=>{
  assert.equal(map.schema_version,'daily-compiler-d1-proof-ingest-mapping-v2');assert.equal(map.repository,'gttome/Daily-AI-Brief-Compiler');assert.equal(map.items.length,6);
  assert.equal(JSON.stringify(req).includes('gttome/Daily-AI-Brief-Compiler'),false);
});
test('v2 proof state begins at Work browser story 1 and is resumable',()=>{
  assert.deepEqual(validateD1ProofState(state),[]);assert.deepEqual(nextD1ProofAction(state),{action:'START_WORK_BROWSER_STORY_1'});
  const s=initialD1ProofState({proofId:'x',branch:'rehearsal/x',requestPath:'request.json',ingestMappingPath:'map.json',updatedAt:'2026-10-07T00:00:00Z'});
  assert.equal(s.status,'PLANNED');assert.equal(s.accepted_story_chats.length,0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {assertSetPlan} from '../image-capsules/set-plan.mjs';
import {assertPacket} from '../image-capsules/packet.mjs';
import {compileGeneratorPrompt} from '../image-capsules/prompt.mjs';
import {nextFusedProofOperation,validateFusedProofExecution} from '../image-capsules/fused-proof-state.mjs';

const root='rehearsals/d0-fused-live-proof-r1';

test('committed fused live-proof packets exactly match their sealed manifest',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
  const plan=JSON.parse(fs.readFileSync(path.join(root,'set-plan.json'),'utf8'));
  const p=assertSetPlan(plan);
  assert.equal(p.plan_sha256,manifest.set_plan_sha256);
  assert.equal(manifest.branch,'rehearsal/d0-fused-live-proof-r1');
  assert.equal(manifest.production,false);
  assert.equal(manifest.shadow_edition,false);
  assert.equal(manifest.semantic_rework,0);
  assert.equal(manifest.candidates.length,6);
  assert.equal(manifest.candidates.filter(x=>x.stress_case).length,2);

  const packetHashes=new Set(),promptHashes=new Set(),contexts=new Set();
  for(const c of manifest.candidates){
    const packet=JSON.parse(fs.readFileSync(c.packet_path,'utf8'));
    assertPacket(packet,{setPlan:plan});
    const prompt=fs.readFileSync(c.prompt_path,'utf8');
    const compiled=compileGeneratorPrompt(packet);
    assert.equal(c.packet_sha256,packet.envelope.packet_sha256);
    assert.equal(c.prompt_sha256,compiled.prompt_sha256);
    assert.equal(c.generator_visible_context_sha256,compiled.projection_sha256);
    assert.equal(prompt,compiled.prompt);
    assert.equal(prompt.includes(c.outer_canary),false);
    packetHashes.add(c.packet_sha256);
    promptHashes.add(c.prompt_sha256);
    contexts.add(c.generator_visible_context_sha256);
  }
  assert.equal(packetHashes.size,6);
  assert.equal(promptHashes.size,6);
  assert.equal(contexts.size,6);
});


test('committed fused proof execution state is resumable and starts at the first sealed candidate',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
  const state=JSON.parse(fs.readFileSync(path.join(root,'execution-state.json'),'utf8'));
  assert.deepEqual(validateFusedProofExecution(state,{manifest}),[]);
  assert.deepEqual(nextFusedProofOperation(state,{manifest}),{
    action:'ALLOCATE_FRESH_CAPSULE',
    attempt:1,
    story_id:'stress-terminal-evidence',
    stress_case:true
  });
  assert.equal(state.native_generations,0);
});

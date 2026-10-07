import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {assertSetPlan} from '../image-capsules/set-plan.mjs';
import {assertPacket} from '../image-capsules/packet.mjs';
import {compileGeneratorPrompt} from '../image-capsules/prompt.mjs';

test('fused rehearsal builder seals six differentiated packets with two first-attempt stress slots',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'d0-fused-rehearsal-'));
  execFileSync(process.execPath,['scripts/build-d0-fused-rehearsal.mjs','contracts/d0-fused-rehearsal-blueprint.json',root],{stdio:'pipe'});
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
  const plan=JSON.parse(fs.readFileSync(path.join(root,'set-plan.json'),'utf8'));
  const planCheck=assertSetPlan(plan);
  assert.equal(manifest.set_plan_sha256,planCheck.plan_sha256);
  assert.equal(manifest.candidates.length,6);
  assert.equal(manifest.candidates.filter(x=>x.stress_case).length,2);
  assert.equal(manifest.native_generation_budget_if_all_first_attempt_pass,6);
  assert.equal(manifest.p0_b_rerun_required,false);
  assert.equal(manifest.p0_c_rerun_required,false);
  assert.equal(manifest.formal_proof_promotion_additional_generations,0);

  const packetHashes=new Set(),promptHashes=new Set(),contexts=new Set();
  for(const c of manifest.candidates){
    const dir=path.join(root,c.story_id);
    const packet=JSON.parse(fs.readFileSync(path.join(dir,'packet.json'),'utf8'));
    assertPacket(packet,{setPlan:plan});
    const prompt=fs.readFileSync(path.join(dir,'generator-prompt.txt'),'utf8');
    const compiled=compileGeneratorPrompt(packet);
    assert.equal(prompt,compiled.prompt);
    assert.equal(c.packet_sha256,packet.envelope.packet_sha256);
    assert.equal(c.prompt_sha256,compiled.prompt_sha256);
    assert.equal(c.generator_visible_context_sha256,compiled.projection_sha256);
    assert.equal(prompt.includes(c.outer_canary),false);
    packetHashes.add(c.packet_sha256);
    promptHashes.add(c.prompt_sha256);
    contexts.add(c.generator_visible_context_sha256);
  }
  assert.equal(packetHashes.size,6);
  assert.equal(promptHashes.size,6);
  assert.equal(contexts.size,6);
});

test('fused blueprint keeps every prohibited dependency false',()=>{
  const b=JSON.parse(fs.readFileSync('contracts/d0-fused-rehearsal-blueprint.json','utf8'));
  assert.equal(b.stories.length,6);
  assert.equal(b.stories.filter(x=>x.stress_case).length,2);
  for(const story of b.stories){
    assert.equal(typeof story.outer_canary,'string');
    assert.ok(story.outer_canary.length>0);
    assert.ok(story.meaningful_components_plan.length>=8);
    assert.ok(story.visible_text_allowlist.length>=1);
  }
});

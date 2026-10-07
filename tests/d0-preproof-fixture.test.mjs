import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertSetPlan} from '../image-capsules/set-plan.mjs';
import {assertPacket} from '../image-capsules/packet.mjs';
import {compileGeneratorPrompt} from '../image-capsules/prompt.mjs';

const root='proof/d0-native-image-capsules/preproof';
const plan=JSON.parse(fs.readFileSync(root+'/set-plan.json','utf8'));
const manifest=JSON.parse(fs.readFileSync(root+'/manifest.json','utf8'));

test('D0 preproof fixture set plan and sealed packets are internally exact',()=>{
  const planResult=assertSetPlan(plan);
  assert.equal(planResult.plan_sha256,'6a63d21698fcf950dc87c3b30dbaf86d107328e007b07e00a4f9abd9678d94f6');
  assert.equal(manifest.native_images_budget_for_preproof,2);
  assert.equal(manifest.formal_p0_a_b_regeneration,false);
  for(const spec of manifest.runs){
    const dir=spec.run_id.endsWith('-a')?'run-a':'run-b';
    const packet=JSON.parse(fs.readFileSync(root+'/'+dir+'/packet.json','utf8'));
    assertPacket(packet,{setPlan:plan});
    assert.equal(packet.envelope.packet_sha256,spec.packet_sha256);
    const compiled=compileGeneratorPrompt(packet);
    assert.equal(compiled.prompt_sha256,spec.prompt_sha256);
    assert.equal(compiled.projection_sha256,spec.generator_visible_context_sha256);
    assert.equal(fs.readFileSync(root+'/'+dir+'/generator-prompt.txt','utf8'),compiled.prompt);
  }
});

test('outer canaries are absent from both generator-visible prompts',()=>{
  const prompts=manifest.runs.map((spec,i)=>fs.readFileSync(root+'/run-'+(i===0?'a':'b')+'/generator-prompt.txt','utf8'));
  for(const spec of manifest.runs){
    for(const prompt of prompts) assert.equal(prompt.includes(spec.outer_canary),false);
  }
});

test('proof fixture has no paid or owner-transfer escape hatch',()=>{
  for(const [key,value] of Object.entries(manifest.hard_boundaries)){
    if(key==='proposal1r_reader_fallback_used') assert.equal(value,false);
    else assert.equal(value,false,key);
  }
});

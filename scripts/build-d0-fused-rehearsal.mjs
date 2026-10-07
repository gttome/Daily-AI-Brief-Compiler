#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {canonicalSha} from '../image-capsules/util.mjs';
import {assertSetPlan,assignmentForStory} from '../image-capsules/set-plan.mjs';
import {assertPacket,sealPacket} from '../image-capsules/packet.mjs';
import {compileGeneratorPrompt} from '../image-capsules/prompt.mjs';

const blueprintPath=process.argv[2]||'contracts/d0-fused-rehearsal-blueprint.json';
const outRoot=process.argv[3]||'proof/d0-native-image-capsules/fused-rehearsal';
const blueprint=JSON.parse(fs.readFileSync(blueprintPath,'utf8'));

if(blueprint?.schema_version!=='daily-compiler-d0-fused-rehearsal-blueprint-v1') throw new Error('fused_blueprint_schema');
if(!Array.isArray(blueprint?.stories)||blueprint.stories.length!==6) throw new Error('fused_blueprint_six_stories');
const setPlan=blueprint.set_plan;
const planResult=assertSetPlan(setPlan);
if(setPlan.edition_date!==blueprint.edition_date) throw new Error('fused_blueprint_date_mismatch');

const renderContract={
  canvas_target:'1200x630',
  background:'white_or_near_white',
  style:'professional_high_detail_textbook_editorial_mechanism',
  minimum_meaningful_components:8,
  people:'prohibited',
  humanoids:'prohibited',
  branding:'prohibited',
  photorealism:'prohibited',
  generic_ai_imagery:'prohibited',
  decorative_filler:'prohibited',
  unsupported_specifics:'prohibited',
  visible_text_policy:'exact_allowlist_only',
  low_quality_fallback:false
};
const reviewContract={
  benchmark_profile:'sep09-sep10-premium3-v1',
  minimum_meaningful_components:8,
  generic_or_sparse_must_be:false,
  decorative_only_must_be:false
};

fs.rmSync(outRoot,{recursive:true,force:true});
fs.mkdirSync(outRoot,{recursive:true});
fs.writeFileSync(path.join(outRoot,'set-plan.json'),JSON.stringify(setPlan,null,2)+'\n');

const candidates=[];
for(let i=0;i<blueprint.stories.length;i++){
  const story=blueprint.stories[i];
  const assignment=assignmentForStory(setPlan,story.story_id);
  const componentPlan=(story.meaningful_components_plan||[]).map(([component_id,description,support])=>({component_id,description,support,required:true}));
  const storyContent={
    story_id:story.story_id,subject:story.subject,core_mechanism:story.core_mechanism,
    verified_visual_facts:story.verified_visual_facts,conceptual_elements:story.conceptual_elements,
    meaningful_components_plan:componentPlan,visible_text_allowlist:story.visible_text_allowlist,
    prohibited_specifics:story.prohibited_specifics,reference_policy:story.reference_policy
  };
  const packet=sealPacket({
    schema_version:'daily-compiler-image-packet-v3',
    envelope:{
      edition_date:blueprint.edition_date,
      story_id:story.story_id,
      candidate_id:story.story_id+'-candidate-01',
      story_content_sha256:canonicalSha(storyContent),
      set_plan_sha256:planResult.plan_sha256,
      packet_sha256:'0'.repeat(64)
    },
    generation:{
      subject:story.subject,
      core_mechanism:story.core_mechanism,
      verified_visual_facts:story.verified_visual_facts,
      conceptual_elements:story.conceptual_elements,
      meaningful_components_plan:componentPlan,
      composition_assignment:assignment,
      visible_text_allowlist:story.visible_text_allowlist,
      prohibited_specifics:story.prohibited_specifics,
      prohibited_composition_patterns:assignment.prohibited_patterns,
      reference_policy:story.reference_policy,
      wrong_subject_action:'discard_and_generate_fresh',
      render_contract:renderContract
    },
    review:reviewContract
  });
  assertPacket(packet,{setPlan});
  const compiled=compileGeneratorPrompt(packet);
  const dir=path.join(outRoot,story.story_id);
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'packet.json'),JSON.stringify(packet,null,2)+'\n');
  fs.writeFileSync(path.join(dir,'generator-prompt.txt'),compiled.prompt);
  candidates.push({
    ordinal:i+1,
    story_id:story.story_id,
    stress_case:story.stress_case===true,
    task_title:'D0 Fused '+String(i+1).padStart(2,'0')+' '+story.story_id,
    run_nonce:blueprint.rehearsal_id+'-'+String(i+1).padStart(2,'0'),
    outer_probe_id:story.outer_probe_id,
    outer_canary:story.outer_canary,
    packet_path:path.posix.join(outRoot.replaceAll('\\','/'),story.story_id,'packet.json'),
    packet_sha256:packet.envelope.packet_sha256,
    prompt_path:path.posix.join(outRoot.replaceAll('\\','/'),story.story_id,'generator-prompt.txt'),
    prompt_sha256:compiled.prompt_sha256,
    generator_visible_context_sha256:compiled.projection_sha256,
    raw_target_path:path.posix.join(outRoot.replaceAll('\\','/'),'attempts',story.story_id,'a01','raw.png'),
    final_target_path:path.posix.join(outRoot.replaceAll('\\','/'),'attempts',story.story_id,'a01','final.png')
  });
}
if(candidates.filter(x=>x.stress_case).length<2) throw new Error('fused_blueprint_two_stress_cases');

const manifest={
  schema_version:'daily-compiler-d0-fused-rehearsal-manifest-v1',
  rehearsal_id:blueprint.rehearsal_id,
  edition_date:blueprint.edition_date,
  set_plan_path:path.posix.join(outRoot.replaceAll('\\','/'),'set-plan.json'),
  set_plan_sha256:planResult.plan_sha256,
  native_generation_budget_if_all_first_attempt_pass:6,
  p0_b_rerun_required:false,
  p0_c_rerun_required:false,
  formal_proof_promotion_additional_generations:0,
  candidates,
  hard_boundaries:{
    work_used:false,codex_used:false,paid_model_api_used:false,paid_image_service_used:false,
    billable_overage_used:false,new_paid_infrastructure_used:false,alternate_account_used:false,
    owner_image_transfer_used:false,owner_liveness_used:false,proposal1r_reader_story_fallback_used:false
  }
};
fs.writeFileSync(path.join(outRoot,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({result:'PASS',out_root:outRoot,set_plan_sha256:planResult.plan_sha256,candidates:candidates.length,stress_cases:candidates.filter(x=>x.stress_case).length},null,2));

import {canonicalSha,nonempty,hex} from './util.mjs';
import {assignmentForStory,assertSetPlan} from './set-plan.mjs';

const ALLOWED_SUPPORT=new Set(['verified_fact','approved_concept']);

export function packetPayloadForHash(packet){
  const copy=structuredClone(packet);
  if(copy?.envelope) copy.envelope.packet_sha256='';
  return copy;
}

export function validatePacket(packet,{setPlan=null}={}){
  const errors=[];
  if(packet?.schema_version!=='daily-compiler-image-packet-v3') errors.push('packet_schema');
  const e=packet?.envelope||{},g=packet?.generation||{},r=packet?.review||{};
  if(!/^\d{4}-\d{2}-\d{2}$/.test(e.edition_date||'')) errors.push('packet_edition_date');
  for(const f of ['story_id','candidate_id']) if(!nonempty(e[f])) errors.push('packet_'+f);
  for(const f of ['story_content_sha256','set_plan_sha256','packet_sha256']) if(!hex(e[f],64)) errors.push('packet_'+f);
  for(const f of ['subject','core_mechanism','reference_policy']) if(!nonempty(g[f])) errors.push('generation_'+f);
  for(const f of ['verified_visual_facts','conceptual_elements','meaningful_components_plan','visible_text_allowlist','prohibited_specifics','prohibited_composition_patterns']) if(!Array.isArray(g[f])) errors.push('generation_'+f);
  if((g.meaningful_components_plan||[]).length<8) errors.push('meaningful_components_min_8');
  const componentIds=new Set();
  for(const c of g.meaningful_components_plan||[]){
    if(!nonempty(c?.component_id)||!nonempty(c?.description)||!ALLOWED_SUPPORT.has(c?.support)||c?.required!==true) errors.push('meaningful_component_invalid');
    if(componentIds.has(c?.component_id)) errors.push('meaningful_component_duplicate_id');
    componentIds.add(c?.component_id);
  }
  const labels=g.visible_text_allowlist||[],seen=new Set();
  for(const label of labels){
    if(!nonempty(label)||label.length>80||label.split(/\s+/).length>8) errors.push('visible_text_label_invalid');
    if(seen.has(label)) errors.push('visible_text_label_duplicate');
    seen.add(label);
  }
  if(g.wrong_subject_action!=='discard_and_generate_fresh') errors.push('wrong_subject_action');
  const c=g.render_contract||{};
  const expected={canvas_target:'1200x630',background:'white_or_near_white',style:'professional_high_detail_textbook_editorial_mechanism',minimum_meaningful_components:8,people:'prohibited',humanoids:'prohibited',branding:'prohibited',photorealism:'prohibited',generic_ai_imagery:'prohibited',decorative_filler:'prohibited',unsupported_specifics:'prohibited',visible_text_policy:'exact_allowlist_only',low_quality_fallback:false};
  for(const [k,v] of Object.entries(expected)) if(c[k]!==v) errors.push('render_contract_'+k);
  if(r.benchmark_profile!=='sep09-sep10-premium3-v1'||r.minimum_meaningful_components!==8||r.generic_or_sparse_must_be!==false||r.decorative_only_must_be!==false) errors.push('review_contract');
  const positive=[g.subject,g.core_mechanism,...(g.verified_visual_facts||[]),...(g.conceptual_elements||[]),...(g.visible_text_allowlist||[])].join(' | ').toLowerCase();
  for(const item of g.prohibited_specifics||[]){
    const term=String(item).trim().toLowerCase();
    if(term.length>=4&&positive.includes(term)) errors.push('positive_prohibited_conflict:'+term);
  }
  if(setPlan){
    const plan=assertSetPlan(setPlan);
    if(e.set_plan_sha256!==plan.plan_sha256) errors.push('set_plan_sha_mismatch');
    try{
      const assignment=assignmentForStory(setPlan,e.story_id);
      if(JSON.stringify(g.composition_assignment)!==JSON.stringify(assignment)) errors.push('composition_assignment_mismatch');
    }catch{errors.push('composition_assignment_story_missing');}
  }
  const computed=canonicalSha(packetPayloadForHash(packet));
  if(e.packet_sha256!==computed) errors.push('packet_sha_mismatch');
  return [...new Set(errors)];
}

export function assertPacket(packet,opts){
  const errors=validatePacket(packet,opts);
  if(errors.length) throw new Error(errors.join(';'));
  return packet;
}

export function generatorProjection(packet){
  assertPacket(packet);
  const g=packet.generation;
  return Object.freeze({
    subject:g.subject,
    core_mechanism:g.core_mechanism,
    verified_visual_facts:structuredClone(g.verified_visual_facts),
    conceptual_elements:structuredClone(g.conceptual_elements),
    meaningful_components_plan:structuredClone(g.meaningful_components_plan),
    composition_assignment:structuredClone(g.composition_assignment),
    visible_text_allowlist:structuredClone(g.visible_text_allowlist),
    prohibited_specifics:structuredClone(g.prohibited_specifics),
    prohibited_composition_patterns:structuredClone(g.prohibited_composition_patterns),
    reference_policy:g.reference_policy,
    wrong_subject_action:g.wrong_subject_action,
    render_contract:structuredClone(g.render_contract)
  });
}

export function sealPacket(packet){
  const copy=structuredClone(packet);
  if(!copy.envelope) throw new Error('packet_envelope_required');
  copy.envelope.packet_sha256=canonicalSha(packetPayloadForHash(copy));
  return Object.freeze(copy);
}

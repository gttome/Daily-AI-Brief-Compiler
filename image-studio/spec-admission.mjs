import {hasRecipeProfile,assertNewGenerationProfile,validateRecipeStory,legacyMinimumShape,compileRecipeProjections} from './specification-projection.mjs';
import fs from 'node:fs';
import {canonicalSha, sha256, nonempty, hex} from '../image-capsules/util.mjs';
import {validateSetPlan, setPlanGate} from '../image-capsules/set-plan.mjs';

const readContract = name => JSON.parse(fs.readFileSync(new URL('../contracts/'+name, import.meta.url), 'utf8'));
const admissionContract = readContract('d1-image-admission-contract.json');
const imageContract = readContract('d1-image-contract.json');
export const D1_SPECIFICATION_SCHEMA = admissionContract.request_schema;
export const D1_SPEC_ADMISSION_SCHEMA = admissionContract.schema_version;
const limits = admissionContract.limits;
const minimumComponents = Math.max(admissionContract.minimum_meaningful_components, imageContract.quality.minimum_meaningful_components);
const minimumSubstages = Math.max(admissionContract.minimum_internal_substages, imageContract.quality.minimum_internal_substages_in_dominant_mechanism);
const minimumRelationships = Math.max(admissionContract.minimum_secondary_relationships, imageContract.quality.minimum_secondary_relationships);
const assignmentFields = ['composition_signature','layout_signature','diagram_grammar','hierarchy_signature','annotation_pattern_signature','reading_path','prohibited_patterns',...admissionContract.additional_assignment_fields];
const generationFields = ['subject','core_mechanism','verified_visual_facts','conceptual_elements','meaningful_components_plan','mechanism_plan','composition_assignment','visible_text_allowlist','prohibited_specifics','prohibited_composition_patterns','reference_policy'];
const recipeFields = ['dominant_mechanism','internal_substages','secondary_relationships','evidence_structure','constraint_structure','feedback_path','output_boundary'];
const normalize = value => String(value).normalize('NFKC').toLowerCase().replace(/[\s_-]+/g,' ').trim();
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const list = value => Array.isArray(value) ? value : [];
const unique = values => new Set(values).size === values.length;
const ownAssignment = row => Object.fromEntries(assignmentFields.map(key => [key, structuredClone(row[key])]));

// Identifiers and operational material never belong in a generator-visible field.
// This is a deterministic contamination screen, not a claim to detect every semantic leak.
const operationalPatterns = [
  /\b(?:gttome|daily[ -]ai[ -]brief(?:[ -]compiler)?|compiler-state|kanban)\b/i,
  /(?:https?:\/\/|www\.|github\.com|githubusercontent\.com|chatgpt\.com\/c\/|sites-project:|page:\/\/)/i,
  /(?:^|[\s"'`(])(?:\/(?:workspace|mnt|tmp|home|root)\/|(?:contracts|rehearsals|shadow-runs|_records|\.github|docs|build|operations|dashboard)[/\\])/i,
  /\b(?:PUBLIC_CLOSED|BUNDLE_READY|SHADOW_VERIFIED|SPEC_READY|GITHUB_VERIFIED|IMAGE_TARGET_BINDING_MISSING)\b/i,
  /\b(?:run|execution|request|edition)[-_](?:\d|[a-z]+[-_]\d)/i,
  /\b(?:dashboard\s+(?:status|snapshot|text|says)|operational\s+(?:context|instructions)|system\s+prompt|ignore\s+(?:all\s+)?previous\s+instructions)\b/i,
  /\b(?:(?:supervisor|watchdog)\s+(?:retries?|resumes?|polls?|wakes?)|(?:stalled|terminal)\s+(?:run|edition|task)|protected\s+main|CI\s+(?:job|failure)|Work\s+task)\b/i,
  /\b[a-f0-9]{40,64}\b/i,
  /\b[^\s/\\]+\.(?:json|jsonl|mjs|md|yaml|yml|png|webp)\b/i
];

function strings(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (object(value)) return Object.values(value).flatMap(strings);
  return [];
}

function specificationPayload(story) {
  const copy = structuredClone(story);
  delete copy.specification_sha256;
  return copy;
}

export function sealD1Specifications(request, sourceEvidence) {
  const copy = structuredClone(request);
  copy.source_evidence_sha256 = canonicalSha(sourceEvidence);
  copy.set_plan_sha256 = canonicalSha(copy.set_plan);
  for (const story of list(copy.stories)) story.specification_sha256 = canonicalSha(specificationPayload(story));
  return copy;
}

function validate(request, sourceEvidence) {
  const errors = [];
  const fail = message => errors.push(message);
  function keys(value, expected, at) {
    if (!object(value)) { fail(at+':object_required'); return false; }
    if (Object.keys(value).some(key => !expected.includes(key)) || expected.some(key => !Object.hasOwn(value,key))) fail(at+':exact_fields_required');
    return true;
  }
  function text(value, maximum, at) {
    if (!nonempty(value) || value.length > maximum || /[\p{Cc}\p{Cf}]/u.test(value || '')) fail(at+':text_invalid');
  }
  function array(value, minimum, maximum, at) {
    if (!Array.isArray(value) || value.length < minimum || value.length > maximum) fail(at+':array_bounds');
    return list(value).slice(0, maximum+1);
  }
  function textArray(value, minimum, maximum, at, characters=limits.statement_characters) {
    const items = array(value,minimum,maximum,at);
    items.forEach((item,index) => text(item,characters,at+'['+index+']'));
    if (!unique(items.map(normalize))) fail(at+':duplicate');
  }
  function assignment(value, at, withStory=false) {
    keys(value,withStory ? ['story_id',...assignmentFields] : assignmentFields,at);
    for (const key of assignmentFields) {
      if (key === 'prohibited_patterns') textArray(value?.[key],1,limits.negative_patterns,at+'.'+key);
      else text(value?.[key],key === 'reading_path' ? limits.statement_characters : limits.signature_characters,at+'.'+key);
    }
  }
  keys(request,['schema_version','contract_version','edition_date','execution_id','request_id','source_commit','source_evidence_sha256','set_plan_sha256','set_plan','stories'],'request');
  keys(sourceEvidence,['schema_version','edition_date','execution_id','source_commit','stories'],'source_evidence');
  const r = request || {}, evidence = sourceEvidence || {}, plan = r.set_plan || {};
  if (r.schema_version !== D1_SPECIFICATION_SCHEMA) fail('request_schema');
  if (r.contract_version !== imageContract.schema_version || r.contract_version !== admissionContract.quality_contract_version || imageContract.strategy !== admissionContract.strategy) fail('active_contract_mismatch');
  if (imageContract.required_count !== 6 || !Number.isInteger(minimumComponents) || !Number.isInteger(minimumSubstages) || !Number.isInteger(minimumRelationships)) fail('active_contract_constraints');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.edition_date || '')) fail('edition_date');
  for (const key of ['execution_id','request_id']) text(r[key],160,key);
  if (!hex(r.source_commit,40)) fail('source_commit');
  if (evidence.schema_version !== admissionContract.source_evidence_schema) fail('source_evidence_schema');
  for (const key of ['edition_date','execution_id','source_commit']) if (r[key] !== evidence[key]) fail('source_evidence_identity:'+key);
  if (!hex(r.source_evidence_sha256,64) || r.source_evidence_sha256 !== canonicalSha(evidence)) fail('source_evidence_sha256');
  if (!hex(r.set_plan_sha256,64) || r.set_plan_sha256 !== canonicalSha(plan)) fail('set_plan_sha256');
  keys(plan,['schema_version','edition_date','stories','planned_set_gate'],'set_plan');
  if (plan.schema_version !== admissionContract.set_plan_schema || plan.edition_date !== r.edition_date) fail('set_plan_identity');
  if (canonicalSha(plan.planned_set_gate ?? null) !== canonicalSha(admissionContract.set_gate)) fail('set_plan_declared_gate');
  const assignments = array(plan.stories,6,6,'set_plan.stories');
  for (const row of assignments) { assignment(row,'set_plan.assignment',true); text(row?.story_id,160,'set_plan.story_id'); }
  const normalizedPlan = {schema_version:'daily-compiler-image-set-plan-v3',edition_date:plan.edition_date,planned_set_gate:plan.planned_set_gate,
    stories:assignments.map(row => Object.fromEntries(Object.entries(object(row) ? row : {}).map(([key,value]) => [key, typeof value === 'string' ? normalize(value) : value])))};
  // Reuse the established canonical six/four/four/four/three set gate.
  errors.push(...validateSetPlan(normalizedPlan).map(error => 'd1_'+error));
  const sources = array(evidence.stories,6,6,'source_evidence.stories');
  for (const source of sources) {
    keys(source,['story_id','story_content_sha256','source_url','verified_visual_facts'],'source_evidence.story');
    text(source?.story_id,160,'source_evidence.story_id');
    if (!hex(source?.story_content_sha256,64)) fail('source_evidence.story_content_sha256');
    try { const u = new URL(source?.source_url); if (u.protocol !== 'https:' || u.username || u.password || u.hash || u.href.length > 2048) fail('source_evidence.source_url'); }
    catch { fail('source_evidence.source_url'); }
    textArray(source?.verified_visual_facts,1,limits.facts,'source_evidence.verified_visual_facts');
  }
  const stories = array(r.stories,6,6,'stories');
  for (const [name,rows] of [['stories',stories],['assignments',assignments],['sources',sources]]) {
    if (!unique(rows.map(row => normalize(row?.story_id)))) fail(name+':duplicate_story_id');
  }
  if (!unique(stories.map(story => normalize(story?.generation?.subject))) || !unique(stories.map(story => normalize(story?.generation?.core_mechanism)))) fail('story_specific_mechanisms_required');
  for (const story of stories) {
    const at = 'story:'+String(story?.story_id);
    keys(story,['story_id','story_content_sha256','specification_sha256','generation'],at);
    text(story?.story_id,160,at+'.story_id');
    if (!hex(story?.story_content_sha256,64)) fail(at+':story_content_sha256');
    if (!hex(story?.specification_sha256,64) || story?.specification_sha256 !== canonicalSha(specificationPayload(story))) fail(at+':specification_sha256');
    const source = sources.find(row => row?.story_id === story?.story_id);
    if (!source || source.story_content_sha256 !== story?.story_content_sha256) fail(at+':source_story_binding');
    const own = assignments.find(row => row?.story_id === story?.story_id);
    const g = story?.generation || {};
    keys(g,generationFields,at+'.generation');
    text(g.subject,limits.subject_characters,at+'.subject');
    text(g.core_mechanism,limits.mechanism_characters,at+'.core_mechanism');
    text(g.reference_policy,limits.statement_characters,at+'.reference_policy');
    if (g.reference_policy !== admissionContract.reference_policy) fail(at+':reference_policy');
    textArray(g.verified_visual_facts,1,limits.facts,at+'.verified_visual_facts');
    textArray(g.conceptual_elements,1,limits.concepts,at+'.conceptual_elements');
    for (const fact of list(g.verified_visual_facts)) if (!source?.verified_visual_facts?.includes(fact)) fail(at+':unsupported_fact');
    for (const concept of list(g.conceptual_elements)) if (list(g.verified_visual_facts).includes(concept)) fail(at+':fact_concept_not_separate');
    textArray(g.prohibited_specifics,1,limits.negative_patterns,at+'.prohibited_specifics');
    textArray(g.prohibited_composition_patterns,1,limits.negative_patterns,at+'.prohibited_composition_patterns');
    textArray(g.visible_text_allowlist,0,limits.labels,at+'.visible_text_allowlist',limits.label_characters);
    for (const label of list(g.visible_text_allowlist)) if (typeof label === 'string' && label.split(/\s+/u).length > limits.label_words) fail(at+':visible_text_word_limit');
    assignment(g.composition_assignment,at+'.composition_assignment');
    if (!own || assignmentFields.some(key => canonicalSha(own[key] ?? null) !== canonicalSha(g.composition_assignment?.[key] ?? null))) fail(at+':composition_assignment_mismatch');
    const components = array(g.meaningful_components_plan,minimumComponents,limits.components,at+'.meaningful_components_plan');
    const ids = components.map(component => component?.component_id);
    if (!unique(ids) || !unique(components.map(component => normalize(component?.description)))) fail(at+':duplicate_components');
    for (const component of components) {
      keys(component,['component_id','description','support','support_index','required'],at+'.component');
      if (!/^c(?:[1-9]|[1-3][0-9]|40)$/.test(component?.component_id || '')) fail(at+':component_id');
      text(component?.description,limits.statement_characters,at+'.component.description');
      const support = component?.support === 'verified_fact' ? g.verified_visual_facts : component?.support === 'approved_concept' ? g.conceptual_elements : null;
      if (!Array.isArray(support) || !Number.isInteger(component?.support_index) || component.support_index < 0 || component.support_index >= support.length || component?.required !== true) fail(at+':component_support');
    }
    const mechanism = g.mechanism_plan || {};
    keys(mechanism,recipeFields,at+'.mechanism_plan');
    for (const key of recipeFields.filter(key => !['internal_substages','secondary_relationships'].includes(key))) text(mechanism[key],limits.statement_characters,at+'.mechanism_plan.'+key);
    for (const stage of array(mechanism.internal_substages,minimumSubstages,limits.recipe_relationships,at+'.internal_substages')) {
      keys(stage,['input_component_id','transformation','output_component_id'],at+'.substage');
      text(stage?.transformation,limits.statement_characters,at+'.transformation');
      if (!ids.includes(stage?.input_component_id) || !ids.includes(stage?.output_component_id) || stage?.input_component_id === stage?.output_component_id) fail(at+':substage_component_binding');
    }
    for (const relation of array(mechanism.secondary_relationships,minimumRelationships,limits.recipe_relationships,at+'.secondary_relationships')) {
      keys(relation,['from_component_id','to_component_id','relationship'],at+'.secondary_relationship');
      text(relation?.relationship,limits.statement_characters,at+'.relationship');
      if (!ids.includes(relation?.from_component_id) || !ids.includes(relation?.to_component_id) || relation?.from_component_id === relation?.to_component_id) fail(at+':secondary_component_binding');
    }
    for (const key of ['internal_substages','secondary_relationships']) if (!unique(list(mechanism[key]).map(canonicalSha))) fail(at+':duplicate_'+key);
    const visible = strings(g).join('\n').normalize('NFKC');
    if (operationalPatterns.some(pattern => pattern.test(visible))) fail(at+':generator_context_contamination');
    const forbiddenIdentifiers = [r.execution_id,r.request_id,r.source_commit,...stories.map(other => other?.story_id)];
    for (const id of forbiddenIdentifiers) if (typeof id === 'string' && id.length >= 4 && visible.toLowerCase().includes(id.normalize('NFKC').toLowerCase())) fail(at+':generator_identity_leak');
    for (const other of stories.filter(other => other?.story_id !== story?.story_id)) {
      for (const value of [other?.generation?.subject,other?.generation?.core_mechanism]) if (typeof value === 'string' && value.length >= 16 && normalize(visible).includes(normalize(value))) fail(at+':other_story_contamination');
    }
    const positive = [g.subject,g.core_mechanism,...list(g.verified_visual_facts),...list(g.conceptual_elements),...components.map(component => component?.description),...list(g.visible_text_allowlist)].filter(value => typeof value === 'string').join(' ').toLowerCase();
    for (const term of list(g.prohibited_specifics)) if (typeof term === 'string' && term.length >= 4 && positive.includes(term.toLowerCase())) fail(at+':prohibited_specific_conflict');
  }
  return {errors:[...new Set(errors)],gate:setPlanGate(normalizedPlan)};
}

export function admitD1Specifications(request, sourceEvidence, {previousReceipt=null}={}) {
  let checked, profileBindings=null;
  try {
    if (JSON.stringify(request)?.length > limits.request_characters || JSON.stringify(sourceEvidence)?.length > limits.evidence_characters) checked = {errors:['payload_size_limit'],gate:null};
    else if (hasRecipeProfile(request)) {
      assertNewGenerationProfile(request);
      profileBindings=request.stories.map(story=>{
        if(Object.keys(story).some(k=>!['story_id','story_content_sha256','specification_sha256','generation','recipe_profile'].includes(k)) || story.specification_sha256!==canonicalSha(specificationPayload(story))) throw new Error('recipe_v2:story_hash_or_fields');
        const visible=strings(story.generation).join('\n').normalize('NFKC');
        if(operationalPatterns.some(p=>p.test(visible))) throw new Error('recipe_v2:generator_context_contamination');
        for(const id of [request.execution_id,request.request_id,request.source_commit,...request.stories.map(s=>s.story_id)]) if(typeof id==='string'&&id.length>=4&&visible.toLowerCase().includes(id.toLowerCase())) throw new Error('recipe_v2:generator_identity_leak');
        for(const other of request.stories.filter(s=>s.story_id!==story.story_id)) for(const value of [other.generation?.subject,other.generation?.core_mechanism]) if(typeof value==='string'&&value.length>=16&&normalize(visible).includes(normalize(value))) throw new Error('recipe_v2:other_story_contamination');
        return validateRecipeStory(story,sourceEvidence.stories.find(s=>s.story_id===story.story_id));
      });
      const minimumShape=legacyMinimumShape(request);
      for(const story of minimumShape.stories) story.specification_sha256=canonicalSha(specificationPayload(story));
      checked=validate(minimumShape,sourceEvidence);
    } else checked = validate(request,sourceEvidence);
  } catch(error) { checked = {errors:[hasRecipeProfile(request) ? error.message : 'malformed_specification_or_source_evidence'],gate:null}; }
  const result = checked.errors.length ? 'FAIL' : 'PASS';
  const binding = result === 'PASS' ? {request_sha256:canonicalSha(request),source_evidence_sha256:canonicalSha(sourceEvidence),set_plan_sha256:canonicalSha(request.set_plan),quality_contract_sha256:canonicalSha(imageContract),admission_contract_sha256:canonicalSha(admissionContract),...(profileBindings?{recipe_profile:{profile_id:request.stories[0].recipe_profile.profile_id,definition_sha256:request.stories[0].recipe_profile.definition_sha256,stories:profileBindings}}:{})} : {};
  const reusable = result === 'PASS' && previousReceipt?.schema_version === D1_SPEC_ADMISSION_SCHEMA && previousReceipt?.result === 'PASS' && previousReceipt?.gate === 'IMAGE_SPEC_ADMISSION' && Object.entries(binding).every(([key,value]) => canonicalSha(previousReceipt[key]??null) === canonicalSha(value));
  return {schema_version:D1_SPEC_ADMISSION_SCHEMA,gate:'IMAGE_SPEC_ADMISSION',result,errors:checked.errors,...binding,all_six_validated:result === 'PASS',planned_diversity:checked.gate,
    quality_attempts_consumed:0,story_chats_opened:0,generation_authorized:false,visual_quality:'NOT_EVALUATED',live_proof:'NOT_EVALUATED',activation:'NOT_GRANTED',
    proof_reuse:result !== 'PASS' ? 'NONE' : reusable ? 'ALREADY_SATISFIED' : 'VALIDATED'};
}

export function assertD1Specifications(request, sourceEvidence, options) {
  const admission = admitD1Specifications(request,sourceEvidence,options);
  if (admission.result !== 'PASS') throw new Error('D1 specification admission failed: '+admission.errors.join(';'));
  return admission;
}

export function compileD1StoryPrompt(request, sourceEvidence, storyId) {
  const admission = assertD1Specifications(request,sourceEvidence);
  const story = request.stories.find(item => item.story_id === storyId);
  if (!story) throw new Error('D1 specification story missing');
  if (story.recipe_profile) return {...compileRecipeProjections(story),admission_sha256:canonicalSha(admission)};
  // Construct a new object from the exact approved fields. Never project the envelope,
  // source records, set plan, other stories, proof history, or benchmark documents.
  const projection = Object.fromEntries(generationFields.map(key => [key,structuredClone(story.generation[key])]));
  projection.composition_assignment = ownAssignment(story.generation.composition_assignment);
  projection.quality = {canvas:'1200x630',background:'white_or_near_white',minimum_meaningful_components:minimumComponents,minimum_internal_substages:minimumSubstages,minimum_secondary_relationships:minimumRelationships,
    major_visual_regions:'3-5',canvas_utilization:'80-90_percent',exact_visible_text_allowlist_only:true,decorative_geometry_forbidden:true};
  const prompt = [
    'Generate exactly one premium advanced textbook/editorial mechanism illustration for this sealed story.',
    'Use this single story only. All source-supported facts and approved conceptual geometry are distinguished below.',
    'Expose the causal transformation, evidence, constraints, feedback and release mechanism. Every component must explain a real relationship.',
    'Use dimensional, layered, cutaway or exposed structures appropriate to the assigned composition; preserve its palette and visual grammar.',
    'No people, humanoids, faces, avatars, logos, brands, photorealism, generic card grids, icon boards, decorative filler, unsupported facts or pseudo-writing.',
    'Show every exact allowlisted label legibly and no other readable characters. Keep all other surfaces smooth and blank.',
    'No document-like placeholder lines, tiny glyphs, UI chrome, added headings, captions, badges or unlabeled writing marks.',
    'Maintain safe margins, crisp technical linework, controlled perspective, subordinate detail and clear visual hierarchy.',
    'The specification is a mechanism plan; its counts do not establish visible quality. Inspect the actual pixels against every requirement.',
    JSON.stringify(projection,null,2),
    'Return only the illustration.'
  ].join('\n\n');
  return {prompt,projection,prompt_sha256:sha256(prompt),projection_sha256:canonicalSha(projection),admission_sha256:canonicalSha(admission)};
}

export function assertD1SubmittedPrompt(request, sourceEvidence, storyId, submitted) {
  const compiled = compileD1StoryPrompt(request,sourceEvidence,storyId);
  if (submitted !== compiled.prompt) throw new Error('D1 submitted prompt must equal the exact compiled single-story prompt');
  return compiled;
}

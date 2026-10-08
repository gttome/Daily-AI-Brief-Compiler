// Pure, versioned single-story projections. No generation, scheduler or Git writes.
import fs from 'node:fs';
import {canonicalSha,sha256,hex} from '../image-capsules/util.mjs';
import {BASIC_GATES,BENCHMARK_DIMENSIONS,REVIEW_SCHEMA,validateVisualReview} from '../image-capsules/review-contract.mjs';
import {RECIPE_QUALITY_OBSERVATION_INSTRUCTIONS,parseRecipeQualityObservations} from './recipe-quality-observations.mjs';

export const RECIPE_PROFILE=Object.freeze(JSON.parse(fs.readFileSync(new URL('../contracts/d1-image-recipe-profile-v2.json',import.meta.url),'utf8')));
export const RECIPE_PROFILE_SHA=canonicalSha(RECIPE_PROFILE);
const quality=JSON.parse(fs.readFileSync(new URL('../contracts/d1-image-contract.json',import.meta.url),'utf8'));
const need=(ok,code)=>{if(!ok)throw new Error('recipe_v2:'+code);};
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const text=(x,max=600)=>typeof x==='string'&&x.trim().length>0&&x.length<=max&&!/[\p{Cc}\p{Cf}]/u.test(x);
const same=(a,b)=>canonicalSha(a)===canonicalSha(b);
const exact=(x,keys,at)=>need(obj(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k)),at+':exact_fields');
const unique=xs=>new Set(xs).size===xs.length;
const sid=x=>typeof x==='string'&&/^[a-z][a-z0-9_-]{0,59}$/.test(x);
export const hasRecipeProfile=request=>Array.isArray(request?.stories)&&request.stories.some(s=>obj(s)&&Object.hasOwn(s,'recipe_profile'));
export function assertNewGenerationProfile(request){need(request?.stories?.length===6&&request.stories.every(s=>s.recipe_profile?.profile_id===RECIPE_PROFILE.profile_id&&s.recipe_profile.definition_sha256===RECIPE_PROFILE_SHA),'new_generation_profile_required');}
export function recipeDigest(story){return canonicalSha({profile_id:RECIPE_PROFILE.profile_id,definition_sha256:RECIPE_PROFILE_SHA,generation:story.generation});}
const relations=s=>[...s.generation.mechanism_plan.internal_substages,...s.generation.mechanism_plan.secondary_relationships];
const endpoints=e=>[e.input_component_id??e.from_component_id,e.output_component_id??e.to_component_id];
export function semanticRequirements(story){return [...story.generation.meaningful_components_plan.map(c=>({id:'component.'+c.component_id,support:c.support,support_index:c.support_index})),...relations(story).map(e=>({id:'relation.'+e.relation_id,support:e.support,support_index:e.support_index}))];}
export function deriveRecipeCriteria(story){
 const g=story.generation,criteria=[];
 const add=(id,requirement)=>criteria.push({id,requirement});
 for(const k of BASIC_GATES)add('basic.'+k,'The visible image must pass '+k.replaceAll('_',' ')+'.');
 for(const k of BENCHMARK_DIMENSIONS)add('benchmark.'+k,'Match premium benchmark '+k.replaceAll('_',' ')+'.');
 // Only visible quality requirements enter a story conversation. Gate actors,
 // repository benchmark locators and set-level orchestration stay outside.
 const outside=new Set(['gate_location','gate_actor','work_visual_rereview_required','github_visual_rereview_required','benchmark_profile_path','composition_assignments_presealed','set_differentiation_required']);
 for(const [k,v] of Object.entries(quality.quality))if(!outside.has(k))add('quality.'+k,JSON.stringify({[k]:v}));
 add('source.truth','Preserve the source-supported meaning; conceptual geometry must not invent factual claims.');
 add('text.allowlist','Show exactly these labels and no additional readable text: '+JSON.stringify(g.visible_text_allowlist));
 add('text.no_pseudotext','No invented glyphs or pseudo-writing. A mark is not evidence of a readable word.');
 add('text.no_placeholder_lines','No document-placeholder lines or writing-like marks on blank surfaces.');
 add('layout.regions','Three to five major regions, with distinct functional components.');
 add('layout.occupancy','Use 80–90 percent useful canvas, preserving safe margins.');
 add('recipe.selected',g.mechanism_plan.selected_construction);
 for(const c of g.meaningful_components_plan){
  add('component.'+c.component_id,c.description+'; role '+c.semantic_role+'; region '+c.region+'.');
  for(const b of c.input_bindings)add('input.'+c.component_id+'.'+b.entry,'Connect '+b.source_component_id+' to '+c.component_id+' at '+b.entry+' using only '+b.relationship_id+'.');
 }
 for(const e of relations(story)){const [from,to]=endpoints(e);add('relation.'+e.relation_id,e.kind+' between '+from+' and '+to+': '+(e.transformation??e.relationship)+(e.kind==='comparison_reference'?'; undirected reference, not transported material or feedback.':e.kind==='feedback'?'; return '+e.returned_state:'; no implied return.'));}
 for(const e of g.mechanism_plan.geometry_requirements)add('geometry.'+e.requirement_id,e.description);
 need(unique(criteria.map(c=>c.id)),'duplicate_criterion');
 return criteria;
}
export function validateRecipeStory(story,source){
 exact(story.recipe_profile,['profile_id','definition_sha256','semantic_review'],'profile');
 need(story.recipe_profile.profile_id===RECIPE_PROFILE.profile_id&&story.recipe_profile.definition_sha256===RECIPE_PROFILE_SHA,'profile_identity');
 const g=story.generation,cs=g.meaningful_components_plan,es=relations(story),ids=cs.map(c=>c.component_id);
 need(unique(ids),'component_ids');
 need(text(g.mechanism_plan.selected_construction),'selected_construction');
 const geometry=g.mechanism_plan.geometry_requirements;
 need(Array.isArray(geometry)&&geometry.length>=1&&geometry.length<=24&&unique(geometry.map(x=>x.requirement_id)),'geometry_requirements');
 for(const x of geometry){exact(x,['requirement_id','description'],'geometry');need(sid(x.requirement_id)&&text(x.description),'geometry_description');}
 need(unique(es.map(e=>e.relation_id)),'relation_ids');
 const byId=new Map(es.map(e=>[e.relation_id,e]));
 for(const c of cs){
  exact(c,['component_id','description','support','support_index','required',...RECIPE_PROFILE.component_fields],'component');
  need(sid(c.semantic_role)&&/^r[1-5]$/.test(c.region)&&Array.isArray(c.input_bindings)&&c.input_bindings.length<=12,'component_role_region_inputs');
  need(unique(c.input_bindings.map(b=>b.entry))&&unique(c.input_bindings.map(b=>b.relationship_id)),'duplicate_entry_or_input');
  for(const b of c.input_bindings){
   exact(b,['source_component_id','entry','relationship_id'],'input');
   need(ids.includes(b.source_component_id)&&b.source_component_id!==c.component_id&&sid(b.entry),'unbound_input');
   const e=byId.get(b.relationship_id);
   need(e&&endpoints(e)[0]===b.source_component_id&&endpoints(e)[1]===c.component_id&&['artifact_flow','measurement','feedback'].includes(e.kind),'input_relation_binding');
  }
 }
 const regions=new Set(cs.map(c=>c.region));need(regions.size>=3&&regions.size<=5,'major_regions');
 for(const e of es){
  const stage=Object.hasOwn(e,'input_component_id');
  exact(e,[...(stage?['input_component_id','transformation','output_component_id']:['from_component_id','to_component_id','relationship']),...RECIPE_PROFILE.relation_fields],'relation');
  need(sid(e.relation_id)&&RECIPE_PROFILE.relationship_kinds.includes(e.kind),'relationship_kind');
  const [from,to]=endpoints(e),a=cs.find(c=>c.component_id===from),b=cs.find(c=>c.component_id===to);
  need(a&&b&&from!==to,'relationship_endpoints');
  const support=e.support==='verified_fact'?g.verified_visual_facts:e.support==='approved_concept'?g.conceptual_elements:null;
  need(support&&Number.isInteger(e.support_index)&&e.support_index>=0&&e.support_index<support.length,'relationship_support');
  if(e.kind==='feedback')need(e.support==='verified_fact'&&text(e.returned_state),'unsupported_feedback');else need(e.returned_state===null,'nonfeedback_return');
  if(a.semantic_role==='comparison_reference'||b.semantic_role==='comparison_reference')need(e.kind==='comparison_reference','reference_cannot_transport');
  if(['artifact_flow','measurement','feedback'].includes(e.kind))need(b.input_bindings.filter(x=>x.relationship_id===e.relation_id&&x.source_component_id===from).length===1,'missing_input_port');
 }
 // No independently authored arity: the compiler alone renders port counts.
 const prose=[g.core_mechanism,...g.conceptual_elements,...cs.map(c=>c.description),...es.map(e=>e.transformation??e.relationship),...Object.values(g.mechanism_plan).filter(x=>typeof x==='string'),...geometry.map(x=>x.description)].join(' ');
 need(!/\b(?:one|two|three|four|five|six|seven|eight|nine|ten|\d+)[ -](?:input|port)s?\b/i.test(prose),'independent_arity_prose');
 const r=story.recipe_profile.semantic_review;
 exact(r,['schema_version','recipe_sha256','source_story_sha256','reviewer','reviewed_at','claims','result'],'semantic_review');
 need(r.schema_version==='daily-compiler-d1-recipe-source-review-v2'&&r.recipe_sha256===recipeDigest(story)&&r.source_story_sha256===canonicalSha(source),'semantic_review_binding');
 need(text(r.reviewer,160)&&/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(r.reviewed_at)&&Number.isFinite(Date.parse(r.reviewed_at)),'semantic_review_identity');
 const expected=semanticRequirements(story);
 need(Array.isArray(r.claims)&&r.claims.length===expected.length&&unique(r.claims.map(c=>c.id)),'semantic_claim_set');
 for(const x of expected){const c=r.claims.find(row=>row.id===x.id);exact(c,['id','support','support_index','assessment','observation'],'semantic_claim');need(c.support===x.support&&c.support_index===x.support_index&&c.assessment===(x.support==='verified_fact'?'SUPPORTED':'CONCEPTUAL')&&text(c.observation)&&c.observation.trim().length>=16,'semantic_claim_rejected_or_unbound');}
 need(r.result==='PASS','semantic_review_not_pass');
 return {story_id:story.story_id,profile_sha256:RECIPE_PROFILE_SHA,recipe_sha256:recipeDigest(story),criteria_sha256:canonicalSha(deriveRecipeCriteria(story)),semantic_review_sha256:canonicalSha(r)};
}
// Strip only explicit v2 additions for the unchanged legacy minimum/set validator.
// The actual v2 admission binding is always computed over the unstripped request.
export function legacyMinimumShape(request){
 const copy=structuredClone(request);
 for(const s of copy.stories){delete s.recipe_profile;for(const c of s.generation.meaningful_components_plan)for(const k of RECIPE_PROFILE.component_fields)delete c[k];for(const e of relations(s))for(const k of RECIPE_PROFILE.relation_fields)delete e[k];for(const k of RECIPE_PROFILE.mechanism_fields)delete s.generation.mechanism_plan[k];}
 return copy;
}
export function compileRecipeProjections(story){
 const criteria=deriveRecipeCriteria(story),g=structuredClone(story.generation);
 const projection={...g,derived_inputs:g.meaningful_components_plan.filter(c=>c.input_bindings.length).map(c=>({component:c.component_id,input_count:c.input_bindings.length,entries:c.input_bindings})),criteria};
 // Profile digests, source metadata, operational identities and other stories are absent.
 const prompt=['Generate exactly one premium advanced textbook/editorial mechanism illustration of this story only.',
 'Explain the specified transformation and relevant evidence, constraints or comparison. Show feedback only where explicitly typed and supported; undirected comparison references are not returned material.',
 'Use a white or near-white 1200×630 landscape, dimensional exposed causal geometry, safe margins, crisp linework and every fixed criterion below.',
 'No people, humanoids, faces, avatars, logos, brands, photorealism, screens, UI chrome, card grids, pseudo-writing, placeholder lines, decorative padding or low-quality fallback.',
 'Use the exact allowlisted visible labels and no other characters. Keep all other surfaces smooth and blank.',JSON.stringify(projection,null,2),'Return only the illustration.'].join('\n\n');
 const reviewPrompt=['Inspect only the exact saved canonical image in this story conversation. Do not generate or edit.',
 'Judge every criterion against visible pixels. For each criterion return id, pass (boolean), location, observation, offending_text (null except actual unauthorized readable text) and missing_labels (array). Marks are not readable words; assess pseudotext and placeholder lines separately.',
 'Return only a JSON object containing criteria, specification_conflict, and result. Do not invent or emit story IDs, repository paths, context identities or hashes. The outer deterministic recorder adds the actual asset and protocol bindings; they never enter this conversation.',
 'Do not invent additional topology or geometry. A missing/contradictory requirement is specification_conflict=true and FAIL, not permission to change the target. PASS requires all criteria true.',JSON.stringify(criteria,null,2),RECIPE_QUALITY_OBSERVATION_INSTRUCTIONS].join('\n\n');
 const correctionPolicy='Correct only failed existing criterion IDs using their recorded observations. Preserve the complete selected construction, input bindings, relationships and allowlist. A specification conflict stops the case; it does not authorize a new requirement or generation.';
 return {prompt,projection,prompt_sha256:sha256(prompt),projection_sha256:canonicalSha(projection),review_prompt:reviewPrompt,review_prompt_sha256:sha256(reviewPrompt),correction_policy:correctionPolicy,correction_policy_sha256:sha256(correctionPolicy),criteria,criteria_sha256:canonicalSha(criteria)};
}
// Bind the actual inner-chat observations without sending repository metadata
// into a conversation which may later produce a correction image.
export function bindRecipeReview(story,responseText,{finalSha256,contextId,reviewedAt}){
 need(typeof responseText==='string'&&responseText.length<=200000,'bounded_review_response');
 const observation=JSON.parse(responseText);exact(observation,['criteria','specification_conflict','result'],'review_response');
 const review={schema_version:'daily-compiler-d1-recipe-review-v2',story_id:story.story_id,specification_sha256:story.specification_sha256,criteria_sha256:canonicalSha(deriveRecipeCriteria(story)),final_sha256:finalSha256,reviewer_context:contextId,reviewed_at:reviewedAt,...observation};
 validateRecipeReview(story,review,{finalSha256,contextId});return review;
}
export function validateRecipeReview(story,review,{finalSha256,contextId}={}){
 exact(review,['schema_version','story_id','specification_sha256','criteria_sha256','final_sha256','reviewer_context','reviewed_at','criteria','specification_conflict','result'],'pixel_review');
 need(review.schema_version==='daily-compiler-d1-recipe-review-v2'&&review.story_id===story.story_id&&review.specification_sha256===story.specification_sha256,'review_identity');
 const criteria=deriveRecipeCriteria(story);
 need(review.criteria_sha256===canonicalSha(criteria)&&hex(review.final_sha256,64)&&review.final_sha256===finalSha256&&review.reviewer_context===contextId,'review_asset_binding');
 need(typeof contextId==='string'&&/^ctx-[a-f0-9]{64}$/.test(contextId)&&Number.isFinite(Date.parse(review.reviewed_at)),'review_context_time');
 need(Array.isArray(review.criteria)&&review.criteria.length===criteria.length&&unique(review.criteria.map(c=>c.id))&&criteria.every(c=>review.criteria.some(x=>x.id===c.id)),'review_criterion_set');
 for(const c of review.criteria){
  exact(c,['id','pass','location','observation','offending_text','missing_labels'],'criterion_observation');
  need(typeof c.pass==='boolean'&&text(c.location,160)&&text(c.observation)&&c.observation.trim().length>=12&&Array.isArray(c.missing_labels),'localized_observation');
  need(c.missing_labels.every(x=>story.generation.visible_text_allowlist.includes(x)),'missing_label_identity');
  if(c.id!=='text.allowlist')need(c.offending_text===null&&c.missing_labels.length===0,'marks_not_readable_text');
  else if(c.pass)need(c.offending_text===null&&c.missing_labels.length===0,'passing_text_defects');
  else need(text(c.offending_text,160)||c.missing_labels.length>0,'actual_text_defect_required');
 }
 parseRecipeQualityObservations(review);
 need(typeof review.specification_conflict==='boolean','specification_conflict_boolean');
 const result=review.criteria.every(c=>c.pass)&&!review.specification_conflict?'PASS':'FAIL';need(review.result===result,'derived_review_result');return result;
}
// Transcribe an already-bound pixel review into the unchanged v3 record. This
// does not inspect pixels, invent OCR, or override the stricter recipe result.
export function projectRecipeVisualReview(story,recipeReview,{attempt,canonicalIdentity}={}){
 need(Number.isInteger(attempt)&&attempt>=1&&attempt<=4&&obj(canonicalIdentity)&&text(canonicalIdentity.path,1024)&&canonicalIdentity.path.trim()===canonicalIdentity.path&&hex(canonicalIdentity.sha256,64)&&hex(canonicalIdentity.git_blob_sha,40),'visual_projection_identity');
 validateRecipeReview(story,recipeReview,{finalSha256:canonicalIdentity.sha256,contextId:recipeReview?.reviewer_context});
 const criteria=new Map(recipeReview.criteria.map(c=>[c.id,c])),localized=c=>c.location+': '+c.observation;
 const gates=(prefix,keys)=>Object.fromEntries(keys.map(k=>{const c=criteria.get(prefix+k);return [k,{verdict:c.pass?'PASS':'FAIL',observation:localized(c)}];}));
 const labels=criteria.get('text.allowlist'),required=[...story.generation.visible_text_allowlist];
 need(labels.offending_text===null||text(labels.offending_text,160),'visual_projection_actual_text');
 const review={schema_version:REVIEW_SCHEMA,story_id:story.story_id,attempt,final_path:canonicalIdentity.path,final_sha256:canonicalIdentity.sha256,final_git_blob_sha:canonicalIdentity.git_blob_sha,packet_sha256:story.specification_sha256,prompt_sha256:compileRecipeProjections(story).prompt_sha256,reviewed_at:recipeReview.reviewed_at,reviewer_identity:recipeReview.reviewer_context,
  basic_gates:gates('basic.',BASIC_GATES),
  visible_text:{result:labels.pass?'PASS':'FAIL',required_labels:required,observed_required_labels:required.filter(label=>!labels.missing_labels.includes(label)),missing_labels:[...labels.missing_labels],extra_visible_text:labels.offending_text===null?[]:[labels.offending_text]},
  meaningful_components:story.generation.meaningful_components_plan.map(c=>criteria.get('component.'+c.component_id)).filter(c=>c.pass).map(localized),
  benchmark_dimensions:gates('benchmark.',BENCHMARK_DIMENSIONS),
  generic_or_sparse:['quality.generic_infographic_aesthetic_forbidden','quality.minimum_meaningful_components','benchmark.meaningful_detail'].every(id=>criteria.get(id).pass)?false:null,
  decorative_only:criteria.get('quality.decorative_geometry_forbidden').pass?false:null,result:'PASS'};
 review.result=validateVisualReview(review,{packet:{envelope:{story_id:story.story_id,packet_sha256:story.specification_sha256},generation:story.generation},finalReceipt:{story_id:story.story_id,attempt,final:canonicalIdentity}}).length===0?'PASS':'FAIL';
 return review;
}
export function compileRecipeCorrection(story,previousReview){
 validateRecipeReview(story,previousReview,{finalSha256:previousReview.final_sha256,contextId:previousReview.reviewer_context});
 need(previousReview.result==='FAIL'&&!previousReview.specification_conflict,'correction_not_authorized_for_pass_or_conflict');
 const p=compileRecipeProjections(story),failed=previousReview.criteria.filter(c=>!c.pass);
 const correction=[p.correction_policy,JSON.stringify(failed,null,2),p.prompt].join('\n\n');
 return {previous_review_sha256:canonicalSha(previousReview),failed_criterion_ids:failed.map(c=>c.id),text:correction,text_sha256:sha256(correction),criteria_sha256:p.criteria_sha256};
}
export function validateRecipeCompanion(request,sources,record){
 if(!hasRecipeProfile(request)){need(!Object.hasOwn(record,'recipe_reviews'),'legacy_review_extension_forbidden');return;}
 const allowed=record.schema_version==='daily-compiler-d1-canonical-reviews-v1'?Object.keys(JSON.parse(fs.readFileSync(new URL('../contracts/d1-canonical-reviews.schema.json',import.meta.url),'utf8')).properties):['proof_id','images','observations','recipe_reviews','sessions'];
 need(Object.keys(record).every(k=>allowed.includes(k)),'canonical_companion_closed_fields');
 const rows=record.recipe_reviews;need(Array.isArray(rows)&&rows.length===6&&unique(rows.map(x=>x.story_id)),'six_recipe_reviews');
 for(const s of request.stories){
  const source=sources.stories.find(x=>x.story_id===s.story_id),binding=validateRecipeStory(s,source),row=rows.find(x=>x.story_id===s.story_id),p=compileRecipeProjections(s);
  exact(row,['story_id','profile_sha256','recipe_sha256','criteria_sha256','semantic_review_sha256','specification_sha256','attempts'],'companion_story');
  need(Object.entries(binding).every(([k,v])=>row[k]===v)&&row.specification_sha256===s.specification_sha256,'companion_recipe_binding');
  const canonicalReview=record.images.find(x=>x.story_id===s.story_id),session=(record.sessions??[]).find(x=>x.story_id===s.story_id);
  need(session&&Date.parse(s.recipe_profile.semantic_review.reviewed_at)<=Date.parse(session.started_at),'source_review_must_precede_story_session');
  need(Array.isArray(row.attempts)&&row.attempts.length>=1&&row.attempts.length<=4&&row.attempts.length===canonicalReview.attempt,'companion_attempt_count');
  let prior=null;
  for(const [i,a] of row.attempts.entries()){
   exact(a,['attempt','raw_sha256','generation_text','generation_text_sha256','review_request_text','review_request_sha256','review_response_text','review_response_sha256','review','correction'],'companion_attempt');
   need(a.attempt===i+1&&hex(a.raw_sha256,64)&&a.generation_text_sha256===sha256(a.generation_text)&&a.review_request_text===p.review_prompt&&a.review_request_sha256===p.review_prompt_sha256,'companion_prompt_binding');
   if(i===0)need(a.generation_text===p.prompt&&a.correction===null,'initial_prompt_exact');
   else {const correction=compileRecipeCorrection(s,prior);need(same(a.correction,correction)&&a.generation_text===correction.text,'correction_exact');}
   need(a.review_response_sha256===sha256(a.review_response_text)&&same(a.review,bindRecipeReview(s,a.review_response_text,{finalSha256:a.review.final_sha256,contextId:canonicalReview.reviewer_identity,reviewedAt:a.review.reviewed_at})),'companion_observed_response');
   const result=validateRecipeReview(s,a.review,{finalSha256:a.review.final_sha256,contextId:canonicalReview.reviewer_identity});
   need(result===(i===row.attempts.length-1?'PASS':'FAIL'),'companion_attempt_result');
   need(session.attempts[i]?.raw_sha256===a.raw_sha256,'companion_runtime_raw');
   need(session.attempts[i].generation_prompt_sha256===a.generation_text_sha256&&session.attempts[i].review_request_sha256===a.review_request_sha256&&session.attempts[i].review_response_sha256===a.review_response_sha256&&session.attempts[i].reviewed_at===a.review.reviewed_at,'companion_runtime_text_binding');
   prior=a.review;
  }
  need(prior.final_sha256===canonicalReview.final_sha256,'companion_canonical_bytes');
 }
}

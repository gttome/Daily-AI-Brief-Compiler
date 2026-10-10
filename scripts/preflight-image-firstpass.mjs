// I5: future image-specific first-pass specifications; historic PNGs untouched.
// A structured source proof is necessary but not proof that pixels look correct.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readImageProcessVersions} from './image-process-versions.mjs';
const fail=s=>{throw Error('image_firstpass_quality:'+s);};
const forbidden=/\b(?:lorem ipsum|placeholder text|pseudo[- ]?writing|fake microtext|fill in later|draft label)\b/i;
const clean=s=>typeof s==='string'&&s.trim().length>=3&&!forbidden.test(s);
const oneOf=(value,allowed)=>allowed.includes(value);
export const MANDATORY_FLOOR=Object.freeze({
  image_format:'PNG',width:1200,height:630,readable_explanatory_text:true,
  exact_saved_pixel_review:true,source_faithful_mechanism:true,
  no_unsupported_causal_claims:true,no_low_quality_fallback:true,
  corrections_until_pass:true,accepted_images_immutable:true
});
export function validateFrozenImageSpecification({spec,story}){
 if(spec?.schema_version!=='external-image-firstpass-freeze-v1'||!story||
   spec.story_id!==story.story_id||spec.source_url!==story.primary_source?.url||
   story.primary_source?.verified_read_evidence?.status!=='verified'||
   story.primary_source.verified_read_evidence.full_source_read!==true||
   !clean(spec.visual_thesis)||!clean(spec.mechanism_metaphor)||
   !Array.isArray(spec.story_anchors)||spec.story_anchors.length<2||spec.story_anchors.length>3||
   spec.story_anchors.some(s=>!clean(s))||
   !Array.isArray(spec.required_labels)||spec.required_labels.length<3||
   spec.required_labels.some(s=>!clean(s))||
   new Set(spec.required_labels).size!==spec.required_labels.length||
   !Array.isArray(spec.source_claim_map)||spec.source_claim_map.length<2||
   !Array.isArray(spec.allowed_causal_edges)||spec.allowed_causal_edges.length<1||
   !Array.isArray(spec.excluded_claims)||spec.excluded_claims.length<1||
   spec.excluded_claims.some(s=>!clean(s))||
   !spec.composition_signature||Object.values(spec.composition_signature).some(s=>!clean(s))||
   !spec.quality_review_plan||spec.quality_review_plan.explanatory_components<12||
   spec.quality_review_plan.major_regions<3||spec.quality_review_plan.major_regions>5||
   spec.quality_review_plan.dominant_internal_substages<2||
   spec.quality_review_plan.secondary_supported_links<2)
   fail('missing_structural_or_source_faithful_spec:'+spec?.story_id);
 const claims=new Map();
 for(const claim of spec.source_claim_map){
   if(!clean(claim.id)||claims.has(claim.id)||!clean(claim.proposition)||
     !clean(claim.supporting_source_excerpt)||claim.source_url!==spec.source_url||
     !oneOf(claim.evidence_kind,['primary_source_fact','explicitly_approved_conceptual_metaphor']))
     fail('unfrozen_source_claim_or_duplicate:'+spec.story_id);
   claims.set(claim.id,claim);
 }
 for(const edge of spec.allowed_causal_edges){
   if(!clean(edge.from)||!clean(edge.to)||edge.from===edge.to||
     !claims.has(edge.support_claim_id)||!oneOf(edge.direction,['forward','conditional','feedback_verified'])||
     edge.relation_supported_by_semantic_review!==true)
     fail('unsupported_causal_edge:'+spec.story_id);
 }
 const review=spec.editorial_semantic_review;
 if(review?.result!=='PASS'||!oneOf(review.method,['human_primary_source_review','semantic_primary_source_review'])||
   !clean(review.reviewer)||review.source_url!==spec.source_url||
   review.labels_verified!==true||review.causal_edges_verified!==true||
   review.unsupported_claims_excluded!==true||review.approved_before_generation!==true)
   fail('independent_semantic_review_not_proven:'+spec.story_id);
 return {story_id:spec.story_id,result:'FROZEN_PREGENERATION_SPEC_PASS',
   required_labels:spec.required_labels.length,
   allowed_edges:spec.allowed_causal_edges.length,
   textual_review_only_not_saved_pixel_acceptance:true};
}
export function verifySixFrozenImageSpecifications({job,specifications}){
 if(job?.schema_version!=='external-compiler-image-job-v1'||job.stories?.length!==6||
   !Array.isArray(specifications)||specifications.length!==6)fail('exact_six_story_assignments');
 const sources=new Map(job.stories.map(s=>[s.story_id,s]));
 const done=new Set(),grammars=new Map(),metaphors=new Set(),annotations=new Set(),results=[];
 for(const s of specifications){
   if(!sources.has(s.story_id)||done.has(s.story_id))fail('duplicate_or_wrong_story');
   done.add(s.story_id);
   results.push(validateFrozenImageSpecification({spec:s,story:sources.get(s.story_id)}));
   const comp=s.composition_signature;
   grammars.set(comp.grammar,(grammars.get(comp.grammar)||0)+1);
   metaphors.add(comp.metaphor);
   annotations.add(comp.annotation);
 }
 if(done.size!==6||grammars.size<4||metaphors.size<4||annotations.size<3||
   Math.max(...grammars.values())>2)fail('six_set_visual_convergence');
 return {schema_version:'external-image-firstpass-set-v1',
   result:'SIX_FROZEN_SPECS_READY_FOR_GENERATION',
   stories:results,unique_mechanism_grammars:grammars.size,
   unique_metaphors:metaphors.size,unique_annotation_patterns:annotations.size,
   saved_pixel_review_still_required:true,quality_attempt_limit:null};
}
export function routeImageCorrection({candidate,defects,transportFailure=false}){
 if(candidate?.accepted_locked===true){
   if(transportFailure||defects?.length===0)
     return {action:'REUSE_IDENTICAL_ACCEPTED_BYTES',sha256:candidate.sha256,regeneration_allowed:false};
   return {action:'SEPARATE_VERSIONED_CORRECTION_REQUIRED',sha256:candidate.sha256,
     accepted_predecessor_preserved:true,regeneration_allowed:false};
 }
 if(transportFailure)return {action:'RETRY_TRANSPORT_SAME_BYTES',regeneration_allowed:false};
 if(!Array.isArray(defects)||!defects.length)return {action:'VERIFY_SAVED_PIXELS_BEFORE_ACCEPTANCE',regeneration_allowed:false};
 const allowed=new Set(['pseudotext','wrong_relation','unsupported_claim','mobile_legibility','generic_layout',
   'clipping','wrong_source_metric','reversed_gate','alt_text','six_set_similarity']);
 if(defects.some(d=>!allowed.has(d.category)||!clean(d.region||'')||!clean(d.evidence||'')))
   fail('unclassified_quality_defect');
 return {action:'REPAIR_FAILED_REGION_AND_REVIEW_UNTIL_PASS',regions:[...new Set(defects.map(d=>d.region))],
   preserve_passing_features:true,quality_attempt_limit:null,regeneration_allowed:true};
}
async function main(){
 const [jobFile,specFile,outputFile]=process.argv.slice(2);
 if(!outputFile)fail('usage: node scripts/preflight-image-firstpass.mjs <job> <six-frozen-specs> <output>');
 if(readImageProcessVersions().image_additional_first_pass_qc!=='enriched_v1'){
   console.log(JSON.stringify({result:'BASELINE_PREGENERATION_QC_SELECTED'}));return;
 }
 const status=verifySixFrozenImageSpecifications({job:JSON.parse(fs.readFileSync(jobFile)),
   specifications:JSON.parse(fs.readFileSync(specFile))});
 fs.mkdirSync(path.dirname(outputFile),{recursive:true});
 fs.writeFileSync(outputFile,JSON.stringify(status,null,2)+'\n');
 console.log(JSON.stringify(status));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();

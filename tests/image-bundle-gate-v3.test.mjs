import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import {canonicalSha} from '../image-capsules/util.mjs';
import {sealPacket} from '../image-capsules/packet.mjs';
import {compileGeneratorPrompt} from '../image-capsules/prompt.mjs';
import {buildRawReceipt} from '../image-capsules/persistence.mjs';
import {buildFinalReceipt} from '../image-capsules/normalize.mjs';
import {structuralGate} from '../image-capsules/structural-gate.mjs';
import {BASIC_GATES,BENCHMARK_DIMENSIONS} from '../image-capsules/review-contract.mjs';
import {observedSetGate,buildAtomicAcceptance} from '../image-capsules/set-review.mjs';
import {validateD0BundleImages} from '../image-capsules/bundle-gate.mjs';

const gate=()=>({verdict:'PASS',observation:'Concrete visible evidence is present.'});
const write=(root,p,obj)=>{const f=path.join(root,p);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,Buffer.isBuffer(obj)||typeof obj==='string'?obj:JSON.stringify(obj,null,2)+'\n');};

async function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'d0-bundle-')),date='2026-10-08';
  const setPlan={schema_version:'daily-compiler-image-set-plan-v3',edition_date:date,stories:Array.from({length:6},(_,i)=>({story_id:'s'+i,composition_signature:'c'+i,layout_signature:'l'+(i%4),diagram_grammar:'g'+(i%4),hierarchy_signature:'h'+(i%4),annotation_pattern_signature:'a'+(i%3),reading_path:'r'+i,prohibited_patterns:[]})),planned_set_gate:{unique_composition_signatures:6,distinct_layout_signatures_min:4,distinct_diagram_grammars_min:4,distinct_hierarchy_signatures_min:4,distinct_annotation_patterns_min:3}};
  const setPlanSha=canonicalSha(setPlan),setPlanPath='shadow-runs/'+date+'/images/set-plan.json'; write(root,setPlanPath,setPlan);
  const items=[],bundleImages=[],setCandidates=[];
  for(let i=0;i<6;i++){
    const story='s'+i,attempt=1,candidate=story+'-a01',base='shadow-runs/'+date+'/images/attempts/'+story+'/a01/';
    const assignment={...setPlan.stories[i]}; delete assignment.story_id;
    const packet=sealPacket({schema_version:'daily-compiler-image-packet-v3',envelope:{edition_date:date,story_id:story,candidate_id:candidate,story_content_sha256:String(i+1).repeat(64).slice(0,64),set_plan_sha256:setPlanSha,packet_sha256:'0'.repeat(64)},generation:{subject:'Story '+i,core_mechanism:'Evidence moves through a bounded mechanism to a verified result.',verified_visual_facts:['Verified fact '+i],conceptual_elements:['evidence token','verification gate'],meaningful_components_plan:Array.from({length:8},(_,j)=>({component_id:'m'+j,description:'Visible component '+j,support:j===0?'verified_fact':'approved_concept',required:true})),composition_assignment:assignment,visible_text_allowlist:['Input','Verify','Result'],prohibited_specifics:['brand logo'],prohibited_composition_patterns:['generic dashboard'],reference_policy:'No reference images',wrong_subject_action:'discard_and_generate_fresh',render_contract:{canvas_target:'1200x630',background:'white_or_near_white',style:'professional_high_detail_textbook_editorial_mechanism',minimum_meaningful_components:8,people:'prohibited',humanoids:'prohibited',branding:'prohibited',photorealism:'prohibited',generic_ai_imagery:'prohibited',decorative_filler:'prohibited',unsupported_specifics:'prohibited',visible_text_policy:'exact_allowlist_only',low_quality_fallback:false}},review:{benchmark_profile:'sep09-sep10-premium3-v1',minimum_meaningful_components:8,generic_or_sparse_must_be:false,decorative_only_must_be:false}});
    const packetPath=base+'packet.json'; write(root,packetPath,packet);
    const prompt=compileGeneratorPrompt(packet);
    const admission={schema_version:'daily-compiler-image-capsule-admission-v1',edition_date:date,execution_id:'e1',story_id:story,attempt,invocation_id:'i'+i,context_id:'ctx'+i,context_origin:'fresh_story_only_invocation',fresh_context:true,dedicated_story_only_context:true,orchestration_context_visible:false,includes_other_stories:false,conversation_images_visible:false,referenced_images:[],submitted_instruction_sha256:prompt.prompt_sha256,expected_instruction_sha256:prompt.prompt_sha256,submitted_instruction_equals_expected:true,same_invocation_capture_required:true,owner_intervention_required:false,work_used:false,codex_used:false,paid_model_api_used:false,proof:{method:'platform_fresh_capsule_boundary',generator_visible_context_sha256:prompt.projection_sha256,outer_context_probe_id:'probe'+i,outer_context_visible_to_generator:false,other_story_material_visible:false,prior_image_material_visible:false,evidence_ref:'proof/p0-a-'+i+'.json'},generation_authorized:true};
    const admissionPath=base+'admission.json'; write(root,admissionPath,admission);
    const raw=await sharp({create:{width:1600,height:900,channels:3,background:{r:240-i,g:245,b:250}}}).png().toBuffer();
    const rawPath=base+'raw.png',rawReceipt=buildRawReceipt({editionDate:date,storyId:story,candidateId:candidate,attempt,path:rawPath,bytes:raw,invocationId:'i'+i,contextId:'ctx'+i,readBackVerified:true});
    const rawReceiptPath=base+'raw-receipt.json'; write(root,rawPath,raw); write(root,rawReceiptPath,rawReceipt);
    const final=await sharp(raw).resize(1200,630,{fit:'contain',background:'#ffffff'}).png({compressionLevel:9,adaptiveFiltering:false,palette:false}).toBuffer();
    const finalReceipt=buildFinalReceipt({rawReceipt,finalBytes:final,finalPath:base+'final.png'}),finalPath=finalReceipt.final.path,finalReceiptPath=base+'final-receipt.json';
    write(root,finalPath,final); write(root,finalReceiptPath,finalReceipt);
    const structural=structuralGate({finalBytes:final,finalReceipt,expectedStoryId:story,expectedCandidateId:candidate,expectedAttempt:attempt}),structuralPath=base+'structural-gate.json'; write(root,structuralPath,structural);
    const review={schema_version:'daily-compiler-image-review-v3',story_id:story,attempt,final_path:finalPath,final_sha256:finalReceipt.final.sha256,final_git_blob_sha:finalReceipt.final.git_blob_sha,packet_sha256:packet.envelope.packet_sha256,prompt_sha256:prompt.prompt_sha256,reviewed_at:'2026-10-08T00:00:00Z',reviewer_identity:'review-'+i,basic_gates:Object.fromEntries(BASIC_GATES.map(x=>[x,gate()])),visible_text:{result:'PASS',required_labels:['Input','Verify','Result'],observed_required_labels:['Input','Verify','Result'],missing_labels:[],extra_visible_text:[]},meaningful_components:Array.from({length:8},(_,j)=>'Visible component '+j),benchmark_dimensions:Object.fromEntries(BENCHMARK_DIMENSIONS.map(x=>[x,gate()])),generic_or_sparse:false,decorative_only:false,result:'PASS'};
    const reviewPath=base+'review.json'; write(root,reviewPath,review);
    const assetVersion='v2',cacheKey='d0-'+i;
    items.push({story_id:story,final_path:finalPath,final_sha256:finalReceipt.final.sha256,git_blob_sha:finalReceipt.final.git_blob_sha,asset_version:assetVersion,cache_key:cacheKey,supersedes:null,review,review_context:{packet,finalReceipt}});
    bundleImages.push({story_id:story,path:finalPath,sha256:finalReceipt.final.sha256,git_blob_sha:finalReceipt.final.git_blob_sha,accepted:true,accepted_locked:true,image_system:'d0_native_image_capsules',asset_version:assetVersion,cache_key:cacheKey,supersedes:null,packet_path:packetPath,packet_sha256:packet.envelope.packet_sha256,admission_path:admissionPath,admission_sha256:canonicalSha(admission),raw_receipt_path:rawReceiptPath,raw_receipt_sha256:canonicalSha(rawReceipt),final_receipt_path:finalReceiptPath,final_receipt_sha256:canonicalSha(finalReceipt),structural_gate_path:structuralPath,structural_gate_sha256:canonicalSha(structural),visual_review_path:reviewPath,visual_review_sha256:canonicalSha(review),set_review_sha256:''});
    setCandidates.push({story_id:story,final_sha256:finalReceipt.final.sha256,composition_signature:assignment.composition_signature,layout_signature:assignment.layout_signature,diagram_grammar:assignment.diagram_grammar,hierarchy_signature:assignment.hierarchy_signature,annotation_pattern_signature:assignment.annotation_pattern_signature});
  }
  const setReview={schema_version:'daily-compiler-image-set-review-v3',edition_date:date,candidates:setCandidates,observed_gate:observedSetGate(setCandidates),no_labels_swapped_template:true,no_repeated_dominant_template:true,intentionally_curated:true,all_individually_benchmark_grade:true,result:'PASS',reviewed_at:'2026-10-08T00:10:00Z'};
  const setReviewSha=canonicalSha(setReview),setReviewPath='shadow-runs/'+date+'/images/set-review.json'; write(root,setReviewPath,setReview);
  for(const image of bundleImages) image.set_review_sha256=setReviewSha;
  const acceptance=buildAtomicAcceptance({editionDate:date,items,setReview}),acceptancePath='shadow-runs/'+date+'/images/acceptance.json'; write(root,acceptancePath,acceptance);
  const bundle={image_system:{strategy:'d0_native_image_capsules',contract_version:'daily-compiler-image-contract-v3',set_plan_path:setPlanPath,set_plan_sha256:setPlanSha,set_review_path:setReviewPath,set_review_sha256:setReviewSha,acceptance_path:acceptancePath,acceptance_sha256:canonicalSha(acceptance)},images:bundleImages};
  return {root,bundle};
}
test('D0 BUNDLE_READY image gate passes only complete exact accepted evidence',async()=>{
  const {root,bundle}=await fixture(); const r=validateD0BundleImages({bundle,repoRoot:root}); assert.equal(r.result,'PASS',r.errors.join('\n')); assert.equal(r.evidence.length,6);
});
test('D0 BUNDLE_READY image gate fails closed on incomplete or mismatched evidence',async()=>{
  const {root,bundle}=await fixture();
  const five=structuredClone(bundle); five.images.pop(); assert.equal(validateD0BundleImages({bundle:five,repoRoot:root}).result,'FAIL');
  const unlocked=structuredClone(bundle); unlocked.images[0].accepted_locked=false; assert.equal(validateD0BundleImages({bundle:unlocked,repoRoot:root}).result,'FAIL');
  const mismatch=structuredClone(bundle); mismatch.images[0].visual_review_sha256='f'.repeat(64); assert.equal(validateD0BundleImages({bundle:mismatch,repoRoot:root}).result,'FAIL');
  const setFail=structuredClone(bundle); setFail.image_system.set_review_sha256='e'.repeat(64); assert.equal(validateD0BundleImages({bundle:setFail,repoRoot:root}).result,'FAIL');
});

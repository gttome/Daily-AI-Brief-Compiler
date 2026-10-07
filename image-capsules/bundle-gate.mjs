import fs from 'node:fs';
import path from 'node:path';
import {canonicalSha,sha256} from './util.mjs';
import {assertSetPlan} from './set-plan.mjs';
import {assertPacket} from './packet.mjs';
import {compileGeneratorPrompt} from './prompt.mjs';
import {validateAdmission} from './admission.mjs';
import {validateRawReceipt} from './persistence.mjs';
import {structuralGate} from './structural-gate.mjs';
import {validateVisualReview} from './review-contract.mjs';
import {validateSetReview} from './set-review.mjs';

const D0='d0_native_image_capsules';
const safeRel=p=>typeof p==='string'&&p.length>0&&!path.isAbsolute(p)&&!p.includes('\\')&&!p.split('/').some(x=>x==='..'||x==='.'||x==='');
function full(root,p){if(!safeRel(p))throw new Error('unsafe_evidence_path:'+String(p)); return path.resolve(root,p);}
function readJson(root,p){return JSON.parse(fs.readFileSync(full(root,p),'utf8'));}
function readBytes(root,p){return fs.readFileSync(full(root,p));}
function same(a,b){return JSON.stringify(a??null)===JSON.stringify(b??null);}

export function validateD0BundleImages({bundle,repoRoot='.'}){
  const errors=[],evidence=[];
  const sys=bundle?.image_system||{};
  if(sys.strategy!==D0) return {result:'NOT_D0',errors:[],evidence:[]};
  if(sys.contract_version!=='daily-compiler-image-contract-v3') errors.push('d0_contract_version');
  for(const f of ['set_plan_path','set_plan_sha256','set_review_path','set_review_sha256','acceptance_path','acceptance_sha256']){
    if(typeof sys[f]!=='string'||!sys[f]) errors.push('image_system_'+f);
  }
  if(!Array.isArray(bundle?.images)||bundle.images.length!==6) errors.push('d0_exactly_six_images');
  if(errors.length) return {result:'FAIL',errors:[...new Set(errors)],evidence};

  let setPlan,setReview,acceptance;
  try{
    setPlan=readJson(repoRoot,sys.set_plan_path);
    const plan=assertSetPlan(setPlan);
    if(plan.plan_sha256!==sys.set_plan_sha256) errors.push('set_plan_digest_mismatch');
  }catch(err){errors.push('set_plan_invalid:'+err.message);}
  try{
    setReview=readJson(repoRoot,sys.set_review_path);
    const setErrors=validateSetReview(setReview);
    if(setErrors.length) errors.push(...setErrors.map(x=>'set_review:'+x));
    if(canonicalSha(setReview)!==sys.set_review_sha256) errors.push('set_review_digest_mismatch');
    if(setReview.result!=='PASS') errors.push('set_review_not_pass');
  }catch(err){errors.push('set_review_invalid:'+err.message);}
  try{
    acceptance=readJson(repoRoot,sys.acceptance_path);
    if(acceptance?.schema_version!=='daily-compiler-image-acceptance-v3'||acceptance?.accepted_locked!==true||!Array.isArray(acceptance?.images)||acceptance.images.length!==6) errors.push('acceptance_record_invalid');
    if(canonicalSha(acceptance)!==sys.acceptance_sha256) errors.push('acceptance_digest_mismatch');
    if(acceptance?.set_review_sha256!==sys.set_review_sha256) errors.push('acceptance_set_review_mismatch');
  }catch(err){errors.push('acceptance_invalid:'+err.message);}

  const storyIds=new Set(),hashes=new Set();
  for(const image of bundle.images||[]){
    const story=image?.story_id;
    if(typeof story!=='string'||!story){errors.push('d0_story_id');continue;}
    if(storyIds.has(story)) errors.push('d0_duplicate_story:'+story);
    storyIds.add(story);
    if(image.image_system!==D0||image.accepted!==true||image.accepted_locked!==true) errors.push('d0_image_not_locked:'+story);
    for(const f of ['path','sha256','git_blob_sha','asset_version','cache_key','packet_path','packet_sha256','admission_path','admission_sha256','raw_receipt_path','raw_receipt_sha256','final_receipt_path','final_receipt_sha256','structural_gate_path','structural_gate_sha256','visual_review_path','visual_review_sha256','set_review_sha256']){
      if(typeof image[f]!=='string'||!image[f]) errors.push('d0_image_field_missing:'+story+':'+f);
    }
    if(image.set_review_sha256!==sys.set_review_sha256) errors.push('d0_image_set_review_mismatch:'+story);
    if(typeof image.sha256==='string') hashes.add(image.sha256);

    try{
      const packet=readJson(repoRoot,image.packet_path);
      assertPacket(packet,{setPlan});
      if(packet.envelope.packet_sha256!==image.packet_sha256) errors.push('packet_digest_mismatch:'+story);
      const compiled=compileGeneratorPrompt(packet);

      const admission=readJson(repoRoot,image.admission_path);
      const admErrors=validateAdmission(admission,{packet});
      if(admErrors.length) errors.push(...admErrors.map(x=>'admission:'+story+':'+x));
      if(canonicalSha(admission)!==image.admission_sha256) errors.push('admission_digest_mismatch:'+story);

      const rawReceipt=readJson(repoRoot,image.raw_receipt_path),rawBytes=readBytes(repoRoot,rawReceipt.path);
      const rawErrors=validateRawReceipt(rawReceipt,{bytes:rawBytes});
      if(rawErrors.length) errors.push(...rawErrors.map(x=>'raw:'+story+':'+x));
      if(canonicalSha(rawReceipt)!==image.raw_receipt_sha256) errors.push('raw_receipt_digest_mismatch:'+story);
      if(rawReceipt.same_invocation_capture!==true) errors.push('same_invocation_capture_missing:'+story);

      const finalReceipt=readJson(repoRoot,image.final_receipt_path),finalBytes=readBytes(repoRoot,image.path);
      if(canonicalSha(finalReceipt)!==image.final_receipt_sha256) errors.push('final_receipt_digest_mismatch:'+story);
      if(finalReceipt.final?.path!==image.path||finalReceipt.final?.sha256!==image.sha256||finalReceipt.final?.git_blob_sha!==image.git_blob_sha) errors.push('final_bundle_identity_mismatch:'+story);
      const structural=structuralGate({finalBytes,finalReceipt,expectedStoryId:story,expectedCandidateId:packet.envelope.candidate_id,expectedAttempt:admission.attempt});
      if(structural.result!=='PASS') errors.push(...structural.errors.map(x=>'structural:'+story+':'+x));

      const structuralSaved=readJson(repoRoot,image.structural_gate_path);
      if(canonicalSha(structuralSaved)!==image.structural_gate_sha256||structuralSaved.result!=='PASS'||structuralSaved.sha256!==image.sha256||structuralSaved.git_blob_sha!==image.git_blob_sha) errors.push('structural_receipt_mismatch:'+story);

      const review=readJson(repoRoot,image.visual_review_path);
      const reviewErrors=validateVisualReview(review,{packet,finalReceipt});
      if(reviewErrors.length) errors.push(...reviewErrors.map(x=>'review:'+story+':'+x));
      if(review.prompt_sha256!==compiled.prompt_sha256) errors.push('review_prompt_digest_mismatch:'+story);
      if(canonicalSha(review)!==image.visual_review_sha256) errors.push('review_digest_mismatch:'+story);

      const setCandidate=setReview?.candidates?.find(x=>x.story_id===story);
      const assignment=packet.generation?.composition_assignment||{};
      if(!setCandidate||setCandidate.final_sha256!==image.sha256||
        setCandidate.composition_signature!==assignment.composition_signature||
        setCandidate.layout_signature!==assignment.layout_signature||
        setCandidate.diagram_grammar!==assignment.diagram_grammar||
        setCandidate.hierarchy_signature!==assignment.hierarchy_signature||
        setCandidate.annotation_pattern_signature!==assignment.annotation_pattern_signature) errors.push('set_candidate_binding:'+story);

      const accepted=acceptance?.images?.find(x=>x.story_id===story);
      if(!accepted||accepted.final_path!==image.path||accepted.sha256!==image.sha256||accepted.git_blob_sha!==image.git_blob_sha||
        accepted.asset_version!==image.asset_version||accepted.cache_key!==image.cache_key||accepted.review_sha256!==image.visual_review_sha256||
        !same(accepted.supersedes,image.supersedes)) errors.push('acceptance_binding:'+story);

      if(sha256(finalBytes)!==image.sha256) errors.push('final_sha256_mismatch:'+story);
      evidence.push({story_id:story,path:image.path,sha256:image.sha256,git_blob_sha:image.git_blob_sha,asset_version:image.asset_version});
    }catch(err){errors.push('d0_evidence_unreadable:'+story+':'+err.message);}
  }
  if(storyIds.size!==6) errors.push('d0_unique_story_count');
  if(hashes.size!==6) errors.push('d0_unique_byte_streams');
  return {result:errors.length?'FAIL':'PASS',errors:[...new Set(errors)],evidence};
}

export function assertD0BundleImages(opts){
  const r=validateD0BundleImages(opts);
  if(r.result!=='PASS') throw new Error('D0 image bundle gate failed: '+r.errors.join(';'));
  return r;
}

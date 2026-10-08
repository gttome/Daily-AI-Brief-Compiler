// TEST_ONLY: frozen synthetic source/media/review records and the six saved test
// PNG byte streams from the existing D1 qualification fixture. This exercises
// deterministic product gates; it is not a real editorial selection, native
// image generation, pixel review, external execution, deployment or activation.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {refreshSyntheticReview,syntheticRecipeReview,syntheticResponse} from './d1-recipe-v2.mjs';
import {validateRecipeStory,compileRecipeProjections} from '../../image-studio/specification-projection.mjs';
import {makeD1QualificationFixture} from './d1-qualification.mjs';
import {makeMediaFixture,makeMediaEvidence} from './media.mjs';
import {applyD1Activation} from '../../image-studio/activation-apply.mjs';
import {D1_STRATEGY,D1_CONTRACT} from '../../image-studio/activation.mjs';
import {canonicalSha,sha256,gitBlobSha} from '../../image-capsules/util.mjs';
import {sealD1Specifications,admitD1Specifications,compileD1StoryPrompt} from '../../image-studio/spec-admission.mjs';

export function makeProductReleaseFixture(options={}){
  const root=typeof options==='string'?options:(options.root||fs.mkdtempSync(path.join(os.tmpdir(),'TEST_ONLY-product-release-')));
  const qualification=makeD1QualificationFixture({root,recipeV2:options.recipeV2===true});
  // Activation exists only inside this throwaway test tree. Never use this
  // fixture receipt to qualify, approve or activate the real image runtime.
  applyD1Activation({repoRoot:root,proofPath:qualification.proofPath,activatedAt:'2026-10-08T03:00:00Z'});
  const media=makeMediaFixture(),{bundle,state}=media;
  const {request,manifest:proofManifest,handoff:proofHandoff,porter:proofPorter,canonical_reviews:proofReviews}=qualification.data;
  const date=request.edition_date,runRelative='shadow-runs/'+date,run=path.join(root,runRelative);
  const idMap=new Map(bundle.stories.map((story,index)=>[story.id,request.stories[index].story_id]));
  for(const story of bundle.stories){
    const original=story.id;story.id=idMap.get(original);
    story.permanent_route='/stories/'+date+'/'+story.id+'/';
  }
  for(const mapping of bundle.book_mappings)mapping.story_id=idMap.get(mapping.story_id)||mapping.story_id;
  for(const item of [...bundle.videos,...bundle.podcasts])item.related_story_ids=item.related_story_ids.map(id=>idMap.get(id)||id);
  bundle.edition_date=date;
  state.edition_date=date;state.execution_id='TEST_ONLY-product-release';state.branch='shadow/'+date;
  state.state='BUNDLE_READY';state.stage='BUNDLE';state.research_cutoff_at=bundle.research_cutoff_at;

  const manifest=structuredClone(proofManifest);
  manifest.studio_session_id='TEST_ONLY-product-release-coordinator';
  const handoff=structuredClone(proofHandoff);
  handoff.edition_date=date;handoff.execution_id=state.execution_id;handoff.branch=state.branch;
  handoff.items=manifest.images.map(image=>({story_id:image.story_id,filename:image.filename,target_path:runRelative+'/images/'+image.filename}));
  const porter=structuredClone(proofPorter);
  for(const item of porter.images){item.target_path=handoff.items.find(row=>row.story_id===item.story_id).target_path;}
  const paths={manifest:runRelative+'/images/acceptance-manifest.json',handoff:runRelative+'/images/ingest-handoff.json',porter:runRelative+'/images/porter-receipt.json',reviews:runRelative+'/images/canonical-reviews.json',request:runRelative+'/images/sealed-request.json',source_evidence:runRelative+'/images/source-evidence.json',admission:runRelative+'/images/admission.json'};
  const supplied=structuredClone(request),sourceEvidence=structuredClone(qualification.data.source_evidence);
  supplied.execution_id=state.execution_id;supplied.request_id='TEST_ONLY-product-release-daily';sourceEvidence.execution_id=state.execution_id;
  for(const specification of supplied.stories){
    const story=bundle.stories.find(row=>row.id===specification.story_id);
    const source=sourceEvidence.stories.find(row=>row.story_id===specification.story_id);
    specification.story_content_sha256=canonicalSha(story);source.story_content_sha256=specification.story_content_sha256;source.source_url=story.source.url;
    if(options.recipeV2===true)refreshSyntheticReview(specification,source);
  }
  const dailyRequest=sealD1Specifications(supplied,sourceEvidence),admission=admitD1Specifications(dailyRequest,sourceEvidence);
  const reviewImages=structuredClone(proofReviews.images),observations=structuredClone(proofReviews.observations);
  const sessions=structuredClone(qualification.data.runtime.sessions);
  for(const review of reviewImages){
    const specification=dailyRequest.stories.find(row=>row.story_id===review.story_id);
    const session=sessions.find(row=>row.story_id===review.story_id);
    review.final_path=handoff.items.find(row=>row.story_id===review.story_id).target_path;
    review.packet_sha256=specification.specification_sha256;
    review.prompt_sha256=compileD1StoryPrompt(dailyRequest,sourceEvidence,review.story_id).prompt_sha256;
    session.prompt_sha256=review.prompt_sha256;
    observations.find(row=>row.story_id===review.story_id).review_sha256=canonicalSha(review);
  }
  const binaryReadback=structuredClone(qualification.data.binary_readback);binaryReadback.proof_id=state.execution_id;
  for(const row of binaryReadback.images){
    row.canonical.path=handoff.items.find(image=>image.story_id===row.story_id).target_path;
    row.url='https://raw.githubusercontent.com/gttome/Daily-AI-Brief-Compiler/'+binaryReadback.commit+'/'+row.canonical.path;
  }
  const reviews={schema_version:'daily-compiler-d1-canonical-reviews-v1',edition_date:date,execution_id:state.execution_id,contract_version:D1_CONTRACT,manifest_sha256:canonicalSha(manifest),
    request:{path:paths.request,sha256:canonicalSha(dailyRequest)},source_evidence:{path:paths.source_evidence,sha256:canonicalSha(sourceEvidence)},admission:{path:paths.admission,sha256:canonicalSha(admission)},
    images:reviewImages,observations,set_review:structuredClone(qualification.data.set_review),binary_readback:binaryReadback,sessions};
  if(options.recipeV2===true)reviews.recipe_reviews=dailyRequest.stories.map((specification,i)=>{
    const projection=compileRecipeProjections(specification),review=reviewImages[i],session=sessions[i];
    return {...validateRecipeStory(specification,sourceEvidence.stories[i]),specification_sha256:specification.specification_sha256,attempts:[{attempt:1,raw_sha256:session.attempts[0].raw_sha256,generation_text:projection.prompt,generation_text_sha256:projection.prompt_sha256,review_request_text:projection.review_prompt,review_request_sha256:projection.review_prompt_sha256,review:syntheticRecipeReview(specification,{sha:review.final_sha256,context:review.reviewer_identity,at:review.reviewed_at}),correction:null}]};
  });
  if(options.recipeV2===true)for(const row of reviews.recipe_reviews)for(const attempt of row.attempts){attempt.review_response_text=syntheticResponse(attempt.review);attempt.review_response_sha256=sha256(attempt.review_response_text);}
  if(options.recipeV2===true)for(const row of reviews.recipe_reviews)for(const [i,attempt] of row.attempts.entries())Object.assign(sessions.find(s=>s.story_id===row.story_id).attempts[i],{generation_prompt_sha256:attempt.generation_text_sha256,review_request_sha256:attempt.review_request_sha256,review_response_sha256:attempt.review_response_sha256});
  const write=(relative,value)=>{
    const file=path.join(root,relative);fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,Buffer.isBuffer(value)?value:JSON.stringify(value,null,2)+'\n');
  };
  bundle.image_system={strategy:D1_STRATEGY,contract_version:D1_CONTRACT,acceptance_manifest_path:paths.manifest,ingest_handoff_path:paths.handoff,work_porter_receipt_path:paths.porter,canonical_reviews_path:paths.reviews};
  bundle.images=manifest.images.map((image,index)=>{
    const bytes=fs.readFileSync(path.join(root,proofHandoff.items[index].target_path));
    const imagePath=handoff.items[index].target_path;write(imagePath,bytes);
    return {story_id:image.story_id,path:imagePath,sha256:sha256(bytes),git_blob_sha:gitBlobSha(bytes),accepted:true,accepted_locked:true,image_system:D1_STRATEGY,asset_version:'TEST_ONLY-d1-v2',cache_key:'TEST_ONLY-'+image.story_id,supersedes:null};
  });
  state.images={required:6,accepted:bundle.images.map(image=>image.story_id),strategy:D1_STRATEGY,phase:'GITHUB_VERIFIED'};
  bundle.producer_receipt={...bundle.producer_receipt,result:'PASS',owner_intervention:false,codex_used:false,paid_model_api_used:false,work_used:true,work_scope:'IMAGE_BROWSER_ORCHESTRATION_AND_INGEST',work_image_generation:false,local_computer_used:false,accepted_image_regenerations:0};
  const statePath=path.join(run,'compiler-state.json'),bundlePath=path.join(run,'edition-bundle.json');
  let evidence;
  function persist({refreshMedia=true}={}){
    handoff.manifest_sha256=canonicalSha(manifest);
    porter.manifest_sha256=canonicalSha(manifest);porter.ingest_handoff_sha256=canonicalSha(handoff);
    reviews.manifest_sha256=canonicalSha(manifest);
    write(paths.request,dailyRequest);write(paths.source_evidence,sourceEvidence);write(paths.admission,admission);
    write(paths.manifest,manifest);write(paths.handoff,handoff);write(paths.porter,porter);write(paths.reviews,reviews);
    for(const [name,value] of [['acceptance_manifest',manifest],['ingest_handoff',handoff],['work_porter_receipt',porter],['canonical_reviews',reviews]])bundle.image_system[name+'_sha256']=canonicalSha(value);
    if(refreshMedia||!evidence)evidence=makeMediaEvidence(bundle);
    const evidenceBytes=JSON.stringify(evidence,null,2)+'\n';
    const evidenceFile=path.join(root,bundle.media_evidence.path);fs.mkdirSync(path.dirname(evidenceFile),{recursive:true});fs.writeFileSync(evidenceFile,evidenceBytes);
    bundle.media_evidence.sha256=sha256(evidenceBytes);
    write(runRelative+'/edition-bundle.json',bundle);state.bundle.digest=sha256(fs.readFileSync(bundlePath));
    write(runRelative+'/compiler-state.json',state);
    return api;
  }
  const api={root,repoRoot:root,run,date,state,bundle,statePath,bundlePath,qualification,manifest,handoff,porter,reviews,dailyRequest,sourceEvidence,admission,paths,get evidence(){return evidence;},persist,refresh:persist,cleanup:()=>fs.rmSync(root,{recursive:true,force:true})};
  persist();return api;
}

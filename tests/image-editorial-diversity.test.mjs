import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyEditorialDiversityEvidence} from '../operations/image-set-diversity.mjs';
const sha=i=>i.toString(16).padStart(64,'0');
function fixture(){
 const edition_date='2026-11-16';
 const images=Array.from({length:6},(_,i)=>({story_id:'story-'+i,sha256:sha(i+1),
   visual_signature:{grammar:'grammar-'+i}}));
 const stories=images.map((x,i)=>({story_id:x.story_id,sha256:x.sha256,
   visual_thesis:'Evidence-specific thesis '+i,format_family:'format-'+i,
   dominant_grammar:'grammar-'+i,medium_treatment:'medium-'+i,
   mechanism_metaphor:'metaphor-'+i,perspective:'perspective-'+i,
   information_hierarchy:'hierarchy-'+i,palette_family:'palette-'+i,
   dominant_arrangement:i===0?'input_engine_output':'object_bound_arrangement',
   observed_distinctiveness:'The saved PNG visibly presents a unique mechanism and spatial reading path for story '+i+', not a relabeled left-right template.',
   first_pass_risk_preflight:'Before generation this story checked arrow contact, labels, caveat margins and source-specific object boundaries.'}));
 const pairwise=[];
 for(let i=0;i<6;i++)for(let j=i+1;j<6;j++)pairwise.push({
   left_story_id:images[i].story_id,right_story_id:images[j].story_id,
   same_dominant_template:false,
   observed_pixel_difference:'The inspected saved images use different subject-specific dominant objects, camera perspectives and reading paths '+i+' versus '+j+'.',
   shared_traits:'Both retain white space and approved source labels.'});
 return {edition_date,images,set_review:{editorial_diversity:{
   schema_version:'external-image-editorial-diversity-v1',status:'PASS',
   method:'six_up_saved_png_pixel_comparison',source:'saved_committed_png_pixels',
   owner_acceptance_not_inferred:true,reviewer:'visual reviewer',
   reviewed_at:'2026-11-15T23:00:00Z',reviewed_sha256s:images.map(x=>x.sha256),
   contact_sheet_path:'external-image-packages/2026-11-16/reviews/six-up-contact-sheet.png',
   contact_sheet_sha256:sha(100),stories,pairwise}}};
}
test('future images require all six saved-pixel observations and 15 specific pair checks',()=>{
 const a=fixture(),r=verifyEditorialDiversityEvidence(a);
 assert.equal(r.pairwise_reviews,15);assert.equal(r.distinct_format_families,6);
 const similar=fixture();for(const row of similar.set_review.editorial_diversity.stories)row.format_family='same';
 assert.throws(()=>verifyEditorialDiversityEvidence(similar),/insufficient_observed_variety_format_family/);
 const missing=fixture();missing.set_review.editorial_diversity.pairwise.pop();
 assert.throws(()=>verifyEditorialDiversityEvidence(missing),/all_fifteen_visual_pairs_required/);
 const forged=fixture();forged.set_review.editorial_diversity.reviewed_sha256s[0]=sha(999);
 assert.throws(()=>verifyEditorialDiversityEvidence(forged),/exact_hash_bindings_required/);
 const mismatch=fixture();mismatch.set_review.editorial_diversity.stories[0].dominant_grammar='other';
 assert.throws(()=>verifyEditorialDiversityEvidence(mismatch),/manifest_visual_signature_conflicts/);
});
test('historical released packages stay unchanged and are never retroactively rejected',()=>{
 assert.equal(verifyEditorialDiversityEvidence({edition_date:'2026-11-15'}).required,false);
});

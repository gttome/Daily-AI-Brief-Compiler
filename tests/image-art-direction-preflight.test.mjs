import test from 'node:test';
import assert from 'node:assert/strict';
import {preflightDistinctArtDirections} from '../scripts/preflight-image-firstpass.mjs';
const spec=i=>({story_id:'story-'+i,composition_signature:{grammar:'grammar-'+i},
 pre_generation_checks:{editorial_style_plan:{
   format_family:'format-'+i,dominant_grammar:'grammar-'+i,
   medium_treatment:'treatment-'+i,perspective:'view-'+i,
   information_hierarchy:'hierarchy-'+i,palette_family:'palette-'+i,
   subject_specific_visual_thesis:'source-bound mechanism '+i,
   difference_from_earlier_story_images:'Uses different physical object forms, reading path and explanatory organization than the other images '+i,
   first_pass_risk_mitigation:'Inspect the actual originating and receiving arrow endpoints, text sizing, safe margins, unsupported chart marks, shared frame geometry and detached caveats before the native call '+i
 }}});
test('prospective style plan rejects repeated treatments and short first-pass review',()=>{
 const ok=Array.from({length:6},(_,i)=>spec(i));
 assert.equal(preflightDistinctArtDirections(ok,'2026-11-16').distinct_formats,6);
 const repeated=structuredClone(ok);repeated.forEach(x=>x.pre_generation_checks.editorial_style_plan.medium_treatment='same');
 assert.throws(()=>preflightDistinctArtDirections(repeated,'2026-11-16'),/repeated_pre_generation_style_medium_treatment/);
 const bad=structuredClone(ok);bad[0].pre_generation_checks.editorial_style_plan.first_pass_risk_mitigation='n/a';
 assert.throws(()=>preflightDistinctArtDirections(bad,'2026-11-16'),/missing_source_specific_style/);
 assert.equal(preflightDistinctArtDirections([], '2026-11-15').required,false);
});

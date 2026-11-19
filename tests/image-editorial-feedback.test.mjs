import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {collectImageEditorialFeedback,renderImageEditorialFeedback} from '../scripts/image-editorial-feedback.mjs';
import {collectObservations,buildMetrics,renderMetricsMarkdown} from '../scripts/aar-improvement-metrics.mjs';
const sha=n=>n.toString(16).padStart(64,'0');
const ref='https://github.com/gttome/Daily-AI-Brief-Compiler/blob/abc/review.json';
function fixture(){
 const edition='2026-11-20',images=Array.from({length:6},(_,i)=>({story_id:'story-'+i,sha256:sha(i+1)}));
 const r={schema_version:'image-editorial-quality-review-v1',edition_date:edition,
  method:'saved_png_fullsize_320_and_set_review',reviewed_at:'2026-11-20T03:50:00Z',reviewer:'Executing image reviewer',
  set_observation:'Actual saved pixels show distinct explanatory structures and deliberately different text architectures.',
  evidence_ref:ref,reference_editions:['2026-11-19'],owner_feedback:{state:'unknown'},
  stories:images.map((i,n)=>({...i,fullsize_pixels_inspected:true,mobile_320_pixels_inspected:true,
   detail_observation:'Two source-supported inner operations are visible in the saved image '+n,
   text_architecture_observation:'Labels attach directly to a section rather than repeating a raised plaque '+n,
   mobile_observation:'The dominant relationship reads at 320 pixels; finer evidence benefits from enlargement '+n,
   assessment:'inconclusive',evidence_ref:ref,
   supported_substages:[{description:'Visible source-bound input transformation',support_claim_id:'primary-1'},{description:'Visible source-bound output comparison',support_claim_id:'primary-2'}],
   secondary_relationships:[{description:'Source evidence binds to its comparison',support_claim_id:'primary-1'},{description:'A detached condition constrains interpretation',support_claim_id:'primary-2'}],
   nearest_prior:{edition_date:'2026-11-19',story_id:'earlier-'+n,asset_sha256:sha(100+n),asset_ref:ref,
    comparison_basis:'actual_saved_pixels',observed_difference:'The saved view uses a vertical section and direct annotation instead of the earlier folded ribbon and inset captions.'}}))};
 return {edition,manifest:{edition_date:edition,job_sha256:sha(99),images},aar:{edition_date:edition,job_sha256:sha(99),editorial_quality_review:r}};
}
test('missing and historical reviews never become aesthetic success or owner approval',()=>{
 assert.equal(collectImageEditorialFeedback({edition:'2026-11-19'}).status,'NOT_APPLICABLE');
 const missing=collectImageEditorialFeedback({edition:'2026-11-20'});
 assert.equal(missing.status,'NOT_RECORDED');assert.equal(missing.reviewed_stories,null);assert.equal(missing.owner_feedback,'UNKNOWN');
 assert.match(renderImageEditorialFeedback(missing),/not computer-vision scores/);
 const f=fixture(),r=collectImageEditorialFeedback(f);assert.equal(r.status,'RECORDED');assert.equal(r.reviewed_stories,6);
 assert.equal(r.owner_feedback,'UNKNOWN');assert.equal(r.source_support_independently_verified,false);
 assert.equal('aesthetic_score' in r,false);
 f.aar.editorial_quality_review.stories[0].nearest_prior=null;
 assert.equal(collectImageEditorialFeedback(f).status,'PARTIAL');assert.equal(collectImageEditorialFeedback(f).nearest_prior_comparisons,5);
});
test('stale hashes, invented owner signoff, duplicate substages and wrong prior dates remain invalid',()=>{
 const mutations=[
  f=>{f.aar.editorial_quality_review.stories[0].sha256=sha(900);},
  f=>{f.aar.editorial_quality_review.owner_feedback={state:'positive'};},
  f=>{f.aar.editorial_quality_review.stories[0].supported_substages[1]={...f.aar.editorial_quality_review.stories[0].supported_substages[0]};},
  f=>{f.aar.editorial_quality_review.reference_editions=['2026-11-20'];},
  f=>{f.aar.editorial_quality_review.stories[0].nearest_prior.asset_ref='javascript:alert(1)';},
  f=>{f.aar.editorial_quality_review.stories[0].mobile_320_pixels_inspected=false;}
 ];
 for(const change of mutations){const f=fixture();change(f);const r=collectImageEditorialFeedback(f);assert.equal(r.status,'INVALID');assert.equal(r.reviewed_stories,null);}
});
test('existing reporting exposes exact observations prospectively and escapes source text',()=>{
 const f=fixture();f.aar.editorial_quality_review.stories[0].detail_observation+=' <script>alert(1)</script> | x';
 const o=collectObservations({combined:{schema_version:'daily-compiler-unified-aar-v1',edition_date:f.edition,cycle_date:'2026-11-19'},
  evidence:{'image-after-action':f.aar,'image-manifest':f.manifest}});
 assert.equal(o.image_editorial_quality.status,'RECORDED');
 const m=buildMetrics({edition:f.edition,observations:[o],registry:{resources:[]},register:{schema_version:'daily-aar-improvement-register-v1',changes:[]}});
 assert.equal(m.image_editorial_history.length,1);const md=renderMetricsMarkdown(m);
 assert.match(md,/Useful image detail and recent artwork comparisons/);assert.match(md,/UNKNOWN/);assert.doesNotMatch(md,/<script>/);
 const old=collectObservations({combined:{schema_version:'daily-compiler-unified-aar-v1',edition_date:'2026-11-19'}});
 assert.equal('image_editorial_quality' in old,false);
});
test('all eight approved actions are reachable from the existing task contract without schedule changes',()=>{
 const guide=fs.readFileSync('docs/automation/NOV19_APPROVED_IMAGE_IMPROVEMENTS.md','utf8');
 const contract=fs.readFileSync('docs/automation/current/IMAGES.md','utf8');assert.match(contract,/NOV19_APPROVED_IMAGE_IMPROVEMENTS\.md/);
 const register=JSON.parse(fs.readFileSync('config/aar-improvement-register.json'));
 for(let i=1;i<=8;i++){
  const id='IMG19-'+String(i).padStart(2,'0');assert.ok(guide.includes(id));
  const row=register.changes.find(r=>r.change_id===id);assert.equal(row.effective_edition,'2026-11-20');assert.equal(row.review_due_edition,'2026-11-22');
 }
 const workflow=fs.readFileSync('.github/workflows/daily-operations-report.yml','utf8');
 assert.match(workflow,/cp scripts\/image-editorial-feedback.mjs/);assert.equal((workflow.match(/runs-on:/g)||[]).length,1);assert.equal((workflow.match(/cron:/g)||[]).length,1);
});

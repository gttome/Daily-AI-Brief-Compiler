import test from 'node:test';
import assert from 'node:assert/strict';
import {validateImageAfterAction} from '../scripts/image-aar-contract.mjs';
import {renderImageAar} from '../scripts/render-image-aar.mjs';

const ids=[
  'nov13-t1-hydrogen','nov13-t2-datacenter-costs',
  'nov13-k1-adobe-agents','nov13-k2-united-agent-policy',
  'nov13-a1-nod-skill','nov13-a2-genie'
];
const hashes=[
  'e628668c7b844c11a91e5ee4556b8c84f9b27ecf24ee614765ffe84942302377',
  'f60508d44675e98e5588e6b91032a3f24d08bc389cca4a2a27e42102bdf31e06',
  '0e8bd2467fbffbfc26588dc0cf8c5e559edb5c32f5c086661b0cf9b36d5b443a',
  'e3de476f8901658372f230da584ba44ae1c5139930a5cb6150556df1dd777922',
  'cae52e20c503788c946350e5306340896317c9b4baa09aa42266588d8750b938',
  '9a2993813476366c196b49cc4af13d09ca553c1f04e20a6980822812ff7d20b7'
];
const jobSha='f1c3e17e778de6689cdf74265f42c33d7804aeb9af066487d26a12570d2a7b05';
const sourceSha='3da32365d3173fac3d7b414342346859bfc0bc7e';
const bundleSha='247f2f668a3bac15d7a05290c8d441f1a77d6d0e4e8aaee9ecdcc6c943bf9c32';
const issue='Six corrected, source-bound native PNGs passed individual and set review. This invocation observed its start clock but did not capture a separate observation immediately before its first native call. No independently retrievable same-invocation start evidence was available.';
function fixture(){
 const job={edition_date:'2026-11-13',stories:ids.map(story_id=>({story_id}))};
 const manifest={
   job_sha256:jobSha,original_source_commit_sha:sourceSha,
   original_bundle_sha256:bundleSha,
   set_review:{result:'PASS',independent_saved_pixel_review:true},
   images:ids.map((story_id,i)=>({story_id,sha256:hashes[i],accepted_locked:true,
      visual_review:{result:'PASS',inspected_png_sha256:hashes[i]}}))
 };
 const aar={
  schema_version:'external-image-after-action-v1',edition_date:'2026-11-13',
  job_sha256:jobSha,original_source_commit_sha:sourceSha,original_bundle_sha256:bundleSha,
  status:'BLOCKED_INCOMPLETE',
  human_readable_path:'external-image-packages/2026-11-13/reviews/after-action.md',
  production:{
   actual_generation_count:19,rejected_count:13,accepted_count:6,accepted_art_regenerated_after_lock:0,
   github_binary_stage_commit:'320020d8e14520f8a3d93386cce6fa8ea58ac0f4',
   host_execution_observed_at:'2026-11-13T14:49:49Z',
   host_execution_observation_source:'executor_observed_in_same_invocation',
   generation_started_at:null,generation_start_source:null,
   scheduler_origin:'UNPROVEN'
  },
  images:ids.map((story_id,i)=>({story_id,generation_attempts:[5,3,3,2,4,2][i],sha256:hashes[i]})),
  errors:[{phase:'Protected package admission',issue,correction:'Recover genuine first-call observation if it exists; preserve all six accepted PNG bytes.'}],
  publication:{result:'NOT_DEPLOYED'},visual_review:{result:'NOT_STARTED'},usage:{work_usage_percent:null}
 };
 return {job,manifest,aar};
}
test('only the six exact Nov 13 accepted images can retain UNKNOWN first-call timing without blocking review validation',()=>{
 const f=fixture();
 const v=validateImageAfterAction(f);
 assert.equal(v.result,'PASS');
 assert.equal(v.first_native_generation_clock,'UNKNOWN_NOT_CAPTURED');
 assert.equal(v.exception_scope,'PINNED_2026_11_13_IMAGE_ONLY_REPORTING_GAP');
 const report=renderImageAar(f);
 assert.match(report,/First native generation clock \\| Not recorded/);
 assert.match(report,/No precise active native runtime is inferred/);
});
test('the missing clock cannot be used for other editions, another image, absent source evidence, or invented observations',()=>{
 const baseline=fixture();
 for(const edit of [
  f=>{f.job.edition_date='2026-11-14';f.aar.edition_date='2026-11-14';},
  f=>{f.manifest.images[0].sha256='a'.repeat(64);f.aar.images[0].sha256='a'.repeat(64);},
  f=>{f.aar.errors=[];},
  f=>{f.aar.production.generation_started_at='2026-11-13T14:50:00Z';},
  f=>{f.aar.production.host_execution_observed_at='2026-11-13T14:48:42Z';},
  f=>{f.aar.production.scheduler_origin='PROVEN';},
  f=>{f.manifest.set_review.result='UNREVIEWED';}
 ]){
  const f=structuredClone(baseline);edit(f);
  assert.throws(()=>validateImageAfterAction(f),/image_aar:/);
 }
});
test('normal forward-only actual clock proof stays required and accepted',()=>{
 const f=fixture();
 f.aar.production.generation_started_at='2026-11-13T14:51:00Z';
 f.aar.production.generation_start_source='executor_observed_before_first_native_call';
 assert.equal(validateImageAfterAction(f).result,'PASS');
 f.aar.production.generation_started_at='2026-11-13T14:40:00Z';
 assert.throws(()=>validateImageAfterAction(f),/genuine_forward_only/);
});

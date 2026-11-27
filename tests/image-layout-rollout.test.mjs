import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {verifyImageLayoutAudit} from '../operations/image-layout-audit.mjs';
import {reportImageLayoutRollout} from '../scripts/report-image-layout-rollout.mjs';
const hash=n=>n.toString(16).padStart(64,'0');
const dates=['2026-11-25','2026-11-24','2026-11-23'];
const verified={editions:dates.map(edition_date=>({edition_date,status:'RELEASED_VERIFIED'}))};
function manifest(edition='2026-11-26'){
 const prior_sets=dates.map((edition_date,i)=>({edition_date,evidence_url:'https://github.com/gttome/Daily-AI-Brief-Compiler/tree/main/',
  images:Array.from({length:6},(_,j)=>({sha256:hash(100+i*6+j),layout_family:'horizontal-strip',treatment:'watercolor'}))}));
 const stories=['horizontal-strip','horizontal-strip','radial-loop','branching-tree','central-cutaway','asymmetric-inset'].map((layout,i)=>({
  story_id:'s'+i,sha256:hash(i+1),observed_layout:layout,planned_layout:layout,planned_silhouette:'.../DDD/...',
  observed_silhouette:'DS./.DD/.S.',observed_treatment:'silkscreen',observed_grouping:'Major objects share a central field',
  observed_eye_path:'The eye moves through the dominant central shape',
  prior_matches:prior_sets.map(s=>({edition_date:s.edition_date,image_sha256:s.images[i].sha256,
   visual_comparison:'The same scale is not shared across these layouts'}))}));
 return {edition_date:edition,job_sha256:hash(900),images:stories.map(({story_id,sha256})=>({story_id,sha256})),set_review:{
  editorial_diversity:{contact_sheet_sha256:hash(800)},
  structural_layout_review:{schema_version:'image-structural-layout-review-v1',contact_sheet_sha256:hash(800),
   method:'unlabeled_silhouette_and_saved_thumbnail',stories,prior_sets}}};
}
test('audits layout, silhouettes, exact artwork and the recent verified edition order',()=>{
 const m=manifest(),a=verifyImageLayoutAudit(m,{index:verified});
 assert.equal(a.largest_repeated_layout,2);assert.equal(a.changed_vs_preceding,4);
 assert.equal(Object.keys(a.observed).length,5);
 assert.equal(verifyImageLayoutAudit({edition_date:'2026-11-25'}),null);
 const e=m.set_review.structural_layout_review;
 const specifications=e.stories.map(x=>({story_id:x.story_id,pre_generation_checks:{
  structural_layout_plan:{layout_family:x.planned_layout,silhouette:x.planned_silhouette}}}));
 assert.equal(verifyImageLayoutAudit(m,{specifications}).largest_repeated_layout,2);
 specifications[0].pre_generation_checks.structural_layout_plan.silhouette='DS./.D./...';
 assert.throws(()=>verifyImageLayoutAudit(m,{specifications}),/review_disagrees_with_frozen_silhouette/);
 e.stories[2].observed_layout='horizontal-strip';
 assert.throws(()=>verifyImageLayoutAudit(m),/observed_layout_repetition/);
 e.stories[2].observed_layout='radial-loop';
 e.stories[2].planned_layout='horizontal-strip';
 assert.throws(()=>verifyImageLayoutAudit(m),/planned_layout_repetition/);
 e.stories[2].planned_layout='radial-loop';
 e.stories[2].sha256=hash(99);
 assert.throws(()=>verifyImageLayoutAudit(m),/missing_observed_pixels_or_hash_binding/);
 e.stories[2].sha256=hash(3);
 assert.throws(()=>verifyImageLayoutAudit(m,{index:{editions:verified.editions.slice(1)}}),/latest_verified/);
 for(const i of [2,3])e.stories[i].observed_treatment='watercolor';
 assert.throws(()=>verifyImageLayoutAudit(m),/fewer_than_three_changed/);
});
test('future plans and actual color/grayscale reviews reject look-alikes despite distinct layouts',()=>{
 const m=manifest('2026-11-28'),a=m.set_review.structural_layout_review;
 const treatment=['line-diagram','ink-map','relief-object','relief-object','engraved-section','editorial-type'];
 const labels=['direct-type','leader-callouts','badges-or-plaques','on-surface','leader-callouts','typographic-hierarchy'];
 const specifications=a.stories.map((x,i)=>{
  x.observed_visual_treatment_family=treatment[i];
  x.observed_label_architecture=labels[i];
  return {story_id:x.story_id,pre_generation_checks:{structural_layout_plan:{
   layout_family:x.planned_layout,silhouette:x.planned_silhouette,
   visual_treatment_family:treatment[i],label_architecture:labels[i]}}};
 });
 const pairs=a.stories.flatMap((a,i)=>m.images.slice(i+1).map(b=>({
  story_ids:[a.story_id,b.story_id],same_visual_grammar:false,
  observation:'The dominant media and label surfaces are different at thumbnail width.'})));
 a.visible_similarity_review={method:'saved_color_and_grayscale_320',contact_sheet_sha256:a.contact_sheet_sha256,pairs};
 assert.equal(verifyImageLayoutAudit(m,{specifications}).visible_contrast.pairs_reviewed,15);
 a.stories[0].observed_visual_treatment_family='relief-object';
 assert.throws(()=>verifyImageLayoutAudit(m,{specifications}),/observed_visual_grammar_repetition/);
 a.stories[0].observed_visual_treatment_family=treatment[0];
 specifications[0].pre_generation_checks.structural_layout_plan.label_architecture='leader-callouts';
 assert.throws(()=>verifyImageLayoutAudit(m,{specifications}),/planned_visual_grammar_repetition/);
 specifications[0].pre_generation_checks.structural_layout_plan.label_architecture=labels[0];
 pairs[0].same_visual_grammar=true;
 assert.throws(()=>verifyImageLayoutAudit(m,{specifications}),/unresolved_same_visual_grammar_pair/);
 pairs[0].same_visual_grammar=false;
 pairs[1].story_ids=[...pairs[0].story_ids].reverse();
 assert.throws(()=>verifyImageLayoutAudit(m,{specifications}),/visible_similarity_pair_duplicate/);
});
test('reports the first seven eligible editions and distinguishes missing from zeros',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'brief-rollout-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const save=(p,data)=>{const name=path.join(root,p);fs.mkdirSync(path.dirname(name),{recursive:true});fs.writeFileSync(name,JSON.stringify(data));};
 const upcoming=['2026-11-26','2026-11-27','2026-11-28','2026-11-29','2026-11-30','2026-12-01','2026-12-02','2026-12-03'];
 save('image-jobs/index.json',{editions:[...verified.editions,...upcoming.map(edition_date=>({edition_date,status:'PUBLISHED_PENDING'}))]});
 const m=manifest();
 save('external-image-packages/2026-11-26/manifest.json',m);
 save('external-image-packages/2026-11-26/reviews/after-action.json',{edition_date:m.edition_date,job_sha256:m.job_sha256,
  images:m.images.map(i=>({...i,generation_attempts:2})),production:{actual_generation_count:12},
  usage:{work_usage_percent:0},rollout_observation:{owner_intervention:'none_observed'}});
 const a=reportImageLayoutRollout({repo:root,site:root,through:'2026-12-03'});
 assert.equal(a.rows.length,7);assert.equal(a.rows[0].first_pass_accepts,0);
 assert.equal(a.rows[0].work_usage_percent,0);assert.equal(a.rows[0].owner_intervention,null);
 assert.equal(a.rows[1].first_pass_accepts,null);assert.equal(a.rows.at(-1).edition,'2026-12-02');
});
test('artifact wait gates on two matching listings and records success and failure',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'artifact-visibility-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const executable=(name,s)=>fs.writeFileSync(path.join(dir,name),'#!/usr/bin/env bash\n'+s+'\n',{mode:0o755});
 executable('sleep','exit 0');executable('gh','if [[ "$2" == *per_page* ]]; then cat "$LIST_FULL"; else cat "$LIST_DEFAULT"; fi');
 const artifact='image-pages-123-2',receipt=path.join(dir,'receipt.json');
 const a=path.join(dir,'a.json'),b=path.join(dir,'b.json');
 const write=(p,id)=>fs.writeFileSync(p,JSON.stringify({artifacts:id?[{id,name:artifact,expired:false,size_in_bytes:123}]:[]}));
 const run=()=>spawnSync('bash',['scripts/wait-image-pages-artifact.sh',artifact,receipt],{env:{...process.env,
  PATH:dir+':'+process.env.PATH,LIST_DEFAULT:a,LIST_FULL:b,GITHUB_REPOSITORY:'o/r',GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'2'}});
 write(a,1);write(b,1);
 assert.equal(run().status,0);assert.equal(JSON.parse(fs.readFileSync(receipt)).probes,8);
 write(b,2);assert.equal(run().status,1);assert.equal(JSON.parse(fs.readFileSync(receipt)).result,'AMBIGUOUS_CURRENT_ATTEMPT_ARTIFACT');
 write(b,null);assert.equal(run().status,1);assert.equal(JSON.parse(fs.readFileSync(receipt)).not_visible_polls,20);
});

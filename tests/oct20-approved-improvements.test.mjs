import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {validateEditorialChronology,validateNontechnicalAudience,validateMediaPrecision} from '../compiler/production-evidence.mjs';
import {validateImageAfterAction} from '../scripts/image-aar-contract.mjs';
import {validateFrozenImageSpecification,verifySixFrozenImageSpecifications} from '../scripts/preflight-image-firstpass.mjs';
const now='2026-10-21T01:00:00Z';
const item=url=>({url,content_retrieved_at:'2026-10-21T00:20:00Z',verification:{checked_at:'2026-10-21T00:21:00Z',content_reviewed:true,playback_verified:false,content_review_basis:'Full publisher synopsis and original transcript reviewed for the selected item.'}});
const fresh=()=>({edition_date:'2026-10-21',editorial_provenance:{selection_locked_at:'2026-10-21T00:22:00Z',sealed_at:'2026-10-21T00:23:00Z'},stories:Array.from({length:6},(_,i)=>({id:'s'+i,focus:i<4?'Technical AI Engineering':'Agents for Everyone',source:{retrieved_at:'2026-10-21T00:18:00Z',read_evidence:{read_at:'2026-10-21T00:19:00Z'}},why_it_matters:'Review a draft answer against your approved customer records before sharing it with colleagues.',audience_fit:{requires_programming:false,prerequisite_level:'general_office_tools',intended_user:'A service-team manager who works with customer records.',practical_action:'Ask the approved assistant to draft a response using permitted customer records.',review_action:'Compare each factual statement with its cited customer record before approval.',usable_outcome:'A reviewed customer reply ready for the manager to approve and share.'}})),videos:[item('https://abcnews.com/video/one'),item('https://www.reuters.com/video/two')],podcasts:[item('https://podcasts.apple.com/us/podcast/show/id123?i=456'),item('https://open.spotify.com/episode/abcdef')],watchlist:{refreshed_at:'2026-10-21T00:21:30Z'}});
const state={started_at:'2026-10-21T00:15:00Z',updated_at:'2026-10-21T00:23:00Z'};
test('future evidence timestamps cannot pass the same new-publication chronology gate',()=>{
 const b=fresh();assert.equal(validateEditorialChronology({bundle:b,state,now}).result,'PASS');
 for(const mutate of [b=>b.stories[0].source.read_evidence.read_at='2026-10-21T01:12:00Z',b=>b.stories[0].source.retrieved_at='2026-10-21T00:20:00Z',b=>b.videos[0].verification.checked_at='2026-10-21T01:12:00Z',b=>b.watchlist.refreshed_at='2026-10-21T01:12:00Z',b=>b.editorial_provenance.sealed_at='2026-10-21T02:00:00Z',b=>delete b.editorial_provenance]){
  const b=fresh();mutate(b);assert.throws(()=>validateEditorialChronology({bundle:b,state,now}),/production_evidence/);
 }
 assert.equal(validateEditorialChronology({bundle:{edition_date:'2026-10-20'},state:{},now}).result,'SKIPPED_HISTORICAL');
});
test('a technical handoff cannot pass as a nontechnical action merely through a label',()=>{
 const b=fresh();assert.equal(validateNontechnicalAudience(b).result,'PASS');
 b.stories[4].why_it_matters='Inspect the worktree and update the pull request.';
 assert.throws(()=>validateNontechnicalAudience(b),/developer_prerequisites/);
 b.stories[4].why_it_matters='Review the final draft with colleagues.';delete b.stories[4].audience_fit;
 assert.throws(()=>validateNontechnicalAudience(b),/audience_evidence/);
});
test('media publisher identity uses URLs, requires exact episode links and honest verification scopes',()=>{
 const b=fresh();assert.equal(validateMediaPrecision(b).result,'PASS');
 b.videos[1].url='https://abcnews.com/video/two';b.videos[1].source='Disguised other publisher';
 assert.throws(()=>validateMediaPrecision(b),/distinct_video_publishers/);
 b.video_diversity_exception={reason:'Both short publisher segments have unique practical content not available from the independently researched alternatives.',reviewer:'Editorial source reviewer',alternatives_reviewed:[{url:'https://reuters.com/video/other',reason:'Alternative is unavailable to readers after checking its public item page.'},{url:'https://bbc.com/video/other',reason:'Alternative lacks the required substantive AI workflow explanation for this edition.'}]};
 assert.equal(validateMediaPrecision(b).video_diversity_exception,true);
 b.podcasts[0].url='https://podcasts.apple.com/us/podcast/show/id123';
 assert.throws(()=>validateMediaPrecision(b),/episode_specific_link/);
 const c=fresh();c.videos[0].verification.playback_verified=true;
 assert.throws(()=>validateMediaPrecision(c),/playback_evidence/);
});
test('real October 20 AAR now supplies consistent 19/13/6 with source/hash binding',()=>{
 const base='external-image-packages/2026-10-20/';
 const manifest=JSON.parse(fs.readFileSync(base+'manifest.json')),aar=JSON.parse(fs.readFileSync(base+'reviews/after-action.json'));
 const job={edition_date:'2026-10-20',stories:manifest.images};
 assert.equal(validateImageAfterAction({aar,manifest,job}).actual_generation_count,19);
 for(const delta of [{production:{...aar.production,actual_generation_count:18}},{images:aar.images.slice(1)},{original_bundle_sha256:'wrong'}])assert.throws(()=>validateImageAfterAction({aar:{...aar,...delta},manifest,job}),/image_aar/);
});
test('October 20 closeout binds every actual capture to a locked saved PNG, with all four contexts',()=>{
 const prefix='external-image-packages/2026-10-20/';
 const m=JSON.parse(fs.readFileSync(prefix+'manifest.json'));
 const r=JSON.parse(fs.readFileSync(prefix+'reviews/live/semantic-pixel-review.json'));
 const c=JSON.parse(fs.readFileSync(prefix+'reviews/live/image-element24/captures.json'));
 assert.equal(r.evidence_source.workflow_run_id,39361877520);assert.equal(r.targets.length,24);
 const matrix=new Set(m.images.flatMap(i=>['dated_brief','permanent_story'].flatMap(p=>['desktop','mobile'].map(v=>i.story_id+':'+p+':'+v))));
 assert.equal(new Set(r.targets.map(t=>t.target_id)).size,24);
 for(const t of r.targets){assert.ok(matrix.has(t.target_id));const saved=c.rows.find(x=>x.target_id===t.target_id);assert.equal(t.capture_sha256,saved.screenshot_sha256);assert.equal(t.live_image_sha256,saved.live_image_sha256);assert.equal(t.actual_pixels_inspected,true);}
 for(const i of m.images)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(i.path)).digest('hex'),i.sha256);
});
test('image preflight rejects unplanned text geometry, missing causal states and cross-date specs',()=>{
 const base='external-image-packages/2026-10-20/';
 const originals=JSON.parse(fs.readFileSync(base+'reviews/six-frozen-specs.json'));
 const specs=structuredClone(originals).map(s=>({...s,edition_date:'2026-10-21',pre_generation_checks:{safe_margin_px:40,no_simulated_writing:true,no_false_success_symbols:true,no_decorative_scenery:true,source_caveat:'Preserve the specific limitations of this primary-source claim.',label_layout:s.required_labels.map(label=>({label,region:'Named mechanism region',minimum_font_px:18})),causal_state_checks:[{condition:'Source specified condition',allowed_path:'Only the approved source-supported path',blocked_path:'No unverified path or success state',support_claim_id:s.source_claim_map[0].id}]}}));
 const stories=specs.map(s=>({story_id:s.story_id,primary_source:{url:s.source_url,verified_read_evidence:{status:'verified',full_source_read:true}}}));
 assert.equal(verifySixFrozenImageSpecifications({job:{schema_version:'external-compiler-image-job-v1',edition_date:'2026-10-21',stories},specifications:specs}).stories.length,6);
 for(const mutate of [s=>delete s.pre_generation_checks,s=>s.pre_generation_checks.label_layout.pop(),s=>s.pre_generation_checks.causal_state_checks[0].support_claim_id='invented']){const s=structuredClone(specs[0]);mutate(s);assert.throws(()=>validateFrozenImageSpecification({spec:s,story:stories[0]}),/preflight_required/);}
 const wrong=structuredClone(specs);wrong[0].edition_date='2026-10-20';assert.throws(()=>verifySixFrozenImageSpecifications({job:{schema_version:'external-compiler-image-job-v1',edition_date:'2026-10-21',stories},specifications:wrong}),/current_edition/);
});
test('distinct verified YouTube channels are not mistaken for one publisher host',()=>{
 const b=fresh();
 b.videos=b.videos.map((v,i)=>({...v,url:'https://www.youtube.com/watch?v=video'+i,verification:{...v.verification,publisher_channel_id:'UC'+String(i).repeat(22),publisher_channel_url:'https://www.youtube.com/channel/UC'+String(i).repeat(22),publisher_channel_verified:true}}));
 assert.equal(validateMediaPrecision(b).video_publishers.length,2);
 b.videos[1].verification={...b.videos[0].verification};
 assert.throws(()=>validateMediaPrecision(b),/distinct_video_publishers/);
});
test('canonical human AAR is rendered from the same structured totals and correction rows',async()=>{
 const {renderImageAar}=await import('../scripts/render-image-aar.mjs');
 const base='external-image-packages/2026-10-20/',manifest=JSON.parse(fs.readFileSync(base+'manifest.json')),aar=JSON.parse(fs.readFileSync(base+'reviews/after-action.json'));
 const rendered=renderImageAar({aar,manifest,job:{edition_date:'2026-10-20',stories:manifest.images}});
 assert.equal(rendered,fs.readFileSync(base+'reviews/after-action.md','utf8'));
 assert.match(rendered,/Native generations \| 19/);assert.match(rendered,/Rejected candidates \| 13/);
 assert.match(rendered,/fine annotations need the original/);
});

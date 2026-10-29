// Forward-only October 21 hardening. Immutable older bundles remain replayable.
import {articlePublisherKey} from './source-diversity.mjs';
import {validateMediaEducationalValue,MEDIA_QUALITY_EFFECTIVE} from './media-quality.mjs';
import {validateVideoEditorialBalance} from './video-editorial-balance.mjs';
export const PRODUCTION_EVIDENCE_EFFECTIVE='2026-10-21';
const fail=s=>{throw Error('production_evidence:'+s);};
const text=(s,n=30)=>typeof s==='string'&&s.trim().length>=n;
const at=(s,label)=>{const n=Date.parse(s);if(!Number.isFinite(n)||!/[Tt].*(?:Z|[+-]\d\d:\d\d)$/.test(s||''))fail('timestamp_required:'+label);return n;};
const active=b=>b?.edition_date>=PRODUCTION_EVIDENCE_EFFECTIVE;
export function validateEditorialChronology({bundle,state,now=new Date()}){
 if(!active(bundle))return {result:'SKIPPED_HISTORICAL'};
 const p=bundle.editorial_provenance;
 const sealed=at(p?.sealed_at,'sealed_at'),locked=at(p?.selection_locked_at,'selection_locked_at');
 const recorded=at(state.updated_at,'state.updated_at'),start=at(state.started_at,'state.started_at');
 const clock=new Date(now).getTime();
 if(!Number.isFinite(clock)||sealed>clock+60000||recorded>clock+60000||locked>sealed||start>sealed||Math.abs(recorded-sealed)>60000)
  fail('invalid_seal_clock_or_order');
 const observations=[];
 for(const s of bundle.stories||[]){
  const retrieved=at(s.source?.retrieved_at,s.id+':retrieved'),read=at(s.source?.read_evidence?.read_at,s.id+':read');
  if(retrieved>read||read>locked)fail('source_read_after_selection_or_before_retrieval:'+s.id);
  observations.push(read);
 }
 for(const s of [...bundle.videos||[],...bundle.podcasts||[]]){
  const retrieved=at(s.content_retrieved_at,'media:retrieved'),checked=at(s.verification?.checked_at,'media:checked');
  if(retrieved>checked||checked>locked)fail('media_verification_after_selection_or_before_retrieval');
  observations.push(checked);
  if(bundle.edition_date>=MEDIA_QUALITY_EFFECTIVE){
   const reviewed=at(s.quality_review?.reviewed_at,'media:quality_reviewed');
   if(reviewed<checked||reviewed>locked)fail('media_quality_review_not_between_verification_and_selection');
  }
 }
 if(at(bundle.watchlist?.refreshed_at,'watchlist')>locked)fail('watchlist_after_selection');
 return {result:'PASS',selection_locked_at:p.selection_locked_at,sealed_at:p.sealed_at,observations:observations.length,clock_tolerance_seconds:60};
}
export function validateNontechnicalAudience(bundle){
 if(!active(bundle))return {result:'SKIPPED_HISTORICAL'};
 const agents=(bundle.stories||[]).filter(s=>s.focus==='Agents for Everyone');
 if(agents.length!==2)fail('two_nontechnical_agent_stories_required');
 for(const s of agents){
  const a=s.audience_fit;
  if(a?.requires_programming!==false||!['none','general_office_tools'].includes(a?.prerequisite_level)||
    !['intended_user','practical_action','review_action','usable_outcome'].every(k=>text(a[k],35)))
   fail('nontechnical_audience_evidence_required:'+s.id);
  if(/\b(worktrees?|git checkout|edit(?:ing)? (?:source )?code|run(?:ning)? local (?:tests|checks)|updat(?:e|ing) (?:the |a )?pull request)\b/i.test(a.practical_action+' '+s.why_it_matters))
   fail('developer_prerequisites_in_nontechnical_action:'+s.id);
 }
 return {result:'PASS',nontechnical_stories:2,semantic_audience_review_still_required:true};
}
export function videoPublisherKey(item){
 const u=new URL(item.url),host=u.hostname.toLowerCase().replace(/^www\./,'');
 if(['youtube.com','m.youtube.com','youtu.be'].includes(host)){
   const v=item.verification,id=v?.publisher_channel_id;
   if(!/^UC[A-Za-z0-9_-]{22}$/.test(id||'')||v.publisher_channel_url!=='https://www.youtube.com/channel/'+id||v.publisher_channel_verified!==true)
     fail('verified_youtube_channel_identity_required');
   return 'youtube-channel:'+id;
 }
 return articlePublisherKey(item.url);
}
// Oct27+ a single publisher is an exception, never a shortcut for two
// videos teaching essentially the same lesson. This uses existing evidence
// fields rather than inventing new playback proof or a mechanical age quota.
export function validateSamePublisherLearningObjectives(bundle){
 if(bundle?.edition_date<'2026-10-27')return {result:'SKIPPED_HISTORICAL'};
 if(!Array.isArray(bundle?.videos)||bundle.videos.length!==2)
   fail('two_videos_required_for_same_publisher_review');
 const normalize=s=>String(s??'').normalize('NFKC').toLowerCase()
   .replace(/[^a-z0-9]+/g,' ').trim();
 const objectives=bundle.videos.map(v=>v.quality_review?.learning_objective);
 const reasons=bundle.videos.map(v=>v.quality_review?.selected_over_alternatives);
 if(objectives.some(x=>!text(x,50))||reasons.some(x=>!text(x,50))||
   new Set(objectives.map(normalize)).size!==2||
   new Set(reasons.map(normalize)).size!==2)
   fail('same_publisher_videos_need_distinct_transferable_objectives_and_selection_reasons');
 return {result:'PASS',distinct_teaching_objectives:2,
   independent_audiovisual_player_verification_still_required:true};
}
// Reviewed alternatives are retained as evidence, not inferred from the two winners.
export function validateVideoPrequalification(bundle){
 if(bundle?.edition_date<'2026-10-24')return {result:'SKIPPED_HISTORICAL'};
 const candidates=bundle.video_prequalification?.candidates;
 if(!Array.isArray(candidates)||candidates.length<6)
   fail('six_prequalified_substantive_video_candidates_required');
 const urls=new Set(),publishers=new Set();
 for(const [index,item] of candidates.entries()){
   let url;
   try{url=new URL(item?.url);}catch{fail('video_candidate_invalid_url:'+index);}
   if(url.protocol!=='https:'||urls.has(url.href)||!text(item.title,8)||
     !text(item.teaching_evidence,45)||!text(item.research_disposition,35)||
     item.content_reviewed!==true||item.public_player_checked!==true||
     !Number.isFinite(item.duration_minutes)||item.duration_minutes<3||item.duration_minutes>20||
     !Number.isFinite(Date.parse(item.checked_at||'')))
     fail('video_candidate_review_incomplete:'+index);
   urls.add(url.href);
   publishers.add(videoPublisherKey(item));
 }
 if(publishers.size<3)fail('video_candidate_publishers_three_required');
 for(const selected of bundle.videos||[]){
   if(!urls.has(new URL(selected.url).href))
     fail('selected_video_missing_from_prequalification:'+selected.title);
 }
 return {result:'PASS',substantive_candidates:urls.size,independent_publishers:publishers.size,
   actual_public_playback_still_required:true,qualitative_content_review_not_inferred:true};
}
export function validateMediaPrecision(bundle){
 if(!active(bundle))return {result:'SKIPPED_HISTORICAL'};
 if(bundle.videos?.length!==2||bundle.podcasts?.length!==2)fail('two_videos_two_podcasts_required');
 const publisherKeys=bundle.videos.map(videoPublisherKey);
 const publishers=new Set(publisherKeys);
 validateVideoEditorialBalance({edition_date:bundle.edition_date,videos:bundle.videos,publishers:publisherKeys});
 const prequalification=validateVideoPrequalification(bundle);
 if(publishers.size<2){
  const e=bundle.video_diversity_exception;
  if(!text(e?.reason,80)||!text(e?.reviewer,3)||!Array.isArray(e?.alternatives_reviewed)||e.alternatives_reviewed.length<2||
    e.alternatives_reviewed.some(s=>!text(s.reason,40)))fail('distinct_video_publishers_or_reviewed_exception_required');
  validateSamePublisherLearningObjectives(bundle);
  const alternatives=new Set(e.alternatives_reviewed.map(videoPublisherKey));
  if(alternatives.size<2||[...alternatives].some(p=>publishers.has(p)))fail('independent_video_alternatives_required');
  // Forward-only: a diversity exception cannot cite unreviewed or invented
  // alternatives. The existing six-candidate pool must substantiate each one.
  if(bundle.edition_date>='2026-10-25'){
   const pool=new Map(bundle.video_prequalification.candidates.map(c=>[new URL(c.url).href,c]));
   const chosen=new Set(bundle.videos.map(v=>new URL(v.url).href));
   for(const alt of e.alternatives_reviewed){
    const url=new URL(alt.url).href,candidate=pool.get(url);
    if(chosen.has(url)||!candidate||candidate.content_reviewed!==true||
       candidate.public_player_checked!==true||!text(candidate.research_disposition,35))
      fail('video_diversity_exception_alternative_not_prequalified');
   }
  }
 }
 for(const item of bundle.podcasts){
  let u;try{u=new URL(item.url);}catch{fail('episode_link_required');}
  const host=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||
    (host==='podcasts.apple.com'&&!/^\d+$/.test(u.searchParams.get('i')||''))||
    (host==='open.spotify.com'&&!/^\/episode\/[^/]+/.test(u.pathname))||
    /\/(?:podcasts?|shows?)\/?$/.test(u.pathname)||u.pathname==='/')fail('episode_specific_link_required');
  // Non-catalog publisher URLs require an explicit per-episode binding, not a show label.
  if(!['podcasts.apple.com','open.spotify.com'].includes(host)&&
    (item.verification?.episode_url!==item.url||!text(item.verification?.episode_identifier,5)))fail('publisher_episode_identity_required');
 }
 for(const item of [...bundle.videos,...bundle.podcasts]){
  const v=item.verification;
  if(typeof v?.content_reviewed!=='boolean'||typeof v?.playback_verified!=='boolean'||
    !text(v?.content_review_basis,40))fail('scoped_media_verification_required');
  if(v.playback_verified===true&&(!text(v.playback_evidence?.method,10)||!text(v.playback_evidence?.result,10)||
    !Number.isFinite(Date.parse(v.playback_evidence?.checked_at))))fail('playback_evidence_required');
 }
 const educational_value=validateMediaEducationalValue(bundle);
 return {result:'PASS',video_publishers:[...publishers],video_diversity_exception:publishers.size<2,prequalification,playback_not_inferred:true,educational_value};
}

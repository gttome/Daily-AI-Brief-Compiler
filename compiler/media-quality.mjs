// Forward-only, evidence-based media usefulness admission. Metadata is NOT content review.
// Deliberately does not fetch transcripts or claim independent audiovisual listening.
export const MEDIA_QUALITY_EFFECTIVE = '2026-10-22';
const fail = code => { throw Error('media_quality:' + code); };
const prose = (s, min=35) => typeof s === 'string' && s.trim().length >= min;
const clean = s => String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
function publicUrl(value) {
  try {
    const u=new URL(value);
    return u.protocol==='https:' && !u.username && !u.password &&
      !/^(localhost|127\.|10\.|192\.168\.|169\.254\.|example\.)/i.test(u.hostname);
  } catch { return false; }
}
const observedAt = value => typeof value==='string' &&
  /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value) &&
  Number.isFinite(Date.parse(value));
function shared(item,index,type,editionDate) {
  const q=item?.quality_review, v=item?.verification;
  // Oct30+ videos are allowed to be analysis, interviews, research and reporting,
  // not only tutorials. Older sealed video contracts and all podcasts remain unchanged.
  const broadVideo=type==='video' && editionDate>='2026-10-30';
  const relevant=broadVideo ?
    (prose(q?.editorial_relevance,35)||prose(q?.learning_objective,35)) &&
    (prose(q?.reader_value,35)||prose(q?.practical_action,35)) :
    prose(q?.learning_objective,35)&&prose(q?.practical_action,35);
  if(!q || !prose(q.reviewer,5) || !observedAt(q.reviewed_at) ||
    !relevant ||
    !prose(q.selected_over_alternatives,35) ||
    !prose(q.content_evidence?.scope,60) ||
    !publicUrl(q.content_evidence?.url) ||
    v?.content_reviewed!==true ||
    !prose(v?.content_review_basis,40))
    fail(type+'_'+index+':substantiated_editorial_review_required');
  if(q.promotional_risk==='high'||q.is_advertisement!==false ||
    !['low','medium'].includes(q.promotional_risk) ||
    !prose(q.promotional_assessment,40))
    fail(type+'_'+index+':promotional_content_or_unreviewed_ad_risk');
  // An official launch description / item metadata alone cannot validate usefulness.
  if(['publisher_metadata','promotional_description','launch_copy','oembed','item_summary']
    .includes(q.content_evidence.kind))
    fail(type+'_'+index+':promotional_metadata_not_content_evidence');
  return q;
}
function pointsOrProcedure(q,index) {
  const points=q.transferable_takeaways;
  const three=Array.isArray(points)&&points.length>=3&&
    points.every(p=>prose(p,35)) &&
    new Set(points.map(clean)).size===points.length;
  const p=q.reproducible_procedure;
  const procedure=Array.isArray(p?.steps)&&p.steps.length>=3&&
    p.steps.every(s=>prose(s,30))&&prose(p?.limitations,40)&&
    prose(p?.expected_outcome,35);
  if(!three&&!procedure)fail('video_'+index+':three_teaching_points_or_reproducible_procedure_required');
}
export function checkVideo(item,index,editionDate='2026-10-22') {
  const q=shared(item,index,'video',editionDate);
  const seconds=Number(item?.duration_minutes)*60;
  if(!Number.isFinite(seconds)||seconds<180||seconds>1200)
    fail('video_'+index+':short_trailer_or_runtime_out_of_bounds');
  const future=editionDate>='2026-10-30';
  const evidenceTypes=future ?
    ['transcript','timestamped_chapters','substantive_companion_lesson','direct_playback',
     'original_reporting','expert_interview','research_presentation','panel_discussion',
     'independent_analysis','news_analysis'] :
    ['transcript','timestamped_chapters','substantive_companion_lesson','direct_playback'];
  if(!evidenceTypes.includes(q.content_evidence.kind))
    fail('video_'+index+':substantive_video_content_evidence_required');
  if(future){
    // Substantive reporting/analysis can have high editorial value without
    // teaching steps. Require a source-grounded justification, not a slogan.
    if(!prose(q.editorial_value_basis,70))
      fail('video_'+index+':source_grounded_editorial_value_basis_required');
  } else pointsOrProcedure(q,index);
  return {index,mode:q.content_evidence.kind,
    editorial_value_reviewed:future,
    transferable_value_reviewed:!future,
    playback_verified:item.verification?.playback_verified===true};
}
export function checkPodcast(item,index,editionDate) {
  const q=shared(item,index,'podcast');
  if(!['whole_episode_transcript','timecoded_agenda','full_listening']
    .includes(q.content_evidence.kind))
    fail('podcast_'+index+':whole_episode_evidence_required');
  const seconds=Number(item?.duration_minutes)*60;
  const parts=q.editorial_segments;
  if(!Number.isFinite(seconds)||seconds<=0||!Array.isArray(parts)||parts.length<1)
    fail('podcast_'+index+':duration_and_segments_required');
  // Coverage must be broad enough that a tiny AI segment in a general-news
  // digest cannot become a made-up 100% AI episode by selectively citing it.
  let cursor=0,ai=0,other=0,ads=0,coverage=0;
  const ordered=[...parts].sort((a,b)=>a.start_seconds-b.start_seconds);
  for(const s of ordered){
    const start=s?.start_seconds,end=s?.end_seconds;
    if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||
      start<cursor-0.01||end>seconds+5||
      !['ai','other','advertisement'].includes(s.kind)||!prose(s.topic,30))
      fail('podcast_'+index+':invalid_or_overlapping_timecoded_segment');
    cursor=end;
    coverage+=end-start;
    if(s.kind==='ai')ai+=end-start;
    else if(s.kind==='other')other+=end-start;
    else ads+=end-start;
  }
  const editorial=ai+other;
  const fraction=editorial?ai/editorial:0;
  if(coverage<seconds*.90||editorial<seconds*.50)
    fail('podcast_'+index+':insufficient_whole_episode_scope');
  if(fraction < .75)
    fail('podcast_'+index+':ai_editorial_fraction_below_75_percent');
  if(q.estimated_editorial_ai_fraction!==undefined &&
     (!Number.isFinite(q.estimated_editorial_ai_fraction) ||
      Math.abs(q.estimated_editorial_ai_fraction-fraction)>.03))
    fail('podcast_'+index+':ai_fraction_claim_disagrees_with_segments');
  if(editionDate>='2026-10-24'){
    if(!['original_reporting','original_interview','expert_analysis','synthetic_roundup'].includes(q.editorial_form)||
       !prose(q.editorial_form_rationale,55))
      fail('podcast_'+index+':originality_and_source_character_review_required');
    const aiTopics=ordered.filter(x=>x.kind==='ai').map(x=>clean(x.topic));
    if(seconds>=1800&&(ordered.length<4||aiTopics.length<2||new Set(aiTopics).size<2))
      fail('podcast_'+index+':long_episode_requires_multiple_distinct_timecoded_topics');
    if(q.editorial_form==='synthetic_roundup'&&
       (!Array.isArray(q.independently_verified_sources)||q.independently_verified_sources.length<2||
        q.independently_verified_sources.some(u=>!publicUrl(u))))
      fail('podcast_'+index+':synthetic_roundup_requires_verifiable_source_analysis');
  }
  return {index,ai_editorial_fraction:Number(fraction.toFixed(4)),
    measured_editorial_seconds:Number(editorial.toFixed(2)),
    advertising_seconds:Number(ads.toFixed(2)),whole_episode_coverage_verified:true};
}
export function validateMediaEducationalValue(bundle) {
  if(bundle?.edition_date<MEDIA_QUALITY_EFFECTIVE)
    return {result:'SKIPPED_HISTORICAL'};
  if(!Array.isArray(bundle?.videos)||bundle.videos.length!==2||
     !Array.isArray(bundle?.podcasts)||bundle.podcasts.length!==2)
    fail('exactly_two_videos_and_two_podcasts_required');
  const videos=bundle.videos.map((i,n)=>checkVideo(i,n+1,bundle.edition_date));
  const podcasts=bundle.podcasts.map((i,n)=>checkPodcast(i,n+1,bundle.edition_date));
  return {result:'PASS',videos,podcasts,editorial_value_attested_by_reviewer:true,
    full_av_playback_not_inferred:true};
}

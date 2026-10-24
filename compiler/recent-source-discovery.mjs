// Source discovery is an editorial evidence ledger; no network calls or dates are inferred.
const fail=msg=>{throw Error('recent_source_discovery:'+msg);};
const note=(v,min=45)=>typeof v==='string'&&v.trim().length>=min;
const date=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v);
const domain=value=>{try{const u=new URL(value);return u.protocol==='https:'?u.hostname.replace(/^www\./,'').toLowerCase():null;}catch{return null;}};
export function validateRecentSourceDiscovery(bundle){
 if(bundle?.edition_date<'2026-10-24')return {result:'SKIPPED_HISTORICAL'};
 const audit=bundle.source_discovery_audit;
 const candidates=audit?.candidates,decisions=audit?.fallback_decisions;
 if(!date(audit?.reviewed_at)||!Array.isArray(candidates)||candidates.length<8||
    !Array.isArray(decisions))fail('eight_original_source_considerations_and_dated_review_required');
 const domains=new Set(),urls=new Set(),recentUrls=new Set(),selected=new Set((bundle.stories||[]).map(s=>s.source.url));
 let newer=0,outside=0;
 const editionTime=Date.parse(bundle.edition_date+'T12:00:00Z');
 for(const c of candidates){
   const site=domain(c?.url),published=Date.parse(c?.original_date||'');
   if(!site||urls.has(c.url)||!note(c.publisher,3)||!Number.isFinite(published)||
      !date(c.checked_at)||!note(c.disposition_reason,45)||
      !['selected','considered','rejected'].includes(c.disposition))
      fail('source_consideration_missing_original_dated_evidence');
   urls.add(c.url);domains.add(site);
   if(editionTime-published<=86400000&&published<=editionTime){newer++;recentUrls.add(c.url);}
   if(!selected.has(c.url))outside++;
 }
 if(domains.size<5||outside<2||[...selected].some(u=>!urls.has(u)))
    fail('publisher_range_or_competing_sources_not_documented');
 for(const story of bundle.stories||[]){
   const original=Date.parse(story.source?.published_at||'');
   if(!Number.isFinite(original))fail('story_original_date_missing:'+story.id);
   if(editionTime-original<=86400000)continue;
   const matches=decisions.filter(d=>d.story_id===story.id);
   if(matches.length!==1||!note(matches[0].why_selected_over_recent_options,65)||
      !Array.isArray(matches[0].newer_sources_considered)||
      matches[0].newer_sources_considered.some(u=>!urls.has(u)))
      fail('older_than_24h_source_requires_explicit_reason:'+story.id);
   // Forward-only: an older selection must demonstrably compare at least one real
   // recent item if any was researched. Relevance still overrides a fake quota.
   if(bundle.edition_date>='2026-10-25'&&recentUrls.size>0&&
      !matches[0].newer_sources_considered.some(u=>recentUrls.has(u)))
      fail('older_story_must_compare_authentic_recent_candidates:'+story.id);
 }
 return {result:'PASS',candidates_considered:urls.size,distinct_domains:domains.size,
   independently_recorded_within_24h:newer,selected_within_24h:[...selected].filter(u=>recentUrls.has(u)).length,
   additional_alternatives:outside,
   source_dates_not_synthesized:true,editorial_relevance_still_required:true};
}

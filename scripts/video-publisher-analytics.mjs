// Evidence-based rolling publisher-family and playable-discovery telemetry.
// Reporting only: never authorizes a media replacement or alters a release gate.
const date=x=>typeof x==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(x)&&
  Number.isFinite(Date.parse(x+'T00:00:00Z'));
const isoDay=(edition,n)=>new Date(Date.parse(edition+'T00:00:00Z')+n*86400000)
  .toISOString().slice(0,10);
const knownHost=(host,root)=>host===root||host.endsWith('.'+root);
const alias={
 'pbs.org':'pbs', 'cbsnews.com':'cbs', 'foxnews.com':'fox-news',
 'ted.com':'ted', 'ted-ed.com':'ted', 'ibm.com':'ibm',
 'fortune.com':'fortune', 'reuters.com':'reuters'
};
function hostname(raw){
 try{const u=new URL(raw);return u.protocol==='https:'?u.hostname.toLowerCase().replace(/^www\./,''):null;}
 catch{return null;}
}
// Only an original-source identity already verified in the actual selected
// bundle is counted. A YouTube/CDN domain alone is never treated as publisher.
export function originalVideoFamily(video){
 if(video?.verification?.identity_verified!==true ||
   typeof video.source!=='string'||!video.source.trim())return null;
 const host=hostname(video.url);if(!host)return null;
 for(const [domain,family] of Object.entries(alias))if(knownHost(host,domain))return family;
 if(['youtube.com','youtu.be','m.youtube.com','youtube-nocookie.com','vimeo.com'].some(d=>knownHost(host,d))){
   const id=video.verification?.publisher_channel_id;
   return video.verification?.publisher_channel_verified===true&&
     typeof id==='string'&&/^[A-Za-z0-9_-]{8,80}$/.test(id)?
     'channel:'+id:null;
 }
 // A real original-publisher-hosted program has already passed the editorial
 // source-identity review. Preserve the host rather than inventing ownership.
 if(['googleusercontent.com','cloudfront.net','akamaized.net','jwplayer.com','brightcove.net','wistia.com'].some(d=>knownHost(host,d)))
  return null;
 return 'publisher-host:'+host;
}
export function verifiedVideoFamilies(bundle,edition,compilerVerified){
 if(compilerVerified!==true||!date(edition)||bundle?.edition_date!==edition||
   !Array.isArray(bundle.videos)||bundle.videos.length!==2)
   return {status:'NOT_RECORDED',families:[],original_programs:0};
 const families=bundle.videos.map(originalVideoFamily);
 if(families.some(f=>f===null)||new Set(families).size!==2)
  return {status:'UNVERIFIED_OR_DUPLICATE_ORIGIN',families:[],original_programs:0};
 return {status:'VERIFIED',families,
  original_programs:2,
  source_urls:bundle.videos.map(v=>v.url),
  evidence:'validated_original_publisher_identity_in_selected_edition_bundle'};
}
export function verifiedVideoDiscovery(sweep,edition){
 if(sweep?.edition_date!==undefined&&sweep.edition_date!==edition)
  return {status:'NOT_RECORDED'};
 const n=sweep?.registered,attempted=sweep?.attempted,available=sweep?.candidate_sources;
 if(!Number.isSafeInteger(n)||n<1||!Number.isSafeInteger(attempted)||attempted<0||attempted>n||
   !Number.isSafeInteger(available)||available<0||available>attempted||
   !Array.isArray(sweep?.source_outcomes)||sweep.source_outcomes.length!==n)
   return {status:'NOT_RECORDED'};
 const ids=sweep.source_outcomes.map(x=>x.resource_id);
 if(ids.some(x=>typeof x!=='string'||!x)||new Set(ids).size!==n ||
   sweep.source_outcomes.filter(x=>x.outcome!=='NOT_ATTEMPTED').length!==attempted ||
   sweep.source_outcomes.filter(x=>x.outcome==='CANDIDATES_FOUND').length!==available)
   return {status:'INVALID_UNBOUND_SWEEP'};
 return {status:'RECORDED',registered:n,attempted,candidate_sources:available,
  candidate_yield_percent:attempted?Number((100*available/attempted).toFixed(1)):null,
  interpretation:'Candidate-bearing discovery routes; not proof of original-program playback or editorial qualification.'};
}
export function rollingVideoDiversity(observations,edition){
 if(!date(edition))throw Error('INVALID_VIDEO_DIVERSITY_DATE');
 const days=Array.from({length:7},(_,i)=>isoDay(edition,i-6));
 const byDate=new Map((observations||[]).map(x=>[x.edition_date,x]));
 const rows=days.map(day=>{
   const v=byDate.get(day)?.video_publisher_families;
   return {edition_date:day,status:v?.status??'NOT_RECORDED',
    families:v?.status==='VERIFIED'?v.families:[]};
 });
 const complete=rows.every(r=>r.status==='VERIFIED'&&r.families.length===2&&
   r.families.every(x=>typeof x==='string'&&x.length>0)&&new Set(r.families).size===2);
 const counted=rows.filter(r=>r.status==='VERIFIED'&&r.families.length===2);
 const families=counted.flatMap(x=>x.families);
 const counts=Object.fromEntries([...new Set(families)].sort().map(k=>[k,families.filter(x=>x===k).length]));
 const largest=Math.max(0,...Object.values(counts)),total=families.length;
 const hhi=total?Number(Object.values(counts).reduce((n,c)=>n+(c/total)**2,0).toFixed(4)):null;
 const adjacentRepeats=counted.reduce((sum,r,i)=>{
  if(!i)return sum;
  const prev=counted[i-1];
  return sum+(prev.edition_date===isoDay(r.edition_date,-1)?
    r.families.filter(f=>prev.families.includes(f)).length:0);
 },0);
 return {status:complete?'COMPLETE':'INCOMPLETE',
  window_first:days[0],window_last:edition,
  recorded_editions:counted.length,required_editions:7,selected_slots:total,
  distinct_families:Object.keys(counts).length,
  selected_family_counts:counts,
  largest_family_selections:total?largest:null,
  largest_family_share:total?Number((largest/total).toFixed(4)):null,
  concentration_hhi:hhi,adjacent_edition_family_repeats:adjacentRepeats,
  variety_target_status:complete?(Object.keys(counts).length>=5&&largest<=4?'MET':'NOT_MET'):'NOT_EVALUABLE',
  goals:{minimum_distinct_families:5,maximum_one_family_in_fourteen:4},
  interpretation:'Seven fully observed editions are required for a pass/fail variety finding. Publisher identities and playable eligibility must not be inferred from a source registry.'};
}

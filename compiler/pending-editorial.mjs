import {allowedPendingEditionBranch} from './oct9-owner-exception.mjs';
// Strict evidence gate for a NEW unattended Release 1 pending-figure edition.
// This is not invoked by fixture/reader preview compilation or legacy illustrated editions.
const fail=s=>{throw new Error('Release 1 editorial evidence: '+s);};
const time=(v,name)=>{const t=Date.parse(v);if(!Number.isFinite(t))fail(name+' invalid date');return t;};
function httpsUrl(v,name){
  let u;try{u=new URL(v);}catch{fail(name+' must be a real absolute HTTPS source URL');}
  if(u.protocol!=='https:'||!u.hostname||/^(?:www\.)?example\.(?:com|net|org)$/i.test(u.hostname)||u.hostname==='localhost') fail(name+' must be a real HTTPS source, not a fixture');
  return u.href;
}
function narrative(s,name,min=16){
  if(typeof s!=='string'||s.trim().length<min) fail(name+' incomplete');
}
export function validateNewPendingEditorial({bundle,state}){
  if(bundle.fixture_only||bundle.producer_receipt?.preview_only)fail('fixtures/previews cannot be production editions');
  if(state.state!=='BUNDLE_READY'||state.stage!=='BUNDLE')fail('a new pending release needs a sealed BUNDLE_READY execution');
  if(!allowedPendingEditionBranch({state,bundle})||typeof state.execution_id!=='string'||!state.execution_id.trim())fail('edition branch and execution identity inconsistent');
  if(bundle.stories.length!==6)fail('six stories required');
  const ids=new Set(),sources=new Set();
  const noon=time(bundle.edition_date+'T12:00:00Z','edition date');
  for(const [i,story] of bundle.stories.entries()){
    if(ids.has(story.id))fail('duplicate story identity '+story.id);
    ids.add(story.id);
    const source=httpsUrl(story.source?.url,'story source '+(i+1));
    if(sources.has(source))fail('six distinct primary story sources required');
    sources.add(source);
    narrative(story.summary,'story summary '+(i+1),35);
    narrative(story.why_it_matters,'Why it matters '+(i+1),25);
    narrative(story.image_alt_intent,'story illustration description '+(i+1),28);
    const published=time(story.source.published_at,'original story publication '+(i+1));
    const retrieved=time(story.source.retrieved_at,'source retrieved '+(i+1));
    const age=(noon-published)/3600000;
    if(age < -18 || age>168)fail('story outside supported 168h freshness window '+(i+1));
    if(retrieved<published-86400000)fail('source read evidence predates original publication '+(i+1));
    if(age>72)narrative(story.source.freshness_reason,'justified extended fallback '+(i+1),30);
    const evidence=story.source.read_evidence;
    if(!evidence||evidence.status!=='verified'||evidence.full_source_read!==true)fail('verified full-source read required '+(i+1));
    if(!['publisher_main_text','publisher_verified_metadata','independent_full_text'].includes(evidence.method))fail('source-read method invalid '+(i+1));
    time(evidence.read_at,'source-read timestamp '+(i+1));
    narrative(evidence.scope,'source-read scope '+(i+1),15);
  }
  const skills=bundle.stories.find(s=>s.agent_skills===true);
  narrative(skills?.agent_skills_evidence,'concrete reusable Agent Skills value',45);
  for(const [kind,items] of [['video',bundle.videos],['podcast',bundle.podcasts]]){
    for(const [i,item] of items.entries()){
      httpsUrl(item.url,kind+' link '+(i+1));
      time(item.original_date,kind+' original episode date '+(i+1));
      const evidence=item.verification;
      if(!evidence || evidence.identity_verified!==true || evidence.duration_verified!==true)fail(kind+' identity/runtime unverified '+(i+1));
      time(evidence.checked_at,kind+' verification time '+(i+1));
      httpsUrl(evidence.runtime_source_url,kind+' duration evidence '+(i+1));
      narrative(item.summary,kind+' editorial summary '+(i+1),30);
    }
  }
  const wl=bundle.watchlist;
  time(wl?.refreshed_at,'Watchlist refresh timestamp');
  if(![...wl.new,...wl.updated,...wl.carried_forward].length)fail('Watchlist cannot be empty');
  for(const entry of [...wl.new,...wl.updated]){
    httpsUrl(entry?.evidence?.url,'Watchlist updated/new evidence URL');
    time(entry?.evidence?.date,'Watchlist evidence publication date');
  }
  return {result:'PASS',stories:6,verified_videos:2,verified_podcasts:2,agent_skills:1,image_generation_required:false};
}

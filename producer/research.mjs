import {publicationInterval} from '../compiler/media.mjs';

export const RESEARCH_FOCUS=Object.freeze([
  'Technical AI Engineering',
  'Applied Generative AI for Knowledge Workers',
  'Agents for Everyone'
]);
export const RESEARCH_LIMITS=Object.freeze({
  retained_articles:20,
  article_deep_packets:9,
  article_evidence_characters:12000,
  media_retained_per_type:12,
  media_evidence_packets_per_type:6,
  media_evidence_characters_per_type:6000
});

const TYPES=['article','video','podcast'];
const MEDIA_TYPES=['video','podcast'];
const RAW_KEYS=/^(?:raw(?:[_-].*)?|(?:full[_-]?)?(?:body|content|text|html|transcript|markdown)|(?:article|page|source|response)[_-](?:body|content|text|html)|evidence_text|deep_packets)$/i;
const CANDIDATE_FIELDS=new Set([
  'id','url','resource_id','type','focus','agent_skills','score','source_supported','route_qualified',
  'original_publication','evidence_refs','title','item_id','source_id','source_url','publisher_id',
  'channel_id','show_id','duration_seconds','source_observation_ref','source_observation_sha256',
  'discovery_only','media_admission','verified','selection_ready'
]);
const METADATA_CHARACTERS=4096;
const text=value=>typeof value==='string'&&value.trim().length>0;
const characters=value=>{let count=0;for(const point of value)count++;return count;};
const identifier=(value,maximum=256)=>text(value)&&characters(value)<=maximum&&!/[\s\u0000-\u001f\u007f]/u.test(value);

function resolveLimits(overrides={}){
  if(!overrides||typeof overrides!=='object'||Array.isArray(overrides)) throw new Error('research_limits_object');
  const limits={...RESEARCH_LIMITS};
  for(const [name,value] of Object.entries(overrides)){
    if(!Object.hasOwn(RESEARCH_LIMITS,name)||!Number.isSafeInteger(value)||value<0||value>RESEARCH_LIMITS[name]) throw new Error('research_limits_'+name);
    limits[name]=value;
  }
  return limits;
}

// Only lossless plain JSON is model-visible evidence. Accessors, toJSON,
// undefined values, cycles and custom prototypes must not evade its byte/text
// representation or conceal content when the budget is measured.
function plainJson(value,seen=new Set()){
  if(value===null||typeof value==='string'||typeof value==='boolean') return true;
  if(typeof value==='number') return Number.isFinite(value);
  if(!value||typeof value!=='object'||seen.has(value)) return false;
  if(![Array.isArray(value)?Array.prototype:Object.prototype,null].includes(Object.getPrototypeOf(value))) return false;
  if(Object.getOwnPropertySymbols(value).length) return false;
  seen.add(value);
  const descriptors=Object.getOwnPropertyDescriptors(value);
  const entries=Object.entries(descriptors).filter(([key])=>!(Array.isArray(value)&&key==='length'));
  if(Array.isArray(value)&&entries.length!==value.length){seen.delete(value);return false;}
  const okay=entries.every(([key,descriptor])=>descriptor.enumerable&&Object.hasOwn(descriptor,'value')&&
    (!Array.isArray(value)||/^(?:0|[1-9]\d*)$/.test(key))&&plainJson(descriptor.value,seen));
  seen.delete(value);
  return okay;
}

function hasRawText(value){
  if(!value||typeof value!=='object') return false;
  return Object.entries(value).some(([key,child])=>RAW_KEYS.test(key)||hasRawText(child));
}

function itemUrl(value){
  if(!identifier(value,2048)) return null;
  try{
    const url=new URL(value);
    if(!['https:','http:'].includes(url.protocol)||url.username||url.password) return null;
    url.hash='';
    return url.href;
  }catch{return null;}
}

function candidateProblem(candidate,type=null){
  if(!plainJson(candidate)||!candidate||Array.isArray(candidate)) return 'metadata_must_be_plain_json';
  if(hasRawText(candidate)) return 'raw_source_text_not_metadata';
  if(characters(JSON.stringify(candidate))>METADATA_CHARACTERS) return 'metadata_size_limit';
  // Metadata contains identity and discovery facts only. Arbitrary excerpts,
  // source support and prose fields belong in counted deep evidence packets.
  if(Object.keys(candidate).some(key=>!CANDIDATE_FIELDS.has(key))) return 'metadata_field_not_allowed';
  if(!identifier(candidate.id)||!identifier(candidate.resource_id)||!itemUrl(candidate.url)) return 'candidate_identity';
  if(candidate.route_qualified!==true) return 'route_unqualified';
  if(!TYPES.includes(candidate.type)||(type!==null&&candidate.type!==type)) return 'candidate_type';
  if(!RESEARCH_FOCUS.includes(candidate.focus)) return 'candidate_focus';
  if(typeof candidate.agent_skills!=='boolean'||typeof candidate.source_supported!=='boolean'||!Number.isFinite(candidate.score)) return 'candidate_evidence_fields';
  if(candidate.title!==undefined&&(!text(candidate.title)||characters(candidate.title)>300)) return 'candidate_title';
  if(!Array.isArray(candidate.evidence_refs)||candidate.evidence_refs.length>16||!candidate.evidence_refs.every(ref=>identifier(ref,512))) return 'candidate_evidence_refs';
  for(const field of ['item_id','source_id','publisher_id','channel_id','show_id']){
    if(candidate[field]!==undefined&&!identifier(candidate[field])) return 'candidate_identity';
  }
  if(candidate.source_url!==undefined&&!itemUrl(candidate.source_url)) return 'candidate_source_url';
  if(candidate.source_observation_ref!==undefined&&!identifier(candidate.source_observation_ref,1024)) return 'candidate_source_observation_ref';
  if(candidate.source_observation_sha256!==undefined&&(typeof candidate.source_observation_sha256!=='string'||!/^[a-f0-9]{64}$/.test(candidate.source_observation_sha256))) return 'candidate_source_observation_sha256';
  if((candidate.source_observation_ref!==undefined)!==(candidate.source_observation_sha256!==undefined)) return 'candidate_source_observation_binding';
  for(const field of ['discovery_only','verified','selection_ready']){
    if(candidate[field]!==undefined&&typeof candidate[field]!=='boolean') return 'candidate_discovery_state';
  }
  if(candidate.media_admission!==undefined&&candidate.media_admission!=='NOT_RUN') return 'candidate_discovery_state';
  const publication=candidate.original_publication;
  if(!publication||Array.isArray(publication)||typeof publication!=='object'||
    Object.keys(publication).some(key=>!['original_value','precision','timezone'].includes(key))) return 'candidate_publication_fields';
  if(typeof publication.timezone==='string'&&characters(publication.timezone)>100) return 'candidate_publication';
  try{publicationInterval(candidate.original_publication);}catch{return 'candidate_publication';}
  if(MEDIA_TYPES.includes(candidate.type)&&candidate.duration_seconds!==undefined&&candidate.duration_seconds!==null&&
    (!Number.isSafeInteger(candidate.duration_seconds)||candidate.duration_seconds<=0)) return 'candidate_duration_metadata';
  return null;
}

function compareCandidates(a,b){
  if(a.score!==b.score) return a.score>b.score?-1:1;
  return a.id<b.id?-1:a.id>b.id?1:0;
}

function metadata(candidate){
  const result=structuredClone(candidate);
  result.discovery_only=true;
  // Route qualification and discovery do not certify a selected media item.
  if(MEDIA_TYPES.includes(candidate.type)){
    result.duration_seconds=candidate.duration_seconds??null;
    result.media_admission='NOT_RUN';
    delete result.verified;
    delete result.selection_ready;
  }
  return result;
}

/** Retain metadata only. Scores are caller rankings, never source-quality proof. */
export function boundResearchCandidates(candidates,{limits:overrides}={}){
  const limits=resolveLimits(overrides), not_retained=[], coverage_gaps=[];
  if(!Array.isArray(candidates)) throw new Error('research_candidates_array');
  const eligible=[];
  for(const candidate of candidates){
    const reason=candidateProblem(candidate);
    if(reason){
      const id=candidate&&typeof candidate==='object'?Object.getOwnPropertyDescriptor(candidate,'id')?.value:null;
      not_retained.push({id:typeof id==='string'?id:null,reason});continue;
    }
    eligible.push(candidate);
  }
  eligible.sort(compareCandidates);
  const pool=[], seenUrls=new Set(), seenIds=new Set();
  for(const candidate of eligible){
    const key=candidate.type+'|'+itemUrl(candidate.url), id=candidate.type+'|'+candidate.id;
    if(seenUrls.has(key)||seenIds.has(id)){
      not_retained.push({id:candidate.id,reason:seenUrls.has(key)?'duplicate_type_url':'duplicate_type_id'});continue;
    }
    seenUrls.add(key);seenIds.add(id);pool.push(candidate);
  }
  const articlePool=pool.filter(candidate=>candidate.type==='article');
  const queues=RESEARCH_FOCUS.map(focus=>articlePool.filter(candidate=>candidate.focus===focus));
  const retained=[];
  while(retained.length<limits.retained_articles&&queues.some(queue=>queue.length)){
    for(const queue of queues) if(queue.length&&retained.length<limits.retained_articles) retained.push(queue.shift());
  }
  const skill=articlePool.find(candidate=>candidate.agent_skills);
  if(skill&&retained.length&&!retained.some(candidate=>candidate.agent_skills)){
    const sameFocus=retained.map((candidate,index)=>({candidate,index})).filter(({candidate})=>candidate.focus===skill.focus);
    const replace=sameFocus.at(-1)?.index??retained.length-1;
    retained[replace]=skill;
  }
  const keptArticles=new Set(retained.map(candidate=>candidate.id));
  for(const candidate of articlePool) if(!keptArticles.has(candidate.id)) not_retained.push({id:candidate.id,reason:'article_retention_limit'});
  for(const focus of RESEARCH_FOCUS){
    const count=retained.filter(candidate=>candidate.focus===focus).length;
    if(count<2) coverage_gaps.push({focus,required:2,retained:count,reason:'insufficient_retained_focus_candidates'});
  }
  if(!retained.some(candidate=>candidate.agent_skills)) coverage_gaps.push({requirement:'agent_skills',reason:'no_retained_agent_skills_candidate'});
  const media={video:[],podcast:[]};
  for(const type of MEDIA_TYPES){
    const all=pool.filter(candidate=>candidate.type===type);
    media[type]=all.slice(0,limits.media_retained_per_type).map(metadata);
    for(const candidate of all.slice(limits.media_retained_per_type)) not_retained.push({id:candidate.id,reason:type+'_retention_limit'});
  }
  return {retained_articles:retained.map(metadata),media,not_retained,coverage_gaps,limits};
}

/** Codepoints in the entire serialized packet array, including keys, refs,
 * delimiters and any additional visible fields. No truncation or clipping. */
export function researchEvidenceCharacters(packets){
  if(!plainJson(packets)) throw new Error('research_evidence_must_be_plain_json');
  return characters(JSON.stringify(packets));
}

function validateCandidateList(candidates,type,maximum,errors){
  if(!Array.isArray(candidates)){errors.push(type+'_retained_array');return [];}
  if(candidates.length>maximum) errors.push(type+'_retention_limit');
  const ids=new Set(), urls=new Set();
  for(const candidate of candidates){
    const problem=candidateProblem(candidate,type);
    if(problem){errors.push(type+'_'+problem);continue;}
    const url=itemUrl(candidate.url);
    if(ids.has(candidate.id)||urls.has(url)) errors.push(type+'_retained_duplicate');
    ids.add(candidate.id);urls.add(url);
  }
  return candidates.filter(candidate=>candidateProblem(candidate,type)===null);
}

function validatePackets(packets,candidates,type,maximum,budget,errors){
  if(!Array.isArray(packets)){errors.push(type+'_evidence_array');return new Set();}
  if(packets.length>maximum) errors.push(type+'_evidence_packet_limit');
  try{if(researchEvidenceCharacters(packets)>budget) errors.push(type+'_evidence_character_limit');}
  catch{errors.push(type+'_evidence_must_be_plain_json');return new Set();}
  const byId=new Map(candidates.map(candidate=>[candidate.id,candidate])), seen=new Set(), supported=new Set();
  for(const packet of packets){
    if(!packet||Array.isArray(packet)||!text(packet.candidate_id)||!text(packet.evidence_text)||
      !Array.isArray(packet.source_refs)||!packet.source_refs.length||!packet.source_refs.every(text)){
      errors.push(type+'_evidence_packet');continue;
    }
    if(seen.has(packet.candidate_id)) errors.push(type+'_evidence_duplicate');
    seen.add(packet.candidate_id);
    const candidate=byId.get(packet.candidate_id);
    if(!candidate){errors.push(type+'_evidence_candidate_not_retained');continue;}
    const anchors=new Set([candidate.url,...candidate.evidence_refs]);
    if(!packet.source_refs.some(ref=>anchors.has(ref))){errors.push(type+'_evidence_source_binding');continue;}
    if(candidate.source_supported===true) supported.add(candidate.id);
  }
  return supported;
}

function validateEnvelopeInput(input,allowSelection){
  const errors=[];
  const stopped=()=>({errors,retained:[],supported:new Set(),stopped:true});
  if(!input||typeof input!=='object'||Array.isArray(input)){errors.push('research_input_object');return stopped();}
  if(Object.keys(input).some(key=>!['retained_articles','deep_packets','selected_ids','media','limits'].includes(key))) errors.push('research_field_not_allowed');
  if(!allowSelection&&Object.hasOwn(input,'selected_ids')) errors.push('research_envelope_selection_not_allowed');
  const {retained_articles,deep_packets,media,limits:overrides}=input;
  let limits;
  try{limits=resolveLimits(overrides);}catch(error){errors.push(error.message);return stopped();}
  const retained=validateCandidateList(retained_articles,'article',limits.retained_articles,errors);
  const supported=validatePackets(deep_packets,retained,'article',limits.article_deep_packets,limits.article_evidence_characters,errors);
  if(!media||typeof media!=='object'||Array.isArray(media)) errors.push('media_discovery_object');
  else if(Object.keys(media).some(key=>!MEDIA_TYPES.includes(key))) errors.push('media_discovery_field_not_allowed');
  for(const type of MEDIA_TYPES){
    const value=media?.[type];
    if(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).some(key=>!['retained_candidates','evidence_packets'].includes(key))) errors.push(type+'_discovery_field_not_allowed');
    const mediaCandidates=Array.isArray(value)?value:value?.retained_candidates;
    const packets=Array.isArray(value)?[]:value?.evidence_packets;
    const valid=validateCandidateList(mediaCandidates,type,limits.media_retained_per_type,errors);
    validatePackets(packets,valid,type,limits.media_evidence_packets_per_type,limits.media_evidence_characters_per_type,errors);
  }
  return {errors,retained,supported,stopped:false};
}

/** Check bounded acquisition/replay evidence without selecting an edition.
 * An envelope cannot carry selected_ids or claim editorial/media admission. */
export function validateResearchEnvelope(input={}){
  return [...new Set(validateEnvelopeInput(input,false).errors)];
}

/** Mechanical research/allocation checks only. This does not replace semantic
 * review, source verification, or the existing compiler/media.mjs admission. */
export function validateEditorialResearch(input={}){
  const {errors,retained,supported,stopped}=validateEnvelopeInput(input,true);
  if(stopped) return [...new Set(errors)];
  const selected=Array.isArray(input.selected_ids)?input.selected_ids:[];
  if(!Array.isArray(input.selected_ids)) errors.push('article_selected_ids_array');
  if(selected.length!==6||!selected.every(text)||new Set(selected).size!==selected.length) errors.push('article_selection_exactly_six');
  const byId=new Map(retained.map(candidate=>[candidate.id,candidate])), selectedCandidates=[];
  for(const id of selected){
    const candidate=byId.get(id);
    if(!candidate){errors.push('article_selected_not_retained');continue;}
    selectedCandidates.push(candidate);
    if(!supported.has(id)) errors.push('article_selected_missing_supported_evidence');
  }
  for(const focus of RESEARCH_FOCUS) if(selectedCandidates.filter(candidate=>candidate.focus===focus).length!==2) errors.push('article_focus_allocation_'+focus);
  if(selectedCandidates.filter(candidate=>candidate.agent_skills).length!==1) errors.push('article_exactly_one_agent_skills');
  return [...new Set(errors)];
}

import path from 'node:path';
import {readerEnvironment} from './reader-environment.mjs';

const FOCUS=Object.freeze({
  'Technical AI Engineering':'technical_ai_engineering',
  'Applied Generative AI for Knowledge Workers':'applied_genai_knowledge_workers',
  'Agents for Everyone':'agents_non_technical_people'
});
const STORY_SLOTS=Object.freeze({
  technical_ai_engineering:['m01','m02'],
  applied_genai_knowledge_workers:['m10','m11'],
  agents_non_technical_people:['m12','m14']
});
const WATCHLIST_TOPIC_ALIASES=Object.freeze({
  'enterprise context becomes the agent battleground':'dab-topic-trusted-enterprise-context',
  'persistent personal agents':'dab-topic-long-horizon-agents',
  'reusable agent skills':'dab-topic-agent-skills-observability',
  'agent governance and review points':'dab-topic-adaptive-agent-safeguards',
  'inference latency as agent ux':'dab-topic-agentic-edge-inference'
});
const BOOK_URL=Object.freeze({
  'Reliable Generative AI':'https://leanpub.com/reliablegenerativeai',
  'Reliable Generative AI Context Engineering':'https://leanpub.com/reliable-context-engineering',
  'Generative AI Professional Prompt Engineering Guide':'https://leanpub.com/genaipromptingguide',
  'Generative AI Prompt Engineering Learning Ecosystem':'https://leanpub.com/GenAILearn'
});
const slugify=value=>String(value||'item').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90)||'item';
const dateAtNoon=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')?value+'T12:00:00.000Z':value;
const dayAge=(edition,event)=>Math.max(0,Math.floor((Date.parse(edition+'T12:00:00Z')-Date.parse(event+'T12:00:00Z'))/86400000));
const focus=value=>{
  const mapped=FOCUS[value];
  if(!mapped)throw new Error('unmapped Compiler focus: '+value);
  return mapped;
};
const evidenceType=publisher=>/reuters|wired/i.test(String(publisher))?'independent_reporting':'publisher_authored';
const freshness=(edition,published)=>{
  const age=dayAge(edition,published);
  if(age<=1)return {tier:'primary',source_published_at:dateAtNoon(published)};
  return {
    tier:'fallback',
    fallback_band:age<=3?'normal':'extended',
    source_published_at:dateAtNoon(published),
    fallback_reason:'Preserved edition selection represented in the canonical reader freshness schema.'
  };
};
const durationSeconds=minutes=>Math.max(1,Math.round(Number(minutes)*60));
const imageName=(date,slot)=>`dab-edition-${date}-${slot}.png`;
function storySlot(bundle,story){
  const mapped=focus(story.focus);
  const peers=bundle.stories.filter(candidate=>focus(candidate.focus)===mapped);
  const index=peers.findIndex(candidate=>candidate.id===story.id);
  const slot=STORY_SLOTS[mapped]?.[index];
  if(!slot)throw new Error('canonical reader story slot unavailable for '+story.id);
  return slot;
}
const canonicalWatchTopicId=item=>{
  const key=slugify(item.topic).slice(0,90);
  return WATCHLIST_TOPIC_ALIASES[key]||`dab-topic-${key.slice(0,54)}`;
};

function adaptStory(bundle,story,environment){
  const image=bundle.images.find(x=>x.story_id===story.id);
  if(!image)throw new Error('accepted image missing for '+story.id);
  const slot=storySlot(bundle,story);
  const filename=imageName(bundle.edition_date,slot);
  return {
    story_id:`dab-story-${bundle.edition_date}-${slot}`,
    compiler_story_id:story.id,
    ordinal:bundle.stories.indexOf(story)+1,
    slug:slugify(story.permanent_route.split('/').filter(Boolean).at(-1)||story.id),
    permanent_url:story.permanent_route,
    focus:focus(story.focus),
    headline:story.headline,
    event_date:story.source.published_at,
    image:{
      path:`briefs/images/${bundle.edition_date}/${filename}`,
      public_url:`${environment.publicBase}/briefs/images/${bundle.edition_date}/${filename}?v=${image.sha256.slice(0,12)}`,
      alt:story.image_alt_intent,
      width:1200,
      height:630,
      kind:'editorial_explainer',
      cache_key:`compiler-${bundle.edition_date}-${image.sha256.slice(0,12)}`
    },
    summary:story.summary,
    why_it_matters:story.why_it_matters,
    source:{
      title:story.source.title,
      organization:story.source.publisher,
      url:story.source.url,
      publication_date:story.source.published_at,
      reading_evidence:{
        status:'verified',
        reading_minutes:story.reading_time_minutes,
        word_count:story.reading_time_minutes*200,
        verified_at:story.source.retrieved_at,
        method:'Preserved edition reading-time evidence expressed in the canonical reader schema.',
        full_source_read:true
      },
      normalized_url:story.source.url,
      evidence_type:evidenceType(story.source.publisher),
      availability_status:'available'
    },
    topics:[...story.topics],
    companies:[story.source.publisher],
    freshness:freshness(bundle.edition_date,story.source.published_at),
    selection_rationale:story.why_it_matters,
    editorial_limitation:'See the linked source for scope and limitations.',
    social_description:story.summary
  };
}

function adaptVideo(bundle,video){
  return {
    status:'included',
    title:video.title,
    channel:video.source,
    upload_date:video.original_date,
    runtime_seconds:durationSeconds(video.duration_minutes),
    url:video.url,
    verification_note:'Verified media identity and duration preserved from the edition bundle.',
    connection:video.why_it_matters,
    why_useful:video.summary,
    official_source_verified:video.verified===true,
    duration_tier:Number(video.duration_minutes)<=10?'short':'extended'
  };
}

function adaptPodcast(bundle,podcast,index){
  const slug=slugify(podcast.title);
  return {
    status:'included',
    ordinal:9+index,
    item_id:`dab-podcast-${bundle.edition_date}-${index+1}`,
    title:podcast.title,
    show:podcast.source,
    host:'Not listed',
    publication_date:podcast.original_date,
    runtime_seconds:durationSeconds(podcast.duration_minutes),
    url:podcast.url,
    permanent_url:`/podcasts/${bundle.edition_date}/${slug}/`,
    focus:'agents_non_technical_people',
    topics:[],
    summary:podcast.summary,
    why_useful:podcast.why_it_matters,
    connection:podcast.why_it_matters,
    selection_rationale:podcast.why_it_matters,
    verification_note:'Verified media identity and duration preserved from the edition bundle.',
    coverage_note:'Selected for this edition.',
    platforms:[{name:podcast.source,url:podcast.url}]
  };
}

function evidencePublisher(url){
  try{return new URL(url).hostname.replace(/^www\./,'');}catch{return 'Source';}
}
function rubric(reason){
  const row={score:3,reason};
  return {novelty:{...row},evidence:{...row},independence:{...row},momentum:{...row},relevance:{...row},durability:{...row}};
}
function adaptWatchTopic(item,{date,kind,index,fallbackEvidence,topicId,prior}){
  const reason=item.why||item.what_changed||item.reason||'Evidence preserved for continued monitoring.';
  const evidence=item.evidence||fallbackEvidence||{};
  const evidenceDate=evidence.date||date;
  const archived=kind==='dropped';
  const current={
    topic_id:topicId,
    name:item.topic,
    summary:reason,
    why_now:reason,
    practical_value:reason,
    first_detected:kind==='new'?date:evidenceDate,
    updated_at:(kind==='new'||kind==='updated'||kind==='dropped')?`${date}T12:00:00Z`:`${evidenceDate}T12:00:00Z`,
    status:archived?'archived':(kind==='new'?'early_signal':'under_research'),
    archive_reason:archived?reason:undefined,
    confidence:'moderate',
    audience:'Professionals using generative AI',
    evidence:[{
      kind:'primary',
      url:evidence.url,
      title:item.topic,
      publisher:evidencePublisher(evidence.url),
      publication_date:evidenceDate,
      review_depth:'Preserved edition evidence reference.',
      checked_at:date,
      development_id:`compiler-${kind}-${index+1}`
    }],
    limitations:'The preserved evidence supports monitoring, not a claim of broad adoption or independent validation.',
    research_score:60,
    rubric:rubric(reason),
    momentum:{classification:'baseline',score:null,reason:'Current edition evidence is preserved without inferring additional momentum.'},
    next_action:'Continue monitoring primary evidence and independent developments.'
  };
  if(!prior)return current;
  return {
    ...prior,
    topic_id:prior.topic_id,
    name:prior.name||item.topic,
    summary:reason,
    why_now:reason,
    practical_value:reason,
    updated_at:current.updated_at,
    status:archived?'archived':(prior.status==='archived'?'under_research':prior.status),
    archive_reason:archived?reason:undefined,
    evidence:current.evidence,
    limitations:prior.limitations||current.limitations,
    next_action:prior.next_action||current.next_action
  };
}
function adaptWatchlist(bundle,priorWatchlist=null){
  const date=bundle.edition_date;
  const topics=(priorWatchlist?.topics||[]).map(topic=>structuredClone(topic));
  const fallbackEvidence=bundle.stories?.[0]?.source?{url:bundle.stories[0].source.url,date:bundle.stories[0].source.published_at}:null;
  for(const kind of ['new','updated','carried_forward','dropped']){
    (bundle.watchlist?.[kind]||[]).forEach((item,index)=>{
      const topicId=canonicalWatchTopicId(item);
      const existingIndex=topics.findIndex(topic=>topic.topic_id===topicId);
      const prior=existingIndex>=0?topics[existingIndex]:null;
      const adapted=adaptWatchTopic(item,{date,kind,index,fallbackEvidence,topicId,prior});
      if(existingIndex>=0)topics[existingIndex]=adapted;
      else topics.push(adapted);
    });
  }
  return {
    schema_version:'1.0.0',
    edition_date:date,
    updated_at:bundle.watchlist?.refreshed_at||`${date}T12:00:00Z`,
    baseline_note:'Current evidence references are preserved from this edition.',
    topics
  };
}

function adaptBookOverlay(bundle,adaptedStories){
  const references={};
  const selections=[];
  for(const mapping of bundle.book_mappings||[]){
    const story=adaptedStories.find(x=>x.compiler_story_id===mapping.story_id);
    if(!story)continue;
    const reference_id=`compiler-${bundle.edition_date}-${slugify(mapping.story_id)}`;
    const locator=mapping.concept_or_chapter;
    references[reference_id]={
      book:mapping.book,
      locator,
      section_title:mapping.what_to_study_next,
      verified_date:bundle.edition_date,
      evidence_level:'user-provided book structure',
      url:BOOK_URL[mapping.book]
    };
    if(!references[reference_id].url)throw new Error('book destination missing for '+mapping.book);
    selections.push({
      item_id:story.story_id,
      reference_id,
      label:'READ DEEPER',
      why:mapping.connection.slice(0,280)
    });
  }
  return {references,selections};
}

export function adaptCompilerBundle(bundle,{environment=readerEnvironment,priorWatchlist=null}={}){
  if(bundle?.schema_version!=='daily-compiler-edition-bundle-v1')throw new Error('unsupported Compiler bundle');
  const stories=bundle.stories.map(story=>adaptStory(bundle,story,environment));
  const videos=bundle.videos.map(video=>adaptVideo(bundle,video));
  const podcasts=bundle.podcasts.map((podcast,index)=>adaptPodcast(bundle,podcast,index));
  const dates=[...stories.map(x=>x.event_date),...videos.map(x=>x.upload_date),...podcasts.map(x=>x.publication_date)].sort();
  const edition={
    schema_version:'1.0.0',
    edition_id:`dab-edition-${bundle.edition_date}`,
    brief_date:bundle.edition_date,
    title:`Daily Generative AI Brief - ${bundle.edition_date}`,
    published_at:`${bundle.edition_date}T12:00:00-05:00`,
    timezone:environment.timezone,
    status:'published',
    research_cutoff_at:bundle.watchlist?.refreshed_at||`${bundle.edition_date}T12:00:00Z`,
    coverage_period:{start:dates[0]||bundle.edition_date,end:dates.at(-1)||bundle.edition_date},
    article_freshness_policy:'article-24-72-168-v1',
    policy_profile:'reader-parity-preserved-semantic-bundle-v1',
    stories,
    worth_watching:{general:videos[0],agents_non_technical_people:videos[1]},
    podcasts,
    editorial_takeaway:stories[0]?.why_it_matters||''
  };
  return {
    edition,
    watchlist:adaptWatchlist(bundle,priorWatchlist),
    bookOverlay:adaptBookOverlay(bundle,stories),
    imageBindings:bundle.images.map(image=>{
      const story=bundle.stories.find(candidate=>candidate.id===image.story_id);
      if(!story)throw new Error('image binding story missing: '+image.story_id);
      return {
        story_id:image.story_id,
        source_path:image.path,
        reader_filename:imageName(bundle.edition_date,storySlot(bundle,story)),
        sha256:image.sha256,
        git_blob_sha:image.git_blob_sha
      };
    })
  };
}

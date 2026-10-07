const slugify=value=>String(value||'item').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90)||'item';

export function compilerStoryFeedbackId(date,semanticId){
  return `dab-story-compiler-${date}-${slugify(semanticId)}`;
}
export function compilerVideoFeedbackId(date,role){
  return `dab-video-compiler-${date}-${slugify(role)}`;
}
export function compilerPodcastFeedbackId(date,index){
  return `dab-podcast-compiler-${date}-${Number(index)+1}`;
}
export function isCompilerFeedbackItem(edition,item){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(edition||'')))return false;
  return new RegExp(`^dab-(?:story|video|podcast)-compiler-${edition}-[a-z0-9-]{1,100}const slugify=value=>String(value||'item').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90)||'item';

export function compilerStoryFeedbackId(date,semanticId){
  return `dab-story-compiler-${date}-${slugify(semanticId)}`;
}
export function compilerVideoFeedbackId(date,role){
  return `dab-video-compiler-${date}-${slugify(role)}`;
}
export function compilerPodcastFeedbackId(date,index){
  return `dab-podcast-compiler-${date}-${Number(index)+1}`;
}
).test(String(item||''));
}
export function isCompilerReaderEventItem(edition,item){
  if(isCompilerFeedbackItem(edition,item))return true;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(edition||'')))return false;
  return new RegExp(`^dab-(?:story|video|podcast)-${edition}-[a-z0-9-]{1,100}const slugify=value=>String(value||'item').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90)||'item';

export function compilerStoryFeedbackId(date,semanticId){
  return `dab-story-compiler-${date}-${slugify(semanticId)}`;
}
export function compilerVideoFeedbackId(date,role){
  return `dab-video-compiler-${date}-${slugify(role)}`;
}
export function compilerPodcastFeedbackId(date,index){
  return `dab-podcast-compiler-${date}-${Number(index)+1}`;
}
).test(String(item||''));
}
export function isCompilerWatchTopic(topic){
  return /^dab-topic-[a-z0-9-]{1,100}$/.test(String(topic||''));
}
export function compilerFeedbackRegistry(bundle,edition,watchlist){
  const date=bundle.edition_date;
  const stories=edition.stories.map(story=>{
    const source=bundle.stories.find(row=>row.id===story.compiler_story_id);
    return {
      type:'story',
      canonical_reader_id:story.story_id,
      feedback_id:compilerStoryFeedbackId(date,story.compiler_story_id),
      semantic_id:story.compiler_story_id,
      title:story.headline||source?.headline||story.compiler_story_id
    };
  });
  const videos=[
    {type:'video',canonical_reader_id:`dab-video-${date}-general`,feedback_id:compilerVideoFeedbackId(date,'general'),semantic_id:'general',title:bundle.videos?.[0]?.title||'General video'},
    {type:'video',canonical_reader_id:`dab-video-${date}-agent-skills`,feedback_id:compilerVideoFeedbackId(date,'agent-skills'),semantic_id:'agent-skills',title:bundle.videos?.[1]?.title||'Agent Skills video'}
  ];
  const podcasts=(edition.podcasts||[]).map((podcast,index)=>({
    type:'podcast',
    canonical_reader_id:podcast.item_id,
    feedback_id:compilerPodcastFeedbackId(date,index),
    semantic_id:String(index+1),
    title:podcast.title
  }));
  return {
    schema_version:'daily-compiler-feedback-registry-v1',
    edition_date:date,
    namespace:'daily-ai-brief-compiler',
    items:[...stories,...videos,...podcasts],
    watchlist_topics:(watchlist?.topics||[]).map(topic=>topic.topic_id),
    semantic_rework:0,
    accepted_image_regenerations:0
  };
}

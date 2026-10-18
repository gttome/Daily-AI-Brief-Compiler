// Forward-only publishing-organization diversity for newly sealed editions.
// The identity comes from the source URL, not producer-authored display labels.
export const DIVERSITY_EFFECTIVE_DATE='2026-10-19';
const DATE=/^\d{4}-\d{2}-\d{2}$/;
function hostOf(raw){
  try{
    const u=new URL(raw);
    if(u.protocol!=='https:')throw new Error('HTTPS required');
    return u.hostname.toLowerCase().replace(/^www\./,'');
  }catch{throw new Error('ARTICLE_SOURCE_IDENTITY_UNVERIFIED '+String(raw??''));}
}
export function articlePublisherKey(source){
  const host=hostOf(typeof source==='string'?source:source?.url);
  if(host==='aws.amazon.com'||host.endsWith('.aws.amazon.com')||host==='amazon.science')return 'aws';
  if(host==='sap.com'||host.endsWith('.sap.com'))return 'sap';
  if(host==='github.blog'||host==='github.com'||host.endsWith('.github.com'))return 'github';
  if(host==='google.com'||host.endsWith('.google.com')||host==='blog.google'||
    host==='research.google'||host==='deepmind.google'||host.endsWith('.googleblog.com'))return 'google';
  if(host==='microsoft.com'||host.endsWith('.microsoft.com'))return 'microsoft';
  if(host==='openai.com'||host.endsWith('.openai.com'))return 'openai';
  if(host==='anthropic.com'||host.endsWith('.anthropic.com'))return 'anthropic';
  if(host==='meta.com'||host.endsWith('.meta.com')||host==='about.fb.com')return 'meta';
  if(host==='huggingface.co'||host.endsWith('.huggingface.co'))return 'huggingface';
  const parts=host.split('.');
  // The hosting domain is a conservative fallback, not a claimed corporate owner.
  if(parts.length>=3&&/^(co|com|org|ac)$/.test(parts[parts.length-2])&&
      /^(uk|au|nz|jp)$/.test(parts[parts.length-1]))return parts.slice(-3).join('.');
  return parts.slice(-2).join('.');
}
export function validateArticleSourceDiversity(bundle){
  const date=bundle?.edition_date;
  if(typeof date!=='string'||!DATE.test(date))throw new Error('ARTICLE_DIVERSITY_DATE_REQUIRED');
  if(date<DIVERSITY_EFFECTIVE_DATE)return {result:'SKIPPED_HISTORICAL',date};
  if(!Array.isArray(bundle.stories)||bundle.stories.length!==6)
    throw new Error('ARTICLE_DIVERSITY_SIX_STORIES_REQUIRED');
  const counts={};
  for(const story of bundle.stories){
    const key=articlePublisherKey(story?.source);
    counts[key]=(counts[key]||0)+1;
  }
  const violations=[];
  if(Object.keys(counts).length<5)violations.push('at least five independent publishing organizations needed');
  for(const [key,count] of Object.entries(counts)){
    if(count>2)violations.push(key+' exceeds two of six');
  }
  for(const key of ['aws','sap'])if((counts[key]||0)>1)
    violations.push(key+' exceeds one of six');
  if(violations.length)
    throw new Error('ARTICLE_PUBLISHER_DIVERSITY_VIOLATION '+JSON.stringify({counts,violations}));
  return {result:'PASS',date,article_count:6,distinct_publishers:Object.keys(counts).length,
    publisher_counts:Object.fromEntries(Object.entries(counts).sort(([a],[b])=>a.localeCompare(b)))};
}

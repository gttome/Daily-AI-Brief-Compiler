// Exact, source-bound correction for article social-preview image metadata.
// Changes only og:image, twitter:image and the WebPage JSON-LD image field.
const BASE='https://gttome.github.io/Daily-AI-Brief-Compiler/';
const fail=reason=>{throw Error('premium_social_preview:'+reason);};
const decodeAttribute=value=>String(value).replace(/&(#x[0-9a-f]+|#[0-9]+|amp|quot|apos|lt|gt);/gi,(found,key)=>{
  const named={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>'};
  if(key[0]!=='#')return named[key.toLowerCase()];
  const isHex=key[1].toLowerCase()==='x';
  const n=parseInt(key.slice(isHex?2:1),isHex?16:10);
  return n>0&&n<=0x10ffff?String.fromCodePoint(n):found;
});
export function patchPremiumStoryPreview(html,{permanentUrl,imageUrl,imageAlt}){
  if(typeof html!=='string'||typeof imageAlt!=='string'||!imageAlt.trim())fail('missing_html_or_reviewed_alt');
  const path=typeof permanentUrl==='string'&&permanentUrl.startsWith(BASE)?permanentUrl.slice(BASE.length):'';
  const matched=/^stories\/(20\d{2}-\d{2}-\d{2})\/[a-z0-9-]+\/$/.exec(path);
  if(!matched)fail('untrusted_permanent_article');
  const date=matched[1],prefix=BASE+'briefs/images/'+date+'/dab-edition-'+date+'-';
  if(typeof imageUrl!=='string'||!imageUrl.startsWith(prefix)||
     !/^m(?:01|02|10|11|12|14)\.png\?v=[a-f0-9]{12}$/.test(imageUrl.slice(prefix.length)))
    fail('untrusted_premium_image_url');
  if(!html.includes('<link rel="canonical" href="'+permanentUrl+'" />'))
    fail('incorrect_article_canonical');
  const visible=[...html.matchAll(/<img\b[^>]*>/g)].filter(x=>{
    const src=/\bsrc="([^"]+)"/.exec(x[0]),alt=/\balt="([^"]*)"/.exec(x[0]);
    return src&&alt&&decodeAttribute(src[1])===imageUrl&&decodeAttribute(alt[1])===imageAlt;
  });
  if(visible.length!==1)fail('reviewed_visible_image_pairing_required');
  const pendingPrefix=BASE+'briefs/images/'+date+'/illustration-pending.svg?v=';
  const isPending=v=>typeof v==='string'&&v.startsWith(pendingPrefix)&&/^[a-f0-9]{12}$/.test(v.slice(pendingPrefix.length));
  const metaTags=[...html.matchAll(/<meta\b[^>]*>/g)].map(m=>m[0]);
  const tags={};
  for(const property of ['og:image','twitter:image']){
    const matching=metaTags.filter(tag=>tag.includes('property="'+property+'"'));
    if(matching.length!==1)fail('missing_or_duplicate_'+property);
    const image=/\bcontent="([^"]+)"/.exec(matching[0]);
    if(!image||!isPending(image[1]))fail('unexpected_prior_'+property);
    tags[property]={tag:matching[0],prior:image[1]};
  }
  if(tags['og:image'].prior!==tags['twitter:image'].prior)fail('unequal_old_preview_urls');
  const scripts=[...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g)].map(m=>m[0]);
  if(scripts.length!==1)fail('missing_or_duplicate_structured_data');
  const dataMatch=/<script\b[^>]*>([\s\S]*?)<\/script>/.exec(scripts[0]);
  let data;
  try{data=JSON.parse(dataMatch[1]);}catch{fail('unparseable_structured_data');}
  if(data['@type']!=='WebPage'||data.url!==permanentUrl||
     data.image!==tags['og:image'].prior)fail('structured_data_identity_or_prior_image_mismatch');
  const originalField='"image":'+JSON.stringify(tags['og:image'].prior);
  if(scripts[0].split(originalField).length!==2)fail('structured_data_image_field_not_unique');
  let out=html;
  for(const key of ['og:image','twitter:image']){
    const entry=tags[key];
    out=out.replace(entry.tag,entry.tag.replace('content="'+entry.prior+'"','content="'+imageUrl+'"'));
  }
  const updatedScript=scripts[0].replace(originalField,'"image":'+JSON.stringify(imageUrl));
  out=out.replace(scripts[0],updatedScript);
  if(out===html||!out.includes('"image":'+JSON.stringify(imageUrl)))fail('preview_patch_not_applied');
  return {html:out,fields_changed:3,original_image_url:tags['og:image'].prior,image_url:imageUrl,permanent_url:permanentUrl};
}

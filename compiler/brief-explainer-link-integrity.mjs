// Navigation/link hygiene for the two public explainer pages ONLY.
// Never mutate daily Brief editions or source/permanent story links.
const BASE='/Daily-AI-Brief-Compiler/';
export const EDITORIAL_EXPLAINER_ROUTES=Object.freeze([
 'sources/index.html','build-your-own-brief-compiler/index.html'
]);
const fail=s=>{throw Error('brief_explainer_link_integrity:'+s);};
const uniqueReplace=(source,oldText,newText,label)=>{
 if(source.split(oldText).length!==2)fail('layout_or_markup_drift:'+label);
 return source.replace(oldText,newText);
};
const HEADER_HOME='<li><a href="'+BASE+'">Home</a></li>';
const HEADER_BUILDER='<li><a href="'+BASE+'build-your-own-brief-compiler/">Build Your Own Brief</a></li>';
const FOOTER=/<nav aria-label="Publication footer" class="reader-footer-links">[\s\S]*?<\/nav>/;

export function assertUniqueBriefInternalLinks(html,{page}={}){
 const matches=[...String(html).matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>/gi)]
   .map(x=>x[1]).filter(href=>href.startsWith(BASE));
 const duplicates=[...new Set(matches)].filter(href=>matches.filter(x=>x===href).length>1);
 if(duplicates.length)fail('repeated_other_brief_page_link:'+(page||'unknown')+':'+duplicates.join('|'));
 const required=[
  BASE,BASE+'briefs-archive/',BASE+'watchlist/',
  BASE+'sources/',BASE+'build-your-own-brief-compiler/'
 ];
 for(const url of required){
  if(matches.filter(x=>x===url).length!==1)
   fail('missing_or_repeated_required_navigation:'+url);
 }
 return {result:'PASS',page:page||null,local_links:matches.length,
  unique_local_links:new Set(matches).size};
}
export function normalizeBriefExplainerPage(html,{page}){
 if(!['sources','builder'].includes(page))fail('unknown_info_page');
 let text=String(html);
 text=uniqueReplace(text,HEADER_HOME,'','duplicate_home_and_brand');
 const footer=text.match(FOOTER);
 if(!footer||text.match(new RegExp(FOOTER.source,'g'))?.length!==1)
   fail('footer_nav_cannot_be_deduplicated');
 text=text.replace(FOOTER,'');
 if(page==='sources'){
  text=uniqueReplace(text,HEADER_BUILDER,'','source_page_has_builder_cta');
  // The same Watchlist URL also exists in primary nav. Edit only the
  // specific explanatory callout so essential primary navigation is preserved.
  const startMarker='<div class="src-callout"><strong>For readers:</strong>';
  const start=text.indexOf(startMarker),end=text.indexOf('</div>',start);
  if(start<0||end<=start||text.indexOf(startMarker,start+1)>=0)
    fail('sources_reader_callout_changed');
  let callout=text.slice(start,end+'</div>'.length);
  for(const [before,after] of [
   ['<a href="'+BASE+'">today’s Brief</a>','today’s Brief'],
   ['<a href="'+BASE+'watchlist/">Emerging AI Watchlist</a>','the Emerging AI Watchlist'],
   ['<a href="'+BASE+'briefs-archive/">dated archive</a>','the dated archive']
  ]){
   callout=uniqueReplace(callout,before,after,'repeated_source_exploration_link');
  }
  text=text.slice(0,start)+callout+text.slice(end+'</div>'.length);
 }
 assertUniqueBriefInternalLinks(text,{page});
 return text;
}

// In the future edition's temporary Jekyll source, scope the same rules to
// /sources/ and /build-your-own-brief-compiler/. Other pages keep their layout.
export function tailorBriefExplainerJekyllLayout(layout){
 const onlyOther="{% unless page.permalink == '/sources/' or page.permalink == '/build-your-own-brief-compiler/' %}";
 const onlyNotSources="{% unless page.permalink == '/sources/' %}";
 let text=String(layout);
 if(text.includes(onlyOther))fail('layout_already_tailored');
 const oldHome="<li><a href=\"{{ '/' | relative_url }}\">Home</a></li>";
 text=uniqueReplace(text,oldHome,onlyOther+'\n            '+oldHome+'\n            {% endunless %}','jekyll_home_duplicate');
 const oldBuilder="<li><a href=\"{{ '/build-your-own-brief-compiler/' | relative_url }}\">Build Your Own Brief</a></li>";
 text=uniqueReplace(text,oldBuilder,onlyNotSources+'\n            '+oldBuilder+'\n            {% endunless %}','jekyll_builder_source_cta_duplicate');
 const footer='<nav aria-label="Publication footer" class="reader-footer-links">';
 const footerIndex=text.indexOf(footer),footerEnd=text.indexOf('</nav>',footerIndex);
 if(footerIndex<0||footerEnd<footerIndex||text.indexOf(footer,footerIndex+1)>=0)
  fail('jekyll_footer_changed');
 text=text.slice(0,footerIndex)+onlyOther+'\n        '+
  text.slice(footerIndex,footerEnd+6)+'\n        {% endunless %}'+text.slice(footerEnd+6);
 return text;
}

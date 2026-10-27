// One shared runtime closes the historical navigation gap without touching the
// immutable HTML of hundreds of previously published Briefs. No network calls.
export const GLOBAL_BRIEF_NAV_MARKER='DAILY_COMPILER_GLOBAL_HEADER_NAV_V1';
export const GLOBAL_BRIEF_NAV_SCRIPT=String.raw`
;(()=>{
  'use strict';
  // DAILY_COMPILER_GLOBAL_HEADER_NAV_V1
  const base='/Daily-AI-Brief-Compiler/';
  const sources=base+'sources/';
  const builder=base+'build-your-own-brief-compiler/';
  function apply(){
    const primary=document.querySelector('.ledger-primary-nav ul');
    if(!primary)return;
    const links=[...primary.querySelectorAll('a[href]')];
    const sourceLink=links.find(a=>a.getAttribute('href')===sources);
    if(!sourceLink)return; // only canonical Brief navigation is eligible
    const matching=links.filter(a=>a.getAttribute('href')===builder);
    if(matching.length>1)return; // never hide a preexisting authoring defect
    if(matching.length===0){
      const li=document.createElement('li'),a=document.createElement('a');
      a.setAttribute('href',builder);
      a.textContent='Build Your Own Brief';
      li.appendChild(a);
      sourceLink.parentElement.insertAdjacentElement('afterend',li);
    }
    // No second Builder destination at the bottom of the homepage.
    document.querySelectorAll('.reader-footer-links a[href="'+builder+'"]')
      .forEach(a=>a.remove());
    // A Sources CTA from an older generation is redundant when the header has
    // the same link. Retain its words without a duplicate clickable target.
    document.querySelectorAll('#source-builder a[href="'+builder+'"]')
      .forEach(a=>{
        const strong=document.createElement('strong');
        strong.textContent=a.textContent;
        a.replaceWith(strong);
      });
  }
  if(document.readyState==='loading')
    document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
})();
`;

export function appendGlobalBriefNavigation(audienceSource){
 const original=String(audienceSource);
 if(!original.startsWith('(()=>{')||
    !original.includes('api/audience')||
    !original.includes('/Daily-AI-Brief')){
   throw Error('audience_source_contract_changed');
 }
 if(original.includes(GLOBAL_BRIEF_NAV_MARKER))
   throw Error('global_nav_already_attached');
 return original.trimEnd()+'\n'+GLOBAL_BRIEF_NAV_SCRIPT+'\n';
}

/* Source-faithful full-resolution explanatory diagram viewer.
 * Adds accessible controls without changing accepted image URL, alt, bytes,
 * underlying story copy or initial placeholder images.
 */
(()=>{
  'use strict';
  function install(){
    const content=document.querySelector('main#content');
    if(!content)return;
    const images=[...content.querySelectorAll('img')].filter(img=>{
      try{const u=new URL(img.currentSrc||img.src,document.baseURI);
        return u.protocol==='https:' && u.hostname==='gttome.github.io' &&
          /^\/Daily-AI-Brief-Compiler\/briefs\/images\/20\d{2}-\d{2}-\d{2}\/dab-edition-20\d{2}-\d{2}-\d{2}-m(01|02|10|11|12|14)\.png$/.test(u.pathname);
      }catch{return false;}
    });
    if(!images.length)return;
    const dialog=document.createElement('dialog');
    dialog.className='premium-image-viewer';
    dialog.setAttribute('aria-label','Full-size explanatory diagram');
    const toolbar=document.createElement('div');
    toolbar.className='premium-image-viewer-toolbar';
    const heading=document.createElement('strong');
    heading.textContent='Full-size explanatory diagram';
    const external=document.createElement('a');
    external.textContent='Open original PNG';
    external.target='_blank';
    external.rel='noopener noreferrer';
    const close=document.createElement('button');
    close.type='button';close.textContent='Close';
    close.addEventListener('click',()=>dialog.close());
    toolbar.append(heading,external,close);
    const help=document.createElement('p');
    help.textContent='Pan horizontally and vertically to read the original labels at full size. The accepted image has not been altered.';
    help.className='premium-image-viewer-help';
    const viewport=document.createElement('div');
    viewport.className='premium-image-viewer-viewport';
    viewport.setAttribute('role','region');
    viewport.setAttribute('aria-label','Scrollable full-resolution diagram');
    viewport.tabIndex=0;
    dialog.append(toolbar,help,viewport);
    dialog.addEventListener('close',()=>{viewport.replaceChildren();});
    document.body.append(dialog);
    for(const img of images){
      if(img.dataset.premiumImageViewer==='ready')continue;
      img.dataset.premiumImageViewer='ready';
      const controls=document.createElement('div');
      controls.className='premium-image-enlarge-controls';
      const btn=document.createElement('button');
      btn.type='button';btn.className='premium-image-enlarge-button';
      btn.textContent='Enlarge diagram to read labels';
      btn.setAttribute('aria-label','Enlarge full-size explanatory diagram');
      btn.addEventListener('click',()=>{
        const url=img.currentSrc||img.src;
        if(typeof dialog.showModal!=='function'){window.open(url,'_blank','noopener,noreferrer');return;}
        const full=document.createElement('img');
        full.src=url;full.alt=img.alt;full.width=1200;full.height=630;
        full.decoding='async';
        full.className='premium-image-full-resolution';
        viewport.replaceChildren(full);
        external.href=url;
        dialog.showModal();
        viewport.scrollTop=0;viewport.scrollLeft=0;
        viewport.focus();
      });
      const link=document.createElement('a');
      link.className='premium-image-open-original';
      link.href=img.currentSrc||img.src;
      link.textContent='Open original image in new tab';
      link.target='_blank';link.rel='noopener noreferrer';
      controls.append(btn,link);
      // Keep original image markup, article HTML and story text untouched.
      const figure=img.parentElement?.tagName==='P'?img.parentElement:img;
      figure.insertAdjacentElement('afterend',controls);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
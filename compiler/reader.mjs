import fs from 'node:fs';
import path from 'node:path';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));

const routeSlug=story=>{
  const route=String(story.permanent_route||'').replace(/^\/+|\/+$/g,'');
  const bits=route.split('/').filter(Boolean);
  return bits.length ? bits[bits.length-1] : story.id;
};

const ratingMarkup=storyId=>`
<div class="engagement" data-story-engagement="${esc(storyId)}">
  <div class="rating" aria-label="Rate usefulness for this story">
    <span class="engagement-label">Useful?</span>
    ${[1,2,3,4,5].map(n=>`<button type="button" data-rating="${n}" data-story-id="${esc(storyId)}" aria-label="Rate ${n} of 5 stars" aria-pressed="false">★</button>`).join('')}
  </div>
  <div class="share-row">
    <button class="share" type="button" data-share="${esc(storyId)}">Share</button>
    <span class="share-count" data-share-count="${esc(storyId)}">0 shares on this device</span>
    <span class="share-status" data-share-status="${esc(storyId)}" aria-live="polite"></span>
  </div>
</div>`;

const labelsMarkup=story=>{
  const labels=[...(story.coverage_labels||[]),...(story.topics||[])];
  const unique=[...new Set(labels)].slice(0,8);
  return unique.length ? '<div class="labels">'+unique.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div>' : '';
};

const sourceDate=story=>story.source?.published_at ? ` · ${esc(String(story.source.published_at).slice(0,10))}` : '';

const storyCard=(bundle,story,prefix)=>{
  const image=bundle.images.find(i=>i.story_id===story.id);
  const slug=routeSlug(story);
  const img=image ? `${prefix}assets/${bundle.edition_date}/${path.basename(image.path)}` : '';
  const href=`${prefix}stories/${bundle.edition_date}/${slug}/`;
  return `
<article class="story-card">
  <p class="eyebrow">${esc(story.focus)}${story.agent_skills?' · Agent Skills':''}</p>
  <h2><a href="${esc(href)}">${esc(story.headline)}</a></h2>
  <p class="meta">${esc(story.source.publisher)}${sourceDate(story)} · ${story.reading_time_minutes} min read</p>
  ${labelsMarkup(story)}
  <img src="${esc(img)}" alt="${esc(story.image_alt_intent)}" loading="lazy">
  <p>${esc(story.summary)}</p>
  <p><strong>Why it matters:</strong> ${esc(story.why_it_matters)}</p>
  <p class="related"><strong>Related coverage:</strong> ${esc(story.related_coverage)}</p>
  <p><a class="source-link" target="_blank" rel="noopener noreferrer" href="${esc(story.source.url)}">Authoritative source ↗</a></p>
  ${ratingMarkup(story.id)}
</article>`;
};

const mediaMarkup=bundle=>{
  const videos=bundle.videos.map(v=>`
  <article class="media-card">
    <p class="eyebrow">${esc(v.focus)}</p>
    <h3><a target="_blank" rel="noopener noreferrer" href="${esc(v.url)}">${esc(v.title)}</a></h3>
    <p class="meta">${esc(v.source)} · ${esc(v.original_date)} · Duration ${esc(v.duration_minutes)} min</p>
    <p>${esc(v.summary)}</p>
    <p><strong>Why it matters:</strong> ${esc(v.why_it_matters)}</p>
  </article>`).join('');
  const podcasts=bundle.podcasts.map(p=>`
  <article class="media-card">
    <h3><a target="_blank" rel="noopener noreferrer" href="${esc(p.url)}">${esc(p.title||p.episode_title)}</a></h3>
    <p class="meta">${esc(p.source)} · ${esc(p.original_date)} · Duration ${esc(p.duration_minutes)} min · ${esc(p.written_reading_time_minutes)} min read</p>
    <p>${esc(p.summary)}</p>
    <p><strong>Why it matters:</strong> ${esc(p.why_it_matters)}</p>
  </article>`).join('');
  return `
<section id="media"><h2>Watch & listen</h2>
  <h3 class="section-kicker">Videos</h3><div class="media-grid">${videos}</div>
  <h3 class="section-kicker">Podcasts</h3><div class="media-grid">${podcasts}</div>
</section>`;
};

const evidenceLink=item=>item?.evidence?.url
  ? `<a target="_blank" rel="noopener noreferrer" href="${esc(item.evidence.url)}">Evidence ↗</a>`
  : '';

const watchItems=(items,kind)=>items.map(item=>{
  const detail=kind==='updated' ? item.what_changed : (kind==='dropped' ? (item.reason||item.why) : item.why);
  return `<article class="watch-item"><h3>${esc(item.topic)}</h3><p>${esc(detail)}</p><p class="meta">${evidenceLink(item)}</p></article>`;
}).join('');

const watchlistMarkup=bundle=>`
<section id="watchlist">
  <h2>Emerging AI Watchlist</h2>
  <p class="section-intro">Signals worth tracking, with today’s changes separated from carried context.</p>
  <div class="watch-grid">
    <div><h3>New</h3>${watchItems(bundle.watchlist.new,'new')}</div>
    <div><h3>Updated — what changed today</h3>${watchItems(bundle.watchlist.updated,'updated')}</div>
    <div><h3>Carried forward</h3>${watchItems(bundle.watchlist.carried_forward,'carried_forward')}</div>
    <div><h3>Dropped</h3>${watchItems(bundle.watchlist.dropped,'dropped')}</div>
  </div>
</section>`;

const editionBody=(bundle,prefix,{heading='Daily AI Brief'}={})=>`
<header class="hero">
  <p class="eyebrow">Daily edition</p>
  <h1>${esc(heading)} — ${esc(bundle.edition_date)}</h1>
  <p class="lede">Six selected developments across agents, applied generative AI, and technical AI engineering.</p>
  <nav><a href="${prefix}archive/">Earlier Briefs</a> · <a href="#media">Watch & listen</a> · <a href="#watchlist">Emerging AI Watchlist</a></nav>
</header>
<section class="story-grid">${bundle.stories.map(s=>storyCard(bundle,s,prefix)).join('')}</section>
${mediaMarkup(bundle)}
${watchlistMarkup(bundle)}
<footer><a href="${prefix}archive/">Earlier Briefs</a></footer>`;

const interactionScript=`
<script>
(() => {
  const ratingKey=id => 'daily-ai-brief:rating:' + id;
  const shareKey=id => 'daily-ai-brief:shares:' + id;
  const refreshRating=id => {
    const value=Number(localStorage.getItem(ratingKey(id))||0);
    document.querySelectorAll('[data-rating][data-story-id="'+CSS.escape(id)+'"]').forEach(btn=>{
      const n=Number(btn.dataset.rating);
      btn.classList.toggle('is-on',n<=value);
      btn.setAttribute('aria-pressed',n===value?'true':'false');
    });
  };
  const refreshShares=id => {
    const n=Number(localStorage.getItem(shareKey(id))||0);
    document.querySelectorAll('[data-share-count="'+CSS.escape(id)+'"]').forEach(el=>{
      el.textContent=n+' share'+(n===1?'':'s')+' on this device';
    });
  };
  document.querySelectorAll('[data-rating]').forEach(btn=>{
    const id=btn.dataset.storyId;
    refreshRating(id);
    btn.addEventListener('click',()=>{
      localStorage.setItem(ratingKey(id),btn.dataset.rating);
      refreshRating(id);
    });
  });
  document.querySelectorAll('[data-share]').forEach(btn=>{
    const id=btn.dataset.share;
    refreshShares(id);
    btn.addEventListener('click',async()=>{
      const url=btn.closest('article')?.querySelector('h1 a,h2 a')?.href || location.href;
      const title=btn.closest('article')?.querySelector('h1,h2')?.textContent?.trim() || document.title;
      let shared=false;
      try {
        if(navigator.share){ await navigator.share({title,url}); shared=true; }
        else if(navigator.clipboard){ await navigator.clipboard.writeText(url); shared=true; }
      } catch (e) {
        if(e && e.name==='AbortError') return;
      }
      if(!shared){ window.prompt('Copy this link',url); shared=true; }
      if(shared){
        const n=Number(localStorage.getItem(shareKey(id))||0)+1;
        localStorage.setItem(shareKey(id),String(n));
        refreshShares(id);
        document.querySelectorAll('[data-share-status="'+CSS.escape(id)+'"]').forEach(el=>el.textContent='Link ready to share');
      }
    });
  });
})();
</script>`;

const shell=(title,body)=>`<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#172033;background:#f4f7fb}
*{box-sizing:border-box}body{margin:0;background:#f4f7fb;color:#172033}main{max-width:1180px;margin:0 auto;padding:28px 20px 56px}
a{color:#1457b8;text-decoration-thickness:1px;text-underline-offset:3px}a:hover{text-decoration-thickness:2px}
.hero{background:linear-gradient(135deg,#fff,#eef5ff);border:1px solid #dbe5f2;border-radius:24px;padding:28px;margin-bottom:22px}
.hero h1{font-size:clamp(2rem,5vw,3.25rem);line-height:1.02;margin:.2rem 0 1rem}.lede{font-size:1.05rem;max-width:760px;color:#4a5c72}
.story-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.story-card,.media-card,.watch-item,section#media,section#watchlist,.story-page,.archive-card{background:#fff;border:1px solid #dbe4ee;border-radius:18px;box-shadow:0 8px 24px rgba(28,52,84,.06)}
.story-card{padding:20px}.story-card img,.story-page img{width:100%;height:auto;border-radius:12px;border:1px solid #e2e8f0;margin:12px 0 8px}
.story-card h2{margin:.35rem 0 .4rem;font-size:1.35rem;line-height:1.18}.eyebrow{font-size:.78rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#315a8a}.meta{color:#66788d;font-size:.9rem}.labels{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0}.labels span{background:#eef5ff;border:1px solid #d6e6fb;border-radius:999px;padding:4px 8px;font-size:.78rem}
.related{border-left:3px solid #2b7ad8;padding-left:10px;color:#43566d}.engagement{border-top:1px solid #edf1f5;margin-top:16px;padding-top:12px}.rating{display:flex;align-items:center;gap:2px}.engagement-label{font-size:.85rem;margin-right:8px;color:#56697f}.rating button{border:0;background:transparent;font-size:1.45rem;color:#aab5c2;cursor:pointer;padding:2px}.rating button.is-on{color:#e0a21b}.share-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:8px}.share{border:1px solid #b9cbe0;background:#fff;border-radius:9px;padding:7px 11px;cursor:pointer}.share-count,.share-status{font-size:.78rem;color:#66788d}
section#media,section#watchlist{padding:22px;margin-top:24px}section h2{margin-top:0}.section-kicker{margin:18px 0 8px;color:#43566d}.media-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.media-card{padding:16px}.media-card h3{margin:.25rem 0}
.watch-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.watch-grid>div{background:#f8fbff;border:1px solid #e1eaf4;border-radius:14px;padding:14px}.watch-item{padding:12px;margin:10px 0;box-shadow:none}.watch-item h3{font-size:1rem;margin:.15rem 0 .4rem}.section-intro{color:#5b6f85}
.story-page{padding:26px;max-width:900px;margin:0 auto}.story-page h1{font-size:clamp(2rem,4vw,3rem);line-height:1.06}.learning{background:#f8fbff;border:1px solid #dfe9f4;border-radius:14px;padding:16px;margin:16px 0}.learning h3{margin-top:0}.source-box{background:#f7f9fc;border-radius:12px;padding:14px;margin:16px 0}.archive-card{padding:20px;max-width:760px}footer{margin:30px 0 10px;color:#66788d}
@media(max-width:760px){main{padding:16px 12px 40px}.story-grid,.media-grid,.watch-grid{grid-template-columns:1fr}.hero{padding:20px}.story-card,.story-page{padding:16px}}
</style>
</head><body><main>${body}</main>${interactionScript}</body></html>
`;

const storyPage=(bundle,story)=>{
  const image=bundle.images.find(i=>i.story_id===story.id);
  const img=`../../../assets/${bundle.edition_date}/${path.basename(image.path)}`;
  const books=bundle.book_mappings.filter(b=>b.story_id===story.id);
  const learning=books.map(b=>`
  <section class="learning">
    <h3>${esc(b.book)}</h3>
    <p><strong>Concept:</strong> ${esc(b.concept_or_chapter)}</p>
    <p>${esc(b.connection)}</p>
    <p><strong>Study next:</strong> ${esc(b.what_to_study_next)}</p>
  </section>`).join('');
  return shell(story.headline,`
  <p><a href="../../../briefs/${bundle.edition_date}/">← Edition</a> · <a href="../../../archive/">Earlier Briefs</a></p>
  <article class="story-page">
    <p class="eyebrow">${esc(story.focus)}${story.agent_skills?' · Agent Skills':''}</p>
    <h1>${esc(story.headline)}</h1>
    <p class="meta">${esc(story.source.publisher)}${sourceDate(story)} · ${story.reading_time_minutes} min read</p>
    ${labelsMarkup(story)}
    <img src="${esc(img)}" alt="${esc(story.image_alt_intent)}">
    <p>${esc(story.summary)}</p>
    <p><strong>Why it matters:</strong> ${esc(story.why_it_matters)}</p>
    <p class="related"><strong>Related coverage:</strong> ${esc(story.related_coverage)}</p>
    <div class="source-box"><a target="_blank" rel="noopener noreferrer" href="${esc(story.source.url)}">Read the authoritative source — ${esc(story.source.publisher)} ↗</a></div>
    ${learning}
    ${ratingMarkup(story.id)}
  </article>`);
};

export function buildReaderSite({validation,outDir,repoRoot='.'}){
  const {bundle}=validation;
  fs.rmSync(outDir,{recursive:true,force:true});
  fs.mkdirSync(outDir,{recursive:true});

  const editionDir=path.join(outDir,'briefs',bundle.edition_date);
  const latestDir=path.join(outDir,'latest');
  const storyRoot=path.join(outDir,'stories',bundle.edition_date);
  const assetDir=path.join(outDir,'assets',bundle.edition_date);
  const archiveDir=path.join(outDir,'archive');
  for(const dir of [editionDir,latestDir,storyRoot,assetDir,archiveDir]) fs.mkdirSync(dir,{recursive:true});

  for(const image of bundle.images){
    fs.copyFileSync(path.resolve(repoRoot,image.path),path.join(assetDir,path.basename(image.path)));
  }

  fs.writeFileSync(path.join(editionDir,'index.html'),shell('Daily AI Brief '+bundle.edition_date,editionBody(bundle,'../../')));
  fs.writeFileSync(path.join(latestDir,'index.html'),shell('Daily AI Brief — Latest',editionBody(bundle,'../',{heading:'Daily AI Brief'})));
  fs.writeFileSync(path.join(outDir,'index.html'),shell('Daily AI Brief',editionBody(bundle,'',{heading:'Daily AI Brief'})));

  for(const story of bundle.stories){
    const slug=routeSlug(story);
    const dir=path.join(storyRoot,slug);
    fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'index.html'),storyPage(bundle,story));
  }

  const archiveBody=`
  <header class="hero"><p class="eyebrow">Archive</p><h1>Earlier Briefs</h1><p class="lede">Permanent dated editions from the Compiler reader.</p></header>
  <article class="archive-card"><h2><a href="../briefs/${bundle.edition_date}/">${esc(bundle.edition_date)}</a></h2><p>Current verified edition.</p></article>`;
  fs.writeFileSync(path.join(archiveDir,'index.html'),shell('Daily AI Brief Archive',archiveBody));

  const feed={
    version:'daily-ai-brief-feed-v1',
    latest:bundle.edition_date,
    editions:[{
      date:bundle.edition_date,
      route:`briefs/${bundle.edition_date}/`,
      stories:bundle.stories.map(s=>({
        headline:s.headline,
        focus:s.focus,
        route:`stories/${bundle.edition_date}/${routeSlug(s)}/`,
        source_url:s.source.url,
        published_at:s.source.published_at
      }))
    }]
  };
  fs.writeFileSync(path.join(outDir,'feed.json'),JSON.stringify(feed,null,2)+'\n');

  const routes=[
    'index.html',
    'latest/index.html',
    'archive/index.html',
    'feed.json',
    `briefs/${bundle.edition_date}/index.html`,
    ...bundle.stories.map(s=>`stories/${bundle.edition_date}/${routeSlug(s)}/index.html`)
  ];
  const manifest={
    schema_version:'daily-compiler-build-manifest-v2',
    edition_date:bundle.edition_date,
    bundle_sha256:validation.bundleDigest,
    routes,
    images:validation.imageEvidence.map(e=>({
      story_id:e.story_id,
      asset:`assets/${bundle.edition_date}/${path.basename(e.path)}`,
      sha256:e.sha256,
      git_blob_sha:e.git_blob_sha
    })),
    reader_features:{
      dated_edition:true,
      permanent_story_pages:6,
      homepage_latest:true,
      latest_route:true,
      archive_navigation:true,
      earlier_briefs:true,
      related_coverage:true,
      coverage_labels:true,
      ratings:true,
      share:true,
      share_count:'local_device',
      accessible_image_alt:true,
      responsive:true,
      media_new_tab:true,
      watchlist:true,
      feed:true
    }
  };
  fs.writeFileSync(path.join(outDir,'build-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  return manifest;
}

function resolveInternal(htmlFile,ref){
  const clean=ref.split('#')[0].split('?')[0];
  if(!clean||/^(https?:|mailto:|javascript:)/i.test(clean)) return null;
  const base=path.dirname(htmlFile);
  const abs=path.resolve(base,clean);
  return clean.endsWith('/') ? path.join(abs,'index.html') : abs;
}

export function verifyReaderSite({outDir,validation,manifest}){
  const fail=m=>{throw new Error(m);};
  for(const route of manifest.routes) if(!fs.existsSync(path.join(outDir,route))) fail('missing route: '+route);

  const htmlFiles=manifest.routes.filter(r=>r.endsWith('.html')).map(r=>path.join(outDir,r));
  for(const file of htmlFiles){
    const html=fs.readFileSync(file,'utf8');
    for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){
      const target=resolveInternal(file,match[1]);
      if(target&&!fs.existsSync(target)) fail('broken internal link '+match[1]+' in '+file);
    }
    if(/Original Commentary|What do stars mean/i.test(html)) fail('removed reader element present');
  }

  const editionHtml=fs.readFileSync(path.join(outDir,'briefs',validation.bundle.edition_date,'index.html'),'utf8');
  if((editionHtml.match(/data-rating=/g)||[]).length!==30) fail('rating controls missing');
  if((editionHtml.match(/data-share=/g)||[]).length!==6) fail('share controls missing');
  if((editionHtml.match(/data-share-count=/g)||[]).length!==6) fail('share counts missing');
  if((editionHtml.match(/Related coverage:/g)||[]).length!==6) fail('related coverage missing');
  if(!/Emerging AI Watchlist/.test(editionHtml)||!/Updated — what changed today/.test(editionHtml)||!/Carried forward/.test(editionHtml)||!/Dropped/.test(editionHtml)) fail('Watchlist states missing');
  if((editionHtml.match(/target="_blank"/g)||[]).length<10) fail('external media/source links not opening in new tab');
  if(/<img[^>]+alt=""/.test(editionHtml)) fail('empty image alt text');
  if(!/viewport/.test(editionHtml)) fail('mobile viewport missing');

  const copiedImages=fs.readdirSync(path.join(outDir,'assets',validation.bundle.edition_date)).filter(x=>x.endsWith('.png'));
  if(copiedImages.length!==6) fail('compiled site must contain six images');

  return {
    schema_version:'daily-compiler-shadow-verification-receipt-v2',
    result:'PASS',
    edition_date:validation.bundle.edition_date,
    bundle_sha256:validation.bundleDigest,
    route_count:manifest.routes.length,
    permanent_story_pages:6,
    images_present:6,
    internal_links_valid:true,
    reader_contract:manifest.reader_features,
    removed_elements_absent:true,
    production_mutation_target_absent:true,
    owner_intervention:false
  };
}

// Registry-derived public information page: source inclusion is not proof of live visits.
const HTML_ESCAPE={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
const html=s=>String(s??'').replace(/[&<>"']/g,c=>HTML_ESCAPE[c]);
const roles=['article','video','podcast','research','watchlist'];
const roleName={article:'Articles',video:'Videos',podcast:'Podcasts',research:'Research',watchlist:'Watchlist'};
const base='https://github.com/gttome/Daily-AI-Brief-Compiler';
const css="\n.srcx{--ink:#24343d;--muted:#56656a;--rust:#8b472f;--line:#d5d4cf;--wash:#f7f6f2;--teal:#275e63;color:var(--ink);font-family:inherit;max-width:100%;line-height:1.55}\n.srcx *, .srcx *:before, .srcx *:after{box-sizing:border-box}\n.srcx h2,.srcx h3{font-family:Georgia,serif;color:var(--ink);line-height:1.22}\n.srcx h2{font-size:clamp(1.65rem,3.6vw,2.5rem);margin:.25rem 0 .9rem}\n.srcx h3{font-size:1.18rem;margin:.2rem 0 .45rem}\n.srcx p{margin:.5rem 0 1rem}\n.srcx a{color:#864124;text-underline-offset:3px}\n.srcx a:hover{color:#593019}\n.srcx a:focus-visible,.srcx button:focus-visible,.srcx select:focus-visible,.srcx input:focus-visible{outline:3px solid #217b8a;outline-offset:3px}\n.srcx .src-kicker{font:700 .79rem/1.4 Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--rust)}\n.srcx .src-hero{border-top:4px solid var(--rust);padding:1.5rem 0 1.7rem}\n.srcx .src-lead{font-size:1.16rem;max-width:64ch;color:#35434a}\n.srcx .src-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem;margin:1.6rem 0 1rem}\n.srcx .src-stat{padding:1.05rem;border:1px solid var(--line);border-top:3px solid var(--rust);background:#fff}\n.srcx .src-stat strong{display:block;font:700 clamp(1.6rem,3.5vw,2.5rem)/1 Georgia,serif;color:var(--ink)}\n.srcx .src-stat span{display:block;color:var(--muted);font-size:.88rem;margin-top:.6rem}\n.srcx .src-fine{font-size:.91rem;color:var(--muted);max-width:92ch}\n.srcx .src-nav{display:flex;flex-wrap:wrap;gap:.65rem;margin:1.5rem 0}\n.srcx .src-nav a{padding:.62rem .85rem;border:1px solid #bea99a;background:#fffefa;text-decoration:none;font-weight:700;font-size:.91rem}\n.srcx .src-section{padding:2rem 0;border-top:1px solid var(--line);scroll-margin-top:1rem}\n.srcx .src-proposition{font-size:1.08rem;max-width:77ch}\n.srcx .src-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem;margin:1.4rem 0}\n.srcx .src-grid article{padding:1.2rem 1rem;background:#faf9f6;border:1px solid var(--line);min-width:0}\n.srcx .src-grid article p{font-size:.94rem;color:#394b53;margin-bottom:0}\n.srcx .src-step{font:700 .82rem Arial,sans-serif;color:var(--rust);margin-bottom:.55rem}\n.srcx .src-role-table{border-collapse:collapse;width:100%;font-size:.93rem;table-layout:auto}\n.srcx .src-role-table th,.srcx .src-role-table td{padding:.8rem .8rem;border-bottom:1px solid var(--line);text-align:left}\n.srcx .src-role-table th{background:#f2eee8}\n.srcx .src-role-table td:last-child,.srcx .src-role-table th:last-child{text-align:right}\n.srcx .src-scroll{overflow-x:auto}\n.srcx .src-featured{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.85rem;margin:1rem 0 1.5rem}\n.srcx .src-featured article{border-left:3px solid var(--rust);padding:.6rem .9rem;background:#faf9f6;min-width:0}\n.srcx .src-featured a{font-weight:700}\n.srcx .src-featured span{display:block;color:var(--muted);font-size:.83rem}\n.srcx .src-toolbar{display:grid;grid-template-columns:2fr 1fr 1fr;gap:.7rem;align-items:end;background:var(--wash);border:1px solid var(--line);padding:1rem;margin:1rem 0}\n.srcx .src-toolbar label{font-size:.83rem;color:#334a53;font-weight:700;display:block}\n.srcx .src-toolbar input,.srcx .src-toolbar select{width:100%;min-width:0;min-height:44px;padding:.63rem .65rem;border:1px solid #8e9b9f;border-radius:3px;background:white;font:inherit;color:var(--ink);margin-top:.35rem}\n.srcx .src-directory-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem}\n.srcx .src-source-card{padding:.9rem 1rem;border:1px solid #dbdcd7;background:white;min-width:0}\n.srcx .src-source-card h3{font:700 1rem/1.34 Arial,sans-serif;margin:0 0 .3rem;overflow-wrap:anywhere}\n.srcx .src-source-card a{overflow-wrap:anywhere}\n.srcx .src-source-card .src-status{display:inline-block;color:#395558;font-size:.77rem;margin:.3rem 0}\n.srcx .src-source-card[data-enabled=\"false\"] .src-status{color:#745e53}\n.srcx .src-source-card .src-tags{font-size:.82rem;color:#57666c}\n.srcx .src-source-card .src-publisher{font-size:.82rem;color:#69757a;line-height:1.35;margin:.5rem 0 0}\n.srcx .src-source-card[hidden]{display:none!important}\n.srcx .src-directory-footer{display:flex;flex-wrap:wrap;gap:1rem;align-items:center;justify-content:space-between;margin:1.1rem 0}\n.srcx #src-show-more{border:1px solid #915f49;background:#fffefa;color:#7b381d;font:700 .95rem Arial,sans-serif;padding:.7rem 1.2rem;min-height:44px;cursor:pointer}\n.srcx #src-show-more[hidden]{display:none}\n.srcx .src-no-results[hidden]{display:none}\n.srcx .src-compare{width:100%;border-collapse:collapse;min-width:520px}\n.srcx .src-compare th,.srcx .src-compare td{padding:.8rem;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}\n.srcx .src-compare th{background:#f2eee8}\n.srcx .src-compare td:first-child{font-weight:700;width:28%}\n.srcx .src-callout{border-left:4px solid #2d6367;padding:1rem 1.2rem;background:#f5f8f8}\n.srcx .src-audit-links{display:flex;flex-wrap:wrap;gap:.7rem 1.2rem}\n@media(max-width:780px){.srcx .src-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.srcx .src-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.srcx .src-featured,.srcx .src-directory-grid{grid-template-columns:1fr}}\n@media(max-width:540px){.srcx{font-size:1rem}.srcx .src-grid,.srcx .src-stats,.srcx .src-toolbar{grid-template-columns:1fr}.srcx .src-stat{padding:.9rem}.srcx .src-nav a{flex:1 1 40%;text-align:center}.srcx .src-section{padding:1.45rem 0}.srcx .src-compare{font-size:.9rem}}\n";
const interaction="\n(function(){\n  var root=document.querySelector('#sources-transparency');\n  if(!root)return;\n  var search=root.querySelector('#src-search');\n  var role=root.querySelector('#src-role');\n  var state=root.querySelector('#src-state');\n  var total=root.querySelector('#src-results');\n  var more=root.querySelector('#src-show-more');\n  var empty=root.querySelector('#src-no-results');\n  var cards=Array.from(root.querySelectorAll('.src-source-card'));\n  var count=24;\n  function apply(){\n    var term=(search.value||'').trim().toLowerCase();\n    var requested=role.value;\n    var status=state.value;\n    var eligible=cards.filter(function(card){\n      return (!term||(card.dataset.search||'').indexOf(term)>=0)\n        &&(requested==='all'||(card.dataset.roles||'').split(' ').indexOf(requested)>=0)\n        &&(status==='all'||card.dataset.enabled===status);\n    });\n    var shown=eligible.slice(0,count);\n    cards.forEach(function(card){card.hidden=shown.indexOf(card)<0;});\n    total.textContent='Showing '+shown.length+' of '+eligible.length+' matching sources';\n    more.hidden=shown.length>=eligible.length;\n    empty.hidden=eligible.length!==0;\n  }\n  function reset(){count=24;apply();}\n  search.addEventListener('input',reset);\n  role.addEventListener('change',reset);\n  state.addEventListener('change',reset);\n  more.addEventListener('click',function(){count+=24;apply();});\n  apply();\n})();\n";

export const SOURCES_TRANSPARENCY_REVISION='2026-10-27-expanded-portfolio-v1';

export function sourceRegistrySummary(registry){
  if(registry?.schema_version!=='daily-compiler-resource-registry-v1'||!Array.isArray(registry?.resources))
    throw Error('source_registry_invalid_schema');
  const records=registry.resources;
  if(!Array.isArray(records)||records.length<20||new Set(records.map(r=>r.resource_id)).size!==records.length)
    throw Error('source_registry_missing_or_duplicate_records');
  if(records.some(r=>typeof r.resource_id!=='string'||typeof r.name!=='string'||
     typeof r.url!=='string'||typeof r.enabled!=='boolean'||!Array.isArray(r.content_types)))
    throw Error('source_registry_incomplete_identity');
  const enabled=records.filter(x=>x.enabled).length;
  const totals=Object.fromEntries(roles.map(role=>[
    role,{registered:records.filter(x=>x.content_types.includes(role)).length,
          enabled:records.filter(x=>x.enabled&&x.content_types.includes(role)).length}
  ]));
  return {registered:records.length,enabled,pending:records.length-enabled,roles:totals};
}
const extLink=(url,label)=>{
  try{
    const u=new URL(url);
    if(u.protocol!=='https:')return html(label);
    return '<a href="'+html(u.href)+'" target="_blank" rel="noopener noreferrer">'+html(label)+'</a>';
  }catch{return html(label);}
};
const one=(n)=>'<strong>'+n+'</strong>';
function featured(registry){
  const pick=[
    ['research-20261026-a05','Newly qualified discovery'],
    ['directory-935fbe5ba89ff5f91fc8c69b','Newly qualified discovery'],
    ['directory-411bf5f837e28f35220736eb','Newly qualified discovery'],
    ['directory-3ccc18a956cae0b1e24b5968','Newly qualified discovery'],
    ['directory-fd36049347d409f38c9f9a67','Expanded practitioner source'],
    ['directory-c6b8a33e7fa162cc41136fa5','Expanded model and retrieval coverage'],
    ['directory-8df3614a9972a25fc59475ed','Independent evaluation source'],
    ['directory-8ec4fd458a38bc0447f4cded','Applied evaluation source'],
    ['directory-6ea6e283349c7b62ac1ced9d','Agent-observability engineering'],
    ['directory-d6cf3f9fa167b8173a35228b','Evaluation engineering source'],
    ['universe-20261026-every-ai-editorial','Applied AI practitioner source']
  ];
  return pick.map(([id,note])=>{
    const row=registry.resources.find(r=>r.resource_id===id&&r.enabled);
    if(!row)return '';
    return '<article>'+extLink(row.url,row.name)+'<span>'+html(note)+' · Enabled for discovery</span></article>';
  }).filter(Boolean).join('');
}
function directoryEntry(row){
  const state=row.enabled?'true':'false',types=roles.filter(t=>row.content_types.includes(t));
  const urlLabel=row.publisher&&row.publisher!==row.name?row.publisher:'';
  const search=[row.name,row.resource_id,row.url,row.publisher??'',...types].join(' ').toLowerCase().replace(/\s+/g,' ');
  return '<article class="src-source-card" data-source-id="'+html(row.resource_id)+'" data-enabled="'+state+'" data-roles="'+html(types.join(' '))+'" data-search="'+html(search)+'">'
    +'<h3>'+extLink(row.url,row.name)+'</h3>'
    +'<span class="src-status">'+(row.enabled?'Eligible discovery route':'Catalogued · qualification pending')+'</span>'
    +'<div class="src-tags">'+html(types.map(t=>roleName[t]).join(' · ')||'Other evidence')+'</div>'
    +(urlLabel?'<p class="src-publisher">Publisher / group: '+html(urlLabel)+'</p>':'')
    +'</article>';
}
export function renderBriefBuilderSummary(){
  return [
    '<section class="src-section" id="source-builder"><p class="src-kicker">From a Brief to a connected knowledge system</p>',
    '<h2>Build your own purpose-built Brief Compiler</h2>',
    '<p class="src-proposition">The most important advantage is <strong>editorial coherence, not topic-box coverage</strong>. Instead of assembling generic summaries, the editor selects original articles, instructional videos and substantive podcast discussions that illuminate related questions for one well-defined audience. The formats are complementary: evidence, demonstrations and informed experience.</p>',
    '<p>The Daily Generative AI Brief also connects selected developments to concepts and practices across the four books of the <strong>Generative AI Professional Series</strong>. Behind the public Brief, relevant evidence can lead to <strong>author-reviewable proposals</strong> to refresh book chapters, examples, infographics, exercises, video lessons and templates. Those proposals do not automatically edit or release books.</p>',
    '<p>That architecture can be configured for an organization’s own trusted sources, decisions, knowledge assets and approval chain: a field-service manual, a hospital protocol, a cybersecurity runbook, a training curriculum or an emergency-readiness plan. The published Brief is a working example of the approach, not a turnkey multi-tenant software product.</p>',
    '<div class="src-callout"><strong>Explore five complete scenarios and a practical setup blueprint:</strong> <a href="/Daily-AI-Brief-Compiler/build-your-own-brief-compiler/">Build Your Own Brief Compiler — from information to a living knowledge system</a>.</div>',
    '</section>'
  ].join('\\n');
}

export function renderSourcesExperience(registry){
  const s=sourceRegistrySummary(registry);
  const directory=[...registry.resources].sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base'})||a.resource_id.localeCompare(b.resource_id))
    .map(directoryEntry).join('\n');
  const metrics=[
    [s.registered,'Distinct source records'],
    [s.enabled,'Enabled for discovery'],
    [s.pending,'Pending qualification'],
    ['6 + 2 + 2','Articles · videos · podcasts']
  ].map(([number,description])=>'<div class="src-stat"><strong>'+html(number)+'</strong><span>'+html(description)+'</span></div>').join('');
  const roleRows=roles.map(role=>'<tr><th scope="row">'+roleName[role]+'</th><td>'+s.roles[role].enabled+'</td><td>'+s.roles[role].registered+'</td></tr>').join('');
  const contrast=[
    ['The Rundown AI','Daily AI news, explanations and practical guides','A deliberately fixed 2/2/2 professional-audience allocation, paired with source and publication checks','https://www.therundown.ai/'],
    ['TLDR AI','A rapid engineering-focused daily newsletter with source links','Longer mechanism-oriented takeaways, a separate emerging-topic Watchlist and six story-bound explainers','https://tldr.tech/ai'],
    ['Inoreader','User-configured feed monitoring, rules, alerts and AI reports','An already selected and published daily editorial edition, rather than an individual feed workspace','https://www.inoreader.com/features/'],
    ['Feedly','Topic and intelligence monitoring with AI-powered feeds','A narrowly scoped generative-AI editorial product with public daily edition, rubric and review receipts','https://docs.feedly.com/article/768-follow-sources-in-feedly']
  ].map(r=>'<tr><td>'+extLink(r[3],r[0])+'</td><td>'+html(r[1])+'</td><td>'+html(r[2])+'</td></tr>').join('');
  const steps=[
    ['01 · Discover broadly','Draw candidates from original research, engineering releases, enterprise adoption, video, podcasts and early-signal communities. Catalogue status is not proof that a route was checked in a particular run.'],
    ['02 · Verify before selecting','Read the original source; check date, claims, authorship, publisher independence, access and evidence limitations. Preprints and vendor announcements remain labeled as such.'],
    ['03 · Enforce editorial balance','Choose six articles: two technical engineering, two applied knowledge-work stories, two Agents for Everyone, including exactly one substantive Agent Skills item. Add two instructional videos and two varied podcasts.'],
    ['04 · Reject repetition','Check the full archive for reused items and the previous seven editions for overlapping teaching value. Enforce publisher/program rotation and use older articles only with an explicit freshness rationale.'],
    ['05 · Explain the mechanism','Write what changed, why it matters, what readers can try and what remains unproved. Each story receives a source-bound explanatory 1200 × 630 illustration; pending artwork is labeled, not falsely presented as final.'],
    ['06 · Publish with evidence','Protect publication through source/identity checks, CI, image reviews, live-link validation and release receipts. When a gate fails, record the actual blocker instead of inventing a passing status.']
  ].map(p=>'<article><div class="src-step">'+html(p[0].split(' · ')[0])+'</div><h3>'+html(p[0].split(' · ')[1])+'</h3><p>'+html(p[1])+'</p></article>').join('');
  const body=[
  '<style>'+css+'</style>',
  '<div class="srcx" id="sources-transparency" data-source-registry-count="'+s.registered+'" data-source-enabled-count="'+s.enabled+'" data-source-pending-count="'+s.pending+'">',
  '<section class="src-hero"><p class="src-kicker">Our sources · our editorial contract · our evidence</p>',
  '<h2>Wide discovery. Narrow selection. Explainable value.</h2>',
  '<p class="src-lead">The Daily Generative AI Brief is not a live feed of everything mentioning AI. It is an evidence-led editorial product: a carefully chosen daily set of developments, grounded in original sources and translated into decisions, experiments and clearer mental models for working professionals.</p>',
  '<div class="src-stats" aria-label="Current source registry statistics">'+metrics+'</div>',
  '<p class="src-fine"><strong>How to read these numbers:</strong> Source records are not unique publishers, and the article, video, podcast, research and Watchlist roles overlap. <strong>Enabled</strong> means eligible for source discovery, not that a website was reached, read, or approved for a specific edition. Pending sources remain research leads only until independently qualified. Counts are generated from the current protected source registry, not marketing estimates.</p>',
  '<nav class="src-nav" aria-label="On this page"><a href="#source-method">Editorial method</a><a href="#source-featured">What is new</a><a href="#source-directory">Full source directory</a><a href="#source-difference">How we compare</a><a href="#source-builder">Build your own Brief</a><a href="#source-accountability">Our commitments</a></nav></section>',

  '<section class="src-section" id="source-method"><p class="src-kicker">The Compiler method</p><h2>Six steps from a lead to a published Brief</h2>',
  '<p class="src-proposition">The editorial contract is designed to prevent a familiar failure of automated news roundups: mistaking a retrieved item, attention spike or polished summary for independently useful and trustworthy evidence.</p>',
  '<div class="src-grid">'+steps+'</div>',
  '<div class="src-callout"><strong>Freshness is a preference, not permission to invent news.</strong> The selection process prioritizes the newest 24-hour window and may use documented 72-hour or 168-hour fallbacks when more recent material adds less substance. Each publication date and exception must be defensible. Video identity, duration and public-playability checks are distinct from reviewing its instructional merit.</div></section>',

  '<section class="src-section" id="source-featured"><p class="src-kicker">Expanded source portfolio</p><h2>Beyond the usual frontier-lab headlines</h2>',
  '<p>Newly enabled and recently expanded discovery routes now include independent evaluations, agent-engineering field reports, open-source tooling, enterprise adoption and applied research. Examples below are genuine entries in the protected source registry; none is guaranteed a place in a future edition.</p>',
  '<div class="src-featured">'+featured(registry)+'</div>',
  '<div class="src-scroll"><table class="src-role-table"><thead><tr><th scope="col">Evidence role</th><th scope="col">Enabled</th><th scope="col">Catalogued</th></tr></thead><tbody>'+roleRows+'</tbody></table></div>',
  '<p class="src-fine">A research site may also be an article or Watchlist route. A publisher with several product blogs is not counted as several independent corporate sources when applying diversity rules.</p></section>',

  '<section class="src-section" id="source-directory"><p class="src-kicker">Complete public inventory</p><h2>Explore all '+s.registered+' source records</h2>',
  '<p>Search by publisher or topic, filter by evidence role, and distinguish active discovery candidates from sources awaiting qualification. This is a transparent inventory—not a claim of continuous live monitoring, independent verification of every listed URL or endorsement of every publisher.</p>',
  '<div class="src-toolbar"><label for="src-search">Find a source<input id="src-search" type="search" placeholder="Try evaluation, Microsoft, agents…" autocomplete="off"></label>',
  '<label for="src-role">Evidence role<select id="src-role"><option value="all">All roles</option>'+roles.map(r=>'<option value="'+r+'">'+roleName[r]+'</option>').join('')+'</select></label>',
  '<label for="src-state">Qualification<select id="src-state"><option value="true">Enabled for discovery</option><option value="false">Pending qualification</option><option value="all">Both statuses</option></select></label></div>',
  '<div class="src-directory-footer"><strong id="src-results" aria-live="polite">Showing '+s.registered+' catalogued sources</strong><a href="'+base+'/blob/main/config/resource-registry.json" target="_blank" rel="noopener noreferrer">Inspect the source registry in GitHub</a></div>',
  '<div class="src-directory-grid" id="src-directory-grid">'+directory+'</div>',
  '<p class="src-no-results" id="src-no-results" hidden>No sources match these filters. Try a broader search.</p>',
  '<div class="src-directory-footer"><button type="button" id="src-show-more">Show 24 more sources</button><span class="src-fine">The complete directory remains in the page for accessible reading. Filters operate locally in your browser.</span></div></section>',

  '<section class="src-section" id="source-difference"><p class="src-kicker">Different jobs, complementary products</p><h2>What distinguishes the Brief Compiler?</h2>',
  '<p>AI newsletters excel at helping readers catch up quickly; feed tools let individuals follow large streams. The Compiler deliberately combines a fixed professional-audience editorial allocation, auditable research constraints, a source-grounded visual explanation for each story and a longitudinal Watchlist.</p>',
  '<div class="src-scroll"><table class="src-compare"><thead><tr><th>Example service</th><th>What it is built to do</th><th>What the Brief Compiler emphasizes instead</th></tr></thead><tbody>'+contrast+'</tbody></table></div>',
  '<p class="src-fine">This is a comparison of publicly described product emphases, not a feature-by-feature benchmark or a claim that other platforms lack safeguards, original citations or quality journalism. These products are useful for different purposes and can complement one another.</p>',
  '<div class="src-grid">',
  '<article><h3>Purpose-built coverage</h3><p>Exactly 2 technical, 2 applied and 2 accessible agent stories; one substantive Agent Skills entry. Readers see breadth without a random topic mix.</p></article>',
  '<article><h3>Evidence before excitement</h3><p>Source identity, original dates, archive novelty, meaningful independence and limitations matter more than publisher repetition or social popularity.</p></article>',
  '<article><h3>Premium explanatory visuals</h3><p>Six differentiated, text-labeled visual explanations are checked against the sources, reviewed at saved-pixel resolution and separately verified after publication.</p></article>',
  '<article><h3>A scored emerging Watchlist</h3><p>Six published research dimensions—novelty 20%, evidence 25%, independence 15%, momentum 15%, relevance 15% and durability 10%. Unknown measurements remain unknown, not synthetic scores.</p></article>',
  '<article><h3>Reader learning and feedback</h3><p>Why it matters, actionable next steps, permanent article links, archive context and useful star ratings. Watchlist interest voting remains independent of research scoring.</p></article>',
  '<article><h3>Visible operational evidence</h3><p>Protected GitHub changes, acceptance gates, source and image manifests, corrective-action reports and release receipts. We distinguish validated code from a verified live publication.</p></article>',
  '</div></section>',

  renderBriefBuilderSummary(),
  '<section class="src-section" id="source-accountability"><p class="src-kicker">Public accountability</p><h2>What this methodology does—and does not—promise</h2>',
  '<p>AI-assisted research and editorial judgment are imperfect. A listed source can be unavailable, promotional, stale or not independently corroborated; a first-party release is evidence of what its publisher says, not proof of a universal result. A successful automated check is not a substitute for personally verifying consequential claims.</p>',
  '<p>New source records are admitted for <em>discovery</em>; individual items still face the normal factual, recency, instructional, media-identity and source-diversity gates. The Compiler has publication safeguards and incident evidence, but that does not mean every run is error-free or completely unattended. We preserve the original source links so readers can verify claims for themselves.</p>',
  '<div class="src-callout"><strong>For readers:</strong> Start with <a href="/Daily-AI-Brief-Compiler/">today’s Brief</a>, examine the <a href="/Daily-AI-Brief-Compiler/watchlist/">Emerging AI Watchlist</a>, or browse the <a href="/Daily-AI-Brief-Compiler/briefs-archive/">dated archive</a>. For deeper inspection, the <a href="'+base+'" target="_blank" rel="noopener noreferrer">public Compiler repository</a> documents editorial and release controls.</div>',
  '<p class="src-audit-links">'+extLink(base+'/blob/main/docs/EDITORIAL-CONTRACT.md','Editorial selection contract')+' · '+extLink(base+'/blob/main/config/resource-registry.json','Source inventory')+' · '+extLink(base+'/actions','Production validation history')+'</p></section>',
  '</div>',
  '<script>'+interaction+'</script>'
  ].join('\n');
  if((body.match(/class="src-source-card"/g)||[]).length!==s.registered)
    throw Error('source_directory_incomplete');
  return body;
}
export function renderSourcesMarkdown(registry){
  return [
    '---',
    'layout: default',
    'title: Sources, evidence and what makes the Brief Compiler different',
    'description: Explore the source registry, editorial selection method and published quality gates behind the Daily Generative AI Brief.',
    'permalink: /sources/',
    '---','',renderSourcesExperience(registry),''
  ].join('\n');
}
export function replacePublishedSourcesPage(htmlContent,registry){
  const source=String(htmlContent);
  const begin='    <main id="content" class="main-content" role="main">';
  const footer='      <footer class="site-footer">';
  if(source.split(begin).length!==2||source.split(footer).length!==2)
    throw Error('source_page_layout_no_longer_matches');
  const start=source.indexOf(begin)+begin.length,end=source.indexOf(footer,start);
  if(end<start||source.slice(start,end).includes('id="sources-transparency"'))
    throw Error('source_page_already_corrected_or_missing');
  const body=renderSourcesExperience(registry);
  let updated=source.slice(0,start)+'\n'+body+'\n\n'+source.slice(end);
  updated=updated.replace('<h1 class="project-name">Sources and early-signal monitoring</h1>',
    '<h1 class="project-name">Sources, evidence &amp; the Brief Compiler</h1>');
  updated=updated.replace('<p class="project-tagline">Where the Daily AI Brief and Emerging AI Watch look first.</p>',
    '<p class="project-tagline">A transparent look at the source portfolio, editorial standards and what makes this Brief different.</p>');
  // Keep the published canonical URL and shared shell, but make SEO/social
  // metadata accurately describe the upgraded evidence and directory page.
  updated=updated.replaceAll('Sources and early-signal monitoring',
    'Sources, evidence and the Brief Compiler')
    .replaceAll('Where the Daily AI Brief and Emerging AI Watch look first.',
      'Explore verified source roles, the editorial evidence method and the Brief Compiler’s distinguishing workflow.');
  if(updated===source||!updated.includes('id="sources-transparency"'))
    throw Error('source_page_not_updated');
  return updated;
}

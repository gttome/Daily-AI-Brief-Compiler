// Narrow, hash-bound metadata repair. Never reseals an edition or regenerates art.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
export const NOV20_READER_ROUTES=['index.html','latest.html','latest.md','briefs/2026-11-20/index.html',
 'stories/2026-11-20/nov20-k2-openrouter-hf/index.html','stories/2026-11-20/nov20-t2-agent-prs/index.html',
 'videos/2026-11-20/general/index.html','videos/2026-11-20/agent-skills/index.html',
 'data/watchlist.json','watchlist/research/index.html'];
const hfHeadline='Hugging Face and OpenRouter expose where open-weight inference is moving';
const hfTitle='Hugging Face and OpenRouter join forces to make open-weight models easy to run';
const paperTitle='Reliable Mining of Heterogeneous AI Coding-Agent Data: Context-Aware Prediction and Resource-Aware Ranking';
const openTopic='dab-topic-open-weight-inference-shifts-inside-managed-routing-ma';
const workTopic='dab-topic-workplace-ai-changes-task-time-before-meeting-load';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const list=(root,rel='')=>fs.readdirSync(path.join(root,rel),{withFileTypes:true}).flatMap(e=>{const p=path.posix.join(rel,e.name);if(e.isDirectory())return list(root,p);if(!e.isFile())throw Error('special_file');return[p];}).sort();
const replace=(s,old,next,count=1)=>{if(s.split(old).length-1!==count)throw Error('unexpected_copy_occurrences:'+old);return s.split(old).join(next);};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function hfBlock(s,markdown=false){
 let start,end;
 if(markdown){start=s.indexOf('## 4. '+hfHeadline);end=s.indexOf('\n## ',start+1);}
 else {const heading=[...s.matchAll(/<h2\b[^>]*>[^<]*<\/h2>/g)].find(m=>m[0].includes(hfHeadline));start=heading?.index??-1;end=s.indexOf('<h2',start+1);}
 if(start<0)throw Error('hf_article_heading_missing');if(end<0)end=s.length;
 let block=s.slice(start,end);
 block=replace(block,'>New development</span>','>Extended recency fallback</span>');
 block=replace(block,'19 Nov 2026','16 Nov 2026');
 block=replace(block,'November 19, 2026','November 16, 2026');
 return s.slice(0,start)+block+s.slice(end);
}
function supportItems(r){
 if(!/^20\d\d-\d\d-\d\dT/.test(r.observed_at)||!Number.isFinite(Date.parse(r.observed_at)))throw Error('actual_observation_clock_required');
 return {
  [openTopic]:{kind:'primary',url:'https://vercel.com/blog/ai-gateway-production-index-september-2026',
   title:'Open-weight models take 56% of token volume, Astra doubles Fable 5.1 spend',publisher:'Vercel',publication_date:'2026-09-17',
   review_depth:'Postpublication review of the original operator series. Vercel Gateway traffic is separately sampled from OpenRouter; the denominators are not interchangeable.',checked_at:r.observed_at,development_id:'nov20-vercel-independent-routing'},
  [workTopic]:{kind:'primary',url:'https://arxiv.org/abs/2504.11436',title:'Shifting Work Patterns with Generative AI',publisher:'Dillon, Jaffe, Immorlica and Stanton',publication_date:null,
   review_depth:'Postpublication original-paper abstract and repository-metadata review: 66 firms and 7,137 workers. The field experiment and Gallup survey have different populations and outcomes. This is supporting older research, not a new November 20 paper.',checked_at:r.observed_at,development_id:'nov20-workplace-field-experiment'}
 };
}
export function stageNov20ReaderMetadata({revisionFile,historySite,outSite}){
 const r=JSON.parse(fs.readFileSync(revisionFile));
 if(r.correction_type!=='NOV20_ORIGINAL_METADATA_AND_VIDEO_BADGES'||r.edition_date!=='2026-11-20'||r.requested_by!=='owner'||
  JSON.stringify(Object.keys(r.expected_previous_pages||{}))!==JSON.stringify(NOV20_READER_ROUTES)||fs.existsSync(outSite))throw Error('invalid_revision_or_output');
 const before=new Map(list(historySite).map(route=>[route,fs.readFileSync(path.join(historySite,route))]));
 const supports=supportItems(r),replacements=new Map();
 const pngs=[...before.keys()].filter(x=>x.startsWith('briefs/images/2026-11-20/')&&x.endsWith('.png'));
 if(pngs.length!==6||Object.keys(r.expected_accepted_images||{}).length!==6||
  pngs.some(route=>sha(before.get(route))!==r.expected_accepted_images[route]))throw Error('accepted_image_hash_drift');
 for(const route of NOV20_READER_ROUTES){
  const old=before.get(route);if(!old||blob(old)!==r.expected_previous_pages[route])throw Error('published_route_drift:'+route);
  let s=old.toString('utf8');
  if(route==='data/watchlist.json'){
   const w=JSON.parse(s);if(w.edition_date!=='2026-11-20')throw Error('watchlist_edition_drift');
   for(const [id,evidence] of Object.entries(supports)){
    const topic=w.topics.find(t=>t.topic_id===id);if(!topic||topic.first_detected!=='2026-11-20'||topic.evidence.some(e=>e.url===evidence.url))throw Error('watchlist_support_drift');
    if(id===openTopic){topic.evidence[0].title=hfTitle;topic.evidence[0].publication_date='2026-11-16';}
    topic.evidence.push(evidence);
   }
   const open=w.topics.find(t=>t.topic_id===openTopic),work=w.topics.find(t=>t.topic_id===workTopic);
   if(open.research_score!==86||work.research_score!==90)throw Error('unchanged_rubric_score_drift');
   s=JSON.stringify(w,null,2)+'\n';
  }else if(route==='watchlist/research/index.html'){
   for(const [id,e] of Object.entries(supports)){
    const start=s.indexOf('<section class="wl-card" id="'+id+'">'),end=s.indexOf('</section>',start);
    if(start<0||end<0)throw Error('watchlist_topic_missing');let block=s.slice(start,end);
    if(id===openTopic){
     block=replace(block,'href="https://huggingface.co/blog/openrouter">Open-weight inference shifts inside managed routing markets</a>',`href="https://huggingface.co/blog/openrouter">${hfTitle}</a>`);
     block=replace(block,'Published: 2026-11-19','Published: 2026-11-16');
    }
    const item=`<li><a target="_blank" rel="noopener noreferrer" href="${esc(e.url)}">${esc(e.title)}</a><p>${esc(e.publisher)} · Original supporting source${e.publication_date?' · Published: '+e.publication_date:''}</p><p>Review scope: ${esc(e.review_depth)} Checked: ${esc(e.checked_at)}.</p></li>`;
    block=replace(block,'</li></ul>','</li>'+item+'</ul>');s=s.slice(0,start)+block+s.slice(end);
   }
  }else{
   if(NOV20_READER_ROUTES.slice(0,4).includes(route)){
    s=hfBlock(s,route.endsWith('.md'));
    s=replace(s,'OpenRouter joins Hugging Face',hfTitle);
    s=replace(s,'How do teams evaluate code changes attributed to AI agents?',paperTitle);
    s=replace(s,'Recent instructional video fallback','Recent AI video fallback',2);
   }else if(route.includes('nov20-k2-openrouter-hf')){
    s=replace(s,'>New development</span>','>Extended recency fallback</span>');
    s=replace(s,'19 Nov 2026','16 Nov 2026');s=replace(s,'November 19, 2026','November 16, 2026');
    s=replace(s,'OpenRouter joins Hugging Face',hfTitle);
   }else if(route.includes('nov20-t2-agent-prs')){
    s=replace(s,'How do teams evaluate code changes attributed to AI agents?',paperTitle);
   }else s=replace(s,'Recent instructional video fallback','Recent AI video fallback');
  }
  const next=Buffer.from(s);if(old.equals(next))throw Error('no_change:'+route);replacements.set(route,next);
 }
 fs.cpSync(historySite,outSite,{recursive:true});for(const [route,bytes] of replacements)fs.writeFileSync(path.join(outSite,route),bytes);
 if(JSON.stringify([...before.keys()])!==JSON.stringify(list(outSite)))throw Error('inventory_changed');
 let preserved=0;for(const [route,bytes] of before)if(!replacements.has(route)){
  if(!bytes.equals(fs.readFileSync(path.join(outSite,route))))throw Error('unapproved_change:'+route);preserved++;
 }
 return {schema_version:'daily-compiler-nov20-reader-metadata-v1',edition_date:r.edition_date,result:'PASS',files_changed:10,
  changed:[...replacements].map(([route,bytes])=>({route,previous_sha256:sha(before.get(route)),current_sha256:sha(bytes)})),
  original_source_date_corrected:'2026-11-16',source_citation_titles_corrected:2,neutral_video_badges_corrected:10,
  supporting_watchlist_source_urls:Object.values(supports).map(e=>e.url),watchlist_scores_unchanged:[86,90],
  accepted_png_files_byte_preserved:pngs.length,other_public_files_preserved:preserved,
  all_other_site_bytes_preserved:true,immutable_source_bundle_unchanged:true,accepted_images_regenerated:0,
  review_timing:'POSTPUBLICATION',live_readback_required:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [revisionFile,historySite,outSite,receiptFile]=process.argv.slice(2);const receipt=stageNov20ReaderMetadata({revisionFile,historySite,outSite});
 fs.mkdirSync(path.dirname(receiptFile),{recursive:true});fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}

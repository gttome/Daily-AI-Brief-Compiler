#!/usr/bin/env node
// Narrow post-publication patch. Does NOT recompile a sealed edition or touch image assets.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {requireWatchlistCopy} from '../compiler/watchlist-copy.mjs';
import {requireDistinctWatchlistTitles} from '../compiler/watchlist-identity.mjs';
import {scoreTopic} from '../vendor/production-reader/snapshot/_generator/lib/watchlist.mjs';
import {renderWatchlistEvidence} from '../vendor/production-reader/snapshot/assets/js/watchlist-evidence.js';
import {isSyntheticSixty,requireWatchlistRubric} from '../compiler/watchlist-rubric.mjs';

const fail=message=>{throw new Error('Watchlist text-only correction: '+message);};
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const load=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const textFile=(root,p)=>path.join(root,...p.split('/'));
function walk(root){
  const files=[];
  function recur(dir){
    for(const e of fs.readdirSync(dir,{withFileTypes:true})){
      const f=path.join(dir,e.name);
      if(e.isDirectory())recur(f);
      else if(e.isFile())files.push(path.relative(root,f).split(path.sep).join('/'));
      else fail('unexpected symlink or special file: '+f);
    }
  }
  recur(root);return files.sort();
}
export function applyWatchlistRevision({revision,historySite,outSite}){
  const scoreOnly=revision?.scope==='watchlist_score_only';
  const rubricOnly=revision?.scope==='watchlist_rubric_correction';
  const identityOnly=revision?.scope==='watchlist_identity_titles_only';
  if(revision?.schema_version!=='daily-compiler-watchlist-editorial-revision-v1'||(!scoreOnly&&!rubricOnly&&!identityOnly&&revision.scope!=='watchlist_copy_only')||revision.requested_by!=='owner')fail('unsupported revision authorization');
  if(!/^20\d\d-\d\d-\d\d$/.test(revision.edition_date))fail('invalid target date');
  if(scoreOnly){
    if(revision.items!==undefined||!Number.isInteger(revision.expected_topic_count)||!Number.isInteger(revision.expected_missing_score_count))fail('score-only correction requires an exact data audit and no editorial changes');
  }else if(rubricOnly){
    if(!Number.isInteger(revision.expected_topic_count)||
      !Number.isInteger(revision.expected_generic_score_count)||
      !Array.isArray(revision.items)||revision.items.length!==revision.expected_generic_score_count)
      fail('rubric correction requires exact existing-topic and synthetic-score counts');
  }else if(identityOnly){
    if(!Number.isInteger(revision.expected_topic_count)||!Array.isArray(revision.items)||revision.items.length!==2)
      fail('identity repair requires exactly two proven topic title decisions');
  }else if(!Array.isArray(revision.items)||!revision.items.length)fail('no editorial fixes supplied');
  if(!fs.existsSync(historySite)||fs.existsSync(outSite))fail('missing input or output already exists');
  const jsonRoute='data/watchlist.json',htmlRoute='watchlist/research/index.html';
  const watch=load(textFile(historySite,jsonRoute));
  if(watch.edition_date!==revision.edition_date)fail('latest published Watchlist date differs from target; do not overwrite a newer edition');
  let html=fs.readFileSync(textFile(historySite,htmlRoute),'utf8');
  const seen=new Set();
  if(identityOnly){
    if(watch.topics.length!==revision.expected_topic_count)fail('concurrent Watchlist count changed');
    for(const item of revision.items){
      if(!/^dab-topic-[a-z0-9-]+$/.test(item.topic_id)||seen.has(item.topic_id)||
        typeof item.expected_name!=='string'||typeof item.corrected_name!=='string'||
        item.corrected_name.trim().length<24||typeof item.reason!=='string'||item.reason.length<60)
        fail('identity resolution requires precise supported title, ID and scope distinction');
      const topic=watch.topics.find(t=>t.topic_id===item.topic_id);
      if(!topic||topic.status==='archived'||topic.name!==item.expected_name||
        !topic.evidence?.some(e=>e.url===item.expected_primary_url))
        fail('stale or unsupported topic title: '+item.topic_id);
      const before='<section class="wl-card" id="'+esc(topic.topic_id)+'"><h2>'+esc(topic.name)+'</h2>';
      const after='<section class="wl-card" id="'+esc(topic.topic_id)+'"><h2>'+esc(item.corrected_name)+'</h2>';
      if(html.split(before).length!==2)fail('exact published research heading not found once: '+item.topic_id);
      html=html.replace(before,after);
      topic.name_aliases=[...new Set([...(topic.name_aliases||[]),topic.name])];
      topic.name=item.corrected_name;
      topic.title_disambiguation_reason=item.reason;
      seen.add(item.topic_id);
    }
    requireDistinctWatchlistTitles(watch.topics);
  }else if(scoreOnly){
    const missing=watch.topics.filter(t=>!Number.isInteger(t.research_score)).length;
    if(watch.topics.length!==revision.expected_topic_count||missing!==revision.expected_missing_score_count)
      fail('Watchlist score audit mismatch; refuse to patch changed or already-corrected data');
    for(const topic of watch.topics){
      const anchor='<section class="wl-card" id="'+esc(topic.topic_id)+'"><h2>'+esc(topic.name)+'</h2>';
      const start=html.indexOf(anchor);
      if(start<0||html.indexOf(anchor,start+1)>=0)fail('topic section missing or repeated: '+topic.topic_id);
      const end=html.indexOf('</section>',start);
      if(end<0)fail('unclosed research section: '+topic.topic_id);
      const fragment=html.slice(start,end);
      const priorScore=Number.isInteger(topic.research_score)?String(topic.research_score):'';
      const oldSummary='<summary>How the research score works · '+priorScore+'/100</summary>';
      if(fragment.split(oldSummary).length!==2)fail('prior research score HTML does not match JSON: '+topic.topic_id);
      const score=scoreTopic(topic);
      if(!Number.isInteger(score)||score<0||score>100)fail('invalid rubric-derived score: '+topic.topic_id);
      const newSummary='<summary>How the research score works · '+score+'/100</summary>';
      html=html.slice(0,start)+fragment.replace(oldSummary,newSummary)+html.slice(end);
      topic.research_score=score;
    }
    if(html.includes('How the research score works · /100'))fail('blank research score remains');
  }else if(rubricOnly){
    const synthetic=watch.topics.filter(isSyntheticSixty);
    if(watch.topics.length!==revision.expected_topic_count||
       synthetic.length!==revision.expected_generic_score_count)
      fail('synthetic 60/100 rubric audit mismatch; a concurrent change may have occurred');
    const syntheticIds=new Set(synthetic.map(t=>t.topic_id));
    for(const item of revision.items){
      if(!/^dab-topic-[a-z0-9-]+$/.test(item.topic_id)||seen.has(item.topic_id))
        fail('duplicate/invalid rubric topic ID');
      seen.add(item.topic_id);
      const topic=watch.topics.find(t=>t.topic_id===item.topic_id);
      if(!topic||!syntheticIds.has(item.topic_id)||topic.name!==item.topic||
         item.expected_original_score!==60||
         !topic.evidence?.some(e=>e.kind==='primary'&&e.url===item.expected_evidence_url))
        fail('stale, missing or unbound synthetic rubric: '+item.topic_id);
      requireWatchlistRubric(item.rubric,'Corrected '+item.topic_id);
      if(topic.evidence.filter(e=>e.kind==='primary').length===1&&item.rubric.independence.score>1)
        fail('single original source cannot claim independent corroboration: '+item.topic_id);
      if(!topic.momentum?.observations?.length&&item.rubric.momentum.score!==null)
        fail('unobserved historical momentum must be marked unknown: '+item.topic_id);
      const anchor='<section class="wl-card" id="'+esc(topic.topic_id)+'"><h2>'+esc(topic.name)+'</h2>';
      const start=html.indexOf(anchor);
      if(start<0||html.indexOf(anchor,start+1)>=0)fail('rubric topic section missing or repeated: '+item.topic_id);
      const end=html.indexOf('</section>',start);
      if(end<0)fail('rubric topic section unclosed: '+item.topic_id);
      const fragment=html.slice(start,end);
      const scorePattern=/<details class="wl-score-details">[\s\S]*?<\/details>/g;
      const oldBlocks=[...fragment.matchAll(scorePattern)];
      if(oldBlocks.length!==1||!oldBlocks[0][0].includes('· 60/100</summary>'))
        fail('published rubric no longer matches source JSON: '+item.topic_id);
      topic.rubric=item.rubric;
      topic.research_score=scoreTopic(topic);
      if(!Number.isInteger(topic.research_score)||topic.research_score<0||topic.research_score>100)
        fail('corrected rubric score invalid: '+item.topic_id);
      const rendered=renderWatchlistEvidence(topic);
      const replacement=rendered.match(/<details class="wl-score-details">[\s\S]*?<\/details>/);
      if(!replacement)fail('canonical rubric rendering unavailable');
      html=html.slice(0,start)+fragment.replace(oldBlocks[0][0],replacement[0])+html.slice(end);
    }
    if(seen.size!==syntheticIds.size||watch.topics.some(isSyntheticSixty))
      fail('synthetic default rubrics remain uncorrected');
  }else{
  for(const item of revision.items){
    if(!/^dab-topic-[a-z0-9-]+$/.test(item.topic_id)||seen.has(item.topic_id))fail('duplicate/invalid topic ID');seen.add(item.topic_id);
    const topic=watch.topics.find(t=>t.topic_id===item.topic_id);
    if(!topic||topic.name!==item.topic)fail('topic identity changed: '+item.topic_id);
    if(topic.summary!==item.expected_original_text||topic.why_now!==item.expected_original_text||topic.practical_value!==item.expected_original_text)fail('expected original repeated copy no longer present: '+item.topic_id);
    if(!topic.evidence?.some(e=>e.url===item.expected_evidence_url))fail('topic primary evidence changed: '+item.topic_id);
    requireWatchlistCopy(item,item.topic_id);
    const title='<section class="wl-card" id="'+esc(item.topic_id)+'"><h2>'+esc(topic.name)+'</h2>';
    const original=title+'<p>'+esc(topic.summary)+'</p><p><strong>Why now:</strong> '+esc(topic.why_now)+'</p><p><strong>Potential value:</strong> '+esc(topic.practical_value)+'</p>';
    const revised=title+'<p>'+esc(item.summary)+'</p><p><strong>Why now:</strong> '+esc(item.why_now)+'</p><p><strong>Potential value:</strong> '+esc(item.practical_value)+'</p>';
    if(html.split(original).length!==2)fail('original HTML heading not found exactly once: '+item.topic_id);
    html=html.replace(original,revised);
    topic.summary=item.summary;topic.why_now=item.why_now;topic.practical_value=item.practical_value;
  }
  if(watch.topics.some(t=>t.summary===t.why_now&&t.why_now===t.practical_value))fail('repeated Watchlist fields remain after correction');
  }
  fs.cpSync(historySite,outSite,{recursive:true,force:true});
  fs.writeFileSync(textFile(outSite,jsonRoute),JSON.stringify(watch,null,2)+'\n');
  fs.writeFileSync(textFile(outSite,htmlRoute),html);
  const before=walk(historySite),after=walk(outSite);
  if(JSON.stringify(before)!==JSON.stringify(after))fail('output file inventory changed');
  const permitted=new Set([jsonRoute,htmlRoute]),changed=[],unchanged=[];
  for(const route of before){
    const old=sha(fs.readFileSync(textFile(historySite,route)));
    const next=sha(fs.readFileSync(textFile(outSite,route)));
    if(old===next)unchanged.push(route);
    else {
      if(!permitted.has(route))fail('unexpected content change at '+route);
      changed.push({route,previous_sha256:old,current_sha256:next});
    }
  }
  if(changed.length!==2)fail('expected exactly 2 changed Watchlist reader routes');
  const unchangedImageFiles=unchanged.filter(p=>/\.(?:png|webp|jpe?g|svg)$/i.test(p));
  const currentImages=unchangedImageFiles.filter(p=>p.startsWith('briefs/images/'+revision.edition_date+'/'));
  if(currentImages.filter(p=>p.endsWith('.png')).length!==6)fail('six current premium PNGs not independently preserved');
  if(unchanged.filter(p=>/2026-10-08\//.test(p)).length<17)fail('October 8 historical artifacts were not preserved');
  return {schema_version:'daily-compiler-watchlist-text-only-patch-v1',result:'PASS',edition_date:revision.edition_date,scope:revision.scope,corrected_topics:scoreOnly?watch.topics.length:seen.size,missing_scores_before:scoreOnly?revision.expected_missing_score_count:null,missing_scores_after:scoreOnly?0:null,synthetic_sixties_before:rubricOnly?revision.expected_generic_score_count:null,synthetic_sixties_after:rubricOnly?0:null,changed,unchanged_file_count:unchanged.length,unchanged_image_count:unchangedImageFiles.length,current_premium_pngs_preserved:6,normal_compiler_rebuild:false,images_regenerated:0};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [revisionPath,historySite,outSite,receiptPath]=process.argv.slice(2);
 if(!receiptPath)fail('usage: node scripts/apply-watchlist-editorial-revision.mjs <revision.json> <history/site> <build/patched> <receipt.json>');
 const receipt=applyWatchlistRevision({revision:load(revisionPath),historySite,outSite});
 fs.mkdirSync(path.dirname(receiptPath),{recursive:true});
 fs.writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify(receipt));
}

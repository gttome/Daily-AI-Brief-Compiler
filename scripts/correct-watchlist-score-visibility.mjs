#!/usr/bin/env node
// A narrow public Watchlist display correction. Never changes scores, votes,
// editorial bundles, reader pages, images or historical publication bytes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

const RUNTIME='assets/js/watchlist.js';
const DATA='data/watchlist.json';
const RESEARCH='watchlist/research/index.html';
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
const gitBlobSha=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const fail=s=>{throw Error('watchlist_score_visibility:'+s);};
const read=(site,route)=>fs.readFileSync(path.join(site,route));
function walk(root,relative=''){
  return fs.readdirSync(path.join(root,relative),{withFileTypes:true}).flatMap(entry=>{
    const route=path.posix.join(relative,entry.name);
    if(entry.isDirectory())return walk(root,route);
    if(!entry.isFile())fail('unexpected_symlink_or_special_file:'+route);
    return [route];
  }).sort();
}
export function repairWatchlistScoreVisibility({revisionFile,historySite,outSite}){
  const rev=JSON.parse(fs.readFileSync(revisionFile,'utf8'));
  if(rev.schema_version!=='daily-compiler-reading-copy-correction-v1'||
     rev.correction_type!=='WATCHLIST_RESEARCH_SCORE_DISPLAY_ONLY'||
     rev.edition_date!=='2026-10-27'||rev.scope!=='WATCHLIST_RUNTIME_JS_ONLY'||
     rev.requested_by!=='owner'||!Number.isInteger(rev.expected_topic_count)||
     rev.expected_topic_count!==50||!/^[a-f0-9]{40}$/.test(rev.expected_previous_runtime_blob_sha||''))
    fail('invalid_or_unapproved_correction');
  if(!historySite||!outSite||!fs.existsSync(historySite)||fs.existsSync(outSite))
    fail('invalid_staging_paths');
  const data=JSON.parse(read(historySite,DATA).toString('utf8'));
  if(data.edition_date!==rev.edition_date||!Array.isArray(data.topics)||
     data.topics.length!==rev.expected_topic_count||new Set(data.topics.map(t=>t.topic_id)).size!==data.topics.length||
     data.topics.some(t=>!Number.isInteger(t.research_score)||t.research_score<0||t.research_score>100))
    fail('published_watchlist_score_census_mismatch');
  const research=read(historySite,RESEARCH).toString('utf8');
  const detailed=[...research.matchAll(/How the research score works · (\d{1,3})\/100<\/summary>/g)];
  if(detailed.length!==data.topics.length||data.topics.some(t=>
     !research.includes('<section class="wl-card" id="'+t.topic_id+'">')))
    fail('published_research_breakdown_missing');
  const before=read(historySite,RUNTIME);
  if(gitBlobSha(before)!==rev.expected_previous_runtime_blob_sha)
    fail('published_runtime_changed_since_owner_report');
  const oldSource=before.toString('utf8');
  const canonical=fs.readFileSync('vendor/production-reader/snapshot/assets/js/watchlist.js','utf8');
  const start=canonical.indexOf('function researchScore(t){');
  const end=canonical.indexOf('\nfunction card(t){',start);
  if(start<0||end<=start||canonical.indexOf('function researchScore(t){',start+1)>=0)
    fail('canonical_score_helper_missing_or_duplicated');
  const helper=canonical.slice(start,end);
  const marker='function card(t){';
  const oldAnchor='${renderWatchlistEvidence(t)}<fieldset class="wl-question">';
  const newAnchor='${renderWatchlistEvidence(t)}${researchScore(t)}<fieldset class="wl-question">';
  if(canonical.split(helper+'\n'+marker).length!==2||canonical.split(newAnchor).length!==2)
    fail('canonical_reader_template_inconsistent');
  if(oldSource.includes('function researchScore(t){')||
     oldSource.split(marker).length!==2||oldSource.split(oldAnchor).length!==2)
    fail('published_runtime_no_longer_needs_exact_correction');
  const updated=oldSource.replace(marker,helper+'\n'+marker).replace(oldAnchor,newAnchor);
  if(!updated.includes('/watchlist/research/#')||!updated.includes('Research score: '))
    fail('rendered_score_label_absent');
  const inventory=walk(historySite);
  fs.cpSync(historySite,outSite,{recursive:true,force:true});
  fs.writeFileSync(path.join(outSite,RUNTIME),updated,'utf8');
  const afterInventory=walk(outSite);
  if(JSON.stringify(inventory)!==JSON.stringify(afterInventory))
    fail('site_inventory_changed');
  const changed=[];
  for(const route of inventory){
    const previous=sha256(read(historySite,route)),current=sha256(read(outSite,route));
    if(previous!==current){
      if(route!==RUNTIME)fail('forbidden_mutation:'+route);
      changed.push({route,previous_sha256:previous,current_sha256:current});
    }
  }
  if(changed.length!==1||updated===oldSource)fail('exactly_one_runtime_file_must_change');
  return {schema_version:'daily-compiler-watchlist-score-display-correction-v1',
    result:'PASS',edition_date:rev.edition_date,scope:rev.scope,
    files_changed:1,watchlist_topic_count:data.topics.length,graded_topic_count:detailed.length,
    no_watchlist_content_change:true,no_editorial_reseal:true,
    original_runtime_git_blob_sha:gitBlobSha(before),changed};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const [revisionFile,historySite,outSite,receiptFile]=process.argv.slice(2);
  if(!receiptFile)fail('usage: correct-watchlist-score-visibility.mjs <revision> <history/site> <out/site> <receipt>');
  const receipt=repairWatchlistScoreVisibility({revisionFile,historySite,outSite});
  fs.mkdirSync(path.dirname(receiptFile),{recursive:true});
  fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify(receipt));
}
